import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock'
import { SplitCurrencyListManager } from '../../typechain'
import { deployInitialSetup } from '../helpers/deployments'

describe('SplitCurrencyListManager.removeCurrency', () => {
  let splitCurrencyListManager: SplitCurrencyListManager

  beforeEach(async () => {
    const initialSetup = await deployInitialSetup()
    splitCurrencyListManager = initialSetup.splitCurrencyListManager
  })
  it('can remove currency', async () => {
    const initialCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray()

    const lendingCurrency = await splitCurrencyListManager.lendingCurrency()

    const currencyToRemove = initialCurrencyArray.find(
      (currency) =>
        currency !== lendingCurrency &&
        currency !== ethers.constants.AddressZero,
    )

    expect(
      await splitCurrencyListManager.currencyMap(currencyToRemove!),
    ).to.equal(true)

    await splitCurrencyListManager.removeCurrency(currencyToRemove!)

    const updatedCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray()

    expect(
      updatedCurrencyArray.find((currency) => currency === currencyToRemove),
    ).to.be.undefined

    expect(
      await splitCurrencyListManager.currencyMap(currencyToRemove!),
    ).to.equal(false)
  })

  it("can't remove lending currency", async () => {
    const lendingCurrency = await splitCurrencyListManager.lendingCurrency()

    await expect(
      splitCurrencyListManager.removeCurrency(lendingCurrency),
    ).to.be.revertedWith(
      'SplitCurrencyListManager: can not remove lending token address',
    )
  })

  it("can't remove native coin currency (zero address)", async () => {
    await expect(
      splitCurrencyListManager.removeCurrency(ethers.constants.AddressZero),
    ).to.be.revertedWith(
      'SplitCurrencyListManager: can not remove native coin address',
    )
  })

  it("can't remove not listed currency", async () => {
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10)

    await expect(
      splitCurrencyListManager.removeCurrency(newCurrency.address),
    ).to.be.revertedWith('SplitCurrencyListManager: currency not listed')
  })

  it('only owner can remove currency', async () => {
    const [, , , , , , nonOwner] = await ethers.getSigners()

    const initialCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray()

    const lendingCurrency = await splitCurrencyListManager.lendingCurrency()

    const currencyToRemove = initialCurrencyArray.find(
      (currency) =>
        currency !== lendingCurrency &&
        currency !== ethers.constants.AddressZero,
    )

    await expect(
      splitCurrencyListManager.connect(nonOwner).addCurrency(currencyToRemove!),
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })
})
