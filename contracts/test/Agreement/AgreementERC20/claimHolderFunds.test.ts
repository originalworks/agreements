import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber, BigNumberish, providers } from 'ethers'
import { ethers } from 'hardhat'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { splitCurrencyDefinitions } from '../../helpers/splitCurrenciesDefinitions'
import { InitialSetup } from '../../helpers/types'

describe('AgreementERC20.claimHolderFunds', () => {
  let owner: SignerWithAddress

  beforeEach(async () => {
    ;[owner] = await ethers.getSigners()
  })

  it('indivisible coins are lost forever', async () => {
    const initialSetup = await deployInitialSetup({
      paymentFee: ethers.utils.parseEther('0'),
    })
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [600, 400],
    })
    const holder1 = holders[0].account
    const holder2 = holders[1].account
    const { lendingToken } = initialSetup
    await lendingToken.transfer(agreement.address, 101)

    await agreement.claimHolderFunds(holder1, lendingToken.address)
    await agreement.claimHolderFunds(holder2, lendingToken.address)

    expect(await lendingToken.balanceOf(holder1)).to.equal(60)
    expect(await lendingToken.balanceOf(holder2)).to.equal(40)
    expect(await lendingToken.balanceOf(agreement.address)).to.equal(1)

    await lendingToken.transfer(agreement.address, 100)

    await agreement.claimHolderFunds(holder1, lendingToken.address)
    await agreement.claimHolderFunds(holder2, lendingToken.address)

    expect(await lendingToken.balanceOf(holder1)).to.equal(120)
    expect(await lendingToken.balanceOf(holder2)).to.equal(80)
    expect(await lendingToken.balanceOf(agreement.address)).to.equal(1)
  })
  it('currencies doesnt interfere with each other', async () => {
    const [owner] = await ethers.getSigners()
    const incomingFundsLendingToken = 2500
    const incomingFundsNativeCoin = 9000
    const incomingFundsTokenA = 10000
    const incomingFundsTokenB = 50000

    const initialSetup = await deployInitialSetup({
      paymentFee: ethers.utils.parseEther('0'),
    })

    const holder1Shares = 600
    const holder2Shares = 400

    const totalSupply = holder1Shares + holder2Shares

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [holder1Shares, holder2Shares],
    })

    const holder1 = holders[0].account
    const holder2 = holders[1].account

    const holder1NativeCoinBalanceBefore = await ethers.provider.getBalance(
      holder1,
    )
    const holder2NativeCoinBalanceBefore = await ethers.provider.getBalance(
      holder2,
    )

    const lendingToken = initialSetup.splitCurrencies.find(
      (currency) => currency.lendingCurrency === true,
    )!
    const tokenA = initialSetup.splitCurrencies.find(
      (currency) => currency.name === 'TOKEN_A',
    )!
    const tokenB = initialSetup.splitCurrencies.find(
      (currency) => currency.name === 'TOKEN_B',
    )!

    await lendingToken.contract!.mintTo(
      agreement.address,
      incomingFundsLendingToken,
    )
    await tokenA.contract!.mintTo(agreement.address, incomingFundsTokenA)
    await tokenB.contract!.mintTo(agreement.address, incomingFundsTokenB)
    await owner.sendTransaction({
      value: incomingFundsNativeCoin,
      to: agreement.address,
    })

    await agreement.claimHolderFunds(holder1, lendingToken.address)
    await agreement.claimHolderFunds(holder2, lendingToken.address)

    await agreement.claimHolderFunds(holder1, tokenA.address)
    await agreement.claimHolderFunds(holder2, tokenA.address)

    await agreement.claimHolderFunds(holder1, tokenB.address)
    await agreement.claimHolderFunds(holder2, tokenB.address)

    await agreement.claimHolderFunds(holder1, ethers.constants.AddressZero)
    await agreement.claimHolderFunds(holder2, ethers.constants.AddressZero)

    expect(await lendingToken.contract!.balanceOf(holder1)).to.equal(
      (incomingFundsLendingToken * holder1Shares) / totalSupply,
    )
    expect(await lendingToken.contract!.balanceOf(holder2)).to.equal(
      (incomingFundsLendingToken * holder2Shares) / totalSupply,
    )

    expect(await tokenA.contract!.balanceOf(holder1)).to.equal(
      (incomingFundsTokenA * holder1Shares) / totalSupply,
    )
    expect(await tokenA.contract!.balanceOf(holder2)).to.equal(
      (incomingFundsTokenA * holder2Shares) / totalSupply,
    )

    expect(await tokenB.contract!.balanceOf(holder1)).to.equal(
      (incomingFundsTokenB * holder1Shares) / totalSupply,
    )
    expect(await tokenB.contract!.balanceOf(holder2)).to.equal(
      (incomingFundsTokenB * holder2Shares) / totalSupply,
    )

    expect(
      (await ethers.provider.getBalance(holder1)).sub(
        holder1NativeCoinBalanceBefore,
      ),
    ).to.equal((incomingFundsNativeCoin * holder1Shares) / totalSupply)
    expect(
      (await ethers.provider.getBalance(holder2)).sub(
        holder2NativeCoinBalanceBefore,
      ),
    ).to.equal((incomingFundsNativeCoin * holder2Shares) / totalSupply)
  })
  for (let i = 0; i < splitCurrencyDefinitions.length; i++) {
    const splitCurrencyDefinition = splitCurrencyDefinitions[i]
    describe(`${splitCurrencyDefinition.name} - ${splitCurrencyDefinition.symbol} with decimals: ${splitCurrencyDefinition.decimals}`, () => {
      let initialSetup: InitialSetup

      let _currencyTransfer: (
        receiver: string,
        amount: BigNumberish,
      ) => Promise<providers.TransactionResponse>
      let _currencyBalance: (holder: string) => Promise<BigNumber>
      let _currencyAddress: string

      beforeEach(async () => {
        initialSetup = await deployInitialSetup()

        if (splitCurrencyDefinition.nativeCoin) {
          _currencyTransfer = async (
            receiver: string,
            amount: BigNumberish,
          ) => {
            return await owner.sendTransaction({
              to: receiver,
              value: amount,
            })
          }
          _currencyBalance = async (holder: string) => {
            return await ethers.provider.getBalance(holder)
          }
          _currencyAddress = ethers.constants.AddressZero
        } else {
          const tokenContract = initialSetup.splitCurrencies.find(
            (currency) => currency.name === splitCurrencyDefinition.name,
          )?.contract
          _currencyTransfer = async (
            receiver: string,
            amount: BigNumberish,
          ) => {
            return await tokenContract!.transfer(receiver, amount)
          }
          _currencyBalance = async (holder: string) => {
            return await tokenContract!.balanceOf(holder)
          }
          _currencyAddress = tokenContract!.address
        }
      })

      describe('Different initial fee levels', () => {
        const feeLevels = [0, 0.1, 0.5]

        for (const FEE_LEVEL of feeLevels) {
          const MULTIPLIER = 1 - FEE_LEVEL

          describe(`Payment Fee = ${FEE_LEVEL * 100}%`, () => {
            beforeEach(async () => {
              await initialSetup.feeManager.setPaymentFee(
                ethers.utils.parseEther(FEE_LEVEL.toString()),
              )
            })
            it('claims nothing if address does not hold shares', async () => {
              const incomingFunds = 1000
              const [, , , , nonHolderAccount] = await ethers.getSigners()

              const { agreement } = await deployAgreementERC20({
                initialSetup,
                shares: [1000],
              })

              const balanceBefore = await _currencyBalance(
                nonHolderAccount.address,
              )

              await _currencyTransfer(agreement.address, incomingFunds)

              await agreement.claimHolderFunds(
                nonHolderAccount.address,
                _currencyAddress,
              )
              const balanceAfter = await _currencyBalance(
                nonHolderAccount.address,
              )

              expect(balanceAfter.sub(balanceBefore)).to.equal(0)
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(1000 * FEE_LEVEL)
            })

            it('properly claims tokens (single holder)', async () => {
              const incomingFunds = 1000

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [1000],
              })
              const holder = holders[0].account

              const holderBalanceBefore = await _currencyBalance(holder)

              await _currencyTransfer(agreement.address, incomingFunds)
              await agreement.claimHolderFunds(holder, _currencyAddress)
              const holderBalanceAfter = await _currencyBalance(holder)

              expect(holderBalanceAfter.sub(holderBalanceBefore)).to.equal(
                incomingFunds * MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(1000 * FEE_LEVEL)
            })

            it('properly claims tokens (multiple holders)', async () => {
              const incomingFunds = 1000

              const holderAShares = 750
              const holderBShares = 250
              const totalSupply = holderAShares + holderBShares

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              })
              const holderA = holders[0].account
              const holderB = holders[1].account
              const holderABalanceBefore = await _currencyBalance(holderA)
              const holderBBalanceBefore = await _currencyBalance(holderB)

              await _currencyTransfer(agreement.address, incomingFunds)
              await agreement.claimHolderFunds(holderA, _currencyAddress)
              await agreement.claimHolderFunds(holderB, _currencyAddress)

              const holderABalanceAfter = await _currencyBalance(holderA)
              const holderBBalanceAfter = await _currencyBalance(holderB)

              expect(holderABalanceAfter.sub(holderABalanceBefore)).to.equal(
                ((incomingFunds * holderAShares) / totalSupply) * MULTIPLIER,
              )
              expect(holderBBalanceAfter.sub(holderBBalanceBefore)).to.equal(
                ((incomingFunds * holderBShares) / totalSupply) * MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds * FEE_LEVEL)
            })

            it('skips transfer when there is nothing to claim', async () => {
              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [1000],
              })
              const holder = holders[0].account
              const txPromise = agreement.claimHolderFunds(
                holder,
                _currencyAddress,
              )
              await expect(txPromise).to.not.emit(
                agreement,
                'HolderFundsClaimed',
              )

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(0)
            })

            it('skips transfer when amount is too small to claim', async () => {
              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [10, 1000],
              })
              await _currencyTransfer(agreement.address, '10')

              const holder = holders[0].account
              const txPromise = agreement.claimHolderFunds(
                holder,
                _currencyAddress,
              )
              await expect(txPromise).to.not.emit(
                agreement,
                'HolderFundsClaimed',
              )
            })

            it('emits event after successful claim', async () => {
              const incomingFunds = 1000

              const holderAShares = 500
              const holderBShares = 500
              const totalSupply = holderAShares + holderBShares

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              })
              const holderA = holders[0].account
              await _currencyTransfer(agreement.address, incomingFunds)
              const tx = await agreement.claimHolderFunds(
                holderA,
                _currencyAddress,
              )

              await expect(Promise.resolve(tx))
                .to.emit(agreement, 'HolderFundsClaimed')
                .withArgs(
                  holderA,
                  ((incomingFunds * holderAShares) / totalSupply) * MULTIPLIER,
                  _currencyAddress,
                )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds * FEE_LEVEL)
            })

            it('claims nothing if holder already claimed', async () => {
              const incomingFunds = 1000

              const holderAShares = 500
              const holderBShares = 500
              const totalSupply = holderAShares + holderBShares

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              })
              const holderA = holders[0].account
              const holderAInitialBalance = await _currencyBalance(holderA)

              const holderAExpectedBalanceDiff =
                ((incomingFunds * holderAShares) / totalSupply) * MULTIPLIER

              await _currencyTransfer(agreement.address, incomingFunds)
              await agreement.claimHolderFunds(holderA, _currencyAddress)
              const holderABalanceAfterClaim1 = await _currencyBalance(holderA)

              expect(
                holderABalanceAfterClaim1.sub(holderAInitialBalance),
              ).to.equal(holderAExpectedBalanceDiff)

              await agreement.claimHolderFunds(holderA, _currencyAddress)
              const holderABalanceAfterClaim2 = await _currencyBalance(holderA)

              expect(
                holderABalanceAfterClaim2.sub(holderAInitialBalance),
              ).to.equal(holderAExpectedBalanceDiff)
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds * FEE_LEVEL)
            })

            it('works properly for multiple incoming transfers (single holder)', async () => {
              const incomingFunds1 = 100
              const incomingFunds2 = 200

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [1000],
              })
              const holder = holders[0].account

              const holderInitialBalance = await _currencyBalance(holder)

              await _currencyTransfer(agreement.address, incomingFunds1)
              await agreement.claimHolderFunds(holder, _currencyAddress)

              const holderBalanceAfter1 = await _currencyBalance(holder)

              expect(holderBalanceAfter1.sub(holderInitialBalance)).to.equal(
                incomingFunds1 * MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds1 * FEE_LEVEL)

              await _currencyTransfer(agreement.address, incomingFunds2)
              await agreement.claimHolderFunds(holder, _currencyAddress)

              const holderBalanceAfter2 = await _currencyBalance(holder)

              expect(holderBalanceAfter2.sub(holderInitialBalance)).to.equal(
                (incomingFunds1 + incomingFunds2) * MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal((incomingFunds1 + incomingFunds2) * FEE_LEVEL)
            })

            it('works properly for multiple incoming transfers (multiple holders)', async () => {
              const incomingFunds1 = 100
              const incomingFunds2 = 200

              const holderAShares = 500
              const holderBShares = 500
              const totalSupply = holderBShares + holderBShares

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              })
              const holderA = holders[0].account
              const holderB = holders[1].account

              const holderAInitialBalance = await _currencyBalance(holderA)
              const holderBInitialBalance = await _currencyBalance(holderB)

              // ROUND 1: only holder A claims funds
              await _currencyTransfer(agreement.address, incomingFunds1)
              await agreement.claimHolderFunds(holderA, _currencyAddress)

              const holderABalanceAfter1 = await _currencyBalance(holderA)
              const holderBBalanceAfter1 = await _currencyBalance(holderB)

              expect(holderABalanceAfter1.sub(holderAInitialBalance)).to.equal(
                ((incomingFunds1 * holderAShares) / totalSupply) * MULTIPLIER,
              )
              expect(holderBBalanceAfter1.sub(holderBInitialBalance)).to.equal(
                0,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds1 * FEE_LEVEL)

              // ROUND 2: both holders claim funds
              await _currencyTransfer(agreement.address, incomingFunds2)
              await agreement.claimHolderFunds(holderA, _currencyAddress)
              await agreement.claimHolderFunds(holderB, _currencyAddress)

              const holderABalanceAfter2 = await _currencyBalance(holderA)
              const holderBBalanceAfter2 = await _currencyBalance(holderB)

              expect(holderABalanceAfter2.sub(holderAInitialBalance)).to.equal(
                (((incomingFunds1 + incomingFunds2) * holderAShares) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(holderBBalanceAfter2.sub(holderBInitialBalance)).to.equal(
                (((incomingFunds1 + incomingFunds2) * holderBShares) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal((incomingFunds1 + incomingFunds2) * FEE_LEVEL)
            })

            it('works for more complex case', async () => {
              const incomingFunds1 = 100
              const incomingFunds2 = 200
              const incomingFunds3 = 300
              const incomingFunds4 = 200

              const holderABalance = 400
              const holderBBalance = 600
              const totalSupply = holderABalance + holderBBalance

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderABalance, holderBBalance],
              })
              const holderA = holders[0].account
              const holderB = holders[1].account

              const holderAInitialBalance = await _currencyBalance(holderA)
              const holderBInitialBalance = await _currencyBalance(holderB)

              // ROUND 1: only holder A claims funds
              await _currencyTransfer(agreement.address, incomingFunds1)
              await agreement.claimHolderFunds(holderA, _currencyAddress)

              const holderABalanceAfter1 = await _currencyBalance(holderA)
              const holderBBalanceAfter1 = await _currencyBalance(holderB)

              expect(holderABalanceAfter1.sub(holderAInitialBalance)).to.equal(
                ((incomingFunds1 * holderABalance) / totalSupply) * MULTIPLIER,
              )
              expect(holderBBalanceAfter1.sub(holderBInitialBalance)).to.equal(
                0,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds1 * FEE_LEVEL)

              // ROUND 2 & 3: only holder B claims funds
              await _currencyTransfer(agreement.address, incomingFunds2)
              await _currencyTransfer(agreement.address, incomingFunds3)
              await agreement.claimHolderFunds(holderB, _currencyAddress)

              const holderABalanceAfter3 = await _currencyBalance(holderA)
              const holderBBalanceAfter3 = await _currencyBalance(holderB)

              expect(holderABalanceAfter3.sub(holderAInitialBalance)).to.equal(
                ((incomingFunds1 * holderABalance) / totalSupply) * MULTIPLIER,
              )
              expect(holderBBalanceAfter3.sub(holderBInitialBalance)).to.equal(
                (((incomingFunds1 + incomingFunds2 + incomingFunds3) *
                  holderBBalance) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(
                (incomingFunds1 + incomingFunds2 + incomingFunds3) * FEE_LEVEL,
              )

              // ROUND 4: both holders claim funds
              await _currencyTransfer(agreement.address, incomingFunds4)
              await agreement.claimHolderFunds(holderA, _currencyAddress)
              await agreement.claimHolderFunds(holderB, _currencyAddress)

              const holderABalanceAfter4 = await _currencyBalance(holderA)
              const holderBBalanceAfter4 = await _currencyBalance(holderB)

              expect(holderABalanceAfter4.sub(holderAInitialBalance)).to.equal(
                (((incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  holderABalance) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(holderBBalanceAfter4.sub(holderBInitialBalance)).to.equal(
                (((incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  holderBBalance) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(
                (incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  FEE_LEVEL,
              )
            })

            it('works properly for complex case with share transfers in between', async () => {
              const isNativeCoinRun =
                _currencyAddress === ethers.constants.AddressZero

              const incomingFunds1 = 100
              const incomingFunds2 = 200
              const incomingFunds3 = 300
              const incomingFunds4 = 200

              let holderAShares = 400
              let holderBShares = 600
              const totalSupply = holderAShares + holderBShares

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              })
              const holderA = holders[0].account
              const holderAWallet = holders[0].wallet
              const holderB = holders[1].account
              const holderBWallet = holders[1].wallet

              const holderAInitialBalance = await _currencyBalance(holderA)
              const holderBInitialBalance = await _currencyBalance(holderB)

              // ROUND 1: only holder A claims funds
              await _currencyTransfer(agreement.address, incomingFunds1)
              await agreement.claimHolderFunds(holderA, _currencyAddress)

              const holderABalanceDiffAfter1 = (
                await _currencyBalance(holderA)
              ).sub(holderAInitialBalance)

              const holderBBalanceDiffAfter1 = (
                await _currencyBalance(holderB)
              ).sub(holderBInitialBalance)

              expect(holderABalanceDiffAfter1).to.equal(
                ((incomingFunds1 * holderAShares) / totalSupply) * MULTIPLIER,
              )
              expect(holderBBalanceDiffAfter1).to.equal(0)
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds1 * FEE_LEVEL)

              // ROUND 2: transfer of shares, no user claims funds
              await _currencyTransfer(agreement.address, incomingFunds2)

              const transferTxRound2 = await agreement
                .connect(holderAWallet)
                .transfer(holderB, 100)

              const transferReceiptRound2 = await transferTxRound2.wait()
              const holderAGasCosts = transferReceiptRound2.gasUsed.mul(
                transferReceiptRound2.effectiveGasPrice,
              )

              const holderABalanceDiffAfter2 = (await _currencyBalance(holderA))
                .sub(holderAInitialBalance)
                .add(isNativeCoinRun ? holderAGasCosts : 0)

              const holderBBalanceDiffAfter2 = (
                await _currencyBalance(holderB)
              ).sub(holderBInitialBalance)

              expect(holderABalanceDiffAfter2).to.equal(
                (((incomingFunds1 + incomingFunds2) * holderAShares) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(holderBBalanceDiffAfter2).to.equal(
                (((incomingFunds1 + incomingFunds2) * holderBShares) /
                  totalSupply) *
                  MULTIPLIER,
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal((incomingFunds1 + incomingFunds2) * FEE_LEVEL)

              holderAShares -= 100
              holderBShares += 100

              // ROUND 3: holder B claims funds and then transfers shares
              await _currencyTransfer(agreement.address, incomingFunds3)
              await agreement.claimHolderFunds(holderB, _currencyAddress)

              const transferTxRound3 = await agreement
                .connect(holderBWallet)
                .transfer(holderA, 50)

              const transferReceiptRound3 = await transferTxRound3.wait()
              const holderBGasCosts = transferReceiptRound3.gasUsed.mul(
                transferReceiptRound3.effectiveGasPrice,
              )

              const holderABalanceDiffAfter3 = (await _currencyBalance(holderA))
                .sub(holderAInitialBalance)
                .add(isNativeCoinRun ? holderAGasCosts : 0)

              const holderBBalanceDiffAfter3 = (await _currencyBalance(holderB))
                .sub(holderBInitialBalance)
                .add(isNativeCoinRun ? holderBGasCosts : 0)

              expect(holderABalanceDiffAfter3).to.equal(
                holderABalanceDiffAfter2.add(
                  ((incomingFunds3 * holderAShares) / totalSupply) * MULTIPLIER,
                ),
              )
              expect(holderBBalanceDiffAfter3).to.equal(
                holderBBalanceDiffAfter2.add(
                  ((incomingFunds3 * holderBShares) / totalSupply) * MULTIPLIER,
                ),
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(
                (incomingFunds1 + incomingFunds2 + incomingFunds3) * FEE_LEVEL,
              )

              holderAShares += 50
              holderBShares -= 50

              // ROUND 4: both user claim funds
              await _currencyTransfer(agreement.address, incomingFunds4)
              await agreement.claimHolderFunds(holderA, _currencyAddress)
              await agreement.claimHolderFunds(holderB, _currencyAddress)

              const holderABalanceDiffAfter4 = (await _currencyBalance(holderA))
                .sub(holderAInitialBalance)
                .add(isNativeCoinRun ? holderAGasCosts : 0)

              const holderBBalanceDiffAfter4 = (await _currencyBalance(holderB))
                .sub(holderBInitialBalance)
                .add(isNativeCoinRun ? holderBGasCosts : 0)

              expect(holderABalanceDiffAfter4).to.equal(
                holderABalanceDiffAfter3.add(
                  ((incomingFunds4 * holderAShares) / totalSupply) * MULTIPLIER,
                ),
              )
              expect(holderBBalanceDiffAfter4).to.equal(
                holderBBalanceDiffAfter3.add(
                  ((incomingFunds4 * holderBShares) / totalSupply) * MULTIPLIER,
                ),
              )
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(
                (incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  FEE_LEVEL,
              )
            })

            it('works properly for big numbers', async () => {
              const incomingFunds = ethers.utils.parseUnits(
                '1000',
                splitCurrencyDefinition.decimals,
              )
              const holder1Shares = 250
              const holder2Shares = 750
              const totalSupply = holder1Shares + holder2Shares

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holder1Shares, holder2Shares],
              })
              const holder1 = holders[0].account
              const holder2 = holders[1].account

              const holder1InitialBalance = await _currencyBalance(holder1)
              const holder2InitialBalance = await _currencyBalance(holder2)

              await _currencyTransfer(agreement.address, incomingFunds)

              await agreement.claimHolderFunds(holder1, _currencyAddress)
              await agreement.claimHolderFunds(holder2, _currencyAddress)

              const holder1BalanceAfter = await _currencyBalance(holder1)
              const holder2BalanceAfter = await _currencyBalance(holder2)

              expect(holder1BalanceAfter.sub(holder1InitialBalance)).to.equal(
                incomingFunds
                  .mul(holder1Shares)
                  .div(totalSupply)
                  .mul(MULTIPLIER * 10)
                  .div(10),
              )
              expect(holder2BalanceAfter.sub(holder2InitialBalance)).to.equal(
                incomingFunds
                  .mul(holder2Shares)
                  .div(totalSupply)
                  .mul(MULTIPLIER * 10)
                  .div(10),
              )
            })
          })
        }
      })
      describe('Changing fee levels in between', () => {
        it('fee introduced at a later date', async () => {
          const incomingFunds = 1000
          const initialFeeLevel = 0
          const newFeeLevel = 0.1

          await initialSetup.feeManager.setPaymentFee(initialFeeLevel)
          const { feeManager } = initialSetup
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000],
          })
          const holder = holders[0].account

          const holderBalanceBefore = await _currencyBalance(holder)

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(newFeeLevel.toString()),
          )

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          const holderBalanceAfter = await _currencyBalance(holder)

          expect(holderBalanceAfter.sub(holderBalanceBefore)).to.equal(
            incomingFunds + incomingFunds * (1 - newFeeLevel),
          )
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * newFeeLevel,
          )
        })
        it('fee set back to 0', async () => {
          const incomingFunds = 1000
          const initialFeeLevel = 0
          const newFeeLevel = 0.1

          await initialSetup.feeManager.setPaymentFee(initialFeeLevel)

          const { feeManager } = initialSetup
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000],
          })
          const holder = holders[0].account
          const holderBalanceBefore = await _currencyBalance(holder)

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(newFeeLevel.toString()),
          )

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(initialFeeLevel.toString()),
          )

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          const holderBalanceAfter = await _currencyBalance(holder)

          expect(holderBalanceAfter.sub(holderBalanceBefore)).to.equal(
            incomingFunds + incomingFunds + incomingFunds * (1 - newFeeLevel),
          )
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * newFeeLevel,
          )
        })
        it('fee raising multiple times', async () => {
          const incomingFunds = 1000
          const initialFeeLevel = 0
          const firstStageFeeLevel = 0.1
          const secondStageFeeLevel = 0.2

          await initialSetup.feeManager.setPaymentFee(initialFeeLevel)

          const { feeManager } = initialSetup
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000],
          })
          const holder = holders[0].account
          const holderBalanceBefore = await _currencyBalance(holder)

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(firstStageFeeLevel.toString()),
          )

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(secondStageFeeLevel.toString()),
          )

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          const holderBalanceAfter = await _currencyBalance(holder)

          expect(holderBalanceAfter.sub(holderBalanceBefore)).to.equal(
            incomingFunds +
              incomingFunds * (1 - firstStageFeeLevel) +
              incomingFunds * (1 - secondStageFeeLevel),
          )
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * firstStageFeeLevel +
              incomingFunds * secondStageFeeLevel,
          )
        })
        it('fee collected between transfers', async () => {
          const incomingFunds = 1000
          const feeLevel = 0.1

          const { feeManager } = initialSetup
          await feeManager.setPaymentFee(
            ethers.utils.parseEther(feeLevel.toString()),
          )
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000],
          })
          const holder = holders[0].account
          const initialHolderBalance = await _currencyBalance(holder)

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * feeLevel,
          )
          await feeManager.collectPaymentFee(
            agreement.address,
            _currencyAddress,
          )

          const holderBalanceAfterFirstRound = await _currencyBalance(holder)

          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(0)
          expect(
            holderBalanceAfterFirstRound.sub(initialHolderBalance),
          ).to.equal(incomingFunds * (1 - feeLevel))

          await _currencyTransfer(agreement.address, incomingFunds)
          await agreement.claimHolderFunds(holder, _currencyAddress)

          const holderBalanceAfterSecondRound = await _currencyBalance(holder)

          expect(
            holderBalanceAfterSecondRound.sub(initialHolderBalance),
          ).to.equal(incomingFunds * 2 * (1 - feeLevel))
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * feeLevel,
          )
        })
      })
    })
  }
})
