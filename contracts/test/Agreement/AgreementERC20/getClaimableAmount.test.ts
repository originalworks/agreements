import { BigNumber } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { expect } from 'chai'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'

describe('AgreementERC20.getClaimableAmount', () => {
  it('Return amount available for claim and the applied fee', async () => {
    const incomingFunds = BigNumber.from(100000)
    const initialSetup = await deployInitialSetup()
    const { lendingToken, feeManager } = initialSetup
    const paymentFee = await feeManager.paymentFee()
    const holder1Shares = BigNumber.from(600)
    const holder2Shares = BigNumber.from(400)

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [holder1Shares.toNumber(), holder2Shares.toNumber()],
    })
    const holder1 = holders[0]
    const holder2 = holders[1]
    const agreementTotalSupply = await agreement.totalSupply()

    const tokenBalanceBeforeHolder1 = await lendingToken.balanceOf(
      holder1.account,
    )
    const tokenBalanceBeforeHolder2 = await lendingToken.balanceOf(
      holder2.account,
    )

    await lendingToken.mintTo(agreement.address, incomingFunds)

    const claimableAmountHolder1 = await agreement.getClaimableAmount(
      lendingToken.address,
      holder1.account,
    )
    const claimableAmountHolder2 = await agreement.getClaimableAmount(
      lendingToken.address,
      holder2.account,
    )

    await agreement.claimHolderFunds(holder1.account, lendingToken.address)
    await agreement.claimHolderFunds(holder2.account, lendingToken.address)

    const tokenBalanceAfterHolder1 = await lendingToken.balanceOf(
      holder1.account,
    )
    const tokenBalanceAfterHolder2 = await lendingToken.balanceOf(
      holder2.account,
    )

    expect(tokenBalanceAfterHolder1.sub(tokenBalanceBeforeHolder1)).to.equal(
      claimableAmountHolder1.claimableAmount,
    )
    expect(tokenBalanceAfterHolder2.sub(tokenBalanceBeforeHolder2)).to.equal(
      claimableAmountHolder2.claimableAmount,
    )

    expect(
      incomingFunds
        .mul(holder1Shares)
        .div(agreementTotalSupply)
        .mul(paymentFee)
        .div(parseEther('1')),
    ).to.equal(claimableAmountHolder1.fee)

    expect(
      incomingFunds
        .mul(holder2Shares)
        .div(agreementTotalSupply)
        .mul(paymentFee)
        .div(parseEther('1')),
    ).to.equal(claimableAmountHolder2.fee)
  })
})
