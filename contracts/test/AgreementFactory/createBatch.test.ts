import { ethers } from 'hardhat';
import { ContractTransactionReceipt, id, Wallet } from 'ethers';
import { expect } from 'chai';
import { deployInitialSetup } from '../helpers/deployments';
import { AgreementFactory__factory } from '../../typechain';
import { IAgreementERC20 } from '../../typechain/contracts/agreements/AgreementFactory';
import { IAgreementERC1155 } from '../../typechain/contracts/agreements/AgreementFactory';
import { InitialSetup } from '../helpers/types';

const namespace = 'REVELATOR';

describe('AgreementFactory.createBatch', function () {
  let initialSetup: InitialSetup;
  let creationFee: bigint;

  beforeEach(async () => {
    const [owner] = await ethers.getSigners();
    initialSetup = await deployInitialSetup();
    creationFee = await initialSetup.feeManager.creationFee();
    await initialSetup.namespaceRegistry.setNamespaceForAddresses(
      [owner.address],
      [namespace],
    );
  });

  describe('createBatchERC20', () => {
    it('Create multiple ERC20', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const transactionInput = buildCreateBatchERC20Input(inputSize);

      const tx = await agreementFactory.createBatchERC20(transactionInput, {
        value: creationFee * inputSize,
      });

      const receipt = await tx.wait();

      if (!receipt) throw new Error('No receipt found');

      const createdAgreements = readAddressesFromReceipt(receipt);

      for (let i = 0; i < createdAgreements.length; i++) {
        const agreementContract = await ethers.getContractAt(
          'AgreementERC20',
          createdAgreements[i],
        );

        expect(await agreementContract.rwaId()).not.to.equal(undefined);
      }
    });
    it('Require creationFee for each token created', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const transactionInput = buildCreateBatchERC20Input(inputSize);

      await expect(
        agreementFactory.createBatchERC20(transactionInput, {
          value: creationFee * (inputSize - 1n),
        }),
      ).to.be.revertedWith('AgreementFactory: Insufficient fee');
    });
    it('Is cheaper than separate transactions', async function () {
      let separateTxsCumulativeGasCost = 0n;
      const inputSize = 5n;
      const { agreementFactory } = initialSetup;

      const transactionInput = buildCreateBatchERC20Input(inputSize);

      const batchTx = await agreementFactory.createBatchERC20(
        transactionInput,
        {
          value: creationFee * inputSize,
        },
      );

      const batchTxReceipt = await batchTx.wait();
      if (!batchTxReceipt) throw new Error('No batchTxReceipt');
      const batchTxGasCost = batchTxReceipt.gasUsed * batchTxReceipt.gasPrice;

      for (let i = 0; i < inputSize; i++) {
        const tx = await agreementFactory.createERC20(
          {
            holders: transactionInput[i].holders,
            unassignedRwaId: transactionInput[i].unassignedRwaId,
          },
          {
            value: creationFee,
          },
        );
        const receipt = await tx.wait();

        if (!receipt) throw new Error('No receipt found');

        separateTxsCumulativeGasCost =
          receipt.gasUsed * receipt.gasPrice + separateTxsCumulativeGasCost;
      }

      expect(batchTxGasCost < separateTxsCumulativeGasCost).to.equal(true);
    });
    it('Can create up to 48 agreements (with 3 holders) before reaching block size limit', async function () {
      const { agreementFactory } = initialSetup;

      let agreementsCount = 48n;
      await expect(
        agreementFactory.createBatchERC20(
          buildCreateBatchERC20Input(agreementsCount),
          {
            value: creationFee * agreementsCount,
          },
        ),
      ).to.not.be.reverted;

      agreementsCount = 49n;

      await expect(
        agreementFactory.createBatchERC20(
          buildCreateBatchERC20Input(agreementsCount),
          {
            value: creationFee * agreementsCount,
          },
        ),
      ).to.be.reverted;
    }).timeout(100000);
  });

  describe('createBatchERC1155', () => {
    it('Create multiple ERC1155', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const transactionInput = buildCreateBatchERC1155Input(inputSize);

      const tx = await agreementFactory.createBatchERC1155(transactionInput, {
        value: creationFee * inputSize,
      });

      const receipt = await tx.wait();

      if (!receipt) throw new Error('No receipt found');

      const createdAgreements = readAddressesFromReceipt(receipt);

      for (let i = 0; i < createdAgreements.length; i++) {
        const agreementContract = await ethers.getContractAt(
          'AgreementERC1155',
          createdAgreements[i],
        );

        expect(await agreementContract.rwaId()).not.to.equal(undefined);
      }
    });
    it('Require creationFee for each token created', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const transactionInput = buildCreateBatchERC1155Input(inputSize);

      await expect(
        agreementFactory.createBatchERC1155(transactionInput, {
          value: creationFee * (inputSize - 1n),
        }),
      ).to.be.revertedWith('AgreementFactory: Insufficient fee');
    });
    it('Is cheaper than separate transactions', async function () {
      let separateTxsCumulativeGasCost = 0n;
      const inputSize = 5n;
      const { agreementFactory } = initialSetup;

      const transactionInput = buildCreateBatchERC1155Input(inputSize);

      const batchTx = await agreementFactory.createBatchERC1155(
        transactionInput,
        {
          value: creationFee * inputSize,
        },
      );

      const batchTxReceipt = await batchTx.wait();

      if (!batchTxReceipt) throw new Error('No batchTxReceipt found');
      const batchTxGasCost = batchTxReceipt.gasUsed * batchTxReceipt.gasPrice;

      for (let i = 0; i < inputSize; i++) {
        const tx = await agreementFactory.createERC1155(
          {
            tokenUri: transactionInput[i].tokenUri,
            holders: transactionInput[i].holders,
            contractURI: transactionInput[i].contractURI,
            unassignedRwaId: transactionInput[i].unassignedRwaId,
          },
          {
            value: creationFee,
          },
        );
        const receipt = await tx.wait();
        if (!receipt) throw new Error('No receipt found');

        separateTxsCumulativeGasCost =
          receipt.gasUsed * receipt.gasPrice + separateTxsCumulativeGasCost;
      }

      expect(batchTxGasCost < separateTxsCumulativeGasCost).to.equal(true);
    });

    it('Can create up to 39 agreements (with 3 holders) before reaching block size limit', async function () {
      const { agreementFactory } = initialSetup;
      let agreementsCount = 39n;

      await expect(
        agreementFactory.createBatchERC1155(
          buildCreateBatchERC1155Input(agreementsCount),
          {
            value: creationFee * agreementsCount,
          },
        ),
      ).to.not.be.reverted;

      agreementsCount = 40n;

      await expect(
        agreementFactory.createBatchERC1155(
          buildCreateBatchERC1155Input(agreementsCount),
          {
            value: creationFee * agreementsCount,
          },
        ),
      ).to.be.reverted;
    }).timeout(100000);
  });
});

function readAddressesFromReceipt(receipt: ContractTransactionReceipt) {
  const agreementFactoryInterface = AgreementFactory__factory.createInterface();
  const eventFragment = agreementFactoryInterface.getEvent('AgreementCreated');
  const topic = id(eventFragment.format());
  const logs = receipt.logs.filter((log) => log.topics.includes(topic));
  const events = logs.map((log) => agreementFactoryInterface.parseLog(log));

  return events
    .filter((event) => !!event)
    .map((event) => event.args.agreementAddress);
}

function buildCreateBatchERC20Input(inputSize: bigint) {
  const transactionInput: IAgreementERC20.CreateERC20ParamsStruct[] = [];
  const iterInputSize = Number(inputSize);

  for (let i = 0; i < iterInputSize; i++) {
    transactionInput.push({
      unassignedRwaId: `ISRC:${i}`,
      holders: [
        {
          account: Wallet.createRandom().address,
          isAdmin: true,
          balance: 3000n,
        },
        {
          account: Wallet.createRandom().address,
          isAdmin: false,
          balance: 3000n,
        },
        {
          account: Wallet.createRandom().address,
          isAdmin: false,
          balance: 4000n,
        },
      ],
    });
  }
  return transactionInput;
}

function buildCreateBatchERC1155Input(inputSize: bigint) {
  const tokenUri = `0x${'ab'.repeat(32)}`;
  const contractURI = `0x${'ab'.repeat(32)}`;

  const transactionInput: IAgreementERC1155.CreateERC1155ParamsStruct[] = [];
  const iterInputSize = Number(inputSize);

  for (let i = 0; i < iterInputSize; i++) {
    transactionInput.push({
      unassignedRwaId: `ISRC:${i}`,
      contractURI,
      tokenUri,
      holders: [
        {
          account: Wallet.createRandom().address,
          isAdmin: true,
          balance: 3000n,
        },
        {
          account: Wallet.createRandom().address,
          isAdmin: false,
          balance: 3000n,
        },
        {
          account: Wallet.createRandom().address,
          isAdmin: false,
          balance: 4000n,
        },
      ],
    });
  }
  return transactionInput;
}
