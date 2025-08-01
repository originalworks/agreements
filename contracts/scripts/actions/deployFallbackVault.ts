import { ethers, upgrades } from 'hardhat';
import { FallbackVault } from '../../typechain';

export async function deployFallbackVault(): Promise<FallbackVault> {
  const FallbackVault = await ethers.getContractFactory('FallbackVault');
  const fallbackVault = (await upgrades.deployProxy(FallbackVault, [], {
    kind: 'uups',
  })) as FallbackVault;

  await fallbackVault.waitForDeployment();

  return fallbackVault;
}
