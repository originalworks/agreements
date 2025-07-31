// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IHolder {
    struct Holder {
        address account;
        bool isAdmin;
        uint256 balance;
    }
}
