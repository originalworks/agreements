import { JsonRpcProvider, parseEther } from 'ethers';
import {
  AgreementsBlockchainFixture,
  AgreementsFixtureOptions,
  SignerOrWallet,
  TestAgreementHolder,
} from './types';
import { deployNamespaceRegistry } from './deploy-contracts/deployNamespaceRegistry';
import { deploySplitCurrencies } from './deploy-contracts/deploySplitCurrencies';
import { deployFeeManager } from './deploy-contracts/deployFeeManager';
import { deployAgreementERC20Implementation } from './deploy-contracts/deployAgreementERC20Implementation';
import { deployAgreementERC1155Implementation } from './deploy-contracts/deployAgreementERC1155Implementation';
import { deployAgreementRelationsRegistry } from './deploy-contracts/deployAgreementRelationsRegistry';
import { deployFallbackVault } from './deploy-contracts/deployFallbackVault';
import { deploySplitCurrencyListManager } from './deploy-contracts/deploySplitCurrencyListManager';
import { deployAgreementFactory } from './deploy-contracts/deployAgreementFactory';
import { AgreementERC1155, AgreementERC1155__factory } from '../typechain';
import { getEvent } from './utils';

export async function deployAgreementsTestFixture(
  deployer: SignerOrWallet,
  provider: JsonRpcProvider,
  options?: AgreementsFixtureOptions,
) {
  const CREATION_FEE = options?.creationFee ?? parseEther('0.001');
  const PAYMENT_FEE = options?.paymentFee ?? parseEther('0.01');

  const namespaceRegistry = await deployNamespaceRegistry(deployer);

  const splitCurrencies = await deploySplitCurrencies(deployer);

  const feeManager = await deployFeeManager(
    deployer,
    CREATION_FEE,
    PAYMENT_FEE,
  );

  const agreementERC20Implementation =
    await deployAgreementERC20Implementation(deployer);

  const agreementERC1155Implementation =
    await deployAgreementERC1155Implementation(deployer);

  const agreementRelationsRegistry =
    await deployAgreementRelationsRegistry(deployer);

  const fallbackVault = await deployFallbackVault(deployer);

  const splitCurrencyListManager = await deploySplitCurrencyListManager(
    deployer,
    splitCurrencies.otherCurrencies.map((c) => c.address),
    splitCurrencies.lendingToken.address,
  );

  const agreementFactory = await deployAgreementFactory(deployer, {
    agreementERC1155Implementation:
      await agreementERC1155Implementation.getAddress(),
    agreementERC20Implementation:
      await agreementERC20Implementation.getAddress(),
    feeManager: await feeManager.getAddress(),
    agreementRelationsRegistry: await agreementRelationsRegistry.getAddress(),
    splitCurrencyListManager: await splitCurrencyListManager.getAddress(),
    fallbackVault: await fallbackVault.getAddress(),
    namespaceRegistry: await namespaceRegistry.getAddress(),
  });

  const deployAgreementERC1155 = async (
    holders: Omit<TestAgreementHolder, 'wallet'>[],
  ) => {
    const dataHash = `0x${'ab'.repeat(32)}`;
    const contractUri = 'contractUri';
    const partialRevenueStreamURIs = ['REVELATOR:ABC123'];
    const tx = agreementFactory.createERC1155(
      dataHash,
      holders,
      contractUri,
      partialRevenueStreamURIs,
      { value: CREATION_FEE },
    );
    const event = await getEvent(tx, agreementFactory, 'AgreementCreated');
    const agreementAddress = event.args[0];
    const agreement = AgreementERC1155__factory.connect(
      agreementAddress,
    ) as AgreementERC1155;

    return agreement;
  };

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
    provider,
    namespaceRegistry,
    deployAgreementERC1155,
  };

  return fixture;
}
