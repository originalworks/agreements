import { expect } from 'chai';
import { parseEther, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { deployInitialSetup } from '../helpers/deployments';

describe('FeeManager getters and setters', () => {
  describe('get & set owner', () => {
    it('returns original owner', async () => {
      const { feeManager, deployer } = await deployInitialSetup();
      expect(await feeManager.owner()).to.equal(deployer.address);
    });

    it('can change owner', async () => {
      const { feeManager } = await deployInitialSetup();
      const newOwner = Wallet.createRandom().address;
      await feeManager.transferOwnership(newOwner);
      expect(await feeManager.owner()).to.equal(newOwner);
    });

    it('can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners();
      const { feeManager } = await deployInitialSetup();
      await expect(
        feeManager
          .connect(notOwner)
          .transferOwnership(Wallet.createRandom().address),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableUnauthorizedAccount');
    });

    it('cannot be set to zero', async () => {
      const { feeManager } = await deployInitialSetup();
      await expect(
        feeManager.transferOwnership(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableInvalidOwner');
    });
  });

  describe('get & set creation fee', () => {
    it('returns original creation fee', async () => {
      const creationFee = parseEther('0.001');
      const { feeManager } = await deployInitialSetup({ creationFee });
      expect(await feeManager.creationFee()).to.equal(creationFee);
    });

    it('can change creation fee', async () => {
      const { feeManager } = await deployInitialSetup();
      await feeManager.setCreationFee(69n);
      expect(await feeManager.creationFee()).to.equal(69n);
    });

    it('can change creation fee to 0', async () => {
      const { feeManager } = await deployInitialSetup();
      await feeManager.setCreationFee(0n);
      expect(await feeManager.creationFee()).to.equal(0n);
    });

    it('can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners();
      const { feeManager } = await deployInitialSetup();
      await expect(
        feeManager.connect(notOwner).setCreationFee(123n),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableUnauthorizedAccount');
    });
  });
  describe('get & set payment fee', () => {
    it('returns original payment fee', async () => {
      const paymentFee = parseEther('0.015');

      const { feeManager } = await deployInitialSetup({ paymentFee });
      expect(await feeManager.paymentFee()).to.equal(paymentFee);
    });

    it('can change payment fee', async () => {
      const { feeManager } = await deployInitialSetup();
      await feeManager.setPaymentFee(69n);
      expect(await feeManager.paymentFee()).to.equal(69n);
    });

    it('can change payment fee to 0', async () => {
      const { feeManager } = await deployInitialSetup();
      await feeManager.setPaymentFee(0n);
      expect(await feeManager.paymentFee()).to.equal(0n);
    });

    it('can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners();
      const { feeManager } = await deployInitialSetup();
      await expect(
        feeManager.connect(notOwner).setPaymentFee(123n),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableUnauthorizedAccount');
    });
  });
});
