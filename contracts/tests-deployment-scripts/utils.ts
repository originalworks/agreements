import { BaseContract, id, TransactionResponse } from 'ethers';

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
