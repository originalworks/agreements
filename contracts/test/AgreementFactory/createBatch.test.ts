import { ethers } from 'hardhat'
import { BigNumber, ContractReceipt, Wallet } from 'ethers'
import { expect } from 'chai'
import { deployInitialSetup } from '../helpers/deployments'
import { AgreementFactory, AgreementFactory__factory } from '../../typechain'
import { InitialSetup } from '../helpers/types'

const namespace = 'REVELATOR'

describe('AgreementFactory.createBatch', function () {
  let initialSetup: InitialSetup
  let creationFee: BigNumber

  beforeEach(async () => {
    const [owner] = await ethers.getSigners()
    initialSetup = await deployInitialSetup()
    creationFee = await initialSetup.feeManager.creationFee()
    await initialSetup.namespaceRegistry.setNamespaceForAddresses(
      [owner.address],
      [namespace],
    )
  })

  describe('createBatchERC20', () => {
    it('Create multiple ERC20', async function () {
      const inputSize = 3
      const { agreementFactory } = initialSetup

      const { transactionInput, expectedRevenueStreamUris } =
        buildCreateBatchInput(inputSize)

      const tx = await agreementFactory.createBatchERC20(transactionInput, {
        value: creationFee.mul(inputSize),
      })

      const receipt = await tx.wait()

      const createdAgreements = readAddressesAndUrisFromReceipt(receipt)

      for (let i = 0; i < expectedRevenueStreamUris.length; i++) {
        const expectedUri = expectedRevenueStreamUris[i]
        expect(
          createdAgreements.find(
            (agreement) => agreement.revenueStreamURI === expectedUri,
          ),
        ).to.be.not.undefined
      }
    })
    it('Require creationFee for each token created', async function () {
      const inputSize = 3
      const { agreementFactory } = initialSetup

      const { transactionInput } = buildCreateBatchInput(inputSize)

      await expect(
        agreementFactory.createBatchERC20(transactionInput, {
          value: creationFee.mul(inputSize - 1),
        }),
      ).to.be.revertedWith('AgreementFactory: Insufficient fee')
    })
    it('Is cheaper than separate transactions', async function () {
      let separateTxsCumulativeGasCost = BigNumber.from(0)
      const inputSize = 5
      const { agreementFactory } = initialSetup

      const { transactionInput } = buildCreateBatchInput(inputSize)

      const batchTx = await agreementFactory.createBatchERC20(
        transactionInput,
        {
          value: creationFee.mul(inputSize),
        },
      )

      const batchTxReceipt = await batchTx.wait()
      const batchTxGasCost = batchTxReceipt.gasUsed.mul(
        batchTxReceipt.effectiveGasPrice,
      )

      for (let i = 0; i < inputSize; i++) {
        const tx = await agreementFactory.createERC20(
          transactionInput[i]._dataHash,
          transactionInput[i].holders,
          transactionInput[i].partialRevenueStreamURIs,
          {
            value: creationFee,
          },
        )
        const receipt = await tx.wait()

        separateTxsCumulativeGasCost = separateTxsCumulativeGasCost.add(
          receipt.gasUsed.mul(receipt.effectiveGasPrice),
        )
      }

      expect(batchTxGasCost.lt(separateTxsCumulativeGasCost)).to.be.true
    })
    it('Can create up to 28 agreements (with 3 holders) before reaching block size limit', async function () {
      const { agreementFactory } = initialSetup

      await expect(
        agreementFactory.createBatchERC20(
          buildCreateBatchInput(28).transactionInput,
          {
            value: creationFee.mul(28),
          },
        ),
      ).to.not.be.reverted

      await expect(
        agreementFactory.createBatchERC20(
          buildCreateBatchInput(29).transactionInput,
          {
            value: creationFee.mul(29),
          },
        ),
      ).to.be.reverted
    }).timeout(100000)
  })
  describe('createBatchERC1155', () => {
    it('Create multiple ERC1155', async function () {
      const inputSize = 3
      const { agreementFactory } = initialSetup

      const { transactionInput, expectedRevenueStreamUris } =
        buildCreateBatchInput(inputSize)

      const tx = await agreementFactory.createBatchERC1155(transactionInput, {
        value: creationFee.mul(inputSize),
      })

      const receipt = await tx.wait()

      const createdAgreements = readAddressesAndUrisFromReceipt(receipt)

      for (let i = 0; i < expectedRevenueStreamUris.length; i++) {
        const expectedUri = expectedRevenueStreamUris[i]
        expect(
          createdAgreements.find(
            (agreement) => agreement.revenueStreamURI === expectedUri,
          ),
        ).to.be.not.undefined
      }
    })
    it('Require creationFee for each token created', async function () {
      const inputSize = 3
      const { agreementFactory } = initialSetup

      const { transactionInput } = buildCreateBatchInput(inputSize)

      await expect(
        agreementFactory.createBatchERC1155(transactionInput, {
          value: creationFee.mul(inputSize - 1),
        }),
      ).to.be.revertedWith('AgreementFactory: Insufficient fee')
    })
    it('Is cheaper than separate transactions', async function () {
      let separateTxsCumulativeGasCost = BigNumber.from(0)
      const inputSize = 5
      const { agreementFactory } = initialSetup

      const { transactionInput } = buildCreateBatchInput(inputSize)

      const batchTx = await agreementFactory.createBatchERC1155(
        transactionInput,
        {
          value: creationFee.mul(inputSize),
        },
      )

      const batchTxReceipt = await batchTx.wait()
      const batchTxGasCost = batchTxReceipt.gasUsed.mul(
        batchTxReceipt.effectiveGasPrice,
      )

      for (let i = 0; i < inputSize; i++) {
        const tx = await agreementFactory.createERC1155(
          transactionInput[i]._dataHash,
          transactionInput[i].holders,
          transactionInput[i].contractURI,
          transactionInput[i].partialRevenueStreamURIs,
          {
            value: creationFee,
          },
        )
        const receipt = await tx.wait()

        separateTxsCumulativeGasCost = separateTxsCumulativeGasCost.add(
          receipt.gasUsed.mul(receipt.effectiveGasPrice),
        )
      }

      expect(batchTxGasCost.lt(separateTxsCumulativeGasCost)).to.be.true
    })
    it('Can create up to 28 agreements (with 3 holders) before reaching block size limit', async function () {
      const { agreementFactory } = initialSetup

      await expect(
        agreementFactory.createBatchERC1155(
          buildCreateBatchInput(28).transactionInput,
          {
            value: creationFee.mul(28),
          },
        ),
      ).to.not.be.reverted

      await expect(
        agreementFactory.createBatchERC1155(
          buildCreateBatchInput(29).transactionInput,
          {
            value: creationFee.mul(29),
          },
        ),
      ).to.be.reverted
    }).timeout(100000)
  })
})

function readAddressesAndUrisFromReceipt(receipt: ContractReceipt) {
  const agreementFactoryInterface = AgreementFactory__factory.createInterface()
  const eventFragment = agreementFactoryInterface.getEvent(
    'InitialRevenueStreamURISet',
  )
  const topic = agreementFactoryInterface.getEventTopic(eventFragment)
  const logs = receipt.logs.filter((log) => log.topics.includes(topic))
  const events = logs.map((log) => agreementFactoryInterface.parseLog(log))
  return events.map((event) => ({
    revenueStreamURI: event.args.addedUris[0],
    agreementAddress: event.args.agreementAddress,
  }))
}

function buildCreateBatchInput(inputSize: number) {
  const DATA_HASH = `0x${'ab'.repeat(32)}`
  const transactionInput: AgreementFactory.ICreateBatchERC1155Struct[] = []

  for (let i = 0; i < inputSize; i++) {
    transactionInput.push({
      _dataHash: DATA_HASH,
      holders: [
        {
          account: Wallet.createRandom().address,
          isAdmin: true,
          balance: '3000',
        },
        {
          account: Wallet.createRandom().address,
          isAdmin: false,
          balance: '3000',
        },
        {
          account: Wallet.createRandom().address,
          isAdmin: false,
          balance: '4000',
        },
      ],
      partialRevenueStreamURIs: [`ISRC:${i}`],
      contractURI: 'abc123',
    })
  }
  return {
    transactionInput,
    expectedRevenueStreamUris: transactionInput.map(
      (input) => `${namespace}:${input.partialRevenueStreamURIs[0]}`,
    ),
  }
}
