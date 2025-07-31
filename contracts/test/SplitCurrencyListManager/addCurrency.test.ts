import { expect } from 'chai'
import { parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { deployERC20TokenMock } from '../../scripts/actions/deployERC20TokenMock'
import { SplitCurrencyListManager } from '../../typechain'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments'
import { InitialSetup } from '../helpers/types'

describe('SplitCurrencyListManager.addCurrency', () => {
  let initialSetup: InitialSetup
  let splitCurrencyListManager: SplitCurrencyListManager

  beforeEach(async () => {
    initialSetup = await deployInitialSetup()
    splitCurrencyListManager = initialSetup.splitCurrencyListManager
  })

  it('can add new currency', async () => {
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10)
    const initialCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray()

    expect(
      initialCurrencyArray.find((currency) => currency === newCurrency.address),
    ).to.be.undefined

    expect(
      await splitCurrencyListManager.currencyMap(newCurrency.address),
    ).to.equal(false)

    await splitCurrencyListManager.addCurrency(newCurrency.address)

    const updatedCurrencyArray =
      await splitCurrencyListManager.getCurrencyArray()

    expect(
      updatedCurrencyArray.find((currency) => currency === newCurrency.address),
    ).to.not.be.undefined

    expect(
      await splitCurrencyListManager.currencyMap(newCurrency.address),
    ).to.equal(true)
  })

  it("doesn't add new currency if it's already listed", async () => {
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10)
    await splitCurrencyListManager.addCurrency(newCurrency.address)

    await expect(
      splitCurrencyListManager.addCurrency(newCurrency.address),
    ).to.be.revertedWith('SplitCurrencyListManager: currency already listed')
  })

  it("doesn't add new currency if it's lending currency", async () => {
    const lendingCurrency = await splitCurrencyListManager.lendingCurrency()

    await expect(
      splitCurrencyListManager.addCurrency(lendingCurrency),
    ).to.be.revertedWith('SplitCurrencyListManager: currency already listed')
  })

  it('emits CurrencyAdded event', async () => {
    const name = 'new token'
    const symbol = 'NTKN'
    const decimals = 10
    const newCurrency = await deployERC20TokenMock(name, symbol, decimals)

    const tx = await splitCurrencyListManager.addCurrency(newCurrency.address)

    await expect(Promise.resolve(tx))
      .to.emit(splitCurrencyListManager, 'CurrencyAdded')
      .withArgs(newCurrency.address, symbol, name, decimals)
  })

  it('only owner can add currency', async () => {
    const [, , , , , , nonOwner] = await ethers.getSigners()
    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10)

    await expect(
      splitCurrencyListManager
        .connect(nonOwner)
        .addCurrency(newCurrency.address),
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it("can add currency to the list and perform split after funds' been sent (AgreementERC20)", async () => {
    await initialSetup.feeManager.setPaymentFee(0)

    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10)
    const amount = parseUnits('100', 10)

    const {
      agreement,
      holders: [holderA, holderB],
    } = await deployAgreementERC20({ initialSetup, shares: [300, 700] })

    const totalSupply = Number(holderA.balance) + Number(holderB.balance)

    const holderABalanceBefore = await newCurrency.balanceOf(holderA.account)
    const holderBBalanceBefore = await newCurrency.balanceOf(holderB.account)

    await newCurrency.mintTo(agreement.address, amount)

    await splitCurrencyListManager.addCurrency(newCurrency.address)

    await agreement.claimHolderFunds(holderA.account, newCurrency.address)
    await agreement.claimHolderFunds(holderB.account, newCurrency.address)

    const holderABalanceAfter = await newCurrency.balanceOf(holderA.account)
    const holderBBalanceAfter = await newCurrency.balanceOf(holderB.account)

    expect(holderABalanceAfter.sub(holderABalanceBefore)).to.equal(
      amount.mul(holderA.balance).div(totalSupply),
    )
    expect(holderBBalanceAfter.sub(holderBBalanceBefore)).to.equal(
      amount.mul(holderB.balance).div(totalSupply),
    )
  })

  it("can add currency to the list and perform split after funds' been sent (AgreementERC1155)", async () => {
    await initialSetup.feeManager.setPaymentFee(0)

    const newCurrency = await deployERC20TokenMock('new token', 'NTKN', 10)
    const amount = parseUnits('100', 10)

    const {
      agreement,
      holders: [holderA, holderB],
    } = await deployAgreementERC1155({ initialSetup, shares: [300, 700] })

    const totalSupply = Number(holderA.balance) + Number(holderB.balance)

    const holderABalanceBefore = await newCurrency.balanceOf(holderA.account)
    const holderBBalanceBefore = await newCurrency.balanceOf(holderB.account)

    await newCurrency.mintTo(agreement.address, amount)

    await splitCurrencyListManager.addCurrency(newCurrency.address)

    await agreement.claimHolderFunds(holderA.account, newCurrency.address)
    await agreement.claimHolderFunds(holderB.account, newCurrency.address)

    const holderABalanceAfter = await newCurrency.balanceOf(holderA.account)
    const holderBBalanceAfter = await newCurrency.balanceOf(holderB.account)

    expect(holderABalanceAfter.sub(holderABalanceBefore)).to.equal(
      amount.mul(holderA.balance).div(totalSupply),
    )
    expect(holderBBalanceAfter.sub(holderBBalanceBefore)).to.equal(
      amount.mul(holderB.balance).div(totalSupply),
    )
  })
})
