import { expect } from 'chai';
import { Wallet } from 'ethers';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../../helpers/deployments';
import { fakeSignerWithAddress } from '../../../helpers/utils';

describe('AgreementERC20.transferOwnedERC1155Shares', () => {
  const TOKEN_ID = 1n;
  async function setup() {
    const NESTED_AGREEMENT_BALANCE = 500n;
    const initialSetup = await deployInitialSetup();
    const { agreement: agreementERC20, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n, 500n],
    });

    const holder1 = holders[0];
    const holder2 = holders[1];

    const { agreement: nestedAgreementERC1155 } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        { ...holder1, isAdmin: true },
        { ...holder2, isAdmin: false },
        {
          account: await agreementERC20.getAddress(),
          balance: NESTED_AGREEMENT_BALANCE,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    });
    return {
      agreementERC20,
      nestedAgreementERC1155,
      holders,
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    };
  }
  it('can transfer to a holder', async () => {
    const transferAmount = 300n;
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1, holder2],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        nestedAgreementERC1155.getAddress(),
        holder2.account,
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC1155.balanceOf(
        await agreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreementERC1155.balanceOf(holder2.account, TOKEN_ID),
    ).to.equal(holder2.balance + transferAmount);
  });
  it('can transfer to a non-holder', async () => {
    const nonHolder = Wallet.createRandom().address;
    const transferAmount = 300n;
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreementERC1155.getAddress(),
        nonHolder,
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC1155.balanceOf(
        await agreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreementERC1155.balanceOf(nonHolder, TOKEN_ID),
    ).to.equal(transferAmount);
  });
  it('can transfer to agreementERC20', async () => {
    const transferAmount = 300n;
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const { agreement: receiverAgreementERC20 } = await deployAgreementERC20({
      initialSetup,
      shares: [100n],
    });

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreementERC1155.getAddress(),
        await receiverAgreementERC20.getAddress(),
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC1155.balanceOf(
        await agreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreementERC1155.balanceOf(
        await receiverAgreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(transferAmount);
  });
  it('can transfer to agreementERC1155', async () => {
    const transferAmount = 300n;
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const { agreement: receiverAgreementERC1155 } =
      await deployAgreementERC1155({ initialSetup, shares: [100n] });

    const transferTx = await agreementERC20
      .connect(holder1.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreementERC1155.getAddress(),
        await receiverAgreementERC1155.getAddress(),
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC1155.balanceOf(
        await agreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreementERC1155.balanceOf(
        await receiverAgreementERC1155.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(transferAmount);
  });
  it('cannot transfer if sender is not admin', async () => {
    const receiver = Wallet.createRandom().address;
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [adminHolder, nonAdminHolder],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    await expect(
      agreementERC20
        .connect(nonAdminHolder.wallet)
        .transferOwnedERC1155Shares(
          await nestedAgreementERC1155.getAddress(),
          receiver,
          100n,
        ),
    ).to.be.reverted;

    expect(
      await nestedAgreementERC1155.balanceOf(
        await agreementERC20.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(NESTED_AGREEMENT_BALANCE);
    expect(
      await nestedAgreementERC1155.balanceOf(adminHolder.account, TOKEN_ID),
    ).to.equal(adminHolder.balance);
    expect(
      await nestedAgreementERC1155.balanceOf(nonAdminHolder.account, TOKEN_ID),
    ).to.equal(nonAdminHolder.balance);
    expect(await nestedAgreementERC1155.balanceOf(receiver, TOKEN_ID)).to.equal(
      0n,
    );
  });
  it('withdraws funds for nested agreement sender and receiver before transfer', async () => {
    const {
      agreementERC20,
      nestedAgreementERC1155,
      holders: [adminHolder, receiver],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const incomingFundsAmount =
      (await nestedAgreementERC1155.totalSupply()) * 10n;

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
      .mintTo(await nestedAgreementERC1155.getAddress(), incomingFundsAmount);
    await agreementERC20
      .connect(adminHolder.wallet)
      .transferOwnedERC1155Shares(
        await nestedAgreementERC1155.getAddress(),
        receiver.account,
        100n,
      );

    expect(await currencyContract.balanceOf(receiver.account)).to.equal(
      receiver.balance * 10n,
    );
    expect(
      await currencyContract.balanceOf(await agreementERC20.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE * 10n);
  });
});
