import { ethers } from 'hardhat';
import { AgreementRelationsRegistry } from '../../typechain';

export async function deployAgreementRelationsRegistry(): Promise<AgreementRelationsRegistry> {
  const AgreementRelationsRegistry = await ethers.getContractFactory(
    'AgreementRelationsRegistry',
  );
  const agreementRelationsRegistry = await AgreementRelationsRegistry.deploy();
  await agreementRelationsRegistry.waitForDeployment();
  return agreementRelationsRegistry;
}
