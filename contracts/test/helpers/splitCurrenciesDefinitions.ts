import { SplitCurrencyDefinition } from '../../scripts/types'

export const LENDING_TOKEN_NAME = 'LENDING_TOKEN'

export const splitCurrencyDefinitions: SplitCurrencyDefinition[] = [
  {
    name: LENDING_TOKEN_NAME,
    symbol: 'USDC',
    decimals: 6,
    lendingCurrency: true,
    nativeCoin: false,
  },
  {
    name: 'TOKEN_A',
    symbol: 'BUSD',
    decimals: 15,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'TOKEN_B',
    symbol: 'USDT',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'TOKEN_C',
    symbol: 'DAI',
    decimals: 12,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'NATIVE_COIN',
    symbol: 'ETH',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: true,
  },
]
