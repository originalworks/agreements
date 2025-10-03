import { AgreementRelationsRegistry__factory } from '../../typechain';
import { SignerOrWallet } from '../types';

export async function deployAgreementRelationsRegistry(
  deployer: SignerOrWallet,
) {
  const factory = new AgreementRelationsRegistry__factory(deployer);
  const agreementRelationsRegistry = await factory.deploy();
  return agreementRelationsRegistry;
}
