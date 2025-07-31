// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IFeeSource.sol';

interface IPaymentFeeSource is IFeeSource {
    function collectFee(address currency) external;
}
