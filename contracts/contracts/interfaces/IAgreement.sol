// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

interface IAgreement {
  error SelfTransfer();
  error BurnNotAllowed();
  error AlreadyExist();
  error NotAdmin();
  error OnlyAdminAllowed();
  error LastAdminRemovalNotAllowed();
  error OnlyFeeManagerAllowed(address expected, address actual);
  error EmptyHoldersInput();
  error FirstHolderMustBeAdmin();
  error CurrencyNotSupported();
  error ZeroAddressNotAllowed();
  error ZeroBalanceHolder();

  event AdminAdded(address account);
  event AdminRemoved(address account);
  event DataHashChanged(string dataHash);
  event FeeAvailable(uint256 amount, address currency);
  event HolderFundsClaimed(address account, uint256 value, address currency);
  event NativeCoinReceived(address from, uint256 amount);
  event ERC20IncomeRegistered(address currency, uint256 amount);
  event RevenueStreamURIRemoved(string removedUri, address removedByAccount);
  event RevenueStreamURIAdded(string addedUri, address addedByAccount);

  struct Holder {
    address account;
    bool isAdmin;
    uint256 balance;
  }

  struct AgreementInitParams {
    address currencyManager;
    address feeManager;
    address agreementRelationsRegistry;
    address fallbackVault;
    address namespaceRegistry;
    string rwaId;
  }

  function isAdmin(address user) external view returns (bool);

  function addAdmin(address user) external;

  function removeAdmin(address user) external;

  function getAvailableFee(address currency) external view returns (uint256);

  function transferOwnedERC20Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) external;

  function transferOwnedERC1155Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) external;

  function claimHolderFunds(
    address holder,
    address currency,
    bool payRelayer
  ) external;

  function getClaimableAmount(
    address currency,
    address holder,
    bool payRelayer
  ) external view returns (uint256 claimableAmount, uint256 relayerCut);
}
