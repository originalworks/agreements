import { ethers } from 'hardhat';
import { SplitCurrency, SplitCurrencyDefinition } from '../../types';

// edit this file before using 'scripts/execute/deployAll/index.ts'!

// DEPLOYING TO PRODUCTION:
// Add data about existing tokens to PREDEFINED_SPLIT_CURRENCIES.

// DEPLOYING TO DEV/STAGE:
// Add data to SPLIT_CURRENCIES_DEFINITIONS - deployment will
// create new fake tokens according to this object content.

export const PREDEFINED_SPLIT_CURRENCIES: SplitCurrency[] = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: BigInt(6),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    decimals: BigInt(6),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: BigInt(18),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: BigInt(18),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Avalanche Token',
    symbol: 'AVAX',
    decimals: BigInt(18),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'BUSD Token',
    symbol: 'BUSD',
    decimals: BigInt(18),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    decimals: BigInt(8),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Cosmos',
    symbol: 'ATOM',
    decimals: BigInt(6),
    nativeCoin: false,
    address: '',
  },
  {
    name: 'native coin',
    symbol: 'ETH',
    decimals: BigInt(18),
    nativeCoin: true,
    address: ethers.ZeroAddress,
  },
];

export const SPLIT_CURRENCIES_DEFINITIONS: SplitCurrencyDefinition[] = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: BigInt(6),
    nativeCoin: false,
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    decimals: BigInt(6),
    nativeCoin: false,
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: BigInt(18),
    nativeCoin: false,
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: BigInt(18),
    nativeCoin: false,
  },
  {
    name: 'Avalanche Token',
    symbol: 'AVAX',
    decimals: BigInt(18),
    nativeCoin: false,
  },
  {
    name: 'BUSD Token',
    symbol: 'BUSD',
    decimals: BigInt(18),
    nativeCoin: false,
  },
  {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    decimals: BigInt(8),
    nativeCoin: false,
  },
  {
    name: 'Cosmos',
    symbol: 'ATOM',
    decimals: BigInt(6),
    nativeCoin: false,
  },
  {
    name: 'native coin',
    symbol: 'ETH',
    decimals: BigInt(18),
    nativeCoin: true,
  },
];
