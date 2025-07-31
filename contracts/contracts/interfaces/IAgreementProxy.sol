// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IAgreementProxy {
    function upgradeTo(address newImplementation) external;
}
