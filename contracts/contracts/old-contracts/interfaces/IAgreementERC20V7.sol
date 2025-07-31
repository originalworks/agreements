// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IAgreementV7.sol';

interface IAgreementERC20V7 is IAgreementV7 {
    function initialize(
        string memory _dataHash,
        Holder[] memory holders,
        address _splitCurrencyListManager,
        address _feeManager,
        address _lendingContract,
        address _agreementRelationsRegistry,
        address _fallbackVault,
        address _namespaceRegistry,
        string[] memory _revenueStreamURIs
    ) external;
}
