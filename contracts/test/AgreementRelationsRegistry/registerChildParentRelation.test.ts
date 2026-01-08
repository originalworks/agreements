import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAgreementRelationsRegistry } from '../../scripts/actions/deployAgreementRelationsRegistry';
import { AgreementFactoryMock, AgreementRelationsRegistry } from 'typechain';
import { deployInitialSetup } from '../../test/helpers/deployments';

describe('AgreementRelationsRegistry.registerChildParentRelation', () => {
  let registry: AgreementRelationsRegistry;
  let agreementFactory: AgreementFactoryMock;
  before(async () => {
    const AgreementFactory = await ethers.getContractFactory(
      'AgreementFactoryMock',
    );
    agreementFactory = await AgreementFactory.deploy();
  });
  beforeEach(async () => {
    registry = await deployAgreementRelationsRegistry();
    await registry.setAgreementFactoryAddress(
      await agreementFactory.getAddress(),
    );
  });
  it('only agreements can register their relations', async () => {
    const { agreementRelationsRegistry } = await deployInitialSetup();

    const [child, parent] = await ethers.getSigners();

    await expect(
      agreementRelationsRegistry
        .connect(child)
        .registerChildParentRelation(parent.address),
    ).to.be.revertedWithCustomError(agreementRelationsRegistry, 'AccessDenied');
  });
  it('can register chained relations if not circular', async () => {
    const [child, parent, parent2, grandParent, grandGrandParent] =
      await ethers.getSigners();

    await expect(
      registry.connect(child).registerChildParentRelation(parent.address),
    ).to.not.be.reverted;

    await expect(
      registry.connect(child).registerChildParentRelation(parent2.address),
    ).to.not.be.reverted;

    await expect(
      registry.connect(parent).registerChildParentRelation(grandParent.address),
    ).to.not.be.reverted;

    await expect(
      registry
        .connect(grandParent)
        .registerChildParentRelation(grandGrandParent.address),
    ).to.not.be.reverted;
  });

  it('Reverts if try to register first level circular relation', async () => {
    const [child, parent] = await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);

    await expect(
      registry.connect(parent).registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    );
  });

  it('Reverts if try to register second level circular relation', async () => {
    const [child, parent, grandParent] = await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address);

    await expect(
      registry.connect(grandParent).registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    );
  });

  it('Reverts if try to register third level circular relation', async () => {
    const [child, parent, grandParent, grandGrandParent] =
      await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address);
    await registry
      .connect(grandParent)
      .registerChildParentRelation(grandGrandParent.address);

    await expect(
      registry
        .connect(grandGrandParent)
        .registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    );
  });

  it('Reverts if try to register fourth level circular relation', async () => {
    const [
      child,
      parent,
      grandParent,
      grandGrandParent,
      grandGrandGrandParent,
    ] = await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address);
    await registry
      .connect(grandParent)
      .registerChildParentRelation(grandGrandParent.address);
    await registry
      .connect(grandGrandParent)
      .registerChildParentRelation(grandGrandGrandParent.address);

    await expect(
      registry
        .connect(grandGrandGrandParent)
        .registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    );
  });
});
