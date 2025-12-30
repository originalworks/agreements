import { expect } from 'chai';
import { ethers } from 'hardhat';
import { NamespaceRegistry } from '../../typechain';
import { deployNamespaceRegistry } from '../../scripts/actions/deployNamespaceRegistry';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { Wallet } from 'ethers';

describe('NamespaceRegistry.removeNamespaceForAddress', function () {
  const revelatorNamespace = 'REVELATOR';

  let namespaceRegistry: NamespaceRegistry;
  let contractOwner: SignerWithAddress;
  let revelatorNamespaceOwner: SignerWithAddress;
  let someOtherWallet: SignerWithAddress;

  beforeEach(async () => {
    namespaceRegistry = await deployNamespaceRegistry();
    [contractOwner, revelatorNamespaceOwner, someOtherWallet] =
      await ethers.getSigners();

    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      );
  });
  it('Can remove namespace for given address', async function () {
    await namespaceRegistry
      .connect(contractOwner)
      .removeNamespaceForAddress(revelatorNamespaceOwner.address);

    expect(
      await namespaceRegistry.namespaces(revelatorNamespaceOwner.address),
    ).equal('');

    expect(await namespaceRegistry.usedNamespaces(revelatorNamespace)).equal(
      false,
    );
  });

  it('Removed namespacees can be reused', async function () {
    await expect(
      namespaceRegistry
        .connect(contractOwner)
        .setNamespaceForAddresses(
          [Wallet.createRandom().address],
          [revelatorNamespace],
        ),
    ).to.be.revertedWithCustomError(namespaceRegistry, 'AlreadyRegistered');

    await namespaceRegistry
      .connect(contractOwner)
      .removeNamespaceForAddress(revelatorNamespaceOwner.address);

    await expect(
      namespaceRegistry
        .connect(contractOwner)
        .setNamespaceForAddresses(
          [Wallet.createRandom().address],
          [revelatorNamespace],
        ),
    ).to.not.be.revertedWithCustomError(namespaceRegistry, 'AlreadyRegistered');
  });

  it('Only Owner can remove namespaces', async () => {
    await expect(
      namespaceRegistry
        .connect(someOtherWallet)
        .removeNamespaceForAddress(revelatorNamespaceOwner.address),
    ).to.be.revertedWithCustomError(
      namespaceRegistry,
      'OwnableUnauthorizedAccount',
    );
  });

  it('Emits event when namespace is removed', async () => {
    await expect(
      namespaceRegistry
        .connect(contractOwner)
        .removeNamespaceForAddress(revelatorNamespaceOwner.address),
    )
      .to.emit(namespaceRegistry, 'NamespaceEdited')
      .withArgs(revelatorNamespaceOwner.address, '');
  });
});
