// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IFeeManager {
  function creationFee() external view returns (uint256);

  function getFees()
    external
    view
    returns (
      uint256 creationFee,
      uint256 paymentFee,
      uint relayerFee,
      uint256 paymentFeeDenominator
    );

  function owner() external view returns (address);
}
