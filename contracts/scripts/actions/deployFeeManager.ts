import { ethers, upgrades } from 'hardhat';
import { FeeManager } from '../../typechain';

export async function deployFeeManager(
  creationFee: bigint,
  relayerFee: bigint,
  paymentFee: bigint,
): Promise<FeeManager> {
  const FeeManager = await ethers.getContractFactory('FeeManager');
  const feeManager = (await upgrades.deployProxy(
    FeeManager,
    [creationFee, paymentFee, relayerFee],
    { kind: 'uups' },
  )) as FeeManager;

  await feeManager.waitForDeployment();

  return feeManager;
}
