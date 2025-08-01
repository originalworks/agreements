import { ethers, upgrades } from 'hardhat';
import { FeeManager } from '../../typechain';
import { BigNumberish } from 'ethers';

export async function deployFeeManager(
  creationFee: BigNumberish,
  paymentFee: BigNumberish,
): Promise<FeeManager> {
  const FeeManager = await ethers.getContractFactory('FeeManager');
  const feeManager = (await upgrades.deployProxy(
    FeeManager,
    [creationFee, paymentFee],
    { kind: 'uups' },
  )) as FeeManager;

  await feeManager.waitForDeployment();

  return feeManager;
}
