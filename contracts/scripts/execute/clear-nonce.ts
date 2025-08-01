import { JsonRpcProvider } from 'ethers';
import { ethers } from 'hardhat';

// Due to fact that sepolia has empty mined blocks, gas fee estimations are failing.
// It creates the situation where tx has 0 gasPrice therefore it won't be mined.
// This casuses tx queue jam - tx that won't be mined and no new txs will be executed.
// Example:
// 1. Tx has been submitted with correct gasFee // latestNonce = 0x01, pendingNonce = 0x01
// 2. Tx has been submitted with correct gasFee // latestNonce = 0x02, pendingNonce = 0x02
// 3. Tx has been submitted with 0 gasFee       // latestNonce = 0x02, pendingNonce = 0x03
// 4. Tx has been submitted with 0 gasFee       // latestNonce = 0x02, pendingNonce = 0x04
// 5. Tx has been submitted with correct gasFee // latestNonce = 0x02, pendingNonce = 0x05

// In this scenario queue is jammed and no txs from this account will be mined

// To fix it we need to push jammed tx with new one by overriding nonce with the latest mined
// To make it work make sure that provider has always good gas price (set manually)
// and nonce getter is set to 'latest', not 'pending'

const RPC_URL = '';

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = new JsonRpcProvider(RPC_URL);

  const checkNonces = async () => {
    const pendingNonce = await provider.send('eth_getTransactionCount', [
      deployer.address,
      'pending',
    ]);
    const latestNonce = await provider.send('eth_getTransactionCount', [
      deployer.address,
      'latest',
    ]);
    console.log({ pendingNonce, latestNonce });
    return { pendingNonce, latestNonce };
  };

  while (true) {
    const { latestNonce, pendingNonce } = await checkNonces();

    if (latestNonce === pendingNonce) {
      console.log('Nonces are synced');
      return;
    }

    // This tx will hop on the place of first jammed tx.
    const tx = await deployer.sendTransaction({
      to: deployer.address,
      value: '1',
    });
    await tx.wait();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
