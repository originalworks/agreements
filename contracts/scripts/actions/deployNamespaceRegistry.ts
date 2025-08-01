import { ethers, upgrades } from 'hardhat';
import { NamespaceRegistry } from '../../typechain';

export async function deployNamespaceRegistry(): Promise<NamespaceRegistry> {
  const NamespaceRegistry =
    await ethers.getContractFactory('NamespaceRegistry');
  const namespaceRegistry = (await upgrades.deployProxy(NamespaceRegistry, [], {
    kind: 'uups',
  })) as NamespaceRegistry;

  await namespaceRegistry.waitForDeployment();

  return namespaceRegistry;
}
