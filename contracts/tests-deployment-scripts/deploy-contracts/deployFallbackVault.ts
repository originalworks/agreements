import { FallbackVault, FallbackVault__factory } from '../../typechain';
import { deployProxy } from '@royalty-loans/contracts-shared';
import { SignerOrWallet } from '../types';

export async function deployFallbackVault(deployer: SignerOrWallet) {
  const factory = new FallbackVault__factory(deployer);
  const fallbackVault = (await deployProxy(factory, [])) as FallbackVault;
  return fallbackVault;
}
