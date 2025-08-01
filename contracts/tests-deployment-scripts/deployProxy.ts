import { BaseContract, ContractFactory } from 'ethers';
import { ERC1967Proxy__factory } from '../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

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

export const getRunnerAddress = async (
  factory: ContractFactory | BaseContract,
) => {
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
