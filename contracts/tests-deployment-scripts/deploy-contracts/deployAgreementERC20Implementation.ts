import { Wallet } from 'ethers';
import { AgreementERC20__factory } from '../../typechain';

export async function deployAgreementERC20Implementation(deployer: Wallet) {
  const factory = new AgreementERC20__factory(deployer);

  const agreementERC20Implementation = await factory.deploy();

  return agreementERC20Implementation;
}
