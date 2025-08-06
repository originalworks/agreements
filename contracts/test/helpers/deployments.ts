import { ethers } from 'hardhat';
import { AgreementERC20, AgreementERC1155 } from '../../typechain';
import { deploySplitCurrencyListManager } from '../../scripts/actions/deploySplitCurrencyListManager';
import { deployFallbackVault } from '../../scripts/actions/deployFallbackVault';
import { deployAgreementRelationsRegistry } from '../../scripts/actions/deployAgreementRelationsRegistry';
import { deployAgreementFactory } from '../../scripts/actions/deployAgreementFactory';
import { deployAgreementERC1155Implementation } from '../../scripts/actions/deployAgreementERC1155Implementation';
import { deployAgreementERC20Implementation } from '../../scripts/actions/deployAgreementERC20Implementation';
import { deploySplitCurrencies } from '../../scripts/actions/deploySplitCurrencies';
import { deployFeeManager } from '../../scripts/actions/deployFeeManager';
import { deployNamespaceRegistry } from '../../scripts/actions/deployNamespaceRegistry';
import { buildHolders, getEvent } from './utils';
import {
  AgreementDeploymentData,
  DeployAgreementInput,
  InitialSetup,
  InitialSetupOptions,
} from './types';
import {
  LENDING_TOKEN_NAME,
  splitCurrencyDefinitions,
} from './splitCurrenciesDefinitions';
import { parseEther } from 'ethers';

export async function deployInitialSetup(
  options?: InitialSetupOptions,
): Promise<InitialSetup> {
  const accounts = await ethers.getSigners();
  const lender = accounts[9];
  const defaultHolders = [accounts[1], accounts[2], accounts[3], accounts[4]];

  const namespaceRegistry = await deployNamespaceRegistry();

  const splitCurrencies = await deploySplitCurrencies(splitCurrencyDefinitions);

  const lendingToken = splitCurrencies.find(
    (currency) => currency.name === LENDING_TOKEN_NAME,
  );

  const nonLendingERC20SplitCurrencies = splitCurrencies.reduce<string[]>(
    (all, current) => {
      if (!current.lendingCurrency && !current.nativeCoin) {
        all.push(current.address);
      }
      return all;
    },
    [],
  );

  if (!lendingToken || lendingToken.contract === undefined) {
    throw new Error('Lending Token deployment failed');
  }

  const feeManager = await deployFeeManager(
    options?.creationFee || parseEther('0.01'),
    options?.paymentFee || parseEther('0.02'),
  );

  const { agreementERC20Implementation, AgreementERC20Factory } =
    await deployAgreementERC20Implementation();

  const { agreementERC1155Implementation, AgreementERC1155Factory } =
    await deployAgreementERC1155Implementation();

  const agreementRelationsRegistry = await deployAgreementRelationsRegistry();

  const fallbackVault = await deployFallbackVault();

  const splitCurrencyListManager = await deploySplitCurrencyListManager(
    nonLendingERC20SplitCurrencies,
    lendingToken.address,
  );

  const agreementFactory = await deployAgreementFactory({
    agreementERC20Implementation:
      await agreementERC20Implementation.getAddress(),
    agreementERC1155Implementation:
      await agreementERC1155Implementation.getAddress(),
    feeManager: await feeManager.getAddress(),
    agreementRelationsRegistry: await agreementRelationsRegistry.getAddress(),
    splitCurrencyListManager: await splitCurrencyListManager.getAddress(),
    fallbackVault: await fallbackVault.getAddress(),
    namespaceRegistry: await namespaceRegistry.getAddress(),
  });

  return {
    feeManager,
    agreementFactory,
    lendingToken: lendingToken.contract,
    AgreementERC20Factory,
    AgreementERC1155Factory,
    agreementERC20Implementation,
    agreementERC1155Implementation,
    lender,
    defaultHolders,
    deployer: accounts[0],
    agreementRelationsRegistry,
    splitCurrencyListManager,
    fallbackVault,
    splitCurrencies,
    namespaceRegistry,
  };
}

export async function deployAgreementERC20(
  input: DeployAgreementInput,
): Promise<AgreementDeploymentData<AgreementERC20>> {
  const [deployer] = await ethers.getSigners();
  const dataHash = input.dataHash || `0x${'ab'.repeat(32)}`;
  const holders = buildHolders(
    input.initialSetup.defaultHolders,
    input.shares,
    input.holders,
  );
  const { _creationFee } = await input.initialSetup.feeManager.getFees();
  const tx = input.initialSetup.agreementFactory
    .connect(input.txExecutorWallet || deployer)
    .createERC20(
      dataHash,
      holders,
      input.partialRevenueStreamURIs || ['ABC123'],
      {
        value: _creationFee,
      },
    );
  const event = await getEvent(
    tx,
    input.initialSetup.agreementFactory,
    'AgreementCreated',
  );
  const agreementAddress = event.args[0];
  const agreement = input.initialSetup.AgreementERC20Factory.attach(
    agreementAddress,
  ) as AgreementERC20;
  return { agreement, holders, dataHash };
}

export async function deployAgreementERC1155(
  input: DeployAgreementInput,
): Promise<AgreementDeploymentData<AgreementERC1155>> {
  const [deployer] = await ethers.getSigners();
  const dataHash = input.dataHash || `0x${'ab'.repeat(32)}`;
  const contractUri = 'contractUri';
  const holders = buildHolders(
    input.initialSetup.defaultHolders,
    input.shares,
    input.holders,
  );
  const { _creationFee } = await input.initialSetup.feeManager.getFees();
  const tx = input.initialSetup.agreementFactory
    .connect(input.txExecutorWallet || deployer)
    .createERC1155(
      dataHash,
      holders,
      contractUri,
      input.partialRevenueStreamURIs || ['REVELATOR:ABC123'],
      { value: _creationFee },
    );
  const event = await getEvent(
    tx,
    input.initialSetup.agreementFactory,
    'AgreementCreated',
  );
  const agreementAddress = event.args[0];
  const agreement = input.initialSetup.AgreementERC1155Factory.attach(
    agreementAddress,
  ) as AgreementERC1155;
  return { agreement, holders, dataHash, contractUri };
}
