import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAgreementRelationsRegistry } from '../../scripts/actions/deployAgreementRelationsRegistry';
import { AgreementFactoryMock, AgreementRelationsRegistry } from 'typechain';

describe('AgreementRelationsRegistry.registerChildParentRelation', () => {
  let registry: AgreementRelationsRegistry;
  let agreementFactoryMock: AgreementFactoryMock;

  beforeEach(async () => {
    const AgreementFactory = await ethers.getContractFactory(
      'AgreementFactoryMock',
    );
    agreementFactoryMock = await AgreementFactory.deploy();
    registry = await deployAgreementRelationsRegistry();
    await registry.setAgreementFactoryAddress(
      await agreementFactoryMock.getAddress(),
    );
  });
  it('only agreements can register their relations (silent fail)', async () => {
    await agreementFactoryMock.setAlwaysTrue(false);

    const [child, parent] = await ethers.getSigners();

    // silent fail, nothing happens
    await registry.connect(child).registerChildParentRelation(parent.address);

    // read fails beacuse there is no parent at index 0
    await expect(registry.parentsOf(child, 0)).to.be.reverted;

    // only child is recognized as an agreement, still no effect
    await agreementFactoryMock.addAgreement(child);
    await registry.connect(child).registerChildParentRelation(parent.address);
    await expect(registry.parentsOf(child, 0)).to.be.reverted;

    // child and parent are recognized as agreements, relation is added
    await agreementFactoryMock.addAgreement(parent);
    await registry.connect(child).registerChildParentRelation(parent.address);
    expect(await registry.parentsOf(child, 0)).to.equal(parent.address);
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
