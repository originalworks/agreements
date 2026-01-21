import { expect } from 'chai';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments';
import { parseEther } from 'ethers';

describe('AgreementERC1155.getClaimableAmount', () => {
  it('Return amount available for claim and the relayer fee', async () => {
    const incomingFunds = 100000n;
    const initialSetup = await deployInitialSetup();
    const { splitCurrencies, feeManager } = initialSetup;
    const paymentFee = await feeManager.paymentFee();
    const holder1Shares = 600n;
    const holder2Shares = 400n;

    const currencyContract = splitCurrencies[0].contract;
    if (!currencyContract) {
      throw new Error('No currencyContract found');
    }

    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [holder1Shares, holder2Shares],
    });
    const holder1 = holders[0];
    const holder2 = holders[1];

    const tokenBalanceBeforeHolder1 = await currencyContract.balanceOf(
      holder1.account,
    );
    const tokenBalanceBeforeHolder2 = await currencyContract.balanceOf(
      holder2.account,
    );

    await currencyContract.mintTo(await agreement.getAddress(), incomingFunds);

    const claimableAmountHolder1 = await agreement.getClaimableAmount(
      await currencyContract.getAddress(),
      holder1.account,
      false,
    );
    const claimableAmountHolder2 = await agreement.getClaimableAmount(
      await currencyContract.getAddress(),
      holder2.account,
      false,
    );

    const availableFee = await agreement.getAvailableFee(currencyContract);

    await agreement.claimHolderFunds(
      holder1.account,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      holder2.account,
      await currencyContract.getAddress(),
    );

    const tokenBalanceAfterHolder1 = await currencyContract.balanceOf(
      holder1.account,
    );
    const tokenBalanceAfterHolder2 = await currencyContract.balanceOf(
      holder2.account,
    );

    expect(tokenBalanceAfterHolder1 - tokenBalanceBeforeHolder1).to.equal(
      claimableAmountHolder1.claimableAmount,
    );
    expect(tokenBalanceAfterHolder2 - tokenBalanceBeforeHolder2).to.equal(
      claimableAmountHolder2.claimableAmount,
    );

    expect((incomingFunds * paymentFee) / parseEther('1')).to.equal(
      availableFee,
    );
  });
});
