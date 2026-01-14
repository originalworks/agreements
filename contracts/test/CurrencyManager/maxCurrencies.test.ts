import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock';
import { CurrencyManager } from '../../typechain';
import { deployCurrencyManager } from '../../scripts/actions/deployCurrencyManager';

describe('CurrencyManager.addCurrency', () => {
  it('initial value of maxCurrencies is the length of initial list of currencies', async () => {
    const currencyA = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const currencyB = await deployERC20TokenMock('new token', 'NTKN', 10n);

    const initialCurrencies = [
      await currencyA.getAddress(),
      await currencyB.getAddress(),
    ];

    const CurrencyManager = await ethers.getContractFactory('CurrencyManager');

    const currencyManager = (await upgrades.deployProxy(
      CurrencyManager,
      [initialCurrencies],
      { kind: 'uups' },
    )) as CurrencyManager;

    await currencyManager.waitForDeployment();

    expect(await currencyManager.maxCurrencies()).to.equal(
      initialCurrencies.length,
    );
  });
  it("Can change maxCurrencies value if it's not less then current length of array", async () => {
    const currencyA = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const currencyB = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const currencyC = await deployERC20TokenMock('new token', 'NTKN', 10n);

    const initialCurrencies = [
      await currencyA.getAddress(),
      await currencyB.getAddress(),
      await currencyC.getAddress(),
    ];

    const currencyManager = await deployCurrencyManager(initialCurrencies);

    expect(await currencyManager.maxCurrencies()).to.equal(
      initialCurrencies.length,
    );

    await expect(
      currencyManager.setMaxCurrencies(initialCurrencies.length - 1),
    ).to.be.revertedWithCustomError(currencyManager, 'MaxCurrenciesExceeded');

    await currencyManager.removeCurrency(await currencyA.getAddress());

    // can decrease maxCurrencies after removing one currency
    await expect(currencyManager.setMaxCurrencies(initialCurrencies.length - 1))
      .to.not.be.reverted;

    // can increase maxCurrencies
    await expect(currencyManager.setMaxCurrencies(initialCurrencies.length + 3))
      .to.not.be.reverted;
  });
  it('Only owner can set maxCurrencies', async () => {
    const [owner, notOwner] = await ethers.getSigners();
    const currencyA = await deployERC20TokenMock('new token', 'NTKN', 10n);
    const currencyB = await deployERC20TokenMock('new token', 'NTKN', 10n);

    const initialCurrencies = [
      await currencyA.getAddress(),
      await currencyB.getAddress(),
    ];

    const currencyManager = await deployCurrencyManager(initialCurrencies);

    await expect(
      currencyManager.connect(notOwner).setMaxCurrencies(5),
    ).to.be.revertedWithCustomError(
      currencyManager,
      'OwnableUnauthorizedAccount',
    );

    await expect(currencyManager.connect(owner).setMaxCurrencies(5)).to.not.be
      .reverted;
  });
});
