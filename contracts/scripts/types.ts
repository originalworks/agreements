import { ERC20TokenMock } from '../typechain';

export interface SplitCurrencyDefinition {
  name: string;
  symbol: string;
  decimals: bigint;
  nativeCoin: boolean;
}

export interface SplitCurrency extends SplitCurrencyDefinition {
  address: string;
  contract?: ERC20TokenMock;
}

export interface AgreementFactoryDeploymentInput {
  agreementERC20Implementation: string;
  agreementERC1155Implementation: string;
  feeManager: string;
  agreementRelationsRegistry: string;
  currencyManager: string;
  fallbackVault: string;
  namespaceRegistry: string;
}

export interface DeploymentOutput {
  deployer: string;
  agreementERC20Implementation: string;
  agreementERC1155Implementation: string;
  agreementRelationsRegistry: string;
  fallbackVault: string;
  currencyManager: string;
  feeManager: string;
  agreementFactory: string;
  namespaceRegistry: string;
  splitCurrencies: SplitCurrency[];
}
