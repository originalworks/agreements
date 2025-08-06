import { Wallet } from 'ethers';
import { AgreementRelationsRegistry__factory } from '../../typechain';

export async function deployAgreementRelationsRegistry(deployer: Wallet) {
  const factory = new AgreementRelationsRegistry__factory(deployer);
  const agreementRelationsRegistry = await factory.deploy();
  return agreementRelationsRegistry;
}
