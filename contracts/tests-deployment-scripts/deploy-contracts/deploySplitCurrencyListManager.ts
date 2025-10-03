import {
  SplitCurrencyListManager,
  SplitCurrencyListManager__factory,
} from '../../typechain';
import { deployProxy } from '@royalty-loans/contracts-shared';
import { SignerOrWallet } from '../types';

export async function deploySplitCurrencyListManager(
  deployer: SignerOrWallet,
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
