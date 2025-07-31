import { expect } from 'chai'
import { BigNumber, Wallet } from 'ethers'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { fakeSignerWithAddress } from '../../helpers/utils'

describe('AgreementERC1155.transferOwnedERC1155Shares', () => {
  const TOKEN_ID = 1
  async function setup() {
    const NESTED_AGREEMENT_BALANCE = '500'
    const initialSetup = await deployInitialSetup()
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000, 500],
    })

    const holder1 = holders[0]
    const holder2 = holders[1]

    const { agreement: nestedAgreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        { ...holder1, isAdmin: true },
        { ...holder2, isAdmin: false },
        {
          account: agreement.address,
          balance: NESTED_AGREEMENT_BALANCE,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    })
    return {
      agreement,
      nestedAgreement,
      holders,
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    }
  }
  it('can transfer to a holder', async () => {
    const transferAmount = '300'
    const {
      agreement,
      nestedAgreement,
      holders: [holder1, holder2],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreement.address,
        holder2.account,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreement.balanceOf(agreement.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(await nestedAgreement.balanceOf(holder2.account, TOKEN_ID)).to.equal(
      Number(holder2.balance) + Number(transferAmount),
    )
  })
  it('can transfer to a non-holder', async () => {
    const nonHolder = Wallet.createRandom().address
    const transferAmount = '300'
    const {
      agreement,
      nestedAgreement,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreement.address,
        nonHolder,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreement.balanceOf(agreement.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(await nestedAgreement.balanceOf(nonHolder, TOKEN_ID)).to.equal(
      transferAmount,
    )
  })
  it('can transfer to agreementERC20', async () => {
    const transferAmount = '300'
    const {
      agreement,
      nestedAgreement,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const { agreement: receiverAgreementERC20 } = await deployAgreementERC20({
      initialSetup,
      shares: [100],
    })

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreement.address,
        receiverAgreementERC20.address,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreement.balanceOf(agreement.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreement.balanceOf(receiverAgreementERC20.address, TOKEN_ID),
    ).to.equal(transferAmount)
  })
  it('can transfer to agreementERC1155', async () => {
    const transferAmount = '300'
    const {
      agreement,
      nestedAgreement,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const { agreement: receiverAgreementERC1155 } =
      await deployAgreementERC1155({ initialSetup, shares: [100] })

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreement.address,
        receiverAgreementERC1155.address,
        transferAmount,
      )
    await transferTx.wait()

    expect(
      await nestedAgreement.balanceOf(agreement.address, TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount))
    expect(
      await nestedAgreement.balanceOf(
        receiverAgreementERC1155.address,
        TOKEN_ID,
      ),
    ).to.equal(transferAmount)
  })
  it('cannot transfer if sender is not admin', async () => {
    const receiver = Wallet.createRandom().address
    const {
      agreement,
      nestedAgreement,
      holders: [adminHolder, nonAdminHolder],
      NESTED_AGREEMENT_BALANCE,
    } = await setup()

    await expect(
      agreement
        .connect(nonAdminHolder.wallet)
        .transferOwnedERC1155Shares(nestedAgreement.address, receiver, 100),
    ).to.be.reverted

    expect(
      await nestedAgreement.balanceOf(agreement.address, TOKEN_ID),
    ).to.equal(NESTED_AGREEMENT_BALANCE)
    expect(
      await nestedAgreement.balanceOf(adminHolder.account, TOKEN_ID),
    ).to.equal(adminHolder.balance)
    expect(
      await nestedAgreement.balanceOf(nonAdminHolder.account, TOKEN_ID),
    ).to.equal(nonAdminHolder.balance)
    expect(await nestedAgreement.balanceOf(receiver, TOKEN_ID)).to.equal(0)
  })
  it('withdraws funds for nested agreement sender and receiver before transfer', async () => {
    const {
      agreement,
      nestedAgreement,
      holders: [adminHolder, receiver],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup()
    const incomingFundsAmount = (await nestedAgreement.totalSupply()).mul(10)

    const { feeManager, deployer, lendingToken } = initialSetup

    await feeManager.connect(deployer).setPaymentFee(0)

    expect(await lendingToken.balanceOf(adminHolder.account)).to.equal(0)
    expect(await lendingToken.balanceOf(receiver.account)).to.equal(0)

    await lendingToken
      .connect(deployer)
      .mintTo(nestedAgreement.address, incomingFundsAmount)
    await agreement
      .connect(adminHolder.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreement.address,
        receiver.account,
        100,
      )

    expect(await lendingToken.balanceOf(receiver.account)).to.equal(
      BigNumber.from(receiver.balance).mul(10),
    )
    expect(await lendingToken.balanceOf(agreement.address)).to.equal(
      BigNumber.from(NESTED_AGREEMENT_BALANCE).mul(10),
    )
  })
})
