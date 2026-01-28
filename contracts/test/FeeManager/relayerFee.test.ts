import { expect } from 'chai';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments';
import { parseEther, parseUnits } from 'ethers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { HolderWithWallet } from '../../helpers/types';

describe('FeeManager: relayer fee e2e tests', () => {
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

  it('RelayerFee and maxRelayerFee can be changed by FeeManager owner', async () => {
    const feeDenominator = parseEther('1');
    const initialRelayerFee = parseEther('0.05');
    const newRelayerFee = parseEther('0.07');

    const initialSetup = await deployInitialSetup({
      relayerFee: initialRelayerFee,
      paymentFee: 0n,
    });
    const { splitCurrencies, feeManager } = initialSetup;
    const currencyContract = splitCurrencies[0].contract!;

    const incomingFunds = parseUnits('100', await currencyContract.decimals());

    const initialMaxRelayerFee = parseUnits(
      '10',
      await currencyContract.decimals(),
    );

    const newMaxRelayerFee = parseUnits('1', await currencyContract.decimals());

    await feeManager
      .connect(owner)
      .setMaxRelayerFee(
        await currencyContract.getAddress(),
        initialMaxRelayerFee,
      );

    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [holder1],
    });

    await currencyContract.mintTo(await agreement.getAddress(), incomingFunds);

    // check for initial fee values
    let claimableAmount = await agreement.getClaimableAmountWithRelayerFee(
      await currencyContract.getAddress(),
      holder1.account,
    );
    expect(claimableAmount.relayerCut).to.equal(
      (incomingFunds * initialRelayerFee) / feeDenominator,
    );
    expect(claimableAmount.claimableAmount).to.equal(
      incomingFunds - (incomingFunds * initialRelayerFee) / feeDenominator,
    );

    // change relayerFee and check again
    await feeManager.connect(owner).setRelayerFee(newRelayerFee);

    claimableAmount = await agreement.getClaimableAmountWithRelayerFee(
      await currencyContract.getAddress(),
      holder1.account,
    );

    expect(claimableAmount.relayerCut).to.equal(
      (incomingFunds * newRelayerFee) / feeDenominator,
    );
    expect(claimableAmount.claimableAmount).to.equal(
      incomingFunds - (incomingFunds * newRelayerFee) / feeDenominator,
    );

    // change maxRelayerFee and check one more time
    await feeManager
      .connect(owner)
      .setMaxRelayerFee(currencyContract, newMaxRelayerFee);

    claimableAmount = await agreement.getClaimableAmountWithRelayerFee(
      await currencyContract.getAddress(),
      holder1.account,
    );

    expect(claimableAmount.relayerCut).to.equal(newMaxRelayerFee);
    expect(claimableAmount.claimableAmount).to.equal(
      incomingFunds - newMaxRelayerFee,
    );
  });
  it('Fee can be changed between two claims', async () => {
    const feeDenominator = parseEther('1');
    const initialRelayerFee = parseEther('0.05');
    const newRelayerFee = parseEther('0.07');

    const initialSetup = await deployInitialSetup({
      relayerFee: initialRelayerFee,
      paymentFee: 0n,
    });

    const { splitCurrencies, feeManager } = initialSetup;
    const currencyContract = splitCurrencies[0].contract!;
    const incomingFunds = parseUnits('100', await currencyContract.decimals());
    const maxRelayerFee = parseUnits('10', await currencyContract.decimals());

    await feeManager
      .connect(owner)
      .setMaxRelayerFee(await currencyContract.getAddress(), maxRelayerFee);

    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [holder1, holder2],
    });
    const agreementTotalSupply = await agreement.totalSupply();

    const holder1BalanceBefore = await currencyContract.balanceOf(
      holder1.account,
    );
    const holder2BalanceBefore = await currencyContract.balanceOf(
      holder2.account,
    );
    const relayerBalanceBefore = await currencyContract.balanceOf(
      holder1.account,
    );

    await currencyContract.mintTo(await agreement.getAddress(), incomingFunds);

    // claim for holder1 with initialRelayerFee applied
    await agreement
      .connect(relayer)
      .claimHolderFundsWithRelayerFee(holder1.account, currencyContract);

    const holder1Income =
      (await currencyContract.balanceOf(holder1.account)) -
      holder1BalanceBefore;
    let relayerIncome =
      (await currencyContract.balanceOf(relayer)) - relayerBalanceBefore;
    const expectedHolder1IncomeBeforeRelayerFee =
      (incomingFunds * holder1.balance) / agreementTotalSupply;
    const expectedHolder1RelayerFee =
      (expectedHolder1IncomeBeforeRelayerFee * initialRelayerFee) /
      feeDenominator;

    expect(holder1Income).to.equal(
      expectedHolder1IncomeBeforeRelayerFee - expectedHolder1RelayerFee,
    );
    expect(relayerIncome).to.equal(expectedHolder1RelayerFee);

    // change of relayerFee
    await feeManager.connect(owner).setRelayerFee(newRelayerFee);
    // for holder2 claim newRelayerFee will be applied
    await agreement
      .connect(relayer)
      .claimHolderFundsWithRelayerFee(holder2.account, currencyContract);

    const holder2Income =
      (await currencyContract.balanceOf(holder2.account)) -
      holder2BalanceBefore;
    const expectedHolder2IncomeBeforeRelayerFee =
      (incomingFunds * holder2.balance) / agreementTotalSupply;
    const expectedHolder2RelayerFee =
      (expectedHolder2IncomeBeforeRelayerFee * newRelayerFee) / feeDenominator;
    relayerIncome =
      (await currencyContract.balanceOf(relayer)) - relayerBalanceBefore;

    expect(holder2Income).to.equal(
      expectedHolder2IncomeBeforeRelayerFee - expectedHolder2RelayerFee,
    );
    expect(relayerIncome).to.equal(
      expectedHolder1RelayerFee + expectedHolder2RelayerFee,
    );
  });
});
