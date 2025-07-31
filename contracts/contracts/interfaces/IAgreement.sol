// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IHolder.sol';
import './IPaymentFeeSource.sol';

interface IAgreement is IHolder, IPaymentFeeSource {
    event AdminAdded(address account);
    event AdminRemoved(address account);
    event DataHashChanged(string dataHash);
    event FeeAvailable(uint256 newFee, uint256 totalFee, address currency);
    event HolderFundsClaimed(address account, uint256 value, address currency);
    event NativeCoinReceived(address from, uint256 amount);
    event ERC20IncomeRegistered(address currency, uint256 amount);
    event RevenueStreamURIRemoved(string removedUri, address removedByAccount);
    event RevenueStreamURIAdded(string addedUri, address addedByAccount);
}
