import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAgreementRelationsRegistry } from '../../scripts/actions/deployAgreementRelationsRegistry';
import { AgreementFactoryMock, AgreementRelationsRegistry } from 'typechain';
import { deployInitialSetup } from '../../test/helpers/deployments';

describe('AgreementRelationsRegistry.removeChildParentRelation', () => {
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

  it('only agreements can remove their relations', async () => {
    const [child, parent] = await ethers.getSigners();
    const agreementFactoryMockAddress = await agreementFactory.getAddress();

    const {
      agreementRelationsRegistry,
      agreementFactory: realAgreementFactory,
    } = await deployInitialSetup();

    await agreementRelationsRegistry.setAgreementFactoryAddress(
      agreementFactoryMockAddress,
    );
    await registry.connect(child).registerChildParentRelation(parent.address);
    await agreementRelationsRegistry.setAgreementFactoryAddress(
      await realAgreementFactory.getAddress(),
    );

    await expect(
      agreementRelationsRegistry
        .connect(child)
        .removeChildParentRelation(parent.address),
    ).to.be.revertedWithCustomError(agreementRelationsRegistry, 'AccessDenied');
  });

  it('Can remove relation', async () => {
    const [child, parent] = await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);

    await expect(
      registry.connect(parent).registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    );

    await registry.connect(child).removeChildParentRelation(parent.address);

    await expect(
      registry.connect(parent).registerChildParentRelation(child.address),
    ).to.not.be.reverted;
  });

  it("Can register relation if it's no longer circular", async () => {
    const [child, parent, grandParent] = await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address);

    await registry
      .connect(parent)
      .removeChildParentRelation(grandParent.address);

    await expect(
      registry.connect(grandParent).registerChildParentRelation(child.address),
    ).to.not.be.reverted;
  });
  it("Doesn't affect other registered addresses", async () => {
    const [child, parent, grandParent, grandParent2] =
      await ethers.getSigners();

    await registry.connect(child).registerChildParentRelation(parent.address);
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address);

    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent2.address);

    await expect(
      registry.connect(grandParent2).registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    );
  });
});
