// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface INamespaceRegistry {
  function getNamespaceForAddress(
    address addressToCheck
  ) external view returns (string memory);
}
