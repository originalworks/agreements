// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '../interfaces/IAgreementFactory.sol';

contract AgreementFactoryMock is IAgreementFactory {
  function createdAgreements(address) public pure returns (bool) {
    return true;
  }
}
