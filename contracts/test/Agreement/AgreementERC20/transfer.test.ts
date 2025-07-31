import { expect } from 'chai'
import { Wallet } from 'ethers'
import { ethers } from 'hardhat'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'

describe('AgreementERC20.transfer', () => {
  it('can transfer to a holder', async () => {
    const initialSetup = await deployInitialSetup()

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500, 500],
    })
    const holder1 = holders[0]
    const holder2 = holders[1]

    await agreement.connect(holder1.wallet).transfer(holder2.account, 300)

    expect(await agreement.balanceOf(holder1.account)).to.equal(200)
    expect(await agreement.balanceOf(holder2.account)).to.equal(800)
  })

  it('can transfer to a non-holder', async () => {
    const initialSetup = await deployInitialSetup()

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })
    const holder = holders[0]
    const nonHolder = Wallet.createRandom().address

    await agreement.connect(holder.wallet).transfer(nonHolder, 300)

    expect(await agreement.balanceOf(holder.account)).to.equal(700)
    expect(await agreement.balanceOf(nonHolder)).to.equal(300)
  })

  it('can transfer shares to agreementERC1155', async () => {
    const initialSetup = await deployInitialSetup()

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })
    const holder = holders[0]
    const { agreement: agreement2 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000],
    })

    await agreement.connect(holder.wallet).transfer(agreement2.address, 300)

    expect(await agreement.balanceOf(holder.account)).to.equal(700)
    expect(await agreement.balanceOf(agreement2.address)).to.equal(300)
  })

  it('can transfer shares to agreementERC20', async () => {
    const initialSetup = await deployInitialSetup()

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })
    const holder = holders[0]
    const { agreement: agreement2 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })

    await agreement.connect(holder.wallet).transfer(agreement2.address, 300)

    expect(await agreement.balanceOf(holder.account)).to.equal(700)
    expect(await agreement.balanceOf(agreement2.address)).to.equal(300)
  })

  it('withdraws for sender and receiver before transfer', async () => {
    const initialSetup = await deployInitialSetup({
      paymentFee: ethers.utils.parseEther('0'),
    })
    const { lendingToken } = initialSetup
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [600, 400],
    })
    const sender = holders[0]
    const receiver = holders[1]

    expect(await lendingToken.balanceOf(sender.account)).to.equal(0)
    expect(await lendingToken.balanceOf(receiver.account)).to.equal(0)

    await lendingToken.transfer(agreement.address, 1000)
    await agreement.connect(sender.wallet).transfer(receiver.account, 500)

    expect(await agreement.balanceOf(sender.account)).to.equal(100)
    expect(await agreement.balanceOf(receiver.account)).to.equal(900)

    expect(await lendingToken.balanceOf(sender.account)).to.equal(600)
    expect(await lendingToken.balanceOf(receiver.account)).to.equal(400)
  })

  it('does not affect third party holder in any matter', async () => {
    const initialSetup = await deployInitialSetup({
      paymentFee: ethers.utils.parseEther('0'),
    })
    const { lendingToken } = initialSetup
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [600, 400],
    })
    const sender = holders[0]
    const [, , , , , receiver] = await ethers.getSigners()
    const thirdPartyHolder = holders[1]

    await lendingToken.transfer(agreement.address, 1000)
    await agreement.connect(sender.wallet).transfer(receiver.address, 100)

    expect(await lendingToken.balanceOf(sender.account)).to.equal(600) // Received 60% of 1000 Tokens
    expect(await lendingToken.balanceOf(thirdPartyHolder.account)).to.equal(0) // No action performed
    expect(await lendingToken.balanceOf(receiver.address)).to.equal(0) // Received 0% of 100 Tokens

    await lendingToken.transfer(agreement.address, 2000)
    await agreement.connect(sender.wallet).transfer(receiver.address, 100)

    // Received 50% of 2000 Tokens (600 + 1000 Tokens)
    expect(await lendingToken.balanceOf(sender.account)).to.equal(1600)

    // No action performed
    expect(await lendingToken.balanceOf(thirdPartyHolder.account)).to.equal(0)

    // Received 10% of 2000 Tokens (0 + 200 Tokens)
    expect(await lendingToken.balanceOf(receiver.address)).to.equal(200)

    await lendingToken.transfer(agreement.address, 3000)
    await agreement.claimHolderFunds(sender.account, lendingToken.address)
    await agreement.claimHolderFunds(
      thirdPartyHolder.account,
      lendingToken.address,
    )
    await agreement.claimHolderFunds(receiver.address, lendingToken.address)

    // Received 40% of 3000 Tokens (1600 + 1200 Tokens)
    expect(await lendingToken.balanceOf(sender.account)).to.equal(2800)

    // Received 40% of 6000 Tokens
    expect(await lendingToken.balanceOf(thirdPartyHolder.account)).to.equal(
      2400,
    )

    // Received 20% of 3000 Tokens (200 + 600 Tokens)
    expect(await lendingToken.balanceOf(receiver.address)).to.equal(800)
  })
})
