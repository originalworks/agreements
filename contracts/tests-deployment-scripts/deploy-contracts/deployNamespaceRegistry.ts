import { Wallet } from 'ethers'
import { NamespaceRegistry, NamespaceRegistry__factory } from '../../typechain'
import { deployProxy } from '../deployProxy'

export async function deployNamespaceRegistry(deployer: Wallet) {
  const factory = new NamespaceRegistry__factory(deployer)
  const contract = (await deployProxy(factory, [])) as NamespaceRegistry

  return contract
}
