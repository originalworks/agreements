// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;
import '../agreements/AgreementERC20.sol';

contract AgreementERC20WithUpgrade is AgreementERC20 {
  uint256 public newParameter;

  function setNewParameter(uint256 _newParameter) public {
    newParameter = _newParameter;
  }
}
