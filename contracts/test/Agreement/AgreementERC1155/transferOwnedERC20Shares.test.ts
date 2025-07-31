import { expect } from 'chai'
import { BigNumber, Wallet } from 'ethers'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { fakeSignerWithAddress } from '../../helpers/utils'

describe('AgreementERC1155.transferOwnedERC20Shares', () => {
  async function setup() {
    const NESTED_AGREEMENT_BALANCE = '500'
    const initialSetup = await deployInitialSetup()
    const { agreement: agreementERC1155, holders } =
      await deployAgreementERC1155({ initialSetup, shares: [1000, 500] })

    const holder1 = holders[0]
    const holder2 = holders[1]

    const { agreement: nestedAgreementERC20 } = await deployAgreementERC20({
      initialSetup,

      holders: [
        { ...holder1, isAdmin: true },
        { ...holder2, isAdmin: false },
        {
          account: agreementERC1155.address,
          balance: NESTED_AGREEMENT_BALANCE,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    })
    return {
      agreementERC1155,
      nestedAgreementERC20,
      holders,
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    }
  }
  it('can transfer to a holder', async () => {
    const transferAmount = '300'
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1, holder2],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        nestedAgreementERC20.address,
        holder2.account,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC20.balanceOf(agreementERC1155.address),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(await nestedAgreementERC20.balanceOf(holder2.account)).to.equal(
      Number(holder2.balance) + Number(transferAmount),
    )
  })
  it('can transfer to a non-holder', async () => {
    const nonHolder = Wallet.createRandom().address
    const transferAmount = '300'
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        nestedAgreementERC20.address,
        nonHolder,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC20.balanceOf(agreementERC1155.address),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(await nestedAgreementERC20.balanceOf(nonHolder)).to.equal(
      transferAmount,
    )
  })
  it('can transfer to agreementERC20', async () => {
    const transferAmount = '300'
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const { agreement: receiverAgreementERC20 } = await deployAgreementERC20({
      initialSetup,
      shares: [100],
    })

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        nestedAgreementERC20.address,
        receiverAgreementERC20.address,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC20.balanceOf(agreementERC1155.address),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreementERC20.balanceOf(receiverAgreementERC20.address),
    ).to.equal(transferAmount)
  })
  it('can transfer to agreementERC1155', async () => {
    const transferAmount = '300'
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const { agreement: receiverAgreementERC1155 } =
      await deployAgreementERC1155({ initialSetup, shares: [100] })

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        nestedAgreementERC20.address,
        receiverAgreementERC1155.address,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC20.balanceOf(agreementERC1155.address),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreementERC20.balanceOf(receiverAgreementERC1155.address),
    ).to.equal(transferAmount)
  })
  it('cannot transfer if sender is not admin', async () => {
    const receiver = Wallet.createRandom().address
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [adminHolder, nonAdminHolder],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    await expect(
      agreementERC1155
        .connect(nonAdminHolder.wallet)
        .transferOwnedERC20Shares(nestedAgreementERC20.address, receiver, 100),
    ).to.be.reverted

    expect(
      await nestedAgreementERC20.balanceOf(agreementERC1155.address),
    ).to.equal(NESTED_AGREEMENT_BALANCE)
    expect(await nestedAgreementERC20.balanceOf(adminHolder.account)).to.equal(
      adminHolder.balance,
    )
    expect(
      await nestedAgreementERC20.balanceOf(nonAdminHolder.account),
    ).to.equal(nonAdminHolder.balance)
    expect(await nestedAgreementERC20.balanceOf(receiver)).to.equal(0)
  })

  it('withdraws funds for nested agreement sender and receiver before transfer', async () => {
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [adminHolder, receiver],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const incomingFundsAmount = (await nestedAgreementERC20.totalSupply()).mul(
      10,
    )

    const { feeManager, deployer, lendingToken } = initialSetup

    await feeManager.connect(deployer).setPaymentFee(0)

    expect(await lendingToken.balanceOf(adminHolder.account)).to.equal(0)
    expect(await lendingToken.balanceOf(receiver.account)).to.equal(0)

    await lendingToken
      .connect(deployer)
      .mintTo(nestedAgreementERC20.address, incomingFundsAmount)
    await agreementERC1155
      .connect(adminHolder.wallet)
      .transferOwnedERC20Shares(
        nestedAgreementERC20.address,
        receiver.account,
        100,
      )

    expect(await lendingToken.balanceOf(receiver.account)).to.equal(
      BigNumber.from(receiver.balance).mul(10),
    )
    expect(await lendingToken.balanceOf(agreementERC1155.address)).to.equal(
      BigNumber.from(NESTED_AGREEMENT_BALANCE).mul(10),
    )
  })
})
