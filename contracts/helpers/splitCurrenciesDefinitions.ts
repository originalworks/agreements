import { SplitCurrencyDefinition } from '../scripts/types';

export const splitCurrencyDefinitions: SplitCurrencyDefinition[] = [
  {
    name: 'TOKEN_A',
    symbol: 'USDC',
    decimals: 6n,
    nativeCoin: false,
  },
  {
    name: 'TOKEN_B',
    symbol: 'USDT',
    decimals: 18n,
    nativeCoin: false,
  },
  {
    name: 'TOKEN_C',
    symbol: 'DAI',
    decimals: 12n,
    nativeCoin: false,
  },
  {
    name: 'NATIVE_COIN',
    symbol: 'ETH',
    decimals: 18n,
    nativeCoin: true,
  },
];
