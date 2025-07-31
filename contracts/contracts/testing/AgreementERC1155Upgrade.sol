// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;
import '../agreements/AgreementERC1155.sol';

contract AgreementERC1155Upgrade is AgreementERC1155 {
    uint256 public newParameter;

    function setNewParameter(uint256 _newParameter) public {
        newParameter = _newParameter;
    }
}
