import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('AgreementRelationsRegistry.removeChildParentRelation', () => {
  it('Can remove relation', async () => {
    const AgreementRelationsRegistry = await ethers.getContractFactory(
      'AgreementRelationsRegistry',
    )
    const registry = await AgreementRelationsRegistry.deploy()

    const [child, parent] = await ethers.getSigners()

    await registry.connect(child).registerChildParentRelation(parent.address)

    await expect(
      registry.connect(parent).registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )

    await registry.connect(child).removeChildParentRelation(parent.address)

    await expect(
      registry.connect(parent).registerChildParentRelation(child.address),
    ).to.not.be.reverted
  })

  it("Can register relation if it's no longer circular", async () => {
    const AgreementRelationsRegistry = await ethers.getContractFactory(
      'AgreementRelationsRegistry',
    )
    const registry = await AgreementRelationsRegistry.deploy()

    const [child, parent, grandParent] = await ethers.getSigners()

    await registry.connect(child).registerChildParentRelation(parent.address)
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address)

    await registry
      .connect(parent)
      .removeChildParentRelation(grandParent.address)

    await expect(
      registry.connect(grandParent).registerChildParentRelation(child.address),
    ).to.not.be.reverted
  })
  it("Doesn't affect other registered addresses", async () => {
    const AgreementRelationsRegistry = await ethers.getContractFactory(
      'AgreementRelationsRegistry',
    )
    const registry = await AgreementRelationsRegistry.deploy()

    const [child, parent, grandParent, grandParent2] = await ethers.getSigners()

    await registry.connect(child).registerChildParentRelation(parent.address)
    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent.address)

    await registry
      .connect(parent)
      .registerChildParentRelation(grandParent2.address)

    await expect(
      registry.connect(grandParent2).registerChildParentRelation(child.address),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )
  })
})
