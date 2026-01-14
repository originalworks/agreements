import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock';
import { CurrencyManager } from '../../typechain';

describe('CurrencyManager initial parameters', () => {
  it('properly initialize contract with given parameters', async () => {
    const currency1 = await deployERC20TokenMock('token1', 'TKN1', 18n);
    const currency2 = await deployERC20TokenMock('token2', 'TKN2', 18n);
    const currency3 = await deployERC20TokenMock('token3', 'TKN3', 18n);

    const initialCurrencyList = [
      await currency1.getAddress(),
      await currency2.getAddress(),
      await currency3.getAddress(),
      ethers.ZeroAddress,
    ];

    const CurrencyManager = await ethers.getContractFactory('CurrencyManager');

    const currencyManager = (await upgrades.deployProxy(
      CurrencyManager,
      [initialCurrencyList],
      { kind: 'uups' },
    )) as CurrencyManager;

    const currencyArray = await currencyManager.getCurrencyArray();

    expect(await currencyManager.maxCurrencies()).to.equal(
      initialCurrencyList.length,
    );

    expect(await currencyManager.currencyMap(ethers.ZeroAddress)).to.equal(
      true,
    );
    expect(
      currencyArray.find((currency) => currency === ethers.ZeroAddress),
    ).not.to.equal(undefined);

    for (let i = 0; i < initialCurrencyList.length; i++) {
      const currency = initialCurrencyList[i];
      expect(await currencyManager.currencyMap(currency)).to.equal(true);
      expect(
        currencyArray.find((currency) => currency === currency),
      ).not.to.equal(undefined);
    }
  });
});
