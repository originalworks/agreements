import { expect } from 'chai';
import { parseEther, parseUnits, TransactionResponse } from 'ethers';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments';
import { splitCurrencyDefinitions } from '../../helpers/splitCurrenciesDefinitions';
import { InitialSetup } from '../../helpers/types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { AgreementERC1155 } from 'typechain';

describe('AgreementERC1155.claimHolderFundsWithRelayerFee', () => {
  let owner: SignerWithAddress;
  let relayer: SignerWithAddress;
  let holder1: SignerWithAddress;
  let holder2: SignerWithAddress;

  beforeEach(async () => {
    [owner, relayer, holder1, holder2] = await ethers.getSigners();
  });

  for (let i = 0; i < splitCurrencyDefinitions.length; i++) {
    const splitCurrencyDefinition = splitCurrencyDefinitions[i];
    describe(`${splitCurrencyDefinition.name} - ${splitCurrencyDefinition.symbol} with decimals: ${splitCurrencyDefinition.decimals}`, () => {
      let initialSetup: InitialSetup;
      let agreement: AgreementERC1155;
      const holderBalance = 500n;

      let _currencyTransfer: (
        receiver: string,
        amount: bigint,
      ) => Promise<TransactionResponse>;
      let _currencyBalance: (holder: string) => Promise<bigint>;
      let _currencyAddress: string;

      beforeEach(async () => {
        initialSetup = await deployInitialSetup({ paymentFee: 0n });

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
        const agreementDeployment = await deployAgreementERC1155({
          initialSetup,
          holders: [
            {
              account: holder1.address,
              isAdmin: true,
              balance: holderBalance,
              wallet: holder1,
            },
            {
              account: holder2.address,
              isAdmin: false,
              balance: holderBalance,
              wallet: holder2,
            },
          ],
        });
        agreement = agreementDeployment.agreement;
      });

      it('Relayer is rewarded with fee for claiming funds for holder', async () => {
        const incomingFunds = parseUnits(
          '100',
          splitCurrencyDefinition.decimals,
        );
        const relayerFee = parseEther('0.01'); // 1%
        const maxRelayerFee = ethers.parseUnits(
          '10',
          splitCurrencyDefinition.decimals,
        );

        await initialSetup.feeManager.setRelayerFee(relayerFee);
        await initialSetup.feeManager.setMaxRelayerFee(
          _currencyAddress,
          maxRelayerFee,
        );

        await _currencyTransfer(await agreement.getAddress(), incomingFunds);

        const expectedHolderClaimAmount =
          (incomingFunds * holderBalance) / (await agreement.totalSupply());

        const expectedRelayerReward =
          (expectedHolderClaimAmount * relayerFee) / parseEther('1');

        const relayerBalanceBefore = await _currencyBalance(relayer.address);

        const tx = await agreement
          .connect(relayer)
          .claimHolderFundsWithRelayerFee(holder1.address, _currencyAddress);

        const receipt = await tx.wait();

        const relayerBalanceAfter = await _currencyBalance(relayer.address);

        let balanceDifference = relayerBalanceAfter - relayerBalanceBefore;

        if (_currencyAddress == ethers.ZeroAddress && receipt) {
          balanceDifference =
            balanceDifference + receipt.gasUsed * receipt.gasPrice;
        }

        expect(expectedRelayerReward).to.equal(balanceDifference);
      });

      it('Reverts for currencies with no maxRelayerFee set', async () => {
        const incomingFunds = parseUnits(
          '100',
          splitCurrencyDefinition.decimals,
        );
        const relayerFee = parseEther('0.01'); // 1%

        await initialSetup.feeManager.setRelayerFee(relayerFee);

        await _currencyTransfer(await agreement.getAddress(), incomingFunds);

        expect(
          await initialSetup.feeManager.maxRelayerFees(_currencyAddress),
        ).to.equal(0);

        await expect(
          agreement
            .connect(relayer)
            .claimHolderFundsWithRelayerFee(holder1.address, _currencyAddress),
        ).to.be.revertedWithCustomError(
          agreement,
          'ClaimWithRelayerNotSupported',
        );

        await initialSetup.feeManager.setMaxRelayerFee(
          _currencyAddress,
          ethers.parseUnits('10', splitCurrencyDefinition.decimals),
        );

        await expect(
          agreement
            .connect(relayer)
            .claimHolderFundsWithRelayerFee(holder1.address, _currencyAddress),
        ).to.not.be.reverted;
      });

      it('Limits relayer fee to maxRelayerFee', async () => {
        const incomingFunds = parseUnits(
          '1000',
          splitCurrencyDefinition.decimals,
        );
        const relayerFee = parseEther('0.01'); // 1%
        const maxRelayerFee = ethers.parseUnits(
          '1',
          splitCurrencyDefinition.decimals,
        );

        await initialSetup.feeManager.setRelayerFee(relayerFee);
        await initialSetup.feeManager.setMaxRelayerFee(
          _currencyAddress,
          maxRelayerFee,
        );

        await _currencyTransfer(await agreement.getAddress(), incomingFunds);

        const expectedHolderClaimAmount =
          (incomingFunds * holderBalance) / (await agreement.totalSupply());

        const relayerRewardWithoutMaxCap =
          (expectedHolderClaimAmount * relayerFee) / parseEther('1');

        expect(relayerRewardWithoutMaxCap).is.greaterThan(maxRelayerFee);

        const relayerBalanceBefore = await _currencyBalance(relayer.address);

        const tx = await agreement
          .connect(relayer)
          .claimHolderFundsWithRelayerFee(holder1.address, _currencyAddress);

        const receipt = await tx.wait();

        const relayerBalanceAfter = await _currencyBalance(relayer.address);

        let balanceDifference = relayerBalanceAfter - relayerBalanceBefore;

        if (_currencyAddress == ethers.ZeroAddress && receipt) {
          balanceDifference =
            balanceDifference + receipt.gasUsed * receipt.gasPrice;
        }

        expect(maxRelayerFee).to.equal(balanceDifference);
      });

      it('Works with payment fee', async () => {
        const paymentFee = parseEther('0.05');
        const relayerFee = parseEther('0.01'); // 1%
        const incomingFunds = parseUnits(
          '100',
          splitCurrencyDefinition.decimals,
        );
        const appliedPaymentFee =
          (incomingFunds * paymentFee) / parseEther('1');

        const incomingFundsAfterPaymentFee = incomingFunds - appliedPaymentFee;
        const maxRelayerFee = ethers.parseUnits(
          '10',
          splitCurrencyDefinition.decimals,
        );
        await initialSetup.feeManager.setPaymentFee(paymentFee);
        await initialSetup.feeManager.setRelayerFee(relayerFee);
        await initialSetup.feeManager.setMaxRelayerFee(
          _currencyAddress,
          maxRelayerFee,
        );

        await _currencyTransfer(await agreement.getAddress(), incomingFunds);

        const expectedHolderClaimAmount =
          (incomingFundsAfterPaymentFee * holderBalance) /
          (await agreement.totalSupply());

        const expectedRelayerReward =
          (expectedHolderClaimAmount * relayerFee) / parseEther('1');

        const relayerBalanceBefore = await _currencyBalance(relayer.address);

        const tx = await agreement
          .connect(relayer)
          .claimHolderFundsWithRelayerFee(holder1.address, _currencyAddress);

        const receipt = await tx.wait();

        const relayerBalanceAfter = await _currencyBalance(relayer.address);

        let balanceDifference = relayerBalanceAfter - relayerBalanceBefore;

        if (_currencyAddress == ethers.ZeroAddress && receipt) {
          balanceDifference =
            balanceDifference + receipt.gasUsed * receipt.gasPrice;
        }

        expect(expectedRelayerReward).to.equal(balanceDifference);
        expect(await agreement.getAvailableFee(_currencyAddress)).to.equal(
          incomingFunds - incomingFundsAfterPaymentFee,
        );
      });
    });
  }
});
