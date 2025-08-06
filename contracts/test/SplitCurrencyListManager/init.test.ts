import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock';
import { SplitCurrencyListManager } from '../../typechain';

describe('SplitCurrencyListManager initial parameters', () => {
  it('properly initialize contract with given parameters', async () => {
    const currency1 = await deployERC20TokenMock('token1', 'TKN1', 18n);
    const currency2 = await deployERC20TokenMock('token2', 'TKN2', 18n);
    const currency3 = await deployERC20TokenMock('token3', 'TKN3', 18n);
    const lendingCurrency = await deployERC20TokenMock(
      'lending currency',
      'LNDNG',
      18n,
    );

    const initialCurrencyList = [
      await currency1.getAddress(),
      await currency2.getAddress(),
      await currency3.getAddress(),
    ];

    const SplitCurrencyListManager = await ethers.getContractFactory(
      'SplitCurrencyListManager',
    );

    const splitCurrencyListManager = (await upgrades.deployProxy(
      SplitCurrencyListManager,
      [initialCurrencyList, await lendingCurrency.getAddress()],
      { kind: 'uups' },
    )) as SplitCurrencyListManager;

    const currencyArray = await splitCurrencyListManager.getCurrencyArray();

    expect(await splitCurrencyListManager.lendingCurrency()).to.equal(
      await lendingCurrency.getAddress(),
    );
    expect(
      await splitCurrencyListManager.currencyMap(
        await lendingCurrency.getAddress(),
      ),
    ).to.equal(true);
    expect(
      currencyArray.find(
        async (currency) => currency === (await lendingCurrency.getAddress()),
      ),
    ).not.to.equal(undefined);

    expect(
      await splitCurrencyListManager.currencyMap(ethers.ZeroAddress),
    ).to.equal(true);
    expect(
      currencyArray.find((currency) => currency === ethers.ZeroAddress),
    ).not.to.equal(undefined);

    for (let i = 0; i < initialCurrencyList.length; i++) {
      const currency = initialCurrencyList[i];
      expect(await splitCurrencyListManager.currencyMap(currency)).to.equal(
        true,
      );
      expect(
        currencyArray.find((currency) => currency === currency),
      ).not.to.equal(undefined);
    }
  });
});
