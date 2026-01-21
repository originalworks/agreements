import { ethers } from 'hardhat';
import { ERC20TokenMock } from '../../typechain';
import { BaseContract, ContractFactory, parseUnits } from 'ethers';
import { deployProxy } from './deployProxy';

const getRunnerAddress = async (factory: ContractFactory | BaseContract) => {
  if (
    factory.runner &&
    'getAddress' in factory.runner &&
    typeof factory.runner.getAddress === 'function'
  ) {
    const address = await factory.runner.getAddress();
    return address;
  }

  throw new Error('Unable to get runner address');
};

export async function deployERC20TokenMock(
  name: string,
  symbol: string,
  decimals: bigint,
): Promise<ERC20TokenMock> {
  const TokenContract = await ethers.getContractFactory('ERC20TokenMock');
  const tokenContract = await deployProxy(TokenContract, [
    name,
    symbol,
    decimals,
  ]);

  await tokenContract.waitForDeployment();

  await (
    await tokenContract.mintTo(
      await getRunnerAddress(TokenContract),
      parseUnits('10000000', decimals),
    )
  ).wait();

  return tokenContract;
}
