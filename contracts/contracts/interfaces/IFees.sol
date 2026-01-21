// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IFees {
  //   struct PaymentFeeDetails {
  //     uint256 paymentFee;
  //     uint256 feeDenominator;
  //   }

  //   struct

  struct Fees {
    uint256 creationFee;
    uint256 paymentFee;
    uint256 relayerFee;
    uint256 maxRelayerFee;
    uint256 feeDenominator;
  }
}
