// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IFeeSource {
    event FeeCollected(uint256 amount, address currency);
}
