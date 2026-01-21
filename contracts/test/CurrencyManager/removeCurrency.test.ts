import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock';
import { CurrencyManager } from '../../typechain';
import { deployInitialSetup } from '../../helpers/deployments';

describe('CurrencyManager.removeCurrency', () => {
  let currencyManager: CurrencyManager;

  beforeEach(async () => {
    const initialSetup = await deployInitialSetup();
    currencyManager = initialSetup.currencyManager;
  });
  it('can remove currency', async () => {
    const initialCurrencyArray = await currencyManager.getCurrencyArray();

    const currencyToRemove = initialCurrencyArray.find(
      (currency) => currency !== ethers.ZeroAddress,
    );

    if (!currencyToRemove) throw new Error('No currencyToRemove found');

    expect(await currencyManager.currencyMap(currencyToRemove)).to.equal(true);

    await currencyManager.removeCurrency(currencyToRemove);

    const updatedCurrencyArray = await currencyManager.getCurrencyArray();

    expect(
      updatedCurrencyArray.find((currency) => currency === currencyToRemove),
    ).to.equal(undefined);

    expect(await currencyManager.currencyMap(currencyToRemove)).to.equal(false);
  });

  it("can't remove not listed currency", async () => {
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10n);

    await expect(
      currencyManager.removeCurrency(await newCurrency.getAddress()),
    ).to.be.revertedWithCustomError(currencyManager, 'NotListed');
  });

  it('only owner can remove currency', async () => {
    const [, , , , , , nonOwner] = await ethers.getSigners();

    const initialCurrencyArray = await currencyManager.getCurrencyArray();

    const currencyToRemove = initialCurrencyArray.find(
      (currency) => currency !== ethers.ZeroAddress,
    );

    if (!currencyToRemove) throw new Error('No currencyToRemove found');

    await expect(
      currencyManager.connect(nonOwner).addCurrency(currencyToRemove),
    ).to.be.revertedWithCustomError(
      currencyManager,
      'OwnableUnauthorizedAccount',
    );
  });
});
