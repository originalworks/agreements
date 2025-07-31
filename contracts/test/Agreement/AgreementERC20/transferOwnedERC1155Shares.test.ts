import { expect } from 'chai'
import { BigNumber, Wallet } from 'ethers'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { fakeSignerWithAddress } from '../../helpers/utils'

describe('AgreementERC20.transferOwnedERC1155Shares', () => {
  const TOKEN_ID = 1
  async function setup() {
    const NESTED_AGREEMENT_BALANCE = '500'
    const initialSetup = await deployInitialSetup()
    const { agreement: agreementERC20, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000, 500],
    })

    const holder1 = holders[0]
    const holder2 = holders[1]

    const { agreement: nestedAgreementERC1155 } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        { ...holder1, isAdmin: true },
        { ...holder2, isAdmin: false },
        {
          account: agreementERC20.address,
          balance: NESTED_AGREEMENT_BALANCE,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    })
    return {
      agreementERC20,
      nestedAgreementERC1155,
      holders,
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    }
  }
  it('can transfer to a holder', async () => {
    const transferAmount = '300'
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1, holder2],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreementERC1155.address,
        holder2.account,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC1155.balanceOf(agreementERC20.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreementERC1155.balanceOf(holder2.account, TOKEN_ID),
    ).to.equal(Number(holder2.balance) + Number(transferAmount))
  })
  it('can transfer to a non-holder', async () => {
    const nonHolder = Wallet.createRandom().address
    const transferAmount = '300'
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreementERC1155.address,
        nonHolder,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC1155.balanceOf(agreementERC20.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreementERC1155.balanceOf(nonHolder, TOKEN_ID),
    ).to.equal(transferAmount)
  })
  it('can transfer to agreementERC20', async () => {
    const transferAmount = '300'
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const { agreement: receiverAgreementERC20 } = await deployAgreementERC20({
      initialSetup,
      shares: [100],
    })

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreementERC1155.address,
        receiverAgreementERC20.address,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC1155.balanceOf(agreementERC20.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreementERC1155.balanceOf(
        receiverAgreementERC20.address,
        TOKEN_ID,
      ),
    ).to.equal(transferAmount)
  })
  it('can transfer to agreementERC1155', async () => {
    const transferAmount = '300'
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const { agreement: receiverAgreementERC1155 } =
      await deployAgreementERC1155({ initialSetup, shares: [100] })

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreementERC1155.address,
        receiverAgreementERC1155.address,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreementERC1155.balanceOf(agreementERC20.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreementERC1155.balanceOf(
        receiverAgreementERC1155.address,
        TOKEN_ID,
      ),
    ).to.equal(transferAmount)
  })
  it('cannot transfer if sender is not admin', async () => {
    const receiver = Wallet.createRandom().address
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [adminHolder, nonAdminHolder],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    await expect(
      agreementERC20
        .connect(nonAdminHolder.wallet)
        .transferOwnedERC1155Shares(
          nestedAgreementERC1155.address,
          receiver,
          100,
        ),
    ).to.be.reverted

    expect(
      await nestedAgreementERC1155.balanceOf(agreementERC20.address, TOKEN_ID),
    ).to.equal(NESTED_AGREEMENT_BALANCE)
    expect(
      await nestedAgreementERC1155.balanceOf(adminHolder.account, TOKEN_ID),
    ).to.equal(adminHolder.balance)
    expect(
      await nestedAgreementERC1155.balanceOf(nonAdminHolder.account, TOKEN_ID),
    ).to.equal(nonAdminHolder.balance)
    expect(await nestedAgreementERC1155.balanceOf(receiver, TOKEN_ID)).to.equal(
      0,
    )
  })
  it('withdraws funds for nested agreement sender and receiver before transfer', async () => {
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [adminHolder, receiver],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const incomingFundsAmount = (
      await nestedAgreementERC1155.totalSupply()
    ).mul(10)

    const { feeManager, deployer, lendingToken } = initialSetup

    await feeManager.connect(deployer).setPaymentFee(0)

    expect(await lendingToken.balanceOf(adminHolder.account)).to.equal(0)
    expect(await lendingToken.balanceOf(receiver.account)).to.equal(0)

    await lendingToken
      .connect(deployer)
      .mintTo(nestedAgreementERC1155.address, incomingFundsAmount)
    await agreementERC20
      .connect(adminHolder.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreementERC1155.address,
        receiver.account,
        100,
      )

    expect(await lendingToken.balanceOf(receiver.account)).to.equal(
      BigNumber.from(receiver.balance).mul(10),
    )
    expect(await lendingToken.balanceOf(agreementERC20.address)).to.equal(
      BigNumber.from(NESTED_AGREEMENT_BALANCE).mul(10),
    )
  })
})
