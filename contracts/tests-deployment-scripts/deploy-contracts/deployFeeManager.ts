import { Signer } from 'ethers';
import { FeeManager, FeeManager__factory } from '../../typechain';
import { deployProxy } from '../deployProxy';

export async function deployFeeManager(
  deployer: Signer,
  creationFee: bigint,
  paymentFee: bigint,
) {
  const FeeManager = new FeeManager__factory(deployer);

  const feeManager = (await deployProxy(FeeManager, [
    creationFee,
    paymentFee,
  ])) as FeeManager;

  await feeManager.waitForDeployment();

  return feeManager;
}
