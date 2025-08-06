import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock';
import { SplitCurrencyListManager } from '../../typechain';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments';
import { InitialSetup } from '../helpers/types';
import { parseUnits } from 'ethers';

describe('SplitCurrencyListManager.addCurrency', () => {
  let initialSetup: InitialSetup;
  let splitCurrencyListManager: SplitCurrencyListManager;

  beforeEach(async () => {
    initialSetup = await deployInitialSetup();
    splitCurrencyListManager = initialSetup.splitCurrencyListManager;
  });

  it('can add new currency', async () => {
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const initialCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray();

    expect(
      initialCurrencyArray.find(
        async (currency) => currency === (await newCurrency.getAddress()),
      ),
    ).to.equal(undefined);

    expect(
      await splitCurrencyListManager.currencyMap(
        await newCurrency.getAddress(),
      ),
    ).to.equal(false);

    await splitCurrencyListManager.addCurrency(await newCurrency.getAddress());

    const updatedCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray();

    expect(
      updatedCurrencyArray.find(
        async (currency) => currency === (await newCurrency.getAddress()),
      ),
    ).not.to.equal(undefined);

    expect(
      await splitCurrencyListManager.currencyMap(
        await newCurrency.getAddress(),
      ),
    ).to.equal(true);
  });

  it("doesn't add new currency if it's already listed", async () => {
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10n);
    await splitCurrencyListManager.addCurrency(await newCurrency.getAddress());

    await expect(
      splitCurrencyListManager.addCurrency(await newCurrency.getAddress()),
    ).to.be.revertedWith('SplitCurrencyListManager: currency already listed');
  });

  it("doesn't add new currency if it's lending currency", async () => {
    const lendingCurrency = await splitCurrencyListManager.lendingCurrency();

    await expect(
      splitCurrencyListManager.addCurrency(lendingCurrency),
    ).to.be.revertedWith('SplitCurrencyListManager: currency already listed');
  });

  it('emits CurrencyAdded event', async () => {
    const name = 'new token';
    const symbol = 'NTKN';
    const decimals = 10n;
    const newCurrency = await deployERC20TokenMock(name, symbol, decimals);

    const tx = await splitCurrencyListManager.addCurrency(
      await newCurrency.getAddress(),
    );

    await expect(Promise.resolve(tx))
      .to.emit(splitCurrencyListManager, 'CurrencyAdded')
      .withArgs(await newCurrency.getAddress(), symbol, name, decimals);
  });

  it('only owner can add currency', async () => {
    const [, , , , , , nonOwner] = await ethers.getSigners();
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10n);

    await expect(
      splitCurrencyListManager
        .connect(nonOwner)
        .addCurrency(await newCurrency.getAddress()),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("can add currency to the list and perform split after funds' been sent (AgreementERC20)", async () => {
    await initialSetup.feeManager.setPaymentFee(0);

    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const amount = parseUnits('100', 10n);

    const {
      agreement,
      holders: [holderA, holderB],
    } = await deployAgreementERC20({ initialSetup, shares: [300n, 700n] });

    const totalSupply = holderA.balance + holderB.balance;

    const holderABalanceBefore = await newCurrency.balanceOf(holderA.account);
    const holderBBalanceBefore = await newCurrency.balanceOf(holderB.account);

    await newCurrency.mintTo(await agreement.getAddress(), amount);

    await splitCurrencyListManager.addCurrency(await newCurrency.getAddress());

    await agreement.claimHolderFunds(holderA.account, newCurrency.getAddress());
    await agreement.claimHolderFunds(holderB.account, newCurrency.getAddress());

    const holderABalanceAfter = await newCurrency.balanceOf(holderA.account);
    const holderBBalanceAfter = await newCurrency.balanceOf(holderB.account);

    expect(holderABalanceAfter - holderABalanceBefore).to.equal(
      (amount * holderA.balance) / totalSupply,
    );
    expect(holderBBalanceAfter - holderBBalanceBefore).to.equal(
      (amount * holderB.balance) / totalSupply,
    );
  });

  it("can add currency to the list and perform split after funds' been sent (AgreementERC1155)", async () => {
    await initialSetup.feeManager.setPaymentFee(0n);

    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const amount = parseUnits('100', 10n);

    const {
      agreement,
      holders: [holderA, holderB],
    } = await deployAgreementERC1155({ initialSetup, shares: [300n, 700n] });

    const totalSupply = holderA.balance + holderB.balance;

    const holderABalanceBefore = await newCurrency.balanceOf(holderA.account);
    const holderBBalanceBefore = await newCurrency.balanceOf(holderB.account);

    await newCurrency.mintTo(await agreement.getAddress(), amount);

    await splitCurrencyListManager.addCurrency(await newCurrency.getAddress());

    await agreement.claimHolderFunds(
      holderA.account,
      await newCurrency.getAddress(),
    );
    await agreement.claimHolderFunds(
      holderB.account,
      await newCurrency.getAddress(),
    );

    const holderABalanceAfter = await newCurrency.balanceOf(holderA.account);
    const holderBBalanceAfter = await newCurrency.balanceOf(holderB.account);

    expect(holderABalanceAfter - holderABalanceBefore).to.equal(
      (amount * holderA.balance) / totalSupply,
    );
    expect(holderBBalanceAfter - holderBBalanceBefore).to.equal(
      (amount * holderB.balance) / totalSupply,
    );
  });
});
