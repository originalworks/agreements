import { ethers, upgrades } from 'hardhat'
import { SplitCurrencyListManager } from '../../typechain'

export async function deploySplitCurrencyListManager(
  splitCurrencies: string[],
  lendingToken: string,
): Promise<SplitCurrencyListManager> {
  const SplitCurrencyListManager = await ethers.getContractFactory(
    'SplitCurrencyListManager',
  )

  const splitCurrencyListManager = (await upgrades.deployProxy(
    SplitCurrencyListManager,
    [splitCurrencies, lendingToken],
    { kind: 'uups' },
  )) as SplitCurrencyListManager

  await splitCurrencyListManager.deployed()
  return splitCurrencyListManager
}
