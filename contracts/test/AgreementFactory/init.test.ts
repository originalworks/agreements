import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { deployInitialSetup } from '../helpers/deployments';
import { InitialSetup, TokenStandard } from '../helpers/types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('AgreementFactory.initialize', () => {
  let owner: SignerWithAddress;
  let initialSetup: InitialSetup;

  let agreementERC20Implementation: string;
  let agreementERC1155Implementation: string;
  let feeManager: string;
  let agreementRelationsRegistry: string;
  let currencyManager: string;
  let fallbackVault: string;
  let namespaceRegistry: string;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    initialSetup = await deployInitialSetup();

    agreementERC20Implementation =
      await initialSetup.agreementERC20Implementation.getAddress();
    agreementERC1155Implementation =
      await initialSetup.agreementERC1155Implementation.getAddress();
    feeManager = await initialSetup.feeManager.getAddress();
    agreementRelationsRegistry =
      await initialSetup.agreementRelationsRegistry.getAddress();
    currencyManager = await initialSetup.currencyManager.getAddress();
    fallbackVault = await initialSetup.fallbackVault.getAddress();
    namespaceRegistry = await initialSetup.namespaceRegistry.getAddress();
  });

  it('correctly initializes values', async () => {
    const AgreementFactory =
      await ethers.getContractFactory('AgreementFactory');
    const agreementFactory = await upgrades.deployProxy(
      AgreementFactory,
      [
        agreementERC20Implementation,
        agreementERC1155Implementation,
        feeManager,
        agreementRelationsRegistry,
        currencyManager,
        fallbackVault,
        namespaceRegistry,
      ],
      { kind: 'uups' },
    );
    const implementations =
      await agreementFactory.getAgreementImplementations();

    expect(await agreementFactory.owner()).to.equal(owner.address);
    expect(implementations['agreementERC20']).to.equal(
      agreementERC20Implementation,
    );
    expect(implementations['agreementERC1155']).to.equal(
      agreementERC1155Implementation,
    );
  });
  it('emits events', async () => {
    const AgreementFactory =
      await ethers.getContractFactory('AgreementFactory');
    const block = await ethers.provider.getBlockNumber();
    const agreementFactory = await upgrades.deployProxy(
      AgreementFactory,
      [
        agreementERC20Implementation,
        agreementERC1155Implementation,
        feeManager,
        agreementRelationsRegistry,
        currencyManager,
        fallbackVault,
        namespaceRegistry,
      ],
      { kind: 'uups' },
    );

    const agreementImplementationChangedEvents =
      await agreementFactory.queryFilter(
        agreementFactory.getEvent('AgreementImplementationChanged'),
        block,
      );

    const setImplementationERC20Event =
      agreementImplementationChangedEvents.find(
        (event) => event.args.tokenStandard === BigInt(TokenStandard.ERC20),
      );

    const setImplementationERC1155Event =
      agreementImplementationChangedEvents.find(
        (event) => event.args.tokenStandard === BigInt(TokenStandard.ERC1155),
      );

    const ownershipTransferredEvent = await agreementFactory.queryFilter(
      agreementFactory.getEvent('OwnershipTransferred'),
      block,
    );

    expect(
      setImplementationERC20Event?.args['agreementImplementation'],
    ).to.equal(agreementERC20Implementation);
    expect(
      setImplementationERC1155Event?.args['agreementImplementation'],
    ).to.equal(agreementERC1155Implementation);

    expect(ownershipTransferredEvent[0].args.previousOwner).to.equal(
      ethers.ZeroAddress,
    );
    expect(ownershipTransferredEvent[0].args.newOwner).to.equal(owner.address);
  });
  it('cannot be called twice', async () => {
    await expect(
      initialSetup.agreementFactory
        .connect(owner)
        .initialize(
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ),
    ).to.be.reverted;
  });
  it('fails for initialize with address zero', async () => {
    const AgreementFactory =
      await ethers.getContractFactory('AgreementFactory');

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          ethers.ZeroAddress,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'ZeroAddressNotAllowed',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          ethers.ZeroAddress,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'ZeroAddressNotAllowed',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          ethers.ZeroAddress,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          ethers.ZeroAddress,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          ethers.ZeroAddress,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          ethers.ZeroAddress,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );
  });
  it('fails for non-contract', async () => {
    const AgreementFactory =
      await ethers.getContractFactory('AgreementFactory');

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          Wallet.createRandom().address,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'NoCodeAddress',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          Wallet.createRandom().address,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'NoCodeAddress',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          Wallet.createRandom().address,
          agreementRelationsRegistry,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          Wallet.createRandom().address,
          currencyManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          Wallet.createRandom().address,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          currencyManager,
          Wallet.createRandom().address,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWithCustomError(
      { interface: AgreementFactory.interface },
      'InvalidInterface',
    );
  });
});
