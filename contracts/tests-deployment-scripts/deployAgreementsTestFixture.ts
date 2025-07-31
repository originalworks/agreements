import { Wallet, utils, providers } from 'ethers'
import { AgreementsBlockchainFixture, AgreementsFixtureOptions } from './types'
import { deployNamespaceRegistry } from './deploy-contracts/deployNamespaceRegistry'
import { deploySplitCurrencies } from './deploy-contracts/deploySplitCurrencies'
import { deployFeeManager } from './deploy-contracts/deployFeeManager'
import { deployAgreementERC20Implementation } from './deploy-contracts/deployAgreementERC20Implementation'
import { deployAgreementERC1155Implementation } from './deploy-contracts/deployAgreementERC1155Implementation'
import { deployAgreementRelationsRegistry } from './deploy-contracts/deployAgreementRelationsRegistry'
import { deployFallbackVault } from './deploy-contracts/deployFallbackVault'
import { deploySplitCurrencyListManager } from './deploy-contracts/deploySplitCurrencyListManager'
import { deployAgreementFactory } from './deploy-contracts/deployAgreementFactory'

export async function deployAgreementsTestFixture(
  wallets: Wallet[],
  provider: providers.JsonRpcProvider,
  options?: AgreementsFixtureOptions,
) {
  const CREATION_FEE = options?.creationFee || utils.parseEther('0.001')
  const PAYMENT_FEE = options?.paymentFee || utils.parseEther('0.01')
  const [deployer, ...testWallets] = wallets

  const namespaceRegistry = await deployNamespaceRegistry(deployer)

  const splitCurrencies = await deploySplitCurrencies(deployer)

  const feeManager = await deployFeeManager(deployer, CREATION_FEE, PAYMENT_FEE)

  const agreementERC20Implementation = await deployAgreementERC20Implementation(
    deployer,
  )

  const agreementERC1155Implementation =
    await deployAgreementERC1155Implementation(deployer)

  const agreementRelationsRegistry = await deployAgreementRelationsRegistry(
    deployer,
  )

  const fallbackVault = await deployFallbackVault(deployer)

  const splitCurrencyListManager = await deploySplitCurrencyListManager(
    deployer,
    splitCurrencies.otherCurrencies.map((c) => c.address),
    splitCurrencies.lendingToken.address,
  )

  const agreementFactory = await deployAgreementFactory(deployer, {
    agreementERC1155Implementation: agreementERC1155Implementation.address,
    agreementERC20Implementation: agreementERC20Implementation.address,
    feeManager: feeManager.address,
    agreementRelationsRegistry: agreementRelationsRegistry.address,
    splitCurrencyListManager: splitCurrencyListManager.address,
    fallbackVault: fallbackVault.address,
    namespaceRegistry: namespaceRegistry.address,
  })

  const fixture: AgreementsBlockchainFixture = {
    agreementFactory,
    splitCurrencyListManager,
    fallbackVault,
    agreementRelationsRegistry,
    agreementERC1155Implementation,
    agreementERC20Implementation,
    feeManager,
    splitCurrencies,
    deployer,
    testWallets,
    provider,
    namespaceRegistry,
  }

  return fixture
}
