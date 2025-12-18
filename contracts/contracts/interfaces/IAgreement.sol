// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts/utils/Address.sol';
import './IHolder.sol';
import './IPaymentFeeSource.sol';

interface IAgreement is IHolder, IPaymentFeeSource {
  function addAdmin(address user) external;

  function removeAdmin(address user) external;

  function claimHolderFunds(address holder, address currency) external;

  function collectFee(address currency) external;

  function transferOwnedERC20Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) external;

  function transferOwnedERC1155Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) external;

  function isAdmin(address user) external view returns (bool);

  function getAvailableFee(address currency) external view returns (uint256);

  function getClaimableAmount(
    address currency,
    address holder
  ) external view returns (uint256 claimableAmount, uint256 fee);

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
