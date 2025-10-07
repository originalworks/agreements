import { NamespaceRegistry, NamespaceRegistry__factory } from '../../typechain';
import { deployProxy } from '../utils';
import { SignerOrWallet } from '../types';

export async function deployNamespaceRegistry(deployer: SignerOrWallet) {
  const factory = new NamespaceRegistry__factory(deployer);
  const contract = (await deployProxy(factory, [])) as NamespaceRegistry;

  return contract;
}
