import { AgreementERC1155__factory } from '../../typechain';
import { SignerOrWallet } from '../types';

export async function deployAgreementERC1155Implementation(
  deployer: SignerOrWallet,
) {
  const factory = new AgreementERC1155__factory(deployer);

  const agreementERC1155Implementation = await factory.deploy();

  return agreementERC1155Implementation;
}
