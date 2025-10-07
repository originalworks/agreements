import { BaseContract, id, TransactionResponse } from 'ethers';
import { ContractFactory } from 'ethers';
import { ERC1967Proxy__factory } from '../typechain';
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

export const deployProxy = async <T extends ContractFactory>(
  factory: T,
  initArgs: any[],
) => {
  const implementation = await factory.deploy();
  const encodedInitArgs = // @ts-expect-error fk ethers v6
    (await implementation.initialize.populateTransaction(...initArgs)).data;
  const proxy = await (
    await new ERC1967Proxy__factory(
      implementation.runner as unknown as SignerWithAddress,
    ).deploy(await implementation.getAddress(), encodedInitArgs)
  ).waitForDeployment();

  return implementation.attach(await proxy.getAddress()) as ReturnType<
    T['deploy']
  >;
};
