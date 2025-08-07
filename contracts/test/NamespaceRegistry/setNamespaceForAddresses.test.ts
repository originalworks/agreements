import { expect } from 'chai';
import { ethers } from 'hardhat';
import { NamespaceRegistry } from '../../typechain';
import { deployNamespaceRegistry } from '../../scripts/actions/deployNamespaceRegistry';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('NamespaceRegistry.setNamespaceForAddresses', function () {
  const revelatorNamespace = 'REVELATOR';
  const spotifyNamespace = 'SPOTIFY';
  const ytNamespace = 'YOUTUBE';

  let namespaceRegistry: NamespaceRegistry;
  let contractOwner: SignerWithAddress;
  let revelatorNamespaceOwner: SignerWithAddress;
  let spotifyNamespaceOwner: SignerWithAddress;
  let ytNamespaceOwner: SignerWithAddress;
  let someOtherWallet: SignerWithAddress;

  beforeEach(async () => {
    namespaceRegistry = await deployNamespaceRegistry();
    [
      contractOwner,
      revelatorNamespaceOwner,
      spotifyNamespaceOwner,
      ytNamespaceOwner,
      someOtherWallet,
    ] = await ethers.getSigners();
  });
  it('Can set namespace for single address', async function () {
    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      );

    expect(
      await namespaceRegistry.namespaces(revelatorNamespaceOwner.address),
    ).equal(revelatorNamespace);
  });

  it('Can overwrite namespace for address', async function () {
    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses([revelatorNamespaceOwner.address], ['PIEROGI']);

    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      );

    expect(
      await namespaceRegistry.namespaces(revelatorNamespaceOwner.address),
    ).equal(revelatorNamespace);
  });

  it('Can set namespace for multiple addresses', async function () {
    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [
          revelatorNamespaceOwner.address,
          spotifyNamespaceOwner.address,
          ytNamespaceOwner.address,
        ],
        [revelatorNamespace, spotifyNamespace, ytNamespace],
      );

    expect(
      await namespaceRegistry.namespaces(revelatorNamespaceOwner.address),
    ).equal(revelatorNamespace);

    expect(
      await namespaceRegistry.namespaces(spotifyNamespaceOwner.address),
    ).equal(spotifyNamespace);

    expect(await namespaceRegistry.namespaces(ytNamespaceOwner.address)).equal(
      ytNamespace,
    );
  });

  it('Only Owner can add new namespaces', async () => {
    await expect(
      namespaceRegistry
        .connect(someOtherWallet)
        .setNamespaceForAddresses(
          [revelatorNamespaceOwner.address],
          [revelatorNamespace],
        ),
    ).to.be.revertedWithCustomError(
      namespaceRegistry,
      'OwnableUnauthorizedAccount',
    );
  });

  it('Emits event when namespaces are edited', async () => {
    const addresses = [
      revelatorNamespaceOwner.address,
      spotifyNamespaceOwner.address,
      ytNamespaceOwner.address,
    ];
    const namespaces = [revelatorNamespace, spotifyNamespace, ytNamespace];

    await expect(
      namespaceRegistry
        .connect(contractOwner)
        .setNamespaceForAddresses(addresses, namespaces),
    )
      .to.emit(namespaceRegistry, 'NamespaceEdited')
      .withArgs(addresses, namespaces);
  });
});
