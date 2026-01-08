import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAgreementRelationsRegistry } from '../../scripts/actions/deployAgreementRelationsRegistry';

describe('AgreementRelationsRegistry.registerInitialRelation', () => {
  it('agreementFactory can register initial relation for any child and parent', async () => {
    const [, , agreementFactory, child, parent] = await ethers.getSigners();

    const registry = await deployAgreementRelationsRegistry();

    await registry.setAgreementFactoryAddress(agreementFactory.address);

    await expect(
      registry
        .connect(agreementFactory)
        .registerInitialRelation(child.address, parent.address),
    ).not.to.be.reverted;
  });

  it('only agreementFactory can register initial relation', async () => {
    const [, , agreementFactory, differentAccount, child, parent] =
      await ethers.getSigners();

    const registry = await deployAgreementRelationsRegistry();

    await registry.setAgreementFactoryAddress(agreementFactory.address);

    await expect(
      registry
        .connect(differentAccount)
        .registerInitialRelation(child.address, parent.address),
    ).to.be.revertedWithCustomError(registry, 'AccessDenied');
  });
});
