// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IAgreementRelationsRegistry {
  function registerInitialRelation(address child, address parent) external;

  function registerChildParentRelation(address parent) external;

  function removeChildParentRelation(address parent) external;
}
