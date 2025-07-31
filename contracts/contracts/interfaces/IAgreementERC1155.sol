// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IAgreement.sol';

interface IAgreementERC1155 is IAgreement {
    event ContractUriChanged(string contactUri);

    function initialize(
        string memory _contractUri,
        string memory _dataHash,
        Holder[] memory holders,
        address _splitCurrencyListManager,
        address _feeManager,
        address _agreementRelationsRegistry,
        address _fallbackVault,
        address _namespaceRegistry,
        string[] memory _revenueStreamURIs
    ) external;
}
