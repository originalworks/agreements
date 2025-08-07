import { ethers } from 'hardhat';
import { ERC20TokenMock } from '../../typechain';
import { deployProxy, getRunnerAddress } from '../../tests-deployment-scripts';
import { parseUnits } from 'ethers';

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
