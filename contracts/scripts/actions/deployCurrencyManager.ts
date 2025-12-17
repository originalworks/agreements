import { ethers, upgrades } from 'hardhat';
import { CurrencyManager } from '../../typechain';

export async function deployCurrencyManager(
  splitCurrencies: string[],
): Promise<CurrencyManager> {
  const CurrencyManager = await ethers.getContractFactory('CurrencyManager');

  const currencyManager = (await upgrades.deployProxy(
    CurrencyManager,
    [splitCurrencies],
    { kind: 'uups' },
  )) as CurrencyManager;

  await currencyManager.waitForDeployment();
  return currencyManager;
}
