import {
  NativeCryptoTicker,
  SplitCurrency,
  TokenCryptoTicker,
} from '@original-works/original-works-nest-service'
import { ethers, Wallet } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { ERC20TokenMock__factory } from '../../typechain'
import { deployProxy } from '../deployProxy'

export async function deploySplitCurrencies(deployer: Wallet) {
  const ERC20Factory = new ERC20TokenMock__factory(deployer)

  const lendingToken = await deployToken('USDC mock', 'USDC', 6, ERC20Factory)
  const tokenA = await deployToken('TOKEN A mock', 'DAI', 18, ERC20Factory)
  const tokenB = await deployToken('TOKEN B mock', 'USDT', 12, ERC20Factory)
  const nativeCoin: SplitCurrency<NativeCryptoTicker> = {
    symbol: 'ETH',
    decimals: 18,
    address: ethers.constants.AddressZero,
  }

  return { lendingToken, otherCurrencies: [tokenA, tokenB], nativeCoin }
}

async function deployToken(
  name: string,
  symbol: TokenCryptoTicker,
  decimals: number,
  factory: ERC20TokenMock__factory,
) {
  const contract = await deployProxy(factory, [name, symbol, decimals])
  await (
    await contract.mintTo(
      await contract.signer.getAddress(),
      parseUnits('10000', decimals),
    )
  ).wait()

  return {
    symbol,
    decimals,
    address: contract.address.toLowerCase(),
  }
}
