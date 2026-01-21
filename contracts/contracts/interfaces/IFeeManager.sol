// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IFees.sol';

interface IFeeManager is IFees {
  function creationFee() external view returns (uint256);

  function getFees(address currency) external view returns (Fees memory fees);

  function owner() external view returns (address);
}
