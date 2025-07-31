import { utils } from 'ethers'
import { ethers } from 'hardhat'
import { deployFallbackVault } from '../../actions/deployFallbackVault'
import { deployAgreementERC20Implementation } from '../../actions/deployAgreementERC20Implementation'
import { deployAgreementERC1155Implementation } from '../../actions/deployAgreementERC1155Implementation'
import { deployAgreementRelationsRegistry } from '../../actions/deployAgreementRelationsRegistry'
import { deployFeeManager } from '../../actions/deployFeeManager'
import { deployAgreementFactory } from '../../actions/deployAgreementFactory'
import { deployNamespaceRegistry } from '../../actions/deployNamespaceRegistry'
import { deploySplitCurrencyListManager } from '../../actions/deploySplitCurrencyListManager'
import { prepareSplitCurrencies, saveDeploymentData } from './helpers'

// IMPORTANT!
// populate ./constant.ts file before using this script !!!

const CREATION_FEE = utils.parseEther('0')
const PAYMENT_FEE = utils.parseEther('0.01')

const DEPLOY_NEW_CURRENCIES =
  process.env.CURRENCIES_SOURCE === 'predefined' ? false : true

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('deploying namespaceRegistry')
  const namespaceRegistry = await deployNamespaceRegistry()
  console.log('namespaceRegistry:', namespaceRegistry.address)

  console.log('preparing split currencies list...')
  const { splitCurrencies, nonLendingERC20SplitCurrencies, lendingToken } =
    await prepareSplitCurrencies(DEPLOY_NEW_CURRENCIES)

  console.log('deploying FeeManager...')
  const feeManager = await deployFeeManager(CREATION_FEE, PAYMENT_FEE)
  console.log('feeManager:', feeManager.address)

  console.log('deploying AgreementERC20 implementation...')
  const { agreementERC20Implementation } =
    await deployAgreementERC20Implementation()
  console.log(
    'agreementERC20Implementation:',
    agreementERC20Implementation.address,
  )

  console.log('deploying AgreementERC1155 implementation...')
  const { agreementERC1155Implementation } =
    await deployAgreementERC1155Implementation()
  console.log(
    'agreementERC1155Implementation:',
    agreementERC1155Implementation.address,
  )

  console.log('deploying AgreementRelationsRegistry...')
  const agreementRelationsRegistry = await deployAgreementRelationsRegistry()
  console.log('agreementRelationsRegistry:', agreementRelationsRegistry.address)

  console.log('deploying FallbackVault...')
  const fallbackVault = await deployFallbackVault()
  console.log('fallbackVault:', fallbackVault.address)

  console.log('deploying SplitCurrencyListManager...')
  const splitCurrencyListManager = await deploySplitCurrencyListManager(
    nonLendingERC20SplitCurrencies,
    lendingToken.address,
  )
  console.log('splitCurrencyListManager:', splitCurrencyListManager.address)

  console.log('deploying AgreementFactory...')
  const agreementFactory = await deployAgreementFactory({
    agreementERC20Implementation: agreementERC20Implementation.address,
    agreementERC1155Implementation: agreementERC1155Implementation.address,
    feeManager: feeManager.address,
    agreementRelationsRegistry: agreementRelationsRegistry.address,
    splitCurrencyListManager: splitCurrencyListManager.address,
    fallbackVault: fallbackVault.address,
    namespaceRegistry: namespaceRegistry.address,
  })
  console.log('agreementFactory:', agreementFactory.address)

  console.log('saving deployment data into /deployments')
  await saveDeploymentData({
    deployer: deployer.address,
    agreementERC20Implementation: agreementERC20Implementation.address,
    agreementERC1155Implementation: agreementERC1155Implementation.address,
    agreementRelationsRegistry: agreementRelationsRegistry.address,
    fallbackVault: fallbackVault.address,
    splitCurrencyListManager: splitCurrencyListManager.address,
    feeManager: feeManager.address,
    agreementFactory: agreementFactory.address,
    namespaceRegistry: namespaceRegistry.address,
    splitCurrencies,
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
