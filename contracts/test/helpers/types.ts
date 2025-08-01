import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, BigNumberish, Signer } from 'ethers';
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

export interface InitialSetupOptions {
  paymentFee?: BigNumber;
  creationFee?: BigNumber;
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

export interface Holder {
  account: string;
  balance: string;
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
  shares?: BigNumberish[];
  partialRevenueStreamURIs?: string[];
  holders?: HolderWithWallet[];
  dataHash?: string;
  txExecutorWallet?: Signer;
}
