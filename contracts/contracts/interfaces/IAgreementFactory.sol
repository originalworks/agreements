// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IAgreementFactory {
  function createdAgreements(
    address agreement
  ) external view returns (bool created);
}
