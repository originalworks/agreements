// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IFallbackVault {
    function registerIncomingFunds(address user) external payable;
}
