// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IFeeSource.sol';

interface ICreationFeeSource is IFeeSource {
  function collectFee() external;
}
