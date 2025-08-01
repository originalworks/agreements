import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { parseEther } from 'ethers';

describe('(FUNCTIONAL) AgreementERC20: Funds collection flow', () => {
  async function setup() {
    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther('0.1'),
    });
    const { feeManager, lendingToken } = initialSetup;
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500, 500],
    });

    await lendingToken.mintTo(await agreement.getAddress(), parseEther('100'));
    return { feeManager, holders, lendingToken, agreement };
  }
  it('User can collect income after feeManager collected fee', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup();
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await lendingToken.getAddress(),
    );

    expect(
      await lendingToken.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));

    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(0);
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(0);

    await agreement.claimHolderFunds(
      holders[0].account,
      await lendingToken.getAddress(),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await lendingToken.getAddress(),
    );

    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );
  });
  it('User can collect income after feeManager collected fee (collected in-between)', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup();

    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(0);
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(0);

    await agreement.claimHolderFunds(
      holders[0].account,
      await lendingToken.getAddress(),
    );
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );

    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await lendingToken.getAddress(),
    );

    expect(
      await lendingToken.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));

    await agreement.claimHolderFunds(
      holders[1].account,
      await lendingToken.getAddress(),
    );

    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );
  });
  it('Can collect fee after all users collected income', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup();
    await agreement.claimHolderFunds(
      holders[0].account,
      await lendingToken.getAddress(),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await lendingToken.getAddress(),
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await lendingToken.getAddress(),
    );
    expect(
      await lendingToken.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );
  });
  it('Can collect fee and user income with funds incoming at different time', async () => {
    const { feeManager, holders, lendingToken, agreement } = await setup();
    await agreement.claimHolderFunds(
      holders[0].account,
      await lendingToken.getAddress(),
    );
    await agreement.claimHolderFunds(
      holders[1].account,
      await lendingToken.getAddress(),
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await lendingToken.getAddress(),
    );
    expect(
      await lendingToken.balanceOf(await feeManager.getAddress()),
    ).to.equal(parseEther('10'));
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      parseEther('45'),
    );
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      parseEther('45'),
    );

    await lendingToken.mintTo(await agreement.getAddress(), parseEther('200'));

    await agreement.claimHolderFunds(
      holders[0].account,
      await lendingToken.getAddress(),
    );
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
      parseEther('135'), // 45 + 90 = 135
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await lendingToken.getAddress(),
    );
    expect(
      await lendingToken.balanceOf(await feeManager.getAddress()),
    ).to.equal(
      parseEther('30'), // 10 + 20 = 30
    );
    await lendingToken.mintTo(await agreement.getAddress(), parseEther('300'));
    await agreement.claimHolderFunds(
      holders[1].account,
      await lendingToken.getAddress(),
    );
    expect(await lendingToken.balanceOf(holders[1].account)).to.equal(
      parseEther('270'), // 45 + 90 + 135 = 270
    );

    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      await lendingToken.getAddress(),
    );
    expect(
      await lendingToken.balanceOf(await feeManager.getAddress()),
    ).to.equal(
      parseEther('60'), // 10 + 20 + 30 = 60
    );

    await agreement.claimHolderFunds(
      holders[0].account,
      await lendingToken.getAddress(),
    );
    expect(await lendingToken.balanceOf(holders[0].account)).to.equal(
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
