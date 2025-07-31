import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber, BigNumberish, providers } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { splitCurrencyDefinitions } from '../../helpers/splitCurrenciesDefinitions'
import { InitialSetup } from '../../helpers/types'

describe('AgreementERC20.collectFee', () => {
  let owner: SignerWithAddress

  beforeEach(async () => {
    ;[owner] = await ethers.getSigners()
  })
  it('setting the payment fee to more than 1 ether reverts transactions', async () => {
    const initialSetup = await deployInitialSetup()
    const { feeManager } = initialSetup

    await expect(
      feeManager.setPaymentFee(ethers.utils.parseEther('1.1')),
    ).to.be.revertedWith('FeeManager: Payment fee greater than 100%')
  })
  it("fees in different currencies doesn't interfere with each others", async () => {
    const [owner] = await ethers.getSigners()
    const FEE_LEVEL = 0.5

    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther(FEE_LEVEL.toString()),
    })

    const { feeManager } = initialSetup
    const incomingFundsLendingToken = 2500
    const incomingFundsNativeCoin = 9000
    const incomingFundsTokenA = 10000
    const incomingFundsTokenB = 50000

    const { agreement } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })

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

    expect(await agreement.getAvailableFee(lendingToken.address)).to.equal(
      incomingFundsLendingToken * FEE_LEVEL,
    )
    expect(await agreement.getAvailableFee(tokenA.address)).to.equal(
      incomingFundsTokenA * FEE_LEVEL,
    )
    expect(await agreement.getAvailableFee(tokenB.address)).to.equal(
      incomingFundsTokenB * FEE_LEVEL,
    )
    expect(
      await agreement.getAvailableFee(ethers.constants.AddressZero),
    ).to.equal(incomingFundsNativeCoin * FEE_LEVEL)

    await feeManager.collectPaymentFee(agreement.address, lendingToken.address)
    await feeManager.collectPaymentFee(agreement.address, tokenA.address)
    await feeManager.collectPaymentFee(agreement.address, tokenB.address)
    await feeManager.collectPaymentFee(
      agreement.address,
      ethers.constants.AddressZero,
    )

    expect(await lendingToken.contract!.balanceOf(feeManager.address)).to.equal(
      incomingFundsLendingToken * FEE_LEVEL,
    )
    expect(await tokenA.contract!.balanceOf(feeManager.address)).to.equal(
      incomingFundsTokenA * FEE_LEVEL,
    )
    expect(await tokenB.contract!.balanceOf(feeManager.address)).to.equal(
      incomingFundsTokenB * FEE_LEVEL,
    )
    expect(await ethers.provider.getBalance(feeManager.address)).to.equal(
      incomingFundsNativeCoin * FEE_LEVEL,
    )
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
      describe('Changing fee levels in between', () => {
        it('transfers the fee after its changed multiple times', async () => {
          const incomingFunds = 1000
          const feeLevel1 = 0.1
          const feeLevel2 = 0.2
          const feeLevel3 = 0.3

          const { feeManager } = initialSetup
          const { agreement } = await deployAgreementERC20({
            initialSetup,
            shares: [1000],
          })

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(feeLevel1.toString()),
          )
          await _currencyTransfer(agreement.address, incomingFunds)
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * feeLevel1,
          )
          await feeManager.collectPaymentFee(
            agreement.address,
            _currencyAddress,
          )

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(feeLevel2.toString()),
          )
          await _currencyTransfer(agreement.address, incomingFunds)
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * feeLevel2,
          )
          await feeManager.collectPaymentFee(
            agreement.address,
            _currencyAddress,
          )

          await feeManager.setPaymentFee(
            ethers.utils.parseEther(feeLevel3.toString()),
          )
          await _currencyTransfer(agreement.address, incomingFunds)
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            incomingFunds * feeLevel3,
          )
          await feeManager.collectPaymentFee(
            agreement.address,
            _currencyAddress,
          )

          expect(await _currencyBalance(agreement.address)).to.equal(
            incomingFunds * 3 -
              (incomingFunds * feeLevel1 +
                incomingFunds * feeLevel2 +
                incomingFunds * feeLevel3),
          )
          expect(await _currencyBalance(feeManager.address)).to.equal(
            incomingFunds * feeLevel1 +
              incomingFunds * feeLevel2 +
              incomingFunds * feeLevel3,
          )
        })
      })
      describe('Different initial fee levels', () => {
        const feeLevels = [0, 0.23, 0.48]
        for (const FEE_LEVEL of feeLevels) {
          const MULTIPLIER = 1 - FEE_LEVEL
          describe(`Payment Fee = ${FEE_LEVEL * 100}%`, () => {
            beforeEach(async () => {
              await initialSetup.feeManager.setPaymentFee(
                ethers.utils.parseEther(FEE_LEVEL.toString()),
              )
            })
            it('transfers the fee to FeeManager', async () => {
              const incomingFunds = 1000
              const { feeManager } = initialSetup
              const { agreement } = await deployAgreementERC20({
                initialSetup,
                shares: [1000],
              })

              await _currencyTransfer(agreement.address, incomingFunds)
              const expectedFee = incomingFunds * FEE_LEVEL

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(expectedFee)

              const tx = await feeManager.collectPaymentFee(
                agreement.address,
                _currencyAddress,
              )

              await expect(Promise.resolve(tx))
                .to.emit(agreement, 'FeeAvailable')
                .withArgs(expectedFee, expectedFee, _currencyAddress)
                .and.to.emit(agreement, 'FeeCollected')
                .withArgs(expectedFee, _currencyAddress)

              expect(await _currencyBalance(agreement.address)).to.equal(
                incomingFunds - expectedFee,
              )
              expect(await _currencyBalance(feeManager.address)).to.equal(
                expectedFee,
              )
            })
            it('transfers the fee multiple times', async () => {
              const incomingFunds1 = 1000
              const incomingFunds2 = 2000

              const expectedFee1 = incomingFunds1 * FEE_LEVEL
              const expectedFee2 = incomingFunds2 * FEE_LEVEL

              const { feeManager } = initialSetup
              const { agreement } = await deployAgreementERC20({
                initialSetup,
                shares: [1000],
              })

              await _currencyTransfer(agreement.address, incomingFunds1)
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(expectedFee1)
              await feeManager.collectPaymentFee(
                agreement.address,
                _currencyAddress,
              )

              await _currencyTransfer(agreement.address, incomingFunds2)
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(expectedFee2)
              await feeManager.collectPaymentFee(
                agreement.address,
                _currencyAddress,
              )

              expect(await _currencyBalance(agreement.address)).to.equal(
                incomingFunds1 + incomingFunds2 - (expectedFee1 + expectedFee2),
              )
              expect(await _currencyBalance(feeManager.address)).to.equal(
                expectedFee1 + expectedFee2,
              )
            })
            it('allows claiming funds after collecting the fee', async () => {
              const incomingFunds = 1000

              const holder1Shares = 600
              const holder2Shares = 400
              const totalSupply = holder1Shares + holder2Shares

              const { feeManager } = initialSetup
              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holder1Shares, holder2Shares],
              })
              const holder1 = holders[0].account
              const holder2 = holders[1].account

              const holder1InitialBalance = await _currencyBalance(holder1)
              const holder2InitialBalance = await _currencyBalance(holder2)

              await _currencyTransfer(agreement.address, incomingFunds)

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(incomingFunds * FEE_LEVEL)

              await feeManager.collectPaymentFee(
                agreement.address,
                _currencyAddress,
              )
              await agreement.claimHolderFunds(holder1, _currencyAddress)
              await agreement.claimHolderFunds(holder2, _currencyAddress)

              const holder1BalanceAfter = await _currencyBalance(holder1)
              const holder2BalanceAfter = await _currencyBalance(holder2)

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(0)
              expect(await _currencyBalance(feeManager.address)).to.equal(
                incomingFunds * FEE_LEVEL,
              )
              expect(holder1BalanceAfter.sub(holder1InitialBalance)).to.equal(
                ((incomingFunds * holder1Shares) / totalSupply) * MULTIPLIER,
              )
              expect(holder2BalanceAfter.sub(holder2InitialBalance)).to.equal(
                ((incomingFunds * holder2Shares) / totalSupply) * MULTIPLIER,
              )
            })
          })
        }
      })
    })
  }
})
