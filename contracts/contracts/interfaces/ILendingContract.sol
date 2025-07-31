// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

// Legacy code, not used anymore
interface ILendingContract {
    function transfer(
        address agreement,
        address to,
        uint256 amount
    ) external;

    function isCollateral(address borrower, address agreement)
        external
        view
        returns (bool);
}
