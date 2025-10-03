import { ethers, parseUnits, Signer } from 'ethers';
import { ERC20TokenMock__factory } from '../../typechain';

import {
  NativeCryptoTicker,
  SignerOrWallet,
  SplitCurrency,
  TokenCryptoTicker,
} from '../types';
import { deployProxy } from '@royalty-loans/contracts-shared';

export async function deploySplitCurrencies(deployer: SignerOrWallet) {
  const ERC20Factory = new ERC20TokenMock__factory(deployer);

  const lendingToken = await deployToken('USDC mock', 'USDC', 6n, ERC20Factory);
  const tokenA = await deployToken('TOKEN A mock', 'DAI', 18n, ERC20Factory);
  const tokenB = await deployToken('TOKEN B mock', 'USDT', 12n, ERC20Factory);
  const nativeCoin: SplitCurrency<NativeCryptoTicker> = {
    symbol: 'ETH',
    decimals: 18n,
    address: ethers.ZeroAddress,
  };

  return { lendingToken, otherCurrencies: [tokenA, tokenB], nativeCoin };
}

async function deployToken(
  name: string,
  symbol: TokenCryptoTicker,
  decimals: bigint,
  factory: ERC20TokenMock__factory,
) {
  const contract = await deployProxy(factory, [name, symbol, decimals]);
  await (
    await contract.mintTo(
      await (contract.runner as Signer).getAddress(),
      parseUnits('10000', decimals),
    )
  ).wait();

  return {
    symbol,
    decimals,
    address: (await contract.getAddress()).toLowerCase(),
  };
}
