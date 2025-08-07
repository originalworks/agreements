import { Wallet } from 'ethers';
import {
  SplitCurrencyListManager,
  SplitCurrencyListManager__factory,
} from '../../typechain';
import { deployProxy } from '@royalty-loans/contracts-shared';

export async function deploySplitCurrencyListManager(
  deployer: Wallet,
  nonLendingERC20SplitCurrencies: string[],
  lendingCurrency: string,
) {
  const factory = new SplitCurrencyListManager__factory(deployer);

  const splitCurrencyListManager = (await deployProxy(factory, [
    nonLendingERC20SplitCurrencies,
    lendingCurrency,
  ])) as SplitCurrencyListManager;

  return splitCurrencyListManager;
}
