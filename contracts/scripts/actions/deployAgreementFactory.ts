import { ethers, upgrades } from 'hardhat';
import { AgreementFactory } from '../../typechain';
import { AgreementFactoryDeploymentInput } from '../types';

export async function deployAgreementFactory(
  input: AgreementFactoryDeploymentInput,
) {
  const AgreementFactory = await ethers.getContractFactory('AgreementFactory');
  const agreementFactory = (await upgrades.deployProxy(
    AgreementFactory,
    [
      input.agreementERC20Implementation,
      input.agreementERC1155Implementation,
      input.feeManager,
      input.agreementRelationsRegistry,
      input.splitCurrencyListManager,
      input.fallbackVault,
      input.namespaceRegistry,
    ],
    { kind: 'uups' },
  )) as AgreementFactory;

  await agreementFactory.waitForDeployment();

  return agreementFactory;
}
