import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract, providers } from 'ethers'
import { ethers } from 'hardhat'
import { whitelistLender } from '../../scripts/actions/whitelistLender'
import { ERC20TokenMock } from '../../typechain'
import { HolderWithWallet } from './types'

export async function getEvent(
  txPromise: Promise<providers.TransactionResponse>,
  contract: Contract,
  eventName: string,
) {
  const tx = await txPromise
  const receipt = await contract.provider.getTransactionReceipt(tx.hash!)
  const eventFragment = contract.interface.getEvent(eventName)
  const topic = contract.interface.getEventTopic(eventFragment)
  const logs = receipt.logs!.filter((log) => log.topics.includes(topic))
  if (logs.length === 0) {
    throw Error(`Event ${eventName} was not emitted`)
  }
  return contract.interface.parseLog(logs[0])
}

export async function fakeTime(provider: providers.JsonRpcProvider, days = 1) {
  await provider.send('evm_increaseTime', [days * 86400 + 5])
  await provider.send('evm_mine', [])
}

export async function fakeSignerWithAddress() {
  return await SignerWithAddress.create(ethers.provider.getSigner())
}

export function buildHolders(
  defaultHolders: SignerWithAddress[],
  shares?: number[],
  passedHolders?: HolderWithWallet[],
): HolderWithWallet[] {
  if (passedHolders) {
    return passedHolders
  } else if (shares) {
    return shares.map((share, i) => ({
      account: defaultHolders[i].address,
      balance: share.toString(),
      isAdmin: i === 0,
      wallet: defaultHolders[i],
    }))
  } else {
    throw new Error('You must specify either shares or holders')
  }
}

export async function addLender(
  lendingContractAddress: string,
  lendingToken: ERC20TokenMock,
  lender: SignerWithAddress,
) {
  await whitelistLender(lendingContractAddress, lender.address)

  await lendingToken.mintTo(
    lender.address,
    ethers.utils.parseEther('1000000000'),
  )
  await lendingToken
    .connect(lender)
    .approve(lendingContractAddress, ethers.constants.MaxUint256)
}
