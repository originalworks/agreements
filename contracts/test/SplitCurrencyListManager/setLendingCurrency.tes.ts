import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock'
import { SplitCurrencyListManager } from '../../typechain'
import { deployInitialSetup } from '../helpers/deployments'

describe('SplitCurrencyListManager.setLendingCurrency', () => {
  let splitCurrencyListManager: SplitCurrencyListManager

  beforeEach(async () => {
    const initialSetup = await deployInitialSetup()
    splitCurrencyListManager = initialSetup.splitCurrencyListManager
  })

  it('can change lending currency to new one', async () => {
    const newLendingCurrency = await deployERC20TokenMock(
      'new token',
      'NTKN',
      10,
    )

    const currentLendingCurrency =
      await splitCurrencyListManager.lendingCurrency()

    expect(await splitCurrencyListManager.lendingCurrency()).to.equal(
      currentLendingCurrency,
    )

    await splitCurrencyListManager.setLendingCurrency(
      newLendingCurrency.address,
    )

    expect(await splitCurrencyListManager.lendingCurrency()).to.equal(
      newLendingCurrency.address,
    )
  })

  it('can set already listed currency as lending currency', async () => {
    const initialCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray()

    const lendingCurrency = await splitCurrencyListManager.lendingCurrency()

    const alreadyListedCurrency = initialCurrencyArray.find(
      (currency) =>
        currency !== lendingCurrency &&
        currency !== ethers.constants.AddressZero,
    )

    expect(
      await splitCurrencyListManager.currencyMap(alreadyListedCurrency!),
    ).to.equal(true)

    expect(await splitCurrencyListManager.lendingCurrency()).to.not.equal(
      alreadyListedCurrency!,
    )

    await splitCurrencyListManager.setLendingCurrency(alreadyListedCurrency!)

    expect(
      await splitCurrencyListManager.currencyMap(alreadyListedCurrency!),
    ).to.equal(true)

    expect(await splitCurrencyListManager.lendingCurrency()).to.equal(
      alreadyListedCurrency!,
    )
  })

  it("can't set lending currency to the same value", async () => {
    const lendingCurrency = await splitCurrencyListManager.lendingCurrency()
    await expect(
      splitCurrencyListManager.setLendingCurrency(lendingCurrency),
    ).to.be.revertedWith(
      'SplitCurrencyListManager: lending currency already in use',
    )
  })

  it('only owner can set lending currency', async () => {
    const [, , , , , , nonOwner] = await ethers.getSigners()

    const newLendingCurrency = await deployERC20TokenMock(
      'new token',
      'NTKN',
      10,
    )

    await expect(
      splitCurrencyListManager
        .connect(nonOwner)
        .setLendingCurrency(newLendingCurrency.address),
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('adds new lending currency to currency mapping and array', async () => {
    const newLendingCurrency = await deployERC20TokenMock(
      'new token',
      'NTKN',
      10,
    )

    await splitCurrencyListManager.setLendingCurrency(
      newLendingCurrency.address,
    )

    const currencyArray = await splitCurrencyListManager.getCurrencyArray()

    expect(await splitCurrencyListManager.lendingCurrency()).to.equal(
      newLendingCurrency.address,
    )

    expect(
      await splitCurrencyListManager.currencyMap(newLendingCurrency.address),
    ).to.equal(true)

    expect(
      currencyArray.find((currency) => currency === newLendingCurrency.address),
    ).to.not.be.undefined
  })
})
