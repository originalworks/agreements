// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IFeeManager {
  function getFees() external view returns (uint256, uint256, uint256);

  function owner() external view returns (address);
}
