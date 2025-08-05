import { expect } from 'chai';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { parseEther } from 'ethers';

describe('AgreementERC20.getClaimableAmount', () => {
  it('Return amount available for claim and the applied fee', async () => {
    const incomingFunds = 100000n;
    const initialSetup = await deployInitialSetup();
    const { lendingToken, feeManager } = initialSetup;
    const paymentFee = await feeManager.paymentFee();
    const holder1Shares = 600n;
    const holder2Shares = 400n;

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [holder1Shares, holder2Shares],
    });
    const holder1 = holders[0];
    const holder2 = holders[1];
    const agreementTotalSupply = await agreement.totalSupply();

    const tokenBalanceBeforeHolder1 = await lendingToken.balanceOf(
      holder1.account,
    );
    const tokenBalanceBeforeHolder2 = await lendingToken.balanceOf(
      holder2.account,
    );

    await lendingToken.mintTo(await agreement.getAddress(), incomingFunds);

    const claimableAmountHolder1 = await agreement.getClaimableAmount(
      await lendingToken.getAddress(),
      holder1.account,
    );
    const claimableAmountHolder2 = await agreement.getClaimableAmount(
      await lendingToken.getAddress(),
      holder2.account,
    );

    await agreement.claimHolderFunds(
      holder1.account,
      await lendingToken.getAddress(),
    );
    await agreement.claimHolderFunds(
      holder2.account,
      await lendingToken.getAddress(),
    );

    const tokenBalanceAfterHolder1 = await lendingToken.balanceOf(
      holder1.account,
    );
    const tokenBalanceAfterHolder2 = await lendingToken.balanceOf(
      holder2.account,
    );

    expect(tokenBalanceAfterHolder1 - tokenBalanceBeforeHolder1).to.equal(
      claimableAmountHolder1.claimableAmount,
    );
    expect(tokenBalanceAfterHolder2 - tokenBalanceBeforeHolder2).to.equal(
      claimableAmountHolder2.claimableAmount,
    );

    expect(
      (((incomingFunds * holder1Shares) / agreementTotalSupply) * paymentFee) /
        parseEther('1'),
    ).to.equal(claimableAmountHolder1.fee);

    expect(
      (((incomingFunds * holder2Shares) / agreementTotalSupply) * paymentFee) /
        parseEther('1'),
    ).to.equal(claimableAmountHolder2.fee);
  });
});
