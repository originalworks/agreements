import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments';

describe('AgreementERC1155.removeAdmin', () => {
  it('fails if sender is not an admin', async () => {
    const [, , , , , notAdmin] = await ethers.getSigners();
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000],
    });
    await expect(agreement.connect(notAdmin).removeAdmin(holders[0].account)).to
      .be.reverted;
  });

  it('fails if account is not admin', async () => {
    const [adminHolder, nonAdminHolder] = await ethers.getSigners();
    const initialSetup = await deployInitialSetup();
    const { agreement } = await deployAgreementERC1155({
      initialSetup,

      holders: [
        {
          account: adminHolder.address,
          balance: 500n,
          isAdmin: true,
          wallet: adminHolder,
        },
        {
          account: nonAdminHolder.address,
          balance: 500n,
          isAdmin: false,
          wallet: nonAdminHolder,
        },
      ],
    });
    await expect(
      agreement.connect(adminHolder).removeAdmin(nonAdminHolder.address),
    ).to.be.reverted;
  });

  it('fails if last admin was to be removed', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n],
    });
    const admin = holders[0];
    await expect(agreement.connect(admin.wallet).removeAdmin(admin.account)).to
      .be.reverted;
  });

  it('sets the admin status to false', async () => {
    const [adminHolder, nonAdminHolder] = await ethers.getSigners();

    const initialSetup = await deployInitialSetup();
    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        {
          account: adminHolder.address,
          balance: 500n,
          isAdmin: true,
          wallet: adminHolder,
        },
        {
          account: nonAdminHolder.address,
          balance: 500n,
          isAdmin: false,
          wallet: nonAdminHolder,
        },
      ],
    });

    expect(await agreement.isAdmin(adminHolder.address)).to.equal(true);
    await agreement.connect(adminHolder).addAdmin(nonAdminHolder.address);
    expect(await agreement.isAdmin(nonAdminHolder.address)).to.equal(true);
    const tx = await agreement
      .connect(nonAdminHolder)
      .removeAdmin(adminHolder.address);
    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'AdminRemoved')
      .withArgs(adminHolder.address);
    expect(await agreement.isAdmin(adminHolder.address)).to.equal(true);
  });
});
