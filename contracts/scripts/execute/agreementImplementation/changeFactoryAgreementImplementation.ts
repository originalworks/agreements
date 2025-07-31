import { TokenStandard } from '@original-works/original-works-nest-service'
import { ethers } from 'hardhat'

const AGREEMENT_FACTORY_ADDRESS = '0x0'
const AGREEEMENT_ERC1155_IMPLEMENTATION_ADDRESS = '0x0'
const AGREEEMENT_ERC20_IMPLEMENTATION_ADDRESS = '0x0'

async function main() {
  const AgreementFactory = await ethers.getContractFactory('AgreementFactory')
  const agreementFactory = AgreementFactory.attach(AGREEMENT_FACTORY_ADDRESS)

  console.log('setting new ERC1155 implementation...')

  await (
    await agreementFactory.setAgreementImplementation(
      AGREEEMENT_ERC1155_IMPLEMENTATION_ADDRESS,
      TokenStandard.ERC1155,
    )
  ).wait()

  console.log('setting new ERC20 implementation...')
  await (
    await agreementFactory.setAgreementImplementation(
      AGREEEMENT_ERC20_IMPLEMENTATION_ADDRESS,
      TokenStandard.ERC20,
    )
  ).wait()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
