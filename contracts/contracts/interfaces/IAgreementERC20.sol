// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IAgreement.sol';

interface IAgreementERC20 is IAgreement {
  struct CreateERC20Params {
    Holder[] holders;
    string unassignedRwaId;
  }

  struct AgreementERC20InitParams {
    Holder[] holders;
    address currencyManager;
    address feeManager;
    address agreementRelationsRegistry;
    address fallbackVault;
    address namespaceRegistry;
    string rwaId;
  }

  function initialize(AgreementERC20InitParams calldata params) external;
}
