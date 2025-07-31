import { SplitCurrencies } from '@original-works/original-works-nest-service'
import { BigNumber, Wallet, providers } from 'ethers'
import {
  AgreementERC1155,
  AgreementERC20,
  AgreementFactory,
  AgreementRelationsRegistry,
  FallbackVault,
  FeeManager,
  NamespaceRegistry,
  SplitCurrencyListManager,
} from '../typechain'
import { IHolder } from '../typechain/contracts/agreements/AgreementFactory'

export interface AgreementsFixtureOptions {
  creationFee?: BigNumber
  paymentFee?: BigNumber
}

export interface AgreementsBlockchainFixture {
  agreementFactory: AgreementFactory
  splitCurrencyListManager: SplitCurrencyListManager
  fallbackVault: FallbackVault
  agreementRelationsRegistry: AgreementRelationsRegistry
  agreementERC1155Implementation: AgreementERC1155
  agreementERC20Implementation: AgreementERC20
  feeManager: FeeManager
  splitCurrencies: SplitCurrencies
  deployer: Wallet
  testWallets: Wallet[]
  provider: providers.JsonRpcProvider
  namespaceRegistry: NamespaceRegistry
}

export interface TestAgreementHolder extends IHolder.HolderStruct {
  wallet: Wallet
}
