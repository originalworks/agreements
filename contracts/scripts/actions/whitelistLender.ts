import { ethers } from 'hardhat'

export async function whitelistLender(
  lendingContractAddress: string,
  lender: string,
) {
  const LendingContract = await ethers.getContractFactory('LendingContract')
  const lendingContract = LendingContract.attach(lendingContractAddress)

  const tx = await lendingContract.addToWhitelist(lender)
  await tx.wait()
}
