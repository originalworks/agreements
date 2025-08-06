import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ContractTransactionReceipt, id, Wallet } from 'ethers';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments';
import { AgreementFactory__factory } from '../../typechain';

describe('NamespaceRegistry integration test', function () {
  describe('AgreementFactory', () => {
    it('Can create agreement without URI (split agreements)', async function () {
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: [],
        txExecutorWallet: minterWallet,
      });

      await expect(agreement.agreement.revenueStreamURIs(0)).to.reverted;
    });
    it('Create agreement in namespace based on minter address', async function () {
      const partialUri = '123ABC';
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: [partialUri],
        txExecutorWallet: minterWallet,
      });

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${partialUri}`,
      );
    });
    it('Set UNKNOWN namespace if minter is not registered', async () => {
      const partialUri = '123ABC';
      const [, unregisteredMinter] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: [partialUri],
        txExecutorWallet: unregisteredMinter,
      });

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `UNKNOWN:${partialUri}`,
      );
    });
    it('Can set multiple RevenueStreamURIs on mint', async () => {
      const partialURIs = ['123ABC', '456DEF'];
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${partialURIs[0]}`,
      );
      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace}:${partialURIs[1]}`,
      );
    });
  });
  describe('AgreementERC20', () => {
    it('Registered namespace owner can add new RevenueStreamURIs to agreement', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURIs = ['ABC123'];
      const newPartialRevenueStreamURI = 'DEF456';
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: initialPartialRevenueStreamURIs,
        txExecutorWallet: namespaceOwner,
      });

      await agreement.agreement
        .connect(namespaceOwner)
        .addRevenueStreamURI(newPartialRevenueStreamURI);

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${initialPartialRevenueStreamURIs[0]}`,
      );

      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace}:${newPartialRevenueStreamURI}`,
      );
    });
    it('Only registered namespace owner can add RevenueStreamURIs', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURIs = ['ABC123'];
      const newPartialRevenueStreamURI = 'DEF456';
      const [, agreementDeployer, notRegisteredWallet] =
        await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [agreementDeployer.address],
        [namespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: initialPartialRevenueStreamURIs,
        txExecutorWallet: agreementDeployer,
      });

      await expect(
        agreement.agreement
          .connect(notRegisteredWallet)
          .addRevenueStreamURI(newPartialRevenueStreamURI),
      ).to.be.revertedWith(
        'NamespaceRegistry: you are not allowed to add this URI',
      );
    });
    it('Allow RevenueStreamURIs in multiple namespaces', async () => {
      const namespace1 = 'REVELATOR';
      const namespace2 = 'PIEROGI';
      const initialPartialURI = 'ABC123';
      const newpartialURI = 'DEF456';
      const [, namespaceOwner1, namespaceOwner2] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner1.address, namespaceOwner2.address],
        [namespace1, namespace2],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: [initialPartialURI],
        txExecutorWallet: namespaceOwner1,
      });

      await agreement.agreement
        .connect(namespaceOwner2)
        .addRevenueStreamURI(newpartialURI);

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace1}:${initialPartialURI}`,
      );

      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace2}:${newpartialURI}`,
      );
    });
    it('Registered namespace owner can remove RevenueStreamURI by array index', async () => {
      const partialURIs = ['123ABC', '456DEF', '789GHI'];
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${partialURIs[0]}`,
      );

      await agreement.agreement.connect(minterWallet).removeRevenueStreamURI(0);

      // last item from RevenueStremURIs array has been moved into the place of deleted record
      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${partialURIs[2]}`,
      );

      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace}:${partialURIs[1]}`,
      );

      await expect(agreement.agreement.revenueStreamURIs(2)).to.reverted;
    });
    it('Only registered namespace owner can remove URI', async () => {
      const partialURIs = ['123ABC', '456DEF', '789GHI'];
      const namespace = 'REVELATOR';
      const [, minterWallet, notRegisteredWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      await expect(
        agreement.agreement
          .connect(notRegisteredWallet)
          .removeRevenueStreamURI(0),
      ).to.be.revertedWith(
        'NamespaceRegistry: you are not allowed to remove this URI',
      );
    });
    it('Registered namespace owner can only remove URI in its own namespace', async () => {
      const partialURIs = ['123ABC', '456DEF', '789GHI'];
      const namespace = 'REVELATOR';
      const differentNamespace = 'UGABUGA';
      const [, minterWallet, differentNamespaceOwner] =
        await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address, differentNamespaceOwner.address],
        [namespace, differentNamespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      await expect(
        agreement.agreement
          .connect(differentNamespaceOwner)
          .removeRevenueStreamURI(0n),
      ).to.be.revertedWith(
        'NamespaceRegistry: you are not allowed to remove this URI',
      );
    });
    it('Emits event with initial URIs when contract is created', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURI = 'ABC123';
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );
      const tx = await initialSetup.agreementFactory
        .connect(namespaceOwner)
        .createERC20(
          'dataHash',
          [
            {
              account: Wallet.createRandom().address,
              balance: 100n,
              isAdmin: true,
            },
          ],
          [initialPartialRevenueStreamURI],
          {
            value: await initialSetup.feeManager.creationFee(),
          },
        );

      const receipt = await tx.wait();

      if (!receipt) throw new Error('Receipt not found');
      const initialRevenueStreamURISetEvent =
        extractInitialRevenueStreamURISetEvent(receipt);

      expect(initialRevenueStreamURISetEvent.addedByAccount).equal(
        namespaceOwner.address,
      );
      expect(initialRevenueStreamURISetEvent.addedUris).deep.equal([
        `${namespace}:${initialPartialRevenueStreamURI}`,
      ]);
      expect(initialRevenueStreamURISetEvent.agreementAddress).not.to.equal(
        undefined,
      );
    });
    it('Emits event when URI is added', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURI = 'ABC123';
      const newPartialRevenueStreamURI = 'DEF456';
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: [initialPartialRevenueStreamURI],
        txExecutorWallet: namespaceOwner,
      });

      await expect(
        agreement.agreement
          .connect(namespaceOwner)
          .addRevenueStreamURI(newPartialRevenueStreamURI),
      )
        .to.emit(agreement.agreement, 'RevenueStreamURIAdded')
        .withArgs(
          `${namespace}:${newPartialRevenueStreamURI}`,
          namespaceOwner.address,
        );
    });
    it('Emits event when URI is removed', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURIs = ['ABC123', 'DEF456'];
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );

      const agreement = await deployAgreementERC20({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: initialPartialRevenueStreamURIs,
        txExecutorWallet: namespaceOwner,
      });

      await expect(
        agreement.agreement.connect(namespaceOwner).removeRevenueStreamURI(1),
      )
        .to.emit(agreement.agreement, 'RevenueStreamURIRemoved')
        .withArgs(
          `${namespace}:${initialPartialRevenueStreamURIs[1]}`,
          namespaceOwner.address,
        );
    });
  });
  describe('AgreementERC1155', () => {
    it('Registered namespace owner can add new RevenueStreamURIs to agreement', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURIs = ['ABC123'];
      const newPartialRevenueStreamURI = 'DEF456';
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: initialPartialRevenueStreamURIs,
        txExecutorWallet: namespaceOwner,
      });

      await agreement.agreement
        .connect(namespaceOwner)
        .addRevenueStreamURI(newPartialRevenueStreamURI);

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${initialPartialRevenueStreamURIs[0]}`,
      );

      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace}:${newPartialRevenueStreamURI}`,
      );
    });
    it('Only registered namespace owner can add RevenueStreamURIs', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURIs = ['ABC123'];
      const newPartialRevenueStreamURI = 'DEF456';
      const [, agreementDeployer, notRegisteredWallet] =
        await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [agreementDeployer.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: initialPartialRevenueStreamURIs,
        txExecutorWallet: agreementDeployer,
      });

      await expect(
        agreement.agreement
          .connect(notRegisteredWallet)
          .addRevenueStreamURI(newPartialRevenueStreamURI),
      ).to.be.revertedWith(
        'NamespaceRegistry: you are not allowed to add this URI',
      );
    });
    it('Allow RevenueStreamURIs in multiple namespaces', async () => {
      const namespace1 = 'REVELATOR';
      const namespace2 = 'PIEROGI';
      const initialPartialURI = 'ABC123';
      const newpartialURI = 'DEF456';
      const [, namespaceOwner1, namespaceOwner2] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner1.address, namespaceOwner2.address],
        [namespace1, namespace2],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: [initialPartialURI],
        txExecutorWallet: namespaceOwner1,
      });

      await agreement.agreement
        .connect(namespaceOwner2)
        .addRevenueStreamURI(newpartialURI);

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace1}:${initialPartialURI}`,
      );

      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace2}:${newpartialURI}`,
      );
    });
    it('Registered namespace owner can remove RevenueStreamURI by array index', async () => {
      const partialURIs = ['123ABC', '456DEF', '789GHI'];
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${partialURIs[0]}`,
      );

      await agreement.agreement.connect(minterWallet).removeRevenueStreamURI(0);

      // last item from RevenueStremURIs array has been moved into the place of deleted record
      expect(await agreement.agreement.revenueStreamURIs(0)).equal(
        `${namespace}:${partialURIs[2]}`,
      );

      expect(await agreement.agreement.revenueStreamURIs(1)).equal(
        `${namespace}:${partialURIs[1]}`,
      );

      await expect(agreement.agreement.revenueStreamURIs(2)).to.reverted;
    });
    it('Only registered namespace owner can remove URI', async () => {
      const partialURIs = ['123ABC', '456DEF', '789GHI'];
      const namespace = 'REVELATOR';
      const [, minterWallet, notRegisteredWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      await expect(
        agreement.agreement
          .connect(notRegisteredWallet)
          .removeRevenueStreamURI(0n),
      ).to.be.revertedWith(
        'NamespaceRegistry: you are not allowed to remove this URI',
      );
    });
    it('Registered namespace owner can only remove URI in its own namespace', async () => {
      const partialURIs = ['123ABC', '456DEF', '789GHI'];
      const namespace = 'REVELATOR';
      const differentNamespace = 'UGABUGA';
      const [, minterWallet, differentNamespaceOwner] =
        await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address, differentNamespaceOwner.address],
        [namespace, differentNamespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        partialRevenueStreamURIs: partialURIs,
        txExecutorWallet: minterWallet,
      });

      await expect(
        agreement.agreement
          .connect(differentNamespaceOwner)
          .removeRevenueStreamURI(0n),
      ).to.be.revertedWith(
        'NamespaceRegistry: you are not allowed to remove this URI',
      );
    });
    it('Emits event with initial URIs when contract is created', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURI = 'ABC123';
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );
      const tx = await initialSetup.agreementFactory
        .connect(namespaceOwner)
        .createERC1155(
          'dataHash',
          [
            {
              account: Wallet.createRandom().address,
              balance: 100n,
              isAdmin: true,
            },
          ],
          'contractURI',
          [initialPartialRevenueStreamURI],
          {
            value: await initialSetup.feeManager.creationFee(),
          },
        );
      const receipt = await tx.wait();

      if (!receipt) throw new Error('Receipt not found');

      const initialRevenueStreamURISetEvent =
        extractInitialRevenueStreamURISetEvent(receipt);

      expect(initialRevenueStreamURISetEvent.addedByAccount).equal(
        namespaceOwner.address,
      );
      expect(initialRevenueStreamURISetEvent.addedUris).deep.equal([
        `${namespace}:${initialPartialRevenueStreamURI}`,
      ]);
      expect(initialRevenueStreamURISetEvent.agreementAddress).not.to.equal(
        undefined,
      );
    });
    it('Emits event when URI is added', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURI = 'ABC123';
      const newPartialRevenueStreamURI = 'DEF456';
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: [initialPartialRevenueStreamURI],
        txExecutorWallet: namespaceOwner,
      });

      await expect(
        agreement.agreement
          .connect(namespaceOwner)
          .addRevenueStreamURI(newPartialRevenueStreamURI),
      )
        .to.emit(agreement.agreement, 'RevenueStreamURIAdded')
        .withArgs(
          `${namespace}:${newPartialRevenueStreamURI}`,
          namespaceOwner.address,
        );
    });
    it('Emits event when URI is removed', async () => {
      const namespace = 'REVELATOR';
      const initialPartialRevenueStreamURIs = ['ABC123', 'DEF456'];
      const [, namespaceOwner] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [namespaceOwner.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [1000n],
        partialRevenueStreamURIs: initialPartialRevenueStreamURIs,
        txExecutorWallet: namespaceOwner,
      });

      await expect(
        agreement.agreement.connect(namespaceOwner).removeRevenueStreamURI(1),
      )
        .to.emit(agreement.agreement, 'RevenueStreamURIRemoved')
        .withArgs(
          `${namespace}:${initialPartialRevenueStreamURIs[1]}`,
          namespaceOwner.address,
        );
    });
  });
});

function extractInitialRevenueStreamURISetEvent(
  receipt: ContractTransactionReceipt,
) {
  const agreementFactoryInterface = AgreementFactory__factory.createInterface();
  const eventFragment = agreementFactoryInterface.getEvent(
    'InitialRevenueStreamURISet',
  );
  const topic = id(eventFragment.format());
  const logs = receipt.logs.filter((log) => log.topics.includes(topic));
  const event = agreementFactoryInterface.parseLog(logs[0]);

  if (!event) throw new Error('Event not found');

  return {
    agreementAddress: event.args.agreementAddress,
    addedUris: event.args.addedUris,
    addedByAccount: event.args.addedByAccount,
  };
}
