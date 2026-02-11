import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../../helpers/deployments';
import { parseEther } from 'ethers';

describe('(FUNCTIONAL) AgreementERC1155: Funds collection flow', () => {
  async function setup() {
    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther('0.1'),
    });
    const { feeManager, splitCurrencies } = initialSetup;
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [500n, 500n],
    });

    const currencyContract = splitCurrencies[0].contract;

    if (!currencyContract) {
      throw new Error('No currencyContract found');
    }

    await currencyContract.mintTo(
      await agreement.getAddress(),
      parseEther('100'),
    );
    return { feeManager, holders, currencyContract, agreement };
  }
  it('User can collect income after feeManager collected fee', async () => {
    const { feeManager, holders, currencyContract, agreement } = await setup();
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await currencyContract.getAddress(),
    );

    expect(
      await currencyContract.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));

    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(0);
    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(0);

    await agreement.claimHolderFunds(
      holders[0].account,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await currencyContract.getAddress(),
    );

    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );
    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );
  });
  it('User can collect income after feeManager collected fee (collected in-between)', async () => {
    const { feeManager, holders, currencyContract, agreement } = await setup();

    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(0n);
    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(0n);

    await agreement.claimHolderFunds(
      holders[0].account,
      await currencyContract.getAddress(),
    );
    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );

    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await currencyContract.getAddress(),
    );

    expect(
      await currencyContract.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));

    await agreement.claimHolderFunds(
      holders[1].account,
      await currencyContract.getAddress(),
    );

    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );
  });
  it('Can collect fee after all users collected income', async () => {
    const { feeManager, holders, currencyContract, agreement } = await setup();
    await agreement.claimHolderFunds(
      holders[0].account,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await currencyContract.getAddress(),
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await currencyContract.getAddress(),
    );
    expect(
      await currencyContract.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));
    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );
    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );
  });
  it('Can collect fee and claim holder funds with incoming transfers at different time', async () => {
    const { feeManager, holders, currencyContract, agreement } = await setup();
    await agreement.claimHolderFunds(
      holders[0].account,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await currencyContract.getAddress(),
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await currencyContract.getAddress(),
    );
    expect(
      await currencyContract.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));
    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );
    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );

    await currencyContract.mintTo(
      await agreement.getAddress(),
      parseEther('200'),
    );

    await agreement.claimHolderFunds(
      holders[0].account,
      await currencyContract.getAddress(),
    );
    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(
      parseEther('135'), // 45 + 90 = 135
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await currencyContract.getAddress(),
    );
    expect(
      await currencyContract.balanceOf(await feeManager.getAddress()),
    ).to.equal(
      parseEther('30'), // 10 + 20 = 30
    );
    await currencyContract.mintTo(
      await agreement.getAddress(),
      parseEther('300'),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await currencyContract.getAddress(),
    );
    expect(await currencyContract.balanceOf(holders[1].account)).to.equal(
      parseEther('270'), // 45 + 90 + 135 = 270
    );

    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await currencyContract.getAddress(),
    );
    expect(
      await currencyContract.balanceOf(await feeManager.getAddress()),
    ).to.equal(
      parseEther('60'), // 10 + 20 + 30 = 60
    );

    await agreement.claimHolderFunds(
      holders[0].account,
      await currencyContract.getAddress(),
    );
    expect(await currencyContract.balanceOf(holders[0].account)).to.equal(
      parseEther('270'), // 45 + 90 + 135 = 270
    );
  });

  it('emits NativeCoinReceived when received native coins', async () => {
    const [owner] = await ethers.getSigners();
    const value = parseEther('2.34');
    const { agreement } = await setup();

    const tx = await owner.sendTransaction({
      value,
      to: await agreement.getAddress(),
    });

    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'NativeCoinReceived')
      .withArgs(owner.address, value);
  });
});
