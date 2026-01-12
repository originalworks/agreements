import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAgreementRelationsRegistry } from '../../scripts/actions/deployAgreementRelationsRegistry';
import { AgreementFactoryMock, AgreementRelationsRegistry } from 'typechain';

describe('AgreementRelationsRegistry.removeChildParentRelation', () => {
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

  it('removes only relations between agreements (silent fail)', async () => {
    const [child, parent] = await ethers.getSigners();

    await agreementFactoryMock.setAlwaysTrue(false);

    await agreementFactoryMock.addAgreement(child.address);
    await agreementFactoryMock.addAgreement(parent.address);

    await registry.connect(child).registerChildParentRelation(parent.address);

    expect(await registry.parentsOf(child.address, 0)).to.equal(parent.address);

    // parent is no longer agreement, can't remove relation
    await agreementFactoryMock.removeAgreement(parent.address);
    // silent fail, nothing happened
    await registry.connect(child).removeChildParentRelation(parent.address);
    expect(await registry.parentsOf(child.address, 0)).to.equal(parent.address);

    // child is no longer agreement
    await agreementFactoryMock.removeAgreement(child.address);
    await registry.connect(child).removeChildParentRelation(parent.address);
    expect(await registry.parentsOf(child.address, 0)).to.equal(parent.address);

    // child and parent are both agreement again
    await agreementFactoryMock.addAgreement(child.address);
    await agreementFactoryMock.addAgreement(parent.address);
    // relation is removed
    await registry.connect(child).removeChildParentRelation(parent.address);
    // read fails because there is no relation
    await expect(registry.parentsOf(child.address, 0)).to.be.reverted;
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
