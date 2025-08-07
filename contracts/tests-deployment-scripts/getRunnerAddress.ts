import { BaseContract, ContractFactory } from 'ethers';

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
