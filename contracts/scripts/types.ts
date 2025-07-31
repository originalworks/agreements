import { ERC20TokenMock } from '../typechain'

export interface SplitCurrencyDefinition {
  name: string
  symbol: string
  decimals: number
  lendingCurrency: boolean
  nativeCoin: boolean
}

export interface SplitCurrency extends SplitCurrencyDefinition {
  address: string
  contract?: ERC20TokenMock
}

export interface AgreementFactoryDeploymentInput {
  agreementERC20Implementation: string
  agreementERC1155Implementation: string
  feeManager: string
  agreementRelationsRegistry: string
  splitCurrencyListManager: string
  fallbackVault: string
  namespaceRegistry: string
}

export interface DeploymentOutput {
  deployer: string
  agreementERC20Implementation: string
  agreementERC1155Implementation: string
  agreementRelationsRegistry: string
  fallbackVault: string
  splitCurrencyListManager: string
  feeManager: string
  agreementFactory: string
  namespaceRegistry: string
  splitCurrencies: SplitCurrency[]
}
