import { ethers } from 'hardhat';
import {
  ContractTransactionReceipt,
  ContractTransactionResponse,
  id,
  TransactionReceipt,
  Wallet,
} from 'ethers';
import { expect } from 'chai';
import { deployInitialSetup } from '../helpers/deployments';
import { AgreementFactory, AgreementFactory__factory } from '../../typechain';
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

      const { transactionInput, expectedRevenueStreamUris } =
        buildCreateBatchInput(inputSize);

      const tx = await agreementFactory.createBatchERC20(transactionInput, {
        value: creationFee * inputSize,
      });

      const receipt = await tx.wait();

      if (!receipt) throw new Error('No receipt found');

      const createdAgreements = readAddressesAndUrisFromReceipt(receipt);

      for (let i = 0; i < expectedRevenueStreamUris.length; i++) {
        const expectedUri = expectedRevenueStreamUris[i];
        expect(
          createdAgreements.find(
            (agreement) => agreement.revenueStreamURI === expectedUri,
          ),
        ).not.to.equal(undefined);
      }
    });
    it('Require creationFee for each token created', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const { transactionInput } = buildCreateBatchInput(inputSize);

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

      const { transactionInput } = buildCreateBatchInput(inputSize);

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
          transactionInput[i]._dataHash,
          transactionInput[i].holders,
          transactionInput[i].partialRevenueStreamURIs,
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

    it('Can create up to 28 agreements (with 3 holders) before reaching block size limit', async function () {
      const { agreementFactory } = initialSetup;

      await expect(
        agreementFactory.createBatchERC20(
          buildCreateBatchInput(28n).transactionInput,
          {
            value: creationFee * 28n,
          },
        ),
      ).to.not.be.reverted;

      await expect(
        agreementFactory.createBatchERC20(
          buildCreateBatchInput(29n).transactionInput,
          {
            value: creationFee * 29n,
          },
        ),
      ).to.be.reverted;
    }).timeout(100000);
  });
  describe('createBatchERC1155', () => {
    it('Create multiple ERC1155', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const { transactionInput, expectedRevenueStreamUris } =
        buildCreateBatchInput(inputSize);

      const tx = await agreementFactory.createBatchERC1155(transactionInput, {
        value: creationFee * inputSize,
      });

      const receipt = await tx.wait();

      if (!receipt) throw new Error('No receipt found');

      const createdAgreements = readAddressesAndUrisFromReceipt(receipt);

      for (let i = 0; i < expectedRevenueStreamUris.length; i++) {
        const expectedUri = expectedRevenueStreamUris[i];
        expect(
          createdAgreements.find(
            (agreement) => agreement.revenueStreamURI === expectedUri,
          ),
        ).to.equal(undefined);
      }
    });
    it('Require creationFee for each token created', async function () {
      const inputSize = 3n;
      const { agreementFactory } = initialSetup;

      const { transactionInput } = buildCreateBatchInput(inputSize);

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

      const { transactionInput } = buildCreateBatchInput(inputSize);

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
          transactionInput[i]._dataHash,
          transactionInput[i].holders,
          transactionInput[i].contractURI,
          transactionInput[i].partialRevenueStreamURIs,
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

    it('Can create up to 28 agreements (with 3 holders) before reaching block size limit', async function () {
      const { agreementFactory } = initialSetup;

      await expect(
        agreementFactory.createBatchERC1155(
          buildCreateBatchInput(28n).transactionInput,
          {
            value: creationFee * 28n,
          },
        ),
      ).to.not.be.reverted;

      await expect(
        agreementFactory.createBatchERC1155(
          buildCreateBatchInput(29n).transactionInput,
          {
            value: creationFee * 29n,
          },
        ),
      ).to.be.reverted;
    }).timeout(100000);
  });
});

function readAddressesAndUrisFromReceipt(receipt: ContractTransactionReceipt) {
  const agreementFactoryInterface = AgreementFactory__factory.createInterface();
  const eventFragment = agreementFactoryInterface.getEvent(
    'InitialRevenueStreamURISet',
  );
  const topic = id(eventFragment.format());
  const logs = receipt.logs.filter((log) => log.topics.includes(topic));
  const events = logs.map((log) => agreementFactoryInterface.parseLog(log));

  return events
    .filter((event) => !!event)
    .map((event) => ({
      revenueStreamURI: event.args.addedUris[0],
      agreementAddress: event.args.agreementAddress,
    }));
}

function buildCreateBatchInput(inputSize: bigint) {
  const DATA_HASH = `0x${'ab'.repeat(32)}`;
  const transactionInput: AgreementFactory.ICreateBatchERC1155Struct[] = [];
  const iterInputSize = Number(inputSize);

  for (let i = 0; i < iterInputSize; i++) {
    transactionInput.push({
      _dataHash: DATA_HASH,
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
      partialRevenueStreamURIs: [`ISRC:${i}`],
      contractURI: 'abc123',
    });
  }
  return {
    transactionInput,
    expectedRevenueStreamUris: transactionInput.map(
      (input) => `${namespace}:${input.partialRevenueStreamURIs[0]}`,
    ),
  };
}
