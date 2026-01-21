import { expect } from 'chai';
import { parseEther, parseUnits, TransactionResponse } from 'ethers';
import { ethers } from 'hardhat';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { splitCurrencyDefinitions } from '../../helpers/splitCurrenciesDefinitions';
import { InitialSetup } from '../../helpers/types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('AgreementERC20.claimHolderFunds', () => {
  let owner: SignerWithAddress;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
  });

  it('indivisible coins are lost forever', async () => {
    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther('0'),
    });
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [600n, 400n],
    });
    const holder1 = holders[0].account;
    const holder2 = holders[1].account;
    const { splitCurrencies } = initialSetup;

    const currencyContract = splitCurrencies[0].contract;
    if (!currencyContract) {
      throw new Error('No currencyContract found');
    }

    await currencyContract.transfer(await agreement.getAddress(), 101n);

    await agreement.claimHolderFunds(
      holder1,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      holder2,
      await currencyContract.getAddress(),
    );

    expect(await currencyContract.balanceOf(holder1)).to.equal(60n);
    expect(await currencyContract.balanceOf(holder2)).to.equal(40n);
    expect(
      await currencyContract.balanceOf(await agreement.getAddress()),
    ).to.equal(1n);

    await currencyContract.transfer(await agreement.getAddress(), 100n);

    await agreement.claimHolderFunds(
      holder1,
      await currencyContract.getAddress(),
    );
    await agreement.claimHolderFunds(
      holder2,
      await currencyContract.getAddress(),
    );

    expect(await currencyContract.balanceOf(holder1)).to.equal(120n);
    expect(await currencyContract.balanceOf(holder2)).to.equal(80n);
    expect(
      await currencyContract.balanceOf(await agreement.getAddress()),
    ).to.equal(1n);
  });
  it('currencies doesnt interfere with each other', async () => {
    const [owner] = await ethers.getSigners();
    const incomingFundsNativeCoin = 9000n;
    const incomingFundsTokenA = 10000n;
    const incomingFundsTokenB = 50000n;

    const initialSetup = await deployInitialSetup({
      paymentFee: parseEther('0'),
    });

    const holder1Shares = 600n;
    const holder2Shares = 400n;

    const totalSupply = holder1Shares + holder2Shares;

    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [holder1Shares, holder2Shares],
    });

    const holder1 = holders[0].account;
    const holder2 = holders[1].account;

    const holder1NativeCoinBalanceBefore =
      await ethers.provider.getBalance(holder1);
    const holder2NativeCoinBalanceBefore =
      await ethers.provider.getBalance(holder2);

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

    await agreement.claimHolderFunds(holder1, tokenA.address);
    await agreement.claimHolderFunds(holder2, tokenA.address);

    await agreement.claimHolderFunds(holder1, tokenB.address);
    await agreement.claimHolderFunds(holder2, tokenB.address);

    await agreement.claimHolderFunds(holder1, ethers.ZeroAddress);
    await agreement.claimHolderFunds(holder2, ethers.ZeroAddress);

    expect(await tokenA.contract.balanceOf(holder1)).to.equal(
      (incomingFundsTokenA * holder1Shares) / totalSupply,
    );
    expect(await tokenA.contract.balanceOf(holder2)).to.equal(
      (incomingFundsTokenA * holder2Shares) / totalSupply,
    );

    expect(await tokenB.contract.balanceOf(holder1)).to.equal(
      (incomingFundsTokenB * holder1Shares) / totalSupply,
    );
    expect(await tokenB.contract.balanceOf(holder2)).to.equal(
      (incomingFundsTokenB * holder2Shares) / totalSupply,
    );

    expect(
      (await ethers.provider.getBalance(holder1)) -
        holder1NativeCoinBalanceBefore,
    ).to.equal((incomingFundsNativeCoin * holder1Shares) / totalSupply);
    expect(
      (await ethers.provider.getBalance(holder2)) -
        holder2NativeCoinBalanceBefore,
    ).to.equal((incomingFundsNativeCoin * holder2Shares) / totalSupply);
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

          if (!tokenContract) throw new Error('No TokenContract');

          _currencyTransfer = async (receiver: string, amount: bigint) => {
            return await tokenContract.transfer(receiver, amount);
          };
          _currencyBalance = async (holder: string) => {
            return await tokenContract.balanceOf(holder);
          };
          _currencyAddress = await tokenContract.getAddress();
        }
      });

      describe('Different initial fee levels', () => {
        const feeLevels = [0, 0.1, 0.5];

        for (const FEE_LEVEL of feeLevels) {
          const SCALE = 100n;
          const SCALED_FEE_LEVEL = BigInt(FEE_LEVEL * Number(SCALE));
          const MULTIPLIER = SCALE - SCALED_FEE_LEVEL;

          describe(`Payment Fee = ${FEE_LEVEL * 100}%`, () => {
            beforeEach(async () => {
              await initialSetup.feeManager.setPaymentFee(
                parseEther(FEE_LEVEL.toString()),
              );
            });
            it('claims nothing if address does not hold shares', async () => {
              const incomingFunds = 1000n;
              const [, , , , nonHolderAccount] = await ethers.getSigners();

              const { agreement } = await deployAgreementERC20({
                initialSetup,
                shares: [1000n],
              });

              const balanceBefore = await _currencyBalance(
                nonHolderAccount.address,
              );

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );

              await agreement.claimHolderFunds(
                nonHolderAccount.address,
                _currencyAddress,
              );
              const balanceAfter = await _currencyBalance(
                nonHolderAccount.address,
              );

              expect(balanceAfter - balanceBefore).to.equal(0n);
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((1000n * SCALED_FEE_LEVEL) / SCALE);
            });

            it('properly claims tokens (single holder)', async () => {
              const incomingFunds = 1000n;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [1000n],
              });
              const holder = holders[0].account;

              const holderBalanceBefore = await _currencyBalance(holder);

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );
              await agreement.claimHolderFunds(holder, _currencyAddress);
              const holderBalanceAfter = await _currencyBalance(holder);

              expect(holderBalanceAfter - holderBalanceBefore).to.equal(
                (incomingFunds * MULTIPLIER) / SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((1000n * SCALED_FEE_LEVEL) / SCALE);
            });

            it('properly claims tokens (multiple holders)', async () => {
              const incomingFunds = 1000n;

              const holderAShares = 750n;
              const holderBShares = 250n;
              const totalSupply = holderAShares + holderBShares;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              });
              const holderA = holders[0].account;
              const holderB = holders[1].account;
              const holderABalanceBefore = await _currencyBalance(holderA);
              const holderBBalanceBefore = await _currencyBalance(holderB);

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);
              await agreement.claimHolderFunds(holderB, _currencyAddress);

              const holderABalanceAfter = await _currencyBalance(holderA);
              const holderBBalanceAfter = await _currencyBalance(holderB);

              expect(holderABalanceAfter - holderABalanceBefore).to.equal(
                (((incomingFunds * holderAShares) / totalSupply) * MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceAfter - holderBBalanceBefore).to.equal(
                (((incomingFunds * holderBShares) / totalSupply) * MULTIPLIER) /
                  SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);
            });

            it('skips transfer when there is nothing to claim', async () => {
              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [1000n],
              });
              const holder = holders[0].account;
              const txPromise = agreement.claimHolderFunds(
                holder,
                _currencyAddress,
              );
              await expect(txPromise).to.not.emit(
                agreement,
                'HolderFundsClaimed',
              );

              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(0n);
            });

            it('skips transfer when amount is too small to claim', async () => {
              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [10n, 1000n],
              });
              await _currencyTransfer(await agreement.getAddress(), 10n);

              const holder = holders[0].account;
              const txPromise = agreement.claimHolderFunds(
                holder,
                _currencyAddress,
              );
              await expect(txPromise).to.not.emit(
                agreement,
                'HolderFundsClaimed',
              );
            });

            it('emits event after successful claim', async () => {
              const incomingFunds = 1000n;

              const holderAShares = 500n;
              const holderBShares = 500n;
              const totalSupply = holderAShares + holderBShares;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              });
              const holderA = holders[0].account;
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );
              const tx = await agreement.claimHolderFunds(
                holderA,
                _currencyAddress,
              );

              await expect(Promise.resolve(tx))
                .to.emit(agreement, 'HolderFundsClaimed')
                .withArgs(
                  holderA,
                  (((incomingFunds * holderAShares) / totalSupply) *
                    MULTIPLIER) /
                    SCALE,
                  _currencyAddress,
                );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);
            });

            it('claims nothing if holder already claimed', async () => {
              const incomingFunds = 1000n;

              const holderAShares = 500n;
              const holderBShares = 500n;
              const totalSupply = holderAShares + holderBShares;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              });
              const holderA = holders[0].account;
              const holderAInitialBalance = await _currencyBalance(holderA);

              const holderAExpectedBalanceDiff =
                (((incomingFunds * holderAShares) / totalSupply) * MULTIPLIER) /
                SCALE;

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);
              const holderABalanceAfterClaim1 = await _currencyBalance(holderA);

              expect(
                holderABalanceAfterClaim1 - holderAInitialBalance,
              ).to.equal(holderAExpectedBalanceDiff);

              await agreement.claimHolderFunds(holderA, _currencyAddress);
              const holderABalanceAfterClaim2 = await _currencyBalance(holderA);

              expect(
                holderABalanceAfterClaim2 - holderAInitialBalance,
              ).to.equal(holderAExpectedBalanceDiff);
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);
            });

            it('works properly for multiple incoming transfers (single holder)', async () => {
              const incomingFunds1 = 100n;
              const incomingFunds2 = 200n;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [1000n],
              });
              const holder = holders[0].account;

              const holderInitialBalance = await _currencyBalance(holder);

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds1,
              );
              await agreement.claimHolderFunds(holder, _currencyAddress);

              const holderBalanceAfter1 = await _currencyBalance(holder);

              expect(holderBalanceAfter1 - holderInitialBalance).to.equal(
                (incomingFunds1 * MULTIPLIER) / SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds1 * SCALED_FEE_LEVEL) / SCALE);

              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds2,
              );
              await agreement.claimHolderFunds(holder, _currencyAddress);

              const holderBalanceAfter2 = await _currencyBalance(holder);

              expect(holderBalanceAfter2 - holderInitialBalance).to.equal(
                ((incomingFunds1 + incomingFunds2) * MULTIPLIER) / SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 + incomingFunds2) * SCALED_FEE_LEVEL) / SCALE,
              );
            });

            it('works properly for multiple incoming transfers (multiple holders)', async () => {
              const incomingFunds1 = 100n;
              const incomingFunds2 = 200n;

              const holderAShares = 500n;
              const holderBShares = 500n;
              const totalSupply = holderBShares + holderBShares;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              });
              const holderA = holders[0].account;
              const holderB = holders[1].account;

              const holderAInitialBalance = await _currencyBalance(holderA);
              const holderBInitialBalance = await _currencyBalance(holderB);

              // ROUND 1: only holder A claims funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds1,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);

              const holderABalanceAfter1 = await _currencyBalance(holderA);
              const holderBBalanceAfter1 = await _currencyBalance(holderB);

              expect(holderABalanceAfter1 - holderAInitialBalance).to.equal(
                (((incomingFunds1 * holderAShares) / totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceAfter1 - holderBInitialBalance).to.equal(0n);
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds1 * SCALED_FEE_LEVEL) / SCALE);

              // ROUND 2: both holders claim funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds2,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);
              await agreement.claimHolderFunds(holderB, _currencyAddress);

              const holderABalanceAfter2 = await _currencyBalance(holderA);
              const holderBBalanceAfter2 = await _currencyBalance(holderB);

              expect(holderABalanceAfter2 - holderAInitialBalance).to.equal(
                ((((incomingFunds1 + incomingFunds2) * holderAShares) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceAfter2 - holderBInitialBalance).to.equal(
                ((((incomingFunds1 + incomingFunds2) * holderBShares) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 + incomingFunds2) * SCALED_FEE_LEVEL) / SCALE,
              );
            });

            it('works for more complex case', async () => {
              const incomingFunds1 = 100n;
              const incomingFunds2 = 200n;
              const incomingFunds3 = 300n;
              const incomingFunds4 = 200n;

              const holderABalance = 400n;
              const holderBBalance = 600n;
              const totalSupply = holderABalance + holderBBalance;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderABalance, holderBBalance],
              });
              const holderA = holders[0].account;
              const holderB = holders[1].account;

              const holderAInitialBalance = await _currencyBalance(holderA);
              const holderBInitialBalance = await _currencyBalance(holderB);

              // ROUND 1: only holder A claims funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds1,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);

              const holderABalanceAfter1 = await _currencyBalance(holderA);
              const holderBBalanceAfter1 = await _currencyBalance(holderB);

              expect(holderABalanceAfter1 - holderAInitialBalance).to.equal(
                (((incomingFunds1 * holderABalance) / totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceAfter1 - holderBInitialBalance).to.equal(0n);
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds1 * SCALED_FEE_LEVEL) / SCALE);

              // ROUND 2 & 3: only holder B claims funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds2,
              );
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds3,
              );
              await agreement.claimHolderFunds(holderB, _currencyAddress);

              const holderABalanceAfter3 = await _currencyBalance(holderA);
              const holderBBalanceAfter3 = await _currencyBalance(holderB);

              expect(holderABalanceAfter3 - holderAInitialBalance).to.equal(
                (((incomingFunds1 * holderABalance) / totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceAfter3 - holderBInitialBalance).to.equal(
                ((((incomingFunds1 + incomingFunds2 + incomingFunds3) *
                  holderBBalance) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 + incomingFunds2 + incomingFunds3) *
                  SCALED_FEE_LEVEL) /
                  SCALE,
              );

              // ROUND 4: both holders claim funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds4,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);
              await agreement.claimHolderFunds(holderB, _currencyAddress);

              const holderABalanceAfter4 = await _currencyBalance(holderA);
              const holderBBalanceAfter4 = await _currencyBalance(holderB);

              expect(holderABalanceAfter4 - holderAInitialBalance).to.equal(
                ((((incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  holderABalance) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceAfter4 - holderBInitialBalance).to.equal(
                ((((incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  holderBBalance) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  SCALED_FEE_LEVEL) /
                  SCALE,
              );
            });

            it('works properly for complex case with share transfers in between', async () => {
              const isNativeCoinRun = _currencyAddress === ethers.ZeroAddress;

              const incomingFunds1 = 100n;
              const incomingFunds2 = 200n;
              const incomingFunds3 = 300n;
              const incomingFunds4 = 200n;

              let holderAShares = 400n;
              let holderBShares = 600n;
              const totalSupply = holderAShares + holderBShares;

              const { agreement, holders } = await deployAgreementERC20({
                initialSetup,
                shares: [holderAShares, holderBShares],
              });
              const holderA = holders[0].account;
              const holderAWallet = holders[0].wallet;
              const holderB = holders[1].account;
              const holderBWallet = holders[1].wallet;

              const holderAInitialBalance = await _currencyBalance(holderA);
              const holderBInitialBalance = await _currencyBalance(holderB);

              // ROUND 1: only holder A claims funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds1,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);

              const holderABalanceDiffAfter1 =
                (await _currencyBalance(holderA)) - holderAInitialBalance;

              const holderBBalanceDiffAfter1 =
                (await _currencyBalance(holderB)) - holderBInitialBalance;

              // TO TEST
              expect(holderABalanceDiffAfter1).to.equal(
                (((incomingFunds1 * holderAShares) / totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceDiffAfter1).to.equal(0n);
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal((incomingFunds1 * SCALED_FEE_LEVEL) / SCALE);

              // ROUND 2: transfer of shares, no user claims funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds2,
              );

              const transferTxRound2 = await agreement
                .connect(holderAWallet)
                .transfer(holderB, 100n);

              const transferReceiptRound2 = await transferTxRound2.wait();

              if (!transferReceiptRound2) {
                throw new Error('Tx not found');
              }

              const holderAGasCosts =
                transferReceiptRound2?.gasUsed *
                transferReceiptRound2?.gasPrice;

              const holderABalanceDiffAfter2 =
                (await _currencyBalance(holderA)) -
                holderAInitialBalance +
                (isNativeCoinRun ? holderAGasCosts : 0n);

              const holderBBalanceDiffAfter2 =
                (await _currencyBalance(holderB)) - holderBInitialBalance;

              expect(holderABalanceDiffAfter2).to.equal(
                ((((incomingFunds1 + incomingFunds2) * holderAShares) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(holderBBalanceDiffAfter2).to.equal(
                ((((incomingFunds1 + incomingFunds2) * holderBShares) /
                  totalSupply) *
                  MULTIPLIER) /
                  SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 + incomingFunds2) * SCALED_FEE_LEVEL) / SCALE,
              );

              holderAShares -= 100n;
              holderBShares += 100n;

              // ROUND 3: holder B claims funds and then transfers shares
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds3,
              );
              await agreement.claimHolderFunds(holderB, _currencyAddress);

              const transferTxRound3 = await agreement
                .connect(holderBWallet)
                .transfer(holderA, 50n);

              const transferReceiptRound3 = await transferTxRound3.wait();

              if (!transferReceiptRound3) {
                throw new Error('Tx is null');
              }

              const holderBGasCosts =
                transferReceiptRound3.gasUsed * transferReceiptRound3?.gasPrice;

              const holderABalanceDiffAfter3 =
                (await _currencyBalance(holderA)) -
                holderAInitialBalance +
                (isNativeCoinRun ? holderAGasCosts : 0n);

              const holderBBalanceDiffAfter3 =
                (await _currencyBalance(holderB)) -
                holderBInitialBalance +
                (isNativeCoinRun ? holderBGasCosts : 0n);

              expect(holderABalanceDiffAfter3).to.equal(
                holderABalanceDiffAfter2 +
                  (((incomingFunds3 * holderAShares) / totalSupply) *
                    MULTIPLIER) /
                    SCALE,
              );
              expect(holderBBalanceDiffAfter3).to.equal(
                holderBBalanceDiffAfter2 +
                  (((incomingFunds3 * holderBShares) / totalSupply) *
                    MULTIPLIER) /
                    SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 + incomingFunds2 + incomingFunds3) *
                  SCALED_FEE_LEVEL) /
                  SCALE,
              );

              holderAShares += 50n;
              holderBShares -= 50n;

              // ROUND 4: both user claim funds
              await _currencyTransfer(
                await agreement.getAddress(),
                incomingFunds4,
              );
              await agreement.claimHolderFunds(holderA, _currencyAddress);
              await agreement.claimHolderFunds(holderB, _currencyAddress);

              const holderABalanceDiffAfter4 =
                (await _currencyBalance(holderA)) -
                holderAInitialBalance +
                (isNativeCoinRun ? holderAGasCosts : 0n);

              const holderBBalanceDiffAfter4 =
                (await _currencyBalance(holderB)) -
                holderBInitialBalance +
                (isNativeCoinRun ? holderBGasCosts : 0n);

              expect(holderABalanceDiffAfter4).to.equal(
                holderABalanceDiffAfter3 +
                  (((incomingFunds4 * holderAShares) / totalSupply) *
                    MULTIPLIER) /
                    SCALE,
              );
              expect(holderBBalanceDiffAfter4).to.equal(
                holderBBalanceDiffAfter3 +
                  (((incomingFunds4 * holderBShares) / totalSupply) *
                    MULTIPLIER) /
                    SCALE,
              );
              expect(
                await agreement.getAvailablePaymentFee(_currencyAddress),
              ).to.equal(
                ((incomingFunds1 +
                  incomingFunds2 +
                  incomingFunds3 +
                  incomingFunds4) *
                  SCALED_FEE_LEVEL) /
                  SCALE,
              );
            });

            it('works properly for big numbers', async () => {
              const incomingFunds = parseUnits(
                '1000',
                splitCurrencyDefinition.decimals,
              );
              const holder1Shares = 250n;
              const holder2Shares = 750n;
              const totalSupply = holder1Shares + holder2Shares;

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

              await agreement.claimHolderFunds(holder1, _currencyAddress);
              await agreement.claimHolderFunds(holder2, _currencyAddress);

              const holder1BalanceAfter = await _currencyBalance(holder1);
              const holder2BalanceAfter = await _currencyBalance(holder2);

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
      describe('Changing fee levels in between', () => {
        it('fee introduced at a later date', async () => {
          const incomingFunds = 1000n;
          const initialFeeLevel = 0n;
          const newFeeLevel = 0.1;
          const SCALE = 100n;
          const SCALED_NEW_FEE_LEVEL = BigInt(newFeeLevel * Number(SCALE));

          await initialSetup.feeManager.setPaymentFee(initialFeeLevel);

          const { feeManager } = initialSetup;
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000n],
          });
          const holder = holders[0].account;

          const holderBalanceBefore = await _currencyBalance(holder);

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          await feeManager.setPaymentFee(parseEther(newFeeLevel.toString()));

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          const holderBalanceAfter = await _currencyBalance(holder);

          expect(holderBalanceAfter - holderBalanceBefore).to.equal(
            incomingFunds +
              (incomingFunds * (SCALE - SCALED_NEW_FEE_LEVEL)) / SCALE,
          );
          expect(
            await agreement.getAvailablePaymentFee(_currencyAddress),
          ).to.equal((incomingFunds * SCALED_NEW_FEE_LEVEL) / SCALE);
        });
        it('fee set back to 0', async () => {
          const incomingFunds = 1000n;
          const initialFeeLevel = 0n;
          const newFeeLevel = 0.1;
          const SCALE = 100n;
          const SCALED_NEW_FEE_LEVEL = BigInt(newFeeLevel * Number(SCALE));

          await initialSetup.feeManager.setPaymentFee(initialFeeLevel);

          const { feeManager } = initialSetup;
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000n],
          });
          const holder = holders[0].account;
          const holderBalanceBefore = await _currencyBalance(holder);

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          await feeManager.setPaymentFee(parseEther(newFeeLevel.toString()));

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          await feeManager.setPaymentFee(
            parseEther(initialFeeLevel.toString()),
          );

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          const holderBalanceAfter = await _currencyBalance(holder);

          expect(holderBalanceAfter - holderBalanceBefore).to.equal(
            incomingFunds * 2n +
              (incomingFunds * (SCALE - SCALED_NEW_FEE_LEVEL)) / SCALE,
          );
          expect(
            await agreement.getAvailablePaymentFee(_currencyAddress),
          ).to.equal((incomingFunds * SCALED_NEW_FEE_LEVEL) / SCALE);
        });
        it('fee raising multiple times', async () => {
          const incomingFunds = 1000n;
          const initialFeeLevel = 0n;
          const firstStageFeeLevel = 0.1;
          const secondStageFeeLevel = 0.2;

          const SCALE = 100n;
          const SCALED_FIRST_STAGE_FEE_LEVEL = BigInt(
            firstStageFeeLevel * Number(SCALE),
          );
          const SCALED_SECOND_STAGE_FEE_LEVEL = BigInt(
            secondStageFeeLevel * Number(SCALE),
          );

          await initialSetup.feeManager.setPaymentFee(initialFeeLevel);

          const { feeManager } = initialSetup;
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000n],
          });
          const holder = holders[0].account;
          const holderBalanceBefore = await _currencyBalance(holder);

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          await feeManager.setPaymentFee(
            parseEther(firstStageFeeLevel.toString()),
          );

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          await feeManager.setPaymentFee(
            parseEther(secondStageFeeLevel.toString()),
          );

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          const holderBalanceAfter = await _currencyBalance(holder);

          let first =
            (incomingFunds * (SCALE - SCALED_FIRST_STAGE_FEE_LEVEL)) / SCALE;
          let second =
            (incomingFunds * (SCALE - SCALED_SECOND_STAGE_FEE_LEVEL)) / SCALE;

          expect(holderBalanceAfter - holderBalanceBefore).to.equal(
            incomingFunds + first + second,
          );

          first = (incomingFunds * SCALED_FIRST_STAGE_FEE_LEVEL) / SCALE;
          second = (incomingFunds * SCALED_SECOND_STAGE_FEE_LEVEL) / SCALE;
          expect(
            await agreement.getAvailablePaymentFee(_currencyAddress),
          ).to.equal(first + second);
        });
        it('fee collected between transfers', async () => {
          const incomingFunds = 1000n;
          const feeLevel = 0.1;

          const SCALE = 100n;
          const SCALED_FEE_LEVEL = BigInt(feeLevel * Number(SCALE));

          const { feeManager } = initialSetup;
          await feeManager.setPaymentFee(parseEther(feeLevel.toString()));
          const { agreement, holders } = await deployAgreementERC20({
            initialSetup,
            shares: [1000n],
          });
          const holder = holders[0].account;
          const initialHolderBalance = await _currencyBalance(holder);

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          expect(
            await agreement.getAvailablePaymentFee(_currencyAddress),
          ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);
          await feeManager.collectPaymentFee(
            await agreement.getAddress(),
            _currencyAddress,
          );

          const holderBalanceAfterFirstRound = await _currencyBalance(holder);

          expect(
            await agreement.getAvailablePaymentFee(_currencyAddress),
          ).to.equal(0n);
          expect(holderBalanceAfterFirstRound - initialHolderBalance).to.equal(
            (incomingFunds * (SCALE - SCALED_FEE_LEVEL)) / SCALE,
          );

          await _currencyTransfer(await agreement.getAddress(), incomingFunds);
          await agreement.claimHolderFunds(holder, _currencyAddress);

          const holderBalanceAfterSecondRound = await _currencyBalance(holder);

          expect(holderBalanceAfterSecondRound - initialHolderBalance).to.equal(
            (incomingFunds * 2n * (SCALE - SCALED_FEE_LEVEL)) / SCALE,
          );
          expect(
            await agreement.getAvailablePaymentFee(_currencyAddress),
          ).to.equal((incomingFunds * SCALED_FEE_LEVEL) / SCALE);
        });
      });
    });
  }
});
