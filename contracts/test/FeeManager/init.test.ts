import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { deployInitialSetup } from '../helpers/deployments';

describe('FeeManager.initialize', () => {
  it('correctly initializes values', async () => {
    const { feeManager, deployer } = await deployInitialSetup({
      paymentFee: 9000n,
      creationFee: 1234n,
    });

    expect(await feeManager.owner()).to.equal(deployer.address);
    expect(await feeManager.creationFee()).to.equal(1234n);
    expect(await feeManager.paymentFee()).to.equal(9000n);
  });

  it('emits events', async () => {
    const [deployer] = await ethers.getSigners();

    const block = await ethers.provider.getBlockNumber();
    const FeeManager = await ethers.getContractFactory('FeeManager');
    const feeManager = await upgrades.deployProxy(FeeManager, [1234n, 9000n], {
      kind: 'uups',
    });

    const ownershipTransferredEvent = await feeManager.queryFilter(
      feeManager.getEvent('OwnershipTransferred'),
      block,
    );

    const creationFeeChangedEvent = await feeManager.queryFilter(
      feeManager.getEvent('CreationFeeChanged'),
      block,
    );

    const paymentFeeChangedEvent = await feeManager.queryFilter(
      feeManager.getEvent('PaymentFeeChanged'),
      block,
    );

    expect(ownershipTransferredEvent[0].args.previousOwner).to.equal(
      ethers.ZeroAddress,
    );
    expect(ownershipTransferredEvent[0].args.newOwner).to.equal(
      deployer.address,
    );

    expect(creationFeeChangedEvent[0].args.creationFee).to.equal(1234n);

    expect(paymentFeeChangedEvent[0].args.paymentFee).to.equal(9000n);
  });

  it('cannot be called twice', async () => {
    const FeeManager = await ethers.getContractFactory('FeeManager');
    const feeManager = await upgrades.deployProxy(FeeManager, [0n, 0n], {
      kind: 'uups',
    });

    await expect(feeManager.initialize(1, 2)).to.be.revertedWithCustomError(
      feeManager,
      'InvalidInitialization',
    );
  });
});
