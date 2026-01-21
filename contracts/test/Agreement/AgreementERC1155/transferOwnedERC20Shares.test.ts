import { expect } from 'chai';
import { Wallet } from 'ethers';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../../helpers/deployments';
import { fakeSignerWithAddress } from '../../../helpers/utils';

describe('AgreementERC1155.transferOwnedERC20Shares', () => {
  async function setup() {
    const NESTED_AGREEMENT_BALANCE = 500n;
    const initialSetup = await deployInitialSetup();
    const { agreement: agreementERC1155, holders } =
      await deployAgreementERC1155({ initialSetup, shares: [1000n, 500n] });

    const holder1 = holders[0];
    const holder2 = holders[1];

    const { agreement: nestedAgreementERC20 } = await deployAgreementERC20({
      initialSetup,

      holders: [
        { ...holder1, isAdmin: true },
        { ...holder2, isAdmin: false },
        {
          account: await agreementERC1155.getAddress(),
          balance: NESTED_AGREEMENT_BALANCE,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    });
    return {
      agreementERC1155,
      nestedAgreementERC20,
      holders,
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    };
  }
  it('can transfer to a holder', async () => {
    const transferAmount = 300n;
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1, holder2],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        await nestedAgreementERC20.getAddress(),
        holder2.account,
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC20.balanceOf(await agreementERC1155.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(await nestedAgreementERC20.balanceOf(holder2.account)).to.equal(
      holder2.balance + transferAmount,
    );
  });
  it('can transfer to a non-holder', async () => {
    const nonHolder = Wallet.createRandom().address;
    const transferAmount = '300';
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        await nestedAgreementERC20.getAddress(),
        nonHolder,
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC20.balanceOf(await agreementERC1155.getAddress()),
    ).to.equal(Number(NESTED_AGREEMENT_BALANCE) - Number(transferAmount));
    expect(await nestedAgreementERC20.balanceOf(nonHolder)).to.equal(
      transferAmount,
    );
  });
  it('can transfer to agreementERC20', async () => {
    const transferAmount = 300n;
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const { agreement: receiverAgreementERC20 } = await deployAgreementERC20({
      initialSetup,
      shares: [100n],
    });

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        await nestedAgreementERC20.getAddress(),
        await receiverAgreementERC20.getAddress(),
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC20.balanceOf(await agreementERC1155.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreementERC20.balanceOf(
        await receiverAgreementERC20.getAddress(),
      ),
    ).to.equal(transferAmount);
  });
  it('can transfer to agreementERC1155', async () => {
    const transferAmount = 300n;
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [holder1],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const { agreement: receiverAgreementERC1155 } =
      await deployAgreementERC1155({ initialSetup, shares: [100n] });

    const transferTx = await agreementERC1155
      .connect(holder1.wallet)
      .transferOwnedERC20Shares(
        await nestedAgreementERC20.getAddress(),
        await receiverAgreementERC1155.getAddress(),
        transferAmount,
      );
    await transferTx.wait();

    expect(
      await nestedAgreementERC20.balanceOf(await agreementERC1155.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE - transferAmount);
    expect(
      await nestedAgreementERC20.balanceOf(
        await receiverAgreementERC1155.getAddress(),
      ),
    ).to.equal(transferAmount);
  });
  it('cannot transfer if sender is not admin', async () => {
    const receiver = Wallet.createRandom().address;
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [adminHolder, nonAdminHolder],
      NESTED_AGREEMENT_BALANCE,
    } = await setup();

    await expect(
      agreementERC1155
        .connect(nonAdminHolder.wallet)
        .transferOwnedERC20Shares(
          await nestedAgreementERC20.getAddress(),
          receiver,
          100n,
        ),
    ).to.be.reverted;

    expect(
      await nestedAgreementERC20.balanceOf(await agreementERC1155.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE);
    expect(await nestedAgreementERC20.balanceOf(adminHolder.account)).to.equal(
      adminHolder.balance,
    );
    expect(
      await nestedAgreementERC20.balanceOf(nonAdminHolder.account),
    ).to.equal(nonAdminHolder.balance);
    expect(await nestedAgreementERC20.balanceOf(receiver)).to.equal(0n);
  });

  it('withdraws funds for nested agreement sender and receiver before transfer', async () => {
    const {
      agreementERC1155,
      nestedAgreementERC20,
      holders: [adminHolder, receiver],
      NESTED_AGREEMENT_BALANCE,
      initialSetup,
    } = await setup();
    const incomingFundsAmount =
      (await nestedAgreementERC20.totalSupply()) * 10n;
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
      .mintTo(await nestedAgreementERC20.getAddress(), incomingFundsAmount);
    await agreementERC1155
      .connect(adminHolder.wallet)
      .transferOwnedERC20Shares(
        await nestedAgreementERC20.getAddress(),
        receiver.account,
        100n,
      );

    expect(await currencyContract.balanceOf(receiver.account)).to.equal(
      receiver.balance * 10n,
    );
    expect(
      await currencyContract.balanceOf(await agreementERC1155.getAddress()),
    ).to.equal(NESTED_AGREEMENT_BALANCE * 10n);
  });
});
