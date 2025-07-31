import { expect } from 'chai'
import { utils, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments'

describe('FeeManager logic', () => {
  describe('collectFee', () => {
    it('can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners()
      const initialSetup = await deployInitialSetup()
      const { feeManager, lendingToken } = initialSetup
      const { agreement } = await deployAgreementERC20({
        initialSetup,
        shares: [1000],
      })
      await expect(
        feeManager
          .connect(notOwner)
          .collectPaymentFee(agreement.address, lendingToken.address),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    describe('collect paymentFee', () => {
      it('collect paymentFee from the specified ERC20 agreement contract', async () => {
        const incomingFunds = ethers.utils.parseEther('5')
        const paymentFee = ethers.utils.parseEther('0.1')

        const initialSetup = await deployInitialSetup({
          paymentFee,
        })
        const { feeManager, lendingToken } = initialSetup
        const { agreement } = await deployAgreementERC20({
          initialSetup,
          shares: [1000],
        })
        await lendingToken.mintTo(agreement.address, incomingFunds)
        await feeManager.collectPaymentFee(
          agreement.address,
          lendingToken.address,
        )
        expect(await lendingToken.balanceOf(agreement.address)).to.equal(
          incomingFunds.sub(
            incomingFunds.mul(paymentFee).div(utils.parseEther('1')),
          ),
        )
        expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
          incomingFunds.mul(paymentFee).div(utils.parseEther('1')),
        )
      })
      it('collect paymentFee from the specified ERC1155 agreement contract', async () => {
        const incomingFunds = ethers.utils.parseEther('1.4')
        const paymentFee = ethers.utils.parseEther('0.1')

        const initialSetup = await deployInitialSetup({
          paymentFee,
        })
        const { feeManager, lendingToken } = initialSetup
        const { agreement } = await deployAgreementERC1155({
          initialSetup,
          shares: [1000],
        })
        await lendingToken.mintTo(agreement.address, incomingFunds)
        await feeManager.collectPaymentFee(
          agreement.address,
          lendingToken.address,
        )
        expect(await lendingToken.balanceOf(agreement.address)).to.equal(
          incomingFunds.sub(
            incomingFunds.mul(paymentFee).div(utils.parseEther('1')),
          ),
        )
        expect(await lendingToken.balanceOf(feeManager.address)).to.equal(
          incomingFunds.mul(paymentFee).div(utils.parseEther('1')),
        )
      })
    })

    describe('creationFee', () => {
      it('can collect creationFee after creation of agreementERC20', async () => {
        const creationFee = utils.parseEther('0.35')
        const initialSetup = await deployInitialSetup({ creationFee })
        await deployAgreementERC20({ initialSetup, shares: [500] })
        const { feeManager, agreementFactory } = initialSetup
        expect(
          await ethers.provider.getBalance(agreementFactory.address),
        ).to.equal(creationFee)
        await feeManager.collectCreationFee(agreementFactory.address)
        expect(
          await ethers.provider.getBalance(agreementFactory.address),
        ).to.equal(0)
        expect(await ethers.provider.getBalance(feeManager.address)).to.equal(
          creationFee,
        )
      })
      it('can collect creationFee after creation of agreementERC1155', async () => {
        const creationFee = utils.parseEther('0.5')
        const initialSetup = await deployInitialSetup({ creationFee })
        await deployAgreementERC1155({ initialSetup, shares: [500] })
        const { feeManager, agreementFactory } = initialSetup
        expect(
          await ethers.provider.getBalance(agreementFactory.address),
        ).to.equal(creationFee)
        await feeManager.collectCreationFee(agreementFactory.address)
        expect(
          await ethers.provider.getBalance(agreementFactory.address),
        ).to.equal(0)
        expect(await ethers.provider.getBalance(feeManager.address)).to.equal(
          creationFee,
        )
      })
    })
  })
  describe('funds transfer', () => {
    it('can transfer ETH', async () => {
      const { feeManager, deployer } = await deployInitialSetup()
      const wallet = Wallet.createRandom().connect(ethers.provider)
      await deployer.sendTransaction({
        to: feeManager.address,
        value: utils.parseEther('2.137'),
      })
      await feeManager.withdrawNativeCoins(wallet.address)
      expect(await wallet.getBalance()).to.equal(utils.parseEther('2.137'))
    })

    it('can transfer ERC20', async () => {
      const { feeManager, lendingToken } = await deployInitialSetup()
      const wallet = Wallet.createRandom().connect(ethers.provider)
      await lendingToken.mintTo(feeManager.address, 2137)
      await feeManager.withdrawERC20(wallet.address, lendingToken.address)
      expect(await lendingToken.balanceOf(wallet.address)).to.equal(2137)
    })

    it('withdrawNativeCoins can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners()
      const { feeManager } = await deployInitialSetup()
      await expect(
        feeManager.connect(notOwner).withdrawNativeCoins(notOwner.address),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('withdrawERC20 can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners()
      const { feeManager, lendingToken } = await deployInitialSetup()
      await expect(
        feeManager
          .connect(notOwner)
          .withdrawERC20(notOwner.address, lendingToken.address),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
