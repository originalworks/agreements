import { expect } from 'chai'
import { utils } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'

describe('(FUNCTIONAL) AgreementERC20: Funds collection flow', () => {
  async function setup() {
    const initialSetup = await deployInitialSetup({
      paymentFee: utils.parseEther('0.1'),
    })
    const { feeManager, lendingToken } = initialSetup
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500, 500],
    })

    await lendingToken.mintTo(agreement.address, utils.parseEther('100'))
    return { feeManager, holders, lendingToken, agreement }
  }
  it('User can collect income after feeManager collected fee', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup()
    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)

    expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
      utils.parseEther('10'),
    )

    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(0)
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(0)

    await agreement.claimHolderFunds(holders[0].account, lendingToken.address)
    await agreement.claimHolderFunds(holders[1].account, lendingToken.address)

    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      utils.parseEther('45'),
    )
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      utils.parseEther('45'),
    )
  })
  it('User can collect income after feeManager collected fee (collected in-between)', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup()

    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(0)
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(0)

    await agreement.claimHolderFunds(holders[0].account, lendingToken.address)
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      utils.parseEther('45'),
    )

    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)

    expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
      utils.parseEther('10'),
    )

    await agreement.claimHolderFunds(holders[1].account, lendingToken.address)

    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      utils.parseEther('45'),
    )
  })
  it('Can collect fee after all users collected income', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup()
    await agreement.claimHolderFunds(holders[0].account, lendingToken.address)
    await agreement.claimHolderFunds(holders[1].account, lendingToken.address)
    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)
    expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
      utils.parseEther('10'),
    )
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      utils.parseEther('45'),
    )
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      utils.parseEther('45'),
    )
  })
  it('Can collect fee and user income with funds incoming at different time', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup()
    await agreement.claimHolderFunds(holders[0].account, lendingToken.address)
    await agreement.claimHolderFunds(holders[1].account, lendingToken.address)
    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)
    expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
      utils.parseEther('10'),
    )
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      utils.parseEther('45'),
    )
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      utils.parseEther('45'),
    )

    await lendingToken.mintTo(agreement.address, utils.parseEther('200'))

    await agreement.claimHolderFunds(holders[0].account, lendingToken.address)
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      utils.parseEther('135'), // 45 + 90 = 135
    )
    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)
    expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
      utils.parseEther('30'), // 10 + 20 = 30
    )
    await lendingToken.mintTo(agreement.address, utils.parseEther('300'))
    await agreement.claimHolderFunds(holders[1].account, lendingToken.address)
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      utils.parseEther('270'), // 45 + 90 + 135 = 270
    )

    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)
    expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
      utils.parseEther('60'), // 10 + 20 + 30 = 60
    )

    await agreement.claimHolderFunds(holders[0].account, lendingToken.address)
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      utils.parseEther('270'), // 45 + 90 + 135 = 270
    )
  })

  it('emits NativeCoinReceived when received native coins', async () => {
    const [owner] = await ethers.getSigners()
    const value = parseEther('2.34')
    const { agreement } = await setup()

    const tx = await owner.sendTransaction({ value, to: agreement.address })

    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'NativeCoinReceived')
      .withArgs(owner.address, value)
  })
})
