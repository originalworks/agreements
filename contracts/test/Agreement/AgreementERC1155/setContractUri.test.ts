import { expect } from 'chai';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../../helpers/deployments';

describe('AgreementERC1155.setContractUri', () => {
  const newContractUri = `https://newContractUri.com`;

  it('fails if sender is not an admin', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [500n, 500n],
    });
    const nonAdminHolder = holders[1];
    expect(await agreement.isAdmin(nonAdminHolder.account)).to.equal(false);
    await expect(
      agreement.connect(nonAdminHolder.wallet).setContractUri(newContractUri),
    ).to.be.reverted;
  });
  it('sets new contract uri if sender is an admin', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [500n, 500n],
    });
    const adminHolder = holders[0];
    expect(await agreement.isAdmin(adminHolder.account)).to.equal(true);
    const tx = await agreement
      .connect(adminHolder.wallet)
      .setContractUri(newContractUri);

    expect(await agreement.contractURI()).to.equal(newContractUri);
    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'ContractUriChanged')
      .withArgs(newContractUri);
  });
});
