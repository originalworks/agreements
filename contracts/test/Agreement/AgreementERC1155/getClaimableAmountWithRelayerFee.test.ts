import { expect } from 'chai';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../../helpers/deployments';
import { parseEther, parseUnits } from 'ethers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { HolderWithWallet } from '../../../helpers/types';

describe('AgreementERC1155.getClaimableAmountWithRelayerFee', () => {
  let owner: SignerWithAddress;
  let holder1: HolderWithWallet;
  let holder2: HolderWithWallet;
  let relayer: SignerWithAddress;

  beforeEach(async () => {
    let holder1Wallet, holder2Wallet: SignerWithAddress;

    [owner, holder1Wallet, holder2Wallet, relayer] = await ethers.getSigners();
    holder1 = {
      account: holder1Wallet.address,
      wallet: holder1Wallet,
      isAdmin: true,
      balance: 500n,
    };
    holder2 = {
      account: holder2Wallet.address,
      wallet: holder2Wallet,
      isAdmin: false,
      balance: 500n,
    };
  });
  it('Return amount available for claim with relayer fee cut', async () => {
    const relayerFee = parseEther('0.05');
    const feeDenominator = parseEther('1');

    const initialSetup = await deployInitialSetup({
      relayerFee,
      paymentFee: 0n,
    });
    const { splitCurrencies, feeManager } = initialSetup;
    const currencyContract = splitCurrencies[0].contract!;

    const incomingFunds = parseUnits('100', await currencyContract.decimals());
    const maxRelayerFee = parseUnits('10', await currencyContract.decimals());
    await feeManager.setMaxRelayerFee(
      await currencyContract.getAddress(),
      maxRelayerFee,
    );

    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [holder1, holder2],
    });

    const balanceBeforeHolder1 = await currencyContract.balanceOf(
      holder1.account,
    );
    const balanceBeforeHolder2 = await currencyContract.balanceOf(
      holder2.account,
    );
    const balanceBeforeRelayer = await currencyContract.balanceOf(
      relayer.address,
    );

    await currencyContract.mintTo(await agreement.getAddress(), incomingFunds);

    const claimableAmountHolder1 =
      await agreement.getClaimableAmountWithRelayerFee(
        await currencyContract.getAddress(),
        holder1.account,
      );
    const claimableAmountHolder2 =
      await agreement.getClaimableAmountWithRelayerFee(
        await currencyContract.getAddress(),
        holder2.account,
      );

    // Check for Holder1
    await agreement
      .connect(relayer)
      .claimHolderFundsWithRelayerFee(
        holder1.account,
        await currencyContract.getAddress(),
      );
    const balanceDifferenceHolder1 =
      (await currencyContract.balanceOf(holder1.account)) -
      balanceBeforeHolder1;

    let balanceDifferenceRelayer =
      (await currencyContract.balanceOf(relayer)) - balanceBeforeRelayer;

    const expectedHolder1BalanceDifferenceBeforeFee =
      (incomingFunds * holder1.balance) / (await agreement.totalSupply());

    expect(balanceDifferenceHolder1).to.equal(
      claimableAmountHolder1.claimableAmount,
    );
    expect(balanceDifferenceHolder1).to.equal(
      expectedHolder1BalanceDifferenceBeforeFee -
        (expectedHolder1BalanceDifferenceBeforeFee * relayerFee) /
          feeDenominator,
    );

    expect(balanceDifferenceRelayer).to.equal(
      claimableAmountHolder1.relayerCut,
    );
    expect(balanceDifferenceRelayer).to.equal(
      (expectedHolder1BalanceDifferenceBeforeFee * relayerFee) / feeDenominator,
    );

    // check for Holder2
    await agreement
      .connect(relayer)
      .claimHolderFundsWithRelayerFee(
        holder2.account,
        await currencyContract.getAddress(),
      );

    const balanceDifferenceHolder2 =
      (await currencyContract.balanceOf(holder2.account)) -
      balanceBeforeHolder2;

    balanceDifferenceRelayer =
      (await currencyContract.balanceOf(relayer)) - balanceBeforeRelayer;

    const expectedHolder2BalanceDifferenceBeforeFee =
      (incomingFunds * holder2.balance) / (await agreement.totalSupply());

    expect(balanceDifferenceHolder2).to.equal(
      claimableAmountHolder1.claimableAmount,
    );
    expect(balanceDifferenceHolder2).to.equal(
      expectedHolder2BalanceDifferenceBeforeFee -
        (expectedHolder2BalanceDifferenceBeforeFee * relayerFee) /
          feeDenominator,
    );

    expect(balanceDifferenceRelayer).to.equal(
      claimableAmountHolder1.relayerCut + claimableAmountHolder2.relayerCut,
    );
    expect(balanceDifferenceRelayer).to.equal(
      (incomingFunds * relayerFee) / feeDenominator,
    );
  });
  it('Works with payment fee applied', async () => {
    const relayerFee = parseEther('0.05');
    const paymentFee = parseEther('0.01');
    const feeDenominator = parseEther('1');

    const initialSetup = await deployInitialSetup({
      relayerFee,
      paymentFee,
    });
    const { splitCurrencies, feeManager } = initialSetup;
    const currencyContract = splitCurrencies[0].contract!;

    const incomingFunds = parseUnits('100', await currencyContract.decimals());
    const maxRelayerFee = parseUnits('10', await currencyContract.decimals());
    await feeManager.setMaxRelayerFee(
      await currencyContract.getAddress(),
      maxRelayerFee,
    );

    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [holder1],
    });

    const holderBalanceBefore = await currencyContract.balanceOf(
      holder1.account,
    );

    const relayerBalanceBefore = await currencyContract.balanceOf(
      relayer.address,
    );

    await currencyContract.mintTo(await agreement.getAddress(), incomingFunds);

    const claimableAmount = await agreement.getClaimableAmountWithRelayerFee(
      await currencyContract.getAddress(),
      holder1.account,
    );

    const expectedHolderIncomeAfterPaymentFee =
      incomingFunds - (incomingFunds * paymentFee) / feeDenominator;
    const expectedHolderIncomeAfterAllFees =
      expectedHolderIncomeAfterPaymentFee -
      (expectedHolderIncomeAfterPaymentFee * relayerFee) / feeDenominator;

    await agreement
      .connect(relayer)
      .claimHolderFundsWithRelayerFee(
        holder1.account,
        await currencyContract.getAddress(),
      );
    const holderBalanceDifference =
      (await currencyContract.balanceOf(holder1.account)) - holderBalanceBefore;

    const relayerBalanceDifference =
      (await currencyContract.balanceOf(relayer)) - relayerBalanceBefore;

    expect(expectedHolderIncomeAfterAllFees)
      .to.equal(holderBalanceDifference)
      .to.equal(claimableAmount.claimableAmount);
    expect((expectedHolderIncomeAfterPaymentFee * relayerFee) / feeDenominator)
      .to.equal(relayerBalanceDifference)
      .to.equal(claimableAmount.relayerCut);
  });
  it('Respect maxRelayerFee', async () => {
    const relayerFee = parseEther('0.2'); // 20%

    const initialSetup = await deployInitialSetup({
      relayerFee,
      paymentFee: 0n,
    });
    const { splitCurrencies, feeManager } = initialSetup;
    const currencyContract = splitCurrencies[0].contract!;

    const incomingFunds = parseUnits('100', await currencyContract.decimals());

    // less than incomingFunds * relayerFee / feeDenominator
    const maxRelayerFee = parseUnits('1', await currencyContract.decimals());

    await feeManager.setMaxRelayerFee(
      await currencyContract.getAddress(),
      maxRelayerFee,
    );

    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [holder1],
    });

    await currencyContract.mintTo(await agreement.getAddress(), incomingFunds);

    const claimableAmount = await agreement.getClaimableAmountWithRelayerFee(
      await currencyContract.getAddress(),
      holder1.account,
    );
    expect(claimableAmount.relayerCut).to.equal(maxRelayerFee);
    expect(claimableAmount.claimableAmount).to.equal(
      incomingFunds - maxRelayerFee,
    );
  });
});
