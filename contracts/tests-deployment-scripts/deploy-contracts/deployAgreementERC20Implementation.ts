import { AgreementERC20__factory } from '../../typechain';
import { SignerOrWallet } from '../types';

export async function deployAgreementERC20Implementation(
  deployer: SignerOrWallet,
) {
  const factory = new AgreementERC20__factory(deployer);

  const agreementERC20Implementation = await factory.deploy();

  return agreementERC20Implementation;
}
