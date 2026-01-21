import { expect } from 'chai';
import { parseEther, TransactionResponse } from 'ethers';
import { ethers } from 'hardhat';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { splitCurrencyDefinitions } from '../../helpers/splitCurrenciesDefinitions';
import { InitialSetup } from '../../helpers/types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('AgreementERC20.collectFee', () => {
  let owner: SignerWithAddress;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
  });

  it('Can collect the fee anytime', async () => {
    const initialSetup = await deployInitialSetup();

    await initialSetup.feeManager.setPaymentFee(parseEther('0.5'));

    const usdc = initialSetup.splitCurrencies[0];
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [50n, 50n],
    });
    // collect the fee after the claimHolderFunds
    await usdc.contract?.mintTo(await agreement.getAddress(), 100);
    await agreement.claimHolderFunds(holders[0].account, usdc.address);
    await agreement.claimHolderFunds(holders[1].account, usdc.address);
    await initialSetup.feeManager.collectPaymentFee(
      await agreement.getAddress(),
      usdc.address,
    );

    expect(await usdc.contract?.balanceOf(initialSetup.feeManager)).to.equal(
      50,
    );
    expect(await usdc.contract?.balanceOf(holders[0].account)).to.equal(25);
    expect(await usdc.contract?.balanceOf(holders[1].account)).to.equal(25);

    // collect the fee before the claimHolderFunds
    await usdc.contract?.mintTo(await agreement.getAddress(), 100);

    await initialSetup.feeManager.collectPaymentFee(
      await agreement.getAddress(),
      usdc.address,
    );
    await agreement.claimHolderFunds(holders[0].account, usdc.address);
    await agreement.claimHolderFunds(holders[1].account, usdc.address);

    expect(await usdc.contract?.balanceOf(initialSetup.feeManager)).to.equal(
      100,
    );
    expect(await usdc.contract?.balanceOf(holders[0].account)).to.equal(50);
    expect(await usdc.contract?.balanceOf(holders[1].account)).to.equal(50);

    // collect the fee in between the claimHolderFunds
    await usdc.contract?.mintTo(await agreement.getAddress(), 100);

    await agreement.claimHolderFunds(holders[0].account, usdc.address);
    await initialSetup.feeManager.collectPaymentFee(
      await agreement.getAddress(),
      usdc.address,
    );
    await agreement.claimHolderFunds(holders[1].account, usdc.address);

    expect(await usdc.contract?.balanceOf(initialSetup.feeManager)).to.equal(
      150,
    );
    expect(await usdc.contract?.balanceOf(holders[0].account)).to.equal(75);
    expect(await usdc.contract?.balanceOf(holders[1].account)).to.equal(75);
  });

  it('setting the payment fee to more than 1 ether reverts transactions', async () => {
    const initialSetup = await deployInitialSetup();
    const { feeManager } = initialSetup;

    await expect(
      feeManager.setPaymentFee(parseEther('1.1')),
    ).to.be.revertedWithCustomError(feeManager, 'FeeTooHigh');
  });
  it("fees in different currencies doesn't interfere with each others", async () => {
    const [owner] = await ethers.getSigners();
    const FEE_LEVEL = 0.5;
    const SCALE = 100n;
    const SCALED_FEE_LEVEL = BigInt(FEE_LEVEL * Number(SCALE));

    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther(FEE_LEVEL.toString()),
    });

    const { feeManager } = initialSetup;

    const incomingFundsNativeCoin = 9000n;
    const incomingFundsTokenA = 10000n;
    const incomingFundsTokenB = 50000n;

    const { agreement } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });

    const tokenA = initialSetup.splitCurrencies.find(
      (currency) => currency.name === 'TOKEN_A',
    );
    const tokenB = initialSetup.splitCurrencies.find(
      (currency) => currency.name === 'TOKEN_B',
    );

    if (!tokenA?.contract || !tokenB?.contract)
      throw new Error('No contract found');

    await tokenA.contract.mintTo(
      await agreement.getAddress(),
      incomingFundsTokenA,
    );
    await tokenB.contract.mintTo(
      await agreement.getAddress(),
      incomingFundsTokenB,
    );
    await owner.sendTransaction({
      value: incomingFundsNativeCoin,
      to: await agreement.getAddress(),
    });

    expect(await agreement.getAvailableFee(tokenA.address)).to.equal(
      (incomingFundsTokenA * SCALED_FEE_LEVEL) / SCALE,
    );
    expect(await agreement.getAvailableFee(tokenB.address)).to.equal(
      (incomingFundsTokenB * SCALED_FEE_LEVEL) / SCALE,
    );
    expect(await agreement.getAvailableFee(ethers.ZeroAddress)).to.equal(
      (incomingFundsNativeCoin * SCALED_FEE_LEVEL) / SCALE,
    );

    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      tokenA.address,
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      tokenB.address,
    );
    await feeManager.collectPaymentFee(
      await agreement.getAddress(),
      ethers.ZeroAddress,
    );

    expect(
      await tokenA.contract.balanceOf(await feeManager.getAddress()),
    ).to.equal((incomingFundsTokenA * SCALED_FEE_LEVEL) / SCALE);
    expect(
      await tokenB.contract.balanceOf(await feeManager.getAddress()),
    ).to.equal((incomingFundsTokenB * SCALED_FEE_LEVEL) / SCALE);
    expect(
      await ethers.provider.getBalance(await feeManager.getAddress()),
    ).to.equal((incomingFundsNativeCoin * SCALED_FEE_LEVEL) / SCALE);
  });
  for (let i = 0; i < splitCurrencyDefinitions.length; i++) {
    const splitCurrencyDefinition = splitCurrencyDefinitions[i];
    describe(`${splitCurrencyDefinition.name} - ${splitCurrencyDefinition.symbol} with decimals: ${splitCurrencyDefinition.decimals}`, () => {
      let initialSetup: InitialSetup;

      let _currencyTransfer: (
        receiver: string,
        amount: bigint,
      ) => Promise<TransactionResponse>;
      let _currencyBalance: (holder: string) => Promise<bigint>;
      let _currencyAddress: string;

      beforeEach(async () => {
        initialSetup = await deployInitialSetup();

        if (splitCurrencyDefinition.nativeCoin) {
          _currencyTransfer = async (receiver: string, amount: bigint) => {
            return await owner.sendTransaction({
              to: receiver,
              value: amount,
            });
          };
          _currencyBalance = async (holder: string) => {
            return await ethers.provider.getBalance(holder);
          };
          _currencyAddress = ethers.ZeroAddress;
        } else {
          const tokenContract = initialSetup.splitCurrencies.find(
            (currency) => currency.name === splitCurrencyDefinition.name,
          )?.contract;

          if (!tokenContract) throw new Error('No token contract');
          _currencyTransfer = async (receiver: string, amount: bigint) => {
            return await tokenContract.transfer(receiver, amount);
          };
          _currencyBalance = async (holder: string) => {
            return await tokenContract.balanceOf(holder);
          };
          _currencyAddress = await tokenContract.getAddress();
        }
      });
      describe('Changing fee levels in between', () => {
        it('transfers the fee after its changed multiple times', async () => {
          const incomingFunds = 1000n;
          const feeLevel1 = 0.1;
          const feeLevel2 = 0.2;
          const feeLevel3 = 0.3;
          const SCALE = 100n;
          const SCALED_FEE_LEVEL_1 = BigInt(feeLevel1 * Number(SCALE));
          const SCALED_FEE_LEVEL_2 = BigInt(feeLevel2 * Number(SCALE));
          const SCALED_FEE_LEVEL_3 = BigInt(feeLevel3 * Number(SCALE));

          const { feeManager } = initialSetup;
          const { agreement } = await deployAgreementERC20({
            initialSetup,
            shares: [1000n],
          });

          await feeManager.setPaymentFee(parseEther(feeLevel1.toString()));
          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            (incomingFunds * SCALED_FEE_LEVEL_1) / SCALE,
          );
          await feeManager.collectPaymentFee(
            await agreement.getAddress(),
            _currencyAddress,
          );

          await feeManager.setPaymentFee(parseEther(feeLevel2.toString()));
          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            (incomingFunds * SCALED_FEE_LEVEL_2) / SCALE,
          );
          await feeManager.collectPaymentFee(
            await agreement.getAddress(),
            _currencyAddress,
          );

          await feeManager.setPaymentFee(parseEther(feeLevel3.toString()));
          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
            (incomingFunds * SCALED_FEE_LEVEL_3) / SCALE,
          );
          await feeManager.collectPaymentFee(
            await agreement.getAddress(),
            _currencyAddress,
          );

          const first = (incomingFunds * SCALED_FEE_LEVEL_1) / SCALE;
          const second = (incomingFunds * SCALED_FEE_LEVEL_2) / SCALE;
          const third = (incomingFunds * SCALED_FEE_LEVEL_3) / SCALE;

          expect(await _currencyBalance(await agreement.getAddress())).to.equal(
            incomingFunds * 3n - (first + second + third),
          );
          expect(
            await _currencyBalance(await feeManager.getAddress()),
          ).to.equal(first + second + third);
        });
      });
      describe('Different initial fee levels', () => {
        const feeLevels = [0, 0.23, 0.48];
        const SCALE = 100n;
        for (const FEE_LEVEL of feeLevels) {
          const SCALED_FEE_LEVEL = BigInt(FEE_LEVEL * Number(SCALE));
          const MULTIPLIER = SCALE - SCALED_FEE_LEVEL;

          describe(`Payment Fee = ${FEE_LEVEL * 100}%`, () => {
            beforeEach(async () => {
              await initialSetup.feeManager.setPaymentFee(
                parseEther(FEE_LEVEL.toString()),
              );
            });
            it('transfers the fee to FeeManager', async () => {
              const incomingFunds = 1000n;
              const { feeManager } = initialSetup;
              const { agreement } = await deployAgreementERC20({
                initialSetup,
                shares: [1000n],
              });

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );
              const expectedFee = (incomingFunds * SCALED_FEE_LEVEL) / SCALE;

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(expectedFee);

              const tx = await feeManager.collectPaymentFee(
                await agreement.getAddress(),
                _currencyAddress,
              );

              await expect(Promise.resolve(tx))
                .to.emit(agreement, 'FeeAvailable')
                .withArgs(expectedFee, _currencyAddress)
                .and.to.emit(agreement, 'FeeCollected')
                .withArgs(expectedFee, _currencyAddress);

              expect(
                await _currencyBalance(await agreement.getAddress()),
              ).to.equal(incomingFunds - expectedFee);
              expect(
                await _currencyBalance(await feeManager.getAddress()),
              ).to.equal(expectedFee);
            });
            it('transfers the fee multiple times', async () => {
              const incomingFunds1 = 1000n;
              const incomingFunds2 = 2000n;

              const expectedFee1 = (incomingFunds1 * SCALED_FEE_LEVEL) / SCALE;
              const expectedFee2 = (incomingFunds2 * SCALED_FEE_LEVEL) / SCALE;

              const { feeManager } = initialSetup;
              const { agreement } = await deployAgreementERC20({
                initialSetup,
                shares: [1000n],
              });

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds1,
              );
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(expectedFee1);
              await feeManager.collectPaymentFee(
                await agreement.getAddress(),
                _currencyAddress,
              );

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds2,
              );
              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(expectedFee2);
              await feeManager.collectPaymentFee(
                await agreement.getAddress(),
                _currencyAddress,
              );

              expect(
                await _currencyBalance(await agreement.getAddress()),
              ).to.equal(
                incomingFunds1 + incomingFunds2 - (expectedFee1 + expectedFee2),
              );
              expect(
                await _currencyBalance(await feeManager.getAddress()),
              ).to.equal(expectedFee1 + expectedFee2);
            });
            it('allows claiming funds after collecting the fee', async () => {
              const incomingFunds = 1000n;

              const holder1Shares = 600n;
              const holder2Shares = 400n;
              const totalSupply = holder1Shares + holder2Shares;

              const { feeManager } = initialSetup;
              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holder1Shares, holder2Shares],
              });
              const holder1 = holders[0].account;
              const holder2 = holders[1].account;

              const holder1InitialBalance = await _currencyBalance(holder1);
              const holder2InitialBalance = await _currencyBalance(holder2);

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);

              await feeManager.collectPaymentFee(
                await agreement.getAddress(),
                _currencyAddress,
              );
              await agreement.claimHolderFunds(holder1, _currencyAddress);
              await agreement.claimHolderFunds(holder2, _currencyAddress);

              const holder1BalanceAfter = await _currencyBalance(holder1);
              const holder2BalanceAfter = await _currencyBalance(holder2);

              expect(
                await agreement.getAvailableFee(_currencyAddress),
              ).to.equal(0n);
              expect(
                await _currencyBalance(await feeManager.getAddress()),
              ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);
              expect(holder1BalanceAfter - holder1InitialBalance).to.equal(
                (((incomingFunds * holder1Shares) / totalSupply) * MULTIPLIER) /
                  SCALE,
              );
              expect(holder2BalanceAfter - holder2InitialBalance).to.equal(
                (((incomingFunds * holder2Shares) / totalSupply) * MULTIPLIER) /
                  SCALE,
              );
            });
          });
        }
      });
    });
  }
});
