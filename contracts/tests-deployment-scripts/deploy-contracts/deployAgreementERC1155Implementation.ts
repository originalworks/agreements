import { Wallet } from 'ethers'
import { AgreementERC1155__factory } from '../../typechain'

export async function deployAgreementERC1155Implementation(deployer: Wallet) {
  const factory = new AgreementERC1155__factory(deployer)

  const agreementERC1155Implementation = await factory.deploy()

  return agreementERC1155Implementation
}
