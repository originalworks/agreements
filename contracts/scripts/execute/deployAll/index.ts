import { ethers } from 'hardhat';
import { deployFallbackVault } from '../../actions/deployFallbackVault';
import { deployAgreementERC20Implementation } from '../../actions/deployAgreementERC20Implementation';
import { deployAgreementERC1155Implementation } from '../../actions/deployAgreementERC1155Implementation';
import { deployAgreementRelationsRegistry } from '../../actions/deployAgreementRelationsRegistry';
import { deployFeeManager } from '../../actions/deployFeeManager';
import { deployAgreementFactory } from '../../actions/deployAgreementFactory';
import { deployNamespaceRegistry } from '../../actions/deployNamespaceRegistry';
import { deploySplitCurrencyListManager } from '../../actions/deploySplitCurrencyListManager';
import { prepareSplitCurrencies, saveDeploymentData } from './helpers';
import { parseEther } from 'ethers';

// IMPORTANT!
// populate ./constant.ts file before using this script !!!

const CREATION_FEE = parseEther('0');
const PAYMENT_FEE = parseEther('0.01');

const DEPLOY_NEW_CURRENCIES =
  process.env.CURRENCIES_SOURCE === 'predefined' ? false : true;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('deploying namespaceRegistry');
  const namespaceRegistry = await deployNamespaceRegistry();
  console.log('namespaceRegistry:', await namespaceRegistry.getAddress());

  console.log('preparing split currencies list...');
  const { splitCurrencies, nonLendingERC20SplitCurrencies, lendingToken } =
    await prepareSplitCurrencies(DEPLOY_NEW_CURRENCIES);

  console.log('deploying FeeManager...');
  const feeManager = await deployFeeManager(CREATION_FEE, PAYMENT_FEE);
  console.log('feeManager:', await feeManager.getAddress());

  console.log('deploying AgreementERC20 implementation...');
  const { agreementERC20Implementation } =
    await deployAgreementERC20Implementation();
  console.log(
    'agreementERC20Implementation:',
    await agreementERC20Implementation.getAddress(),
  );

  console.log('deploying AgreementERC1155 implementation...');
  const { agreementERC1155Implementation } =
    await deployAgreementERC1155Implementation();
  console.log(
    'agreementERC1155Implementation:',
    await agreementERC1155Implementation.getAddress(),
  );

  console.log('deploying AgreementRelationsRegistry...');
  const agreementRelationsRegistry = await deployAgreementRelationsRegistry();
  console.log(
    'agreementRelationsRegistry:',
    await agreementRelationsRegistry.getAddress(),
  );

  console.log('deploying FallbackVault...');
  const fallbackVault = await deployFallbackVault();
  console.log('fallbackVault:', await fallbackVault.getAddress());

  console.log('deploying SplitCurrencyListManager...');
  const splitCurrencyListManager = await deploySplitCurrencyListManager(
    nonLendingERC20SplitCurrencies,
    lendingToken.address,
  );
  console.log(
    'splitCurrencyListManager:',
    await splitCurrencyListManager.getAddress(),
  );

  console.log('deploying AgreementFactory...');
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
  console.log('agreementFactory:', await agreementFactory.getAddress());

  console.log('saving deployment data into /deployments');
  await saveDeploymentData({
    deployer: deployer.address,
    agreementERC20Implementation:
      await agreementERC20Implementation.getAddress(),
    agreementERC1155Implementation:
      await agreementERC1155Implementation.getAddress(),
    agreementRelationsRegistry: await agreementRelationsRegistry.getAddress(),
    fallbackVault: await fallbackVault.getAddress(),
    splitCurrencyListManager: await splitCurrencyListManager.getAddress(),
    feeManager: await feeManager.getAddress(),
    agreementFactory: await agreementFactory.getAddress(),
    namespaceRegistry: await namespaceRegistry.getAddress(),
    splitCurrencies,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
