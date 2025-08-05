import {
  BaseContract,
  BigNumberish,
  id,
  JsonRpcProvider,
  parseEther,
  TransactionResponse,
} from 'ethers';
import { ethers } from 'hardhat';
import { whitelistLender } from '../../scripts/actions/whitelistLender';
import { ERC20TokenMock } from '../../typechain';
import { HolderWithWallet } from './types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

export async function getEvent(
  txPromise: Promise<TransactionResponse>,
  contract: BaseContract,
  eventName: string,
) {
  const tx = await txPromise;
  const provider = contract.runner?.provider;
  if (!provider) throw new Error('Provider is null or undefined');

  const receipt = await provider.getTransactionReceipt(tx.hash);
  if (!receipt) throw new Error('Receipt not found');

  const eventFragment = contract.interface.getEvent(eventName);
  if (!eventFragment) throw new Error('Event fragment not found');

  const topic = id(eventFragment.format());
  const logs = receipt.logs.filter((log) => log.topics.includes(topic));
  if (logs.length === 0) {
    throw Error(`Event ${eventName} was not emitted`);
  }

  const event = contract.interface.parseLog(logs[0]);

  if (!event) throw new Error('Event not found');

  return event;
}

export async function fakeTime(provider: JsonRpcProvider, days = 1) {
  await provider.send('evm_increaseTime', [days * 86400 + 5]);
  await provider.send('evm_mine', []);
}

export async function fakeSignerWithAddress() {
  const signer = await ethers.provider.getSigner();
  return await SignerWithAddress.create(
    signer.provider as any,
    await signer.getAddress(),
  );
}

export function buildHolders(
  defaultHolders: SignerWithAddress[],
  shares?: BigNumberish[],
  passedHolders?: HolderWithWallet[],
): HolderWithWallet[] {
  if (passedHolders) {
    return passedHolders;
  } else if (shares) {
    return shares.map((share, i) => ({
      account: defaultHolders[i].address,
      balance: share.toString(),
      isAdmin: i === 0,
      wallet: defaultHolders[i],
    }));
  } else {
    throw new Error('You must specify either shares or holders');
  }
}

export async function addLender(
  lendingContractAddress: string,
  lendingToken: ERC20TokenMock,
  lender: SignerWithAddress,
) {
  await whitelistLender(lendingContractAddress, lender.address);

  await lendingToken.mintTo(lender.address, parseEther('1000000000'));
  await lendingToken
    .connect(lender)
    .approve(lendingContractAddress, ethers.MaxUint256);
}
