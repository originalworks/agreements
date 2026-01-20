import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';

describe('AgreementERC20.upgradeToAndCall', () => {
  it('Only admin can upgrade', async () => {
    const initialSetup = await deployInitialSetup();
    const AgreementERC20WithUpgrade = await ethers.getContractFactory(
      'AgreementERC20WithUpgrade',
    );
    const newImplementation = await AgreementERC20WithUpgrade.deploy();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n, 1000n],
    });
    const admin = holders[0];
    const nonAdmin = holders[1];

    expect(await agreement.isAdmin(admin.account)).to.equal(true);
    expect(await agreement.isAdmin(nonAdmin.account)).to.equal(false);

    await expect(
      agreement
        .connect(nonAdmin.wallet)
        .upgradeToAndCall(await newImplementation.getAddress(), '0x'),
    ).to.be.revertedWithCustomError(newImplementation, 'OnlyAdminAllowed');

    await expect(
      agreement
        .connect(admin.wallet)
        .upgradeToAndCall(await newImplementation.getAddress(), '0x'),
    ).to.not.be.reverted;
  });
});
