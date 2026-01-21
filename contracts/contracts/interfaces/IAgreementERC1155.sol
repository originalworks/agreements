// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import './IAgreement.sol';

interface IAgreementERC1155 is IAgreement {
  event ContractUriChanged(string contactUri);

  struct CreateERC1155Params {
    string tokenUri;
    string contractURI;
    Holder[] holders;
    string unassignedRwaId;
  }

  struct AgreementERC1155InitParams {
    string tokenUri;
    string contractUri;
    Holder[] holders;
    address currencyManager;
    address feeManager;
    address agreementRelationsRegistry;
    address fallbackVault;
    address namespaceRegistry;
    string rwaId;
  }

  function initialize(AgreementERC1155InitParams calldata params) external;

  function setContractUri(string calldata newContractUri) external;

  function setUri(string calldata newUri) external;
}
