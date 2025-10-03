import { AgreementFactory, AgreementFactory__factory } from '../../typechain';
import { deployProxy } from '@royalty-loans/contracts-shared';
import { SignerOrWallet } from '../types';

export interface AgreementFactoryDeploymentInput {
  agreementERC20Implementation: string;
  agreementERC1155Implementation: string;
  feeManager: string;
  agreementRelationsRegistry: string;
  splitCurrencyListManager: string;
  fallbackVault: string;
  namespaceRegistry: string;
}

export async function deployAgreementFactory(
  deployer: SignerOrWallet,
  input: AgreementFactoryDeploymentInput,
) {
  const factory = new AgreementFactory__factory(deployer);
  const agreementFactory = (await deployProxy(factory, [
    input.agreementERC20Implementation,
    input.agreementERC1155Implementation,
    input.feeManager,
    input.agreementRelationsRegistry,
    input.splitCurrencyListManager,
    input.fallbackVault,
    input.namespaceRegistry,
  ])) as AgreementFactory;

  return agreementFactory;
}
