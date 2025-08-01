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
    decimals: 6,
    lendingCurrency: true,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Avalanche Token',
    symbol: 'AVAX',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'BUSD Token',
    symbol: 'BUSD',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    decimals: 8,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'Cosmos',
    symbol: 'ATOM',
    decimals: 6,
    lendingCurrency: false,
    nativeCoin: false,
    address: '',
  },
  {
    name: 'native coin',
    symbol: 'ETH',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: true,
    address: ethers.ZeroAddress,
  },
];

export const SPLIT_CURRENCIES_DEFINITIONS: SplitCurrencyDefinition[] = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    lendingCurrency: true,
    nativeCoin: false,
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'Avalanche Token',
    symbol: 'AVAX',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'BUSD Token',
    symbol: 'BUSD',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    decimals: 8,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'Cosmos',
    symbol: 'ATOM',
    decimals: 6,
    lendingCurrency: false,
    nativeCoin: false,
  },
  {
    name: 'native coin',
    symbol: 'ETH',
    decimals: 18,
    lendingCurrency: false,
    nativeCoin: true,
  },
];
