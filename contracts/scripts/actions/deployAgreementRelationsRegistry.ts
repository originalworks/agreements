import { ethers, upgrades } from 'hardhat';
import { AgreementRelationsRegistry } from '../../typechain';

export async function deployAgreementRelationsRegistry(): Promise<AgreementRelationsRegistry> {
  const AgreementRelationsRegistry = await ethers.getContractFactory(
    'AgreementRelationsRegistry',
  );
  const agreementRelationsRegistry = (await upgrades.deployProxy(
    AgreementRelationsRegistry,
    [],
    { kind: 'uups' },
  )) as AgreementRelationsRegistry;
  await agreementRelationsRegistry.waitForDeployment();

  return agreementRelationsRegistry;
}
