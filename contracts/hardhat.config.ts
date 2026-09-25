import * as dotenv from 'dotenv';

import { HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import '@rumblefishdev/hardhat-kms-signer';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: '0.8.23',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: '0.8.32',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  networks: {
    base_sepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      kmsKeyId: `${process.env.DEV_KMS_KEY_ID}`,
      minMaxPriorityFeePerGas: 1500000000,
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      kmsKeyId: `${process.env.PROD_KMS_KEY_ID}`,
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      kmsKeyId: `${process.env.PROD_KMS_KEY_ID}`,
    },
    anvilDocker: {
      url: 'http://anvil:8545',
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk',
      },
    },
    anvil_localhost: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk',
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    enabled: false,
  },
  sourcify: {
    enabled: true,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v6',
  },
};

export default config;
