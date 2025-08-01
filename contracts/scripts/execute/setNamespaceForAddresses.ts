import { ethers } from 'hardhat';

const NAMESPACE = '';
const ADDRESSES = ['0x0'];
const NAMESPACE_REGISTRY_ADDRESS = '0x0';

async function main() {
  const namespaceRegistry = await ethers.getContractAt(
    'NamespaceRegistry',
    NAMESPACE_REGISTRY_ADDRESS,
  );

  console.log('sending tx');
  const tx = await namespaceRegistry.setNamespaceForAddresses(
    ADDRESSES,
    ADDRESSES.map(() => NAMESPACE),
  );
  console.log('waiting...');

  await tx.wait();
  console.log(`transaction hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
