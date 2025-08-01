import { ethers } from 'hardhat';
import { SplitCurrency, SplitCurrencyDefinition } from '../types';
import { deployERC20TokenMock } from './deployERC20TokenMock';

export async function deploySplitCurrencies(
  definitions: SplitCurrencyDefinition[],
): Promise<SplitCurrency[]> {
  const splitCurrencies: SplitCurrency[] = [];
  for (let i = 0; i < definitions.length; i++) {
    const { name, symbol, decimals, nativeCoin } = definitions[i];
    if (nativeCoin) {
      splitCurrencies.push({
        ...definitions[i],
        address: ethers.ZeroAddress,
      });
    } else {
      const contract = await deployERC20TokenMock(name, symbol, decimals);

      splitCurrencies.push({
        ...definitions[i],
        address: await contract.getAddress(),
        contract,
      });
    }
  }
  return splitCurrencies;
}
