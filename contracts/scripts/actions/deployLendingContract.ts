import { ethers, upgrades } from 'hardhat'
import { LendingContract } from '../../typechain'

export async function deployLendingContract(
  lendingTokenAddress: string,
): Promise<LendingContract> {
  const LendingContract = await ethers.getContractFactory('LendingContract')
  const lendingContract = (await upgrades.deployProxy(
    LendingContract,
    [lendingTokenAddress],
    { kind: 'uups' },
  )) as LendingContract
  await lendingContract.deployed()

  return lendingContract
}
