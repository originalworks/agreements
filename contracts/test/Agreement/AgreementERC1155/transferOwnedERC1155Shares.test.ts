import { expect } from 'chai';
import { Wallet } from 'ethers';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { fakeSignerWithAddress } from '../../helpers/utils';

describe('AgreementERC1155.transferOwnedERC1155Shares', () => {
  const TOKEN_ID = 1n;
  async function setup() {
    const NESTED_AGREEMENT_BALANCE = 500n;
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n, 500n],
    });

    const holder1 = holders[0];
    const holder2 = holders[1];

    const { agreement: nestedAgreement } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        { ...holder1, isAdmin: true },
        { ...holder2, isAdmin: false },
        {
          account: await agreement.getAddress(),
          balance: NESTED_AGREEMENT_BALANCE,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    });
    return {
      agreement,
      nestedAgreement,
      holders,
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    };
  }
  it('can transfer to a holder', async () => {
    const transferAmount = 300n;
    const {
      agreement,
      nestedAgreement,
      holders: [holder1, holder2],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreement.getAddress(),
        holder2.account,
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreement.balanceOf(await agreement.getAddress(), TOKEN_ID),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(await nestedAgreement.balanceOf(holder2.account, TOKEN_ID)).to.equal(
      holder2.balance + transferAmount,
    );
  });
  it('can transfer to a non-holder', async () => {
    const nonHolder = Wallet.createRandom().address;
    const transferAmount = 300n;
    const {
      agreement,
      nestedAgreement,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreement.getAddress(),
        nonHolder,
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreement.balanceOf(await agreement.getAddress(), TOKEN_ID),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(await nestedAgreement.balanceOf(nonHolder, TOKEN_ID)).to.equal(
      transferAmount,
    );
  });
  it('can transfer to agreementERC20', async () => {
    const transferAmount = 300n;
    const {
      agreement,
      nestedAgreement,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const { agreement: receiverAgreementERC20 } = await deployAgreementERC20({
      initialSetup,
      shares: [100n],
    });

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreement.getAddress(),
        await receiverAgreementERC20.getAddress(),
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreement.balanceOf(await agreement.getAddress(), TOKEN_ID),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreement.balanceOf(
        await receiverAgreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(transferAmount);
  });
  it('can transfer to agreementERC1155', async () => {
    const transferAmount = 300n;
    const {
      agreement,
      nestedAgreement,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const { agreement: receiverAgreementERC1155 } =
      await deployAgreementERC1155({ initialSetup, shares: [100n] });

    const transferTx = await agreement
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreement.getAddress(),
        await receiverAgreementERC1155.getAddress(),
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreement.balanceOf(await agreement.getAddress(), TOKEN_ID),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount));
    expect(
      await nestedAgreement.balanceOf(
        await receiverAgreementERC1155.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(transferAmount);
  });
  it('cannot transfer if sender is not admin', async () => {
    const receiver = Wallet.createRandom().address;
    const {
      agreement,
      nestedAgreement,
      holders: [adminHolder, nonAdminHolder],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    await expect(
      agreement
        .connect(nonAdminHolder.wallet)
        .transferOwnedERC1155Shares(
          nestedAgreement.getAddress(),
          receiver,
          100n,
        ),
    ).to.be.reverted;

    expect(
      await nestedAgreement.balanceOf(await agreement.getAddress(), TOKEN_ID),
    ).to.equal(NESTED_AGREEMENT_BALANCE);
    expect(
      await nestedAgreement.balanceOf(adminHolder.account, TOKEN_ID),
    ).to.equal(adminHolder.balance);
    expect(
      await nestedAgreement.balanceOf(nonAdminHolder.account, TOKEN_ID),
    ).to.equal(nonAdminHolder.balance);
    expect(await nestedAgreement.balanceOf(receiver, TOKEN_ID)).to.equal(0n);
  });
  it('withdraws funds for nested agreement sender and receiver before transfer', async () => {
    const {
      agreement,
      nestedAgreement,
      holders: [adminHolder, receiver],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const incomingFundsAmount = (await nestedAgreement.totalSupply()) * 10n;

    const { feeManager, deployer, splitCurrencies } = initialSetup;

    const currencyContract = splitCurrencies[0].contract;
    if (!currencyContract) {
      throw new Error('No currencyContract found');
    }

    await feeManager.connect(deployer).setPaymentFee(0n);

    expect(await currencyContract.balanceOf(adminHolder.account)).to.equal(0n);
    expect(await currencyContract.balanceOf(receiver.account)).to.equal(0n);

    await currencyContract
      .connect(deployer)
      .mintTo(await nestedAgreement.getAddress(), incomingFundsAmount);
    await agreement
      .connect(adminHolder.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreement.getAddress(),
        receiver.account,
        100n,
      );

    expect(await currencyContract.balanceOf(receiver.account)).to.equal(
      receiver.balance * 10n,
    );
    expect(
      await currencyContract.balanceOf(await agreement.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE * 10n);
  });
});
