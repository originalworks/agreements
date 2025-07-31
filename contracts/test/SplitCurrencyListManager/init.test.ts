import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock'
import { SplitCurrencyListManager } from '../../typechain'

describe('SplitCurrencyListManager initial parameters', () => {
  it('properly initialize contract with given parameters', async () => {
    const currency1 = await deployERC20TokenMock('token1', 'TKN1', 18)
    const currency2 = await deployERC20TokenMock('token2', 'TKN2', 18)
    const currency3 = await deployERC20TokenMock('token3', 'TKN3', 18)
    const lendingCurrency = await deployERC20TokenMock(
      'lending currency',
      'LNDNG',
      18,
    )

    const initialCurrencyList = [
      currency1.address,
      currency2.address,
      currency3.address,
    ]

    const SplitCurrencyListManager = await ethers.getContractFactory(
      'SplitCurrencyListManager',
    )

    const splitCurrencyListManager = (await upgrades.deployProxy(
      SplitCurrencyListManager,
      [initialCurrencyList, lendingCurrency.address],
      { kind: 'uups' },
    )) as SplitCurrencyListManager

    const currencyArray = await splitCurrencyListManager.getCurrencyArray()

    expect(await splitCurrencyListManager.lendingCurrency()).to.equal(
      lendingCurrency.address,
    )
    expect(
      await splitCurrencyListManager.currencyMap(lendingCurrency.address),
    ).to.equal(true)
    expect(
      currencyArray.find((currency) => currency === lendingCurrency.address),
    ).to.not.be.undefined

    expect(
      await splitCurrencyListManager.currencyMap(ethers.constants.AddressZero),
    ).to.equal(true)
    expect(
      currencyArray.find(
        (currency) => currency === ethers.constants.AddressZero,
      ),
    ).to.not.be.undefined

    for (let i = 0; i < initialCurrencyList.length; i++) {
      const currency = initialCurrencyList[i]
      expect(await splitCurrencyListManager.currencyMap(currency)).to.equal(
        true,
      )
      expect(currencyArray.find((currency) => currency === currency)).to.not.be
        .undefined
    }
  })
})
