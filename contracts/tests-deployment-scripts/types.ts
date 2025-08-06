import { JsonRpcProvider, Wallet } from 'ethers';
import {
  AgreementERC1155,
  AgreementERC20,
  AgreementFactory,
  AgreementRelationsRegistry,
  FallbackVault,
  FeeManager,
  NamespaceRegistry,
  SplitCurrencyListManager,
} from '../typechain';
import { IHolder } from '../typechain/contracts/agreements/AgreementFactory';
import { NativeCryptoTicker, TokenCryptoTicker } from '../test/helpers/types';

export interface AgreementsFixtureOptions {
  creationFee?: bigint;
  paymentFee?: bigint;
}

export interface SplitCurrency<T> {
  symbol: T;
  decimals: bigint;
  address: string;
}

export interface SplitCurrencies {
  nativeCoin: SplitCurrency<NativeCryptoTicker>;
  lendingToken: SplitCurrency<TokenCryptoTicker>;
  otherCurrencies: SplitCurrency<TokenCryptoTicker>[];
}

export interface AgreementsBlockchainFixture {
  agreementFactory: AgreementFactory;
  splitCurrencyListManager: SplitCurrencyListManager;
  fallbackVault: FallbackVault;
  agreementRelationsRegistry: AgreementRelationsRegistry;
  agreementERC1155Implementation: AgreementERC1155;
  agreementERC20Implementation: AgreementERC20;
  feeManager: FeeManager;
  splitCurrencies: SplitCurrencies;
  deployer: Wallet;
  testWallets: Wallet[];
  provider: JsonRpcProvider;
  namespaceRegistry: NamespaceRegistry;
}

export interface TestAgreementHolder extends IHolder.HolderStruct {
  wallet: Wallet;
}
