import { deployFallbackVault } from '../../actions/deployFallbackVault';
import { deployAgreementERC20Implementation } from '../../actions/deployAgreementERC20Implementation';
import { deployAgreementERC1155Implementation } from '../../actions/deployAgreementERC1155Implementation';
import { deployAgreementRelationsRegistry } from '../../actions/deployAgreementRelationsRegistry';
import { deployFeeManager } from '../../actions/deployFeeManager';
import { deployAgreementFactory } from '../../actions/deployAgreementFactory';
import { deployNamespaceRegistry } from '../../actions/deployNamespaceRegistry';
import { deployCurrencyManager } from '../../actions/deployCurrencyManager';
import { prepareSplitCurrencies } from './helpers';
import { parseEther } from 'ethers';
import fs from 'fs';

const CREATION_FEE = parseEther('0');
const RELAYER_FEE = parseEther('0');
const PAYMENT_FEE = parseEther('0.01');
const DEPLOYMENT_FILE_PATH = './e2e-test-contracts.json';

const DEPLOY_NEW_CURRENCIES = true;

interface DeploymentFileForOwardTests {
  agreementFactoryAddress: string;
  feeManagerAddress: string;
}

async function main() {
  const namespaceRegistry = await deployNamespaceRegistry();
  const splitCurrencies = await prepareSplitCurrencies(DEPLOY_NEW_CURRENCIES);
  const feeManager = await deployFeeManager(
    CREATION_FEE,
    RELAYER_FEE,
    PAYMENT_FEE,
  );

  const { agreementERC20Implementation } =
    await deployAgreementERC20Implementation();

  const { agreementERC1155Implementation } =
    await deployAgreementERC1155Implementation();

  const agreementRelationsRegistry = await deployAgreementRelationsRegistry();

  const fallbackVault = await deployFallbackVault();

  const currencyManager = await deployCurrencyManager(
    splitCurrencies.map((currency) => currency.address),
  );

  const agreementFactory = await deployAgreementFactory({
    agreementERC20Implementation:
      await agreementERC20Implementation.getAddress(),
    agreementERC1155Implementation:
      await agreementERC1155Implementation.getAddress(),
    feeManager: await feeManager.getAddress(),
    agreementRelationsRegistry: await agreementRelationsRegistry.getAddress(),
    currencyManager: await currencyManager.getAddress(),
    fallbackVault: await fallbackVault.getAddress(),
    namespaceRegistry: await namespaceRegistry.getAddress(),
  });

  const tx = await agreementRelationsRegistry.setAgreementFactoryAddress(
    await agreementFactory.getAddress(),
  );
  await tx.wait();
  const deployment: DeploymentFileForOwardTests = {
    agreementFactoryAddress: await agreementFactory.getAddress(),
    feeManagerAddress: await feeManager.getAddress(),
  };

  fs.writeFileSync(DEPLOYMENT_FILE_PATH, JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
