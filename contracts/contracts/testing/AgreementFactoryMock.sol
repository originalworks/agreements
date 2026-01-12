// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '../interfaces/IAgreementFactory.sol';

contract AgreementFactoryMock is IAgreementFactory {
  mapping(address => bool) public _createdAgreements;
  bool alwaysTrue = true;

  function createdAgreements(address agreement) public view returns (bool) {
    if (alwaysTrue) {
      return true;
    } else {
      return _createdAgreements[agreement];
    }
  }

  function addAgreement(address agreement) public {
    _createdAgreements[agreement] = true;
  }

  function removeAgreement(address agreement) public {
    _createdAgreements[agreement] = false;
  }

  function setAlwaysTrue(bool value) public {
    alwaysTrue = value;
  }
}
