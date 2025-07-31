// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IAgreementRelationsRegistry {
    function registerChildParentRelation(address parent) external;

    function removeChildParentRelation(address parent) external;
}
