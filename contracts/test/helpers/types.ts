import { BigNumberish, Signer } from 'ethers';
import { SplitCurrency } from '../../scripts/types';
import {
  AgreementERC1155,
  AgreementERC1155__factory,
  AgreementERC20,
  AgreementERC20__factory,
  AgreementFactory,
  AgreementRelationsRegistry,
  ERC20TokenMock,
  FallbackVault,
  FeeManager,
  NamespaceRegistry,
  SplitCurrencyListManager,
} from '../../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

export interface InitialSetupOptions {
  paymentFee?: bigint;
  creationFee?: bigint;
}

export interface InitialSetup {
  feeManager: FeeManager;
  agreementFactory: AgreementFactory;
  lendingToken: ERC20TokenMock;
  AgreementERC20Factory: AgreementERC20__factory;
  AgreementERC1155Factory: AgreementERC1155__factory;
  agreementERC20Implementation: AgreementERC20;
  agreementERC1155Implementation: AgreementERC1155;
  agreementRelationsRegistry: AgreementRelationsRegistry;
  lender: SignerWithAddress;
  defaultHolders: SignerWithAddress[];
  deployer: SignerWithAddress;
  splitCurrencies: SplitCurrency[];
  splitCurrencyListManager: SplitCurrencyListManager;
  fallbackVault: FallbackVault;
  namespaceRegistry: NamespaceRegistry;
}

export enum TokenStandard {
  ERC20 = 0,
  ERC1155 = 1,
}

export interface Holder {
  account: string;
  balance: bigint;
  isAdmin: boolean;
}

export interface HolderWithWallet extends Holder {
  wallet: SignerWithAddress;
}

export interface AgreementDeploymentData<
  T extends AgreementERC20 | AgreementERC1155,
> {
  agreement: T;
  holders: HolderWithWallet[];
  dataHash: string;
  contractUri?: string;
}

export interface DeployAgreementInput {
  initialSetup: InitialSetup;
  shares?: bigint[];
  partialRevenueStreamURIs?: string[];
  holders?: HolderWithWallet[];
  dataHash?: string;
  txExecutorWallet?: Signer;
}

export type NativeCryptoTicker = 'ETH' | 'BNB' | 'MATIC' | 'SBY';
export type TokenCryptoTicker = 'USDC' | 'BUSD' | 'DAI' | 'USDT';
