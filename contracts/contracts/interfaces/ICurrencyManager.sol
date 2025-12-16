// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface ICurrencyManager {
  function currencyMap(address) external view returns (bool);

  function getCurrencyArray() external view returns (address[] memory);
}
