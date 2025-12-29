import { Signer } from 'ethers';
import { SplitCurrency } from '../../scripts/types';
import {
  AgreementERC1155,
  AgreementERC1155__factory,
  AgreementERC20,
  AgreementERC20__factory,
  AgreementFactory,
  AgreementRelationsRegistry,
  FallbackVault,
  FeeManager,
  NamespaceRegistry,
  CurrencyManager,
} from '../../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

export interface InitialSetupOptions {
  paymentFee?: bigint;
  creationFee?: bigint;
}

export interface InitialSetup {
  feeManager: FeeManager;
  agreementFactory: AgreementFactory;
  AgreementERC20Factory: AgreementERC20__factory;
  AgreementERC1155Factory: AgreementERC1155__factory;
  agreementERC20Implementation: AgreementERC20;
  agreementERC1155Implementation: AgreementERC1155;
  agreementRelationsRegistry: AgreementRelationsRegistry;
  defaultHolders: SignerWithAddress[];
  deployer: SignerWithAddress;
  splitCurrencies: SplitCurrency[];
  currencyManager: CurrencyManager;
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
}

export interface DeployAgreementInput {
  initialSetup: InitialSetup;
  shares?: bigint[];
  unassignedRwaId?: string;
  holders?: HolderWithWallet[];
  txExecutorWallet?: Signer;
  tokenUri?: string;
  contractUri?: string;
}

export type NativeCryptoTicker = 'ETH' | 'BNB' | 'MATIC' | 'SBY';
export type TokenCryptoTicker = 'USDC' | 'BUSD' | 'DAI' | 'USDT';
