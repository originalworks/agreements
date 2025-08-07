import { Wallet } from 'ethers';
import { FallbackVault, FallbackVault__factory } from '../../typechain';
import { deployProxy } from '@royalty-loans/contracts-shared';

export async function deployFallbackVault(deployer: Wallet) {
  const factory = new FallbackVault__factory(deployer);
  const fallbackVault = (await deployProxy(factory, [])) as FallbackVault;
  return fallbackVault;
}
