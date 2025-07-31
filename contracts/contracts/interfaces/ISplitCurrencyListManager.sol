// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface ISplitCurrencyListManager {
    function currencyMap(address) external view returns (bool);

    function getCurrencyArray() external view returns (address[] memory);

    function lendingCurrency() external view returns (address);
}
