import { expect } from 'chai';
import { parseEther, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../../helpers/deployments';

describe('AgreementERC20.transfer', () => {
  it('can not transfer shares to itself', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500n],
    });
    const holder = holders[0];

    await expect(
      agreement
        .connect(holder.wallet)
        .transfer(await agreement.getAddress(), 10),
    ).to.be.revertedWithCustomError(agreement, 'SelfTransfer');
  });
  it('can transfer to a holder', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500n, 500n],
    });
    const holder1 = holders[0];
    const holder2 = holders[1];

    await agreement.connect(holder1.wallet).transfer(holder2.account, 300n);

    expect(await agreement.balanceOf(holder1.account)).to.equal(200n);
    expect(await agreement.balanceOf(holder2.account)).to.equal(800n);
  });

  it('can transfer to a non-holder', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });
    const holder = holders[0];
    const nonHolder = Wallet.createRandom().address;

    await agreement.connect(holder.wallet).transfer(nonHolder, 300n);

    expect(await agreement.balanceOf(holder.account)).to.equal(700n);
    expect(await agreement.balanceOf(nonHolder)).to.equal(300n);
  });

  it('can transfer shares to agreementERC1155', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });
    const holder = holders[0];
    const { agreement: agreement2 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n],
    });

    await agreement
      .connect(holder.wallet)
      .transfer(await agreement2.getAddress(), 300n);

    expect(await agreement.balanceOf(holder.account)).to.equal(700n);
    expect(await agreement.balanceOf(await agreement2.getAddress())).to.equal(
      300n,
    );
  });

  it('can transfer shares to agreementERC20', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });
    const holder = holders[0];
    const { agreement: agreement2 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });

    await agreement
      .connect(holder.wallet)
      .transfer(await agreement2.getAddress(), 300n);

    expect(await agreement.balanceOf(holder.account)).to.equal(700n);
    expect(await agreement.balanceOf(await agreement2.getAddress())).to.equal(
      300n,
    );
  });

  it('withdraws for sender and receiver before transfer', async () => {
    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther('0'),
    });
    const { splitCurrencies } = initialSetup;
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [600n, 400n],
    });
    const sender = holders[0];
    const receiver = holders[1];

    const currencyContract = splitCurrencies[0].contract;
    if (!currencyContract) {
      throw new Error('No currencyContract found');
    }

    expect(await currencyContract.balanceOf(sender.account)).to.equal(0n);
    expect(await currencyContract.balanceOf(receiver.account)).to.equal(0n);

    await currencyContract.transfer(await agreement.getAddress(), 1000n);
    await agreement.connect(sender.wallet).transfer(receiver.account, 500n);

    expect(await agreement.balanceOf(sender.account)).to.equal(100n);
    expect(await agreement.balanceOf(receiver.account)).to.equal(900n);

    expect(await currencyContract.balanceOf(sender.account)).to.equal(600n);
    expect(await currencyContract.balanceOf(receiver.account)).to.equal(400n);
  });

  it('does not affect third party holder in any matter', async () => {
    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther('0'),
    });
    const { splitCurrencies } = initialSetup;
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [600n, 400n],
    });
    const sender = holders[0];
    const [, , , , , receiver] = await ethers.getSigners();
    const thirdPartyHolder = holders[1];

    const currencyContract = splitCurrencies[0].contract;
    if (!currencyContract) {
      throw new Error('No currencyContract found');
    }

    await currencyContract.transfer(await agreement.getAddress(), 1000n);
    await agreement.connect(sender.wallet).transfer(receiver.address, 100n);

    expect(await currencyContract.balanceOf(sender.account)).to.equal(600n); // Received 60% of 1000 Tokens
    expect(await currencyContract.balanceOf(thirdPartyHolder.account)).to.equal(
      0n,
    ); // No action performed
    expect(await currencyContract.balanceOf(receiver.address)).to.equal(0n); // Received 0% of 100 Tokens

    await currencyContract.transfer(await agreement.getAddress(), 2000n);
    await agreement.connect(sender.wallet).transfer(receiver.address, 100n);

    // Received 50% of 2000 Tokens (600 + 1000 Tokens)
    expect(await currencyContract.balanceOf(sender.account)).to.equal(1600n);

    // No action performed
    expect(await currencyContract.balanceOf(thirdPartyHolder.account)).to.equal(
      0n,
    );

    // Received 10% of 2000 Tokens (0 + 200 Tokens)
    expect(await currencyContract.balanceOf(receiver.address)).to.equal(200n);

    await currencyContract.transfer(await agreement.getAddress(), 3000n);
    await agreement.claimHolderFunds(
      sender.account,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      thirdPartyHolder.account,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      receiver.address,
      await currencyContract.getAddress(),
    );

    // Received 40% of 3000 Tokens (1600 + 1200 Tokens)
    expect(await currencyContract.balanceOf(sender.account)).to.equal(2800n);

    // Received 40% of 6000 Tokens
    expect(await currencyContract.balanceOf(thirdPartyHolder.account)).to.equal(
      2400n,
    );

    // Received 20% of 3000 Tokens (200 + 600 Tokens)
    expect(await currencyContract.balanceOf(receiver.address)).to.equal(800n);
  });
});
