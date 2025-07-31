import { ethers } from 'hardhat'
import { AgreementERC1155, AgreementERC1155__factory } from '../../typechain'

export async function deployAgreementERC1155Implementation(): Promise<{
  agreementERC1155Implementation: AgreementERC1155
  AgreementERC1155Factory: AgreementERC1155__factory
}> {
  const AgreementERC1155Factory = await ethers.getContractFactory(
    'AgreementERC1155',
  )
  const agreementERC1155Implementation = await AgreementERC1155Factory.deploy()
  await agreementERC1155Implementation.deployed()
  return { agreementERC1155Implementation, AgreementERC1155Factory }
}
