import { expect } from 'chai';
import { parseEther, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments';

describe('FeeManager logic', () => {
  describe('collectFee', () => {
    it('can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      const { feeManager, lendingToken } = initialSetup;
      const { agreement } = await deployAgreementERC20({
        initialSetup,
        shares: [1000n],
      });
      await expect(
        feeManager
          .connect(notOwner)
          .collectPaymentFee(
            await agreement.getAddress(),
            await lendingToken.getAddress(),
          ),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableUnauthorizedAccount');
    });

    describe('collect paymentFee', () => {
      it('collect paymentFee from the specified ERC20 agreement contract', async () => {
        const incomingFunds = parseEther('5');
        const paymentFee = parseEther('0.1');

        const initialSetup = await deployInitialSetup({
          paymentFee,
        });
        const { feeManager, lendingToken } = initialSetup;
        const { agreement } = await deployAgreementERC20({
          initialSetup,
          shares: [1000n],
        });
        await lendingToken.mintTo(await agreement.getAddress(), incomingFunds);
        await feeManager.collectPaymentFee(
          await agreement.getAddress(),
          await lendingToken.getAddress(),
        );

        let expectedRes = (incomingFunds * paymentFee) / parseEther('1');
        expectedRes = incomingFunds - expectedRes;

        expect(
          await lendingToken.balanceOf(await agreement.getAddress()),
        ).to.equal(expectedRes);

        expect(
          await lendingToken.balanceOf(await feeManager.getAddress()),
        ).to.equal((incomingFunds * paymentFee) / parseEther('1'));
      });
      it('collect paymentFee from the specified ERC1155 agreement contract', async () => {
        const incomingFunds = parseEther('1.4');
        const paymentFee = parseEther('0.1');

        const initialSetup = await deployInitialSetup({
          paymentFee,
        });
        const { feeManager, lendingToken } = initialSetup;
        const { agreement } = await deployAgreementERC1155({
          initialSetup,
          shares: [1000n],
        });
        await lendingToken.mintTo(await agreement.getAddress(), incomingFunds);
        await feeManager.collectPaymentFee(
          await agreement.getAddress(),
          await lendingToken.getAddress(),
        );

        let expectedRes = (incomingFunds * paymentFee) / parseEther('1');
        expectedRes = incomingFunds - expectedRes;

        expect(
          await lendingToken.balanceOf(await agreement.getAddress()),
        ).to.equal(expectedRes);
        expect(
          await lendingToken.balanceOf(await feeManager.getAddress()),
        ).to.equal((incomingFunds * paymentFee) / parseEther('1'));
      });
    });

    describe('creationFee', () => {
      it('can collect creationFee after creation of agreementERC20', async () => {
        const creationFee = parseEther('0.35');
        const initialSetup = await deployInitialSetup({ creationFee });
        await deployAgreementERC20({ initialSetup, shares: [500n] });
        const { feeManager, agreementFactory } = initialSetup;
        expect(
          await ethers.provider.getBalance(await agreementFactory.getAddress()),
        ).to.equal(creationFee);
        await feeManager.collectCreationFee(
          await agreementFactory.getAddress(),
        );
        expect(
          await ethers.provider.getBalance(await agreementFactory.getAddress()),
        ).to.equal(0n);
        expect(
          await ethers.provider.getBalance(await feeManager.getAddress()),
        ).to.equal(creationFee);
      });
      it('can collect creationFee after creation of agreementERC1155', async () => {
        const creationFee = parseEther('0.5');
        const initialSetup = await deployInitialSetup({ creationFee });
        await deployAgreementERC1155({ initialSetup, shares: [500n] });
        const { feeManager, agreementFactory } = initialSetup;
        expect(
          await ethers.provider.getBalance(await agreementFactory.getAddress()),
        ).to.equal(creationFee);
        await feeManager.collectCreationFee(
          await agreementFactory.getAddress(),
        );
        expect(
          await ethers.provider.getBalance(await agreementFactory.getAddress()),
        ).to.equal(0n);
        expect(
          await ethers.provider.getBalance(await feeManager.getAddress()),
        ).to.equal(creationFee);
      });
    });
  });
  describe('funds transfer', () => {
    it('can transfer ETH', async () => {
      const { feeManager, deployer } = await deployInitialSetup();
      const wallet = Wallet.createRandom().connect(ethers.provider);

      await deployer.sendTransaction({
        to: await feeManager.getAddress(),
        value: parseEther('2.137'),
      });
      await feeManager.withdrawNativeCoins(wallet.address);
      expect(await wallet.provider?.getBalance(wallet.address)).to.equal(
        parseEther('2.137'),
      );
    });

    it('can transfer ERC20', async () => {
      const { feeManager, lendingToken } = await deployInitialSetup();
      const wallet = Wallet.createRandom().connect(ethers.provider);
      await lendingToken.mintTo(await feeManager.getAddress(), 2137n);
      await feeManager.withdrawERC20(
        wallet.address,
        await lendingToken.getAddress(),
      );
      expect(await lendingToken.balanceOf(wallet.address)).to.equal(2137n);
    });

    it('withdrawNativeCoins can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners();
      const { feeManager } = await deployInitialSetup();
      await expect(
        feeManager.connect(notOwner).withdrawNativeCoins(notOwner.address),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableUnauthorizedAccount');
    });

    it('withdrawERC20 can only be called by owner', async () => {
      const [, , , notOwner] = await ethers.getSigners();
      const { feeManager, lendingToken } = await deployInitialSetup();
      await expect(
        feeManager
          .connect(notOwner)
          .withdrawERC20(notOwner.address, await lendingToken.getAddress()),
      ).to.be.revertedWithCustomError(feeManager, 'OwnableUnauthorizedAccount');
    });
  });
});
