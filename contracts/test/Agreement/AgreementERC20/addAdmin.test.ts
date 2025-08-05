import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';

describe('AgreementERC20.addAdmin', () => {
  it('fails if sender is not an admin', async () => {
    const [, , , , notAdmin, otherAccount] = await ethers.getSigners();
    const initialSetup = await deployInitialSetup();
    const { agreement } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });
    await expect(agreement.connect(notAdmin).addAdmin(otherAccount.address)).to
      .be.reverted;
  });

  it('fails if account is null account', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });
    await expect(agreement.addAdmin(ethers.ZeroAddress)).to.be.reverted;
  });

  it('fails if account is already an admin', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });
    const admin = holders[0];
    await expect(agreement.addAdmin(admin.account)).to.be.reverted;
  });

  it('sets the admin status', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500n, 500n],
    });
    const admin = holders[0];
    const holder = holders[1];
    expect(await agreement.isAdmin(holder.account)).to.equal(false);

    const tx = await agreement.connect(admin.wallet).addAdmin(holder.account);

    expect(await agreement.isAdmin(holder.account)).to.equal(true);
    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'AdminAdded')
      .withArgs(holder.account);
  });
});
