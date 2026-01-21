// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

import '../interfaces/IFeeManager.sol';
import '../interfaces/IAgreement.sol';
import '../interfaces/IAgreementRelationsRegistry.sol';
import '../interfaces/ICurrencyManager.sol';
import '../interfaces/IFallbackVault.sol';
import '../interfaces/INamespaceRegistry.sol';
import '../interfaces/IPaymentFeeSource.sol';
import '../interfaces/IFees.sol';

abstract contract Agreement is
  IFees,
  IAgreement,
  Initializable,
  IPaymentFeeSource,
  ERC165Upgradeable,
  ERC1155HolderUpgradeable,
  UUPSUpgradeable
{
  using SafeERC20 for IERC20;

  mapping(address => bool) private admins;

  mapping(address => uint256) internal receivedFunds;
  mapping(address => uint256) internal withdrawnFunds;
  mapping(address => mapping(address => uint256)) internal holderFundsCounters;

  mapping(address => uint256) private paymentFees;
  mapping(address => uint256) private collectedPaymentFees;

  ICurrencyManager internal currencyManager;
  IFeeManager internal feeManager;
  IAgreementRelationsRegistry internal agreementRelationsRegistry;
  IFallbackVault internal fallbackVault;
  INamespaceRegistry internal namespaceRegistry;
  uint256 private adminCount;
  string public rwaId;

  uint256[50] private __gap;

  modifier onlyAdmin() {
    if (admins[msg.sender] == false) {
      revert OnlyAdminAllowed();
    }
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function __Agreement_init(
    AgreementInitParams memory params
  ) internal onlyInitializing {
    currencyManager = ICurrencyManager(params.currencyManager);
    feeManager = IFeeManager(params.feeManager);
    agreementRelationsRegistry = IAgreementRelationsRegistry(
      params.agreementRelationsRegistry
    );
    fallbackVault = IFallbackVault(params.fallbackVault);
    namespaceRegistry = INamespaceRegistry(params.namespaceRegistry);

    rwaId = params.rwaId;
  }

  function isAdmin(address user) external view override returns (bool) {
    return admins[user];
  }

  function addAdmin(address user) external override onlyAdmin {
    _addAdmin(user);
  }

  function removeAdmin(address user) external override onlyAdmin {
    if (admins[user] != true) {
      revert NotAdmin();
    }
    if (adminCount == 1) {
      revert LastAdminRemovalNotAllowed();
    }
    adminCount--;
    admins[user] = false;
    emit AdminRemoved(user);
  }

  function getAvailableFee(
    address currency
  ) external view override returns (uint256) {
    Fees memory fees = feeManager.getFees(currency);
    uint256 availableFee = paymentFees[currency] -
      collectedPaymentFees[currency];

    if (_hasUnregisteredIncome(currency)) {
      uint256 currentBalance = _getContractBalance(currency);
      uint256 newTotal = withdrawnFunds[currency] + currentBalance;
      uint256 newReceived = newTotal - receivedFunds[currency];
      return
        availableFee + (newReceived * fees.paymentFee) / fees.feeDenominator;
    } else {
      return availableFee;
    }
  }

  function collectFee(address currency) external override {
    if (msg.sender != address(feeManager)) {
      revert OnlyFeeManagerAllowed(address(feeManager), msg.sender);
    }
    if (_hasUnregisteredIncome(currency)) {
      _registerIncome(currency);
    }
    uint256 availableFee = paymentFees[currency] -
      collectedPaymentFees[currency];
    withdrawnFunds[currency] += availableFee;
    collectedPaymentFees[currency] += availableFee;
    if (currency == address(0)) {
      address feeCollector = payable(msg.sender);
      (bool callSucceeded, ) = feeCollector.call{value: availableFee}('');
      if (!callSucceeded) {
        fallbackVault.registerIncomingFunds{value: availableFee}(
          feeManager.owner()
        );
      }
    } else {
      IERC20(currency).safeTransfer(msg.sender, availableFee);
    }
    emit FeeCollected(availableFee, currency);
  }

  function transferOwnedERC20Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) external override onlyAdmin {
    IERC20(agreement).safeTransfer(recipient, amount);
  }

  function transferOwnedERC1155Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) external override onlyAdmin {
    IERC1155(agreement).safeTransferFrom(
      address(this),
      recipient,
      1,
      amount,
      ''
    );
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    virtual
    override(ERC165Upgradeable, ERC1155HolderUpgradeable)
    returns (bool)
  {
    return
      interfaceId == type(IAgreement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _addAdmin(address user) internal {
    if (admins[user] == true) {
      revert AlreadyExist();
    }
    admins[user] = true;
    adminCount++;
    emit AdminAdded(user);
  }

  function _getContractBalance(
    address currency
  ) internal view returns (uint256) {
    if (currency == address(0)) {
      return address(this).balance;
    } else {
      return IERC20(currency).balanceOf(address(this));
    }
  }

  function _hasUnregisteredIncome(
    address currency
  ) internal view returns (bool) {
    if (currency == address(0)) {
      return (receivedFunds[currency] <
        (withdrawnFunds[currency] + address(this).balance));
    } else {
      return (receivedFunds[currency] <
        (withdrawnFunds[currency] + IERC20(currency).balanceOf(address(this))));
    }
  }

  function _registerIncome(
    address currency
  ) internal returns (Fees memory fees) {
    fees = _updatePaymentFeeCounter(currency);
    uint256 newlyReceivedFunds;
    if (currency == address(0)) {
      newlyReceivedFunds = address(this).balance;
    } else {
      newlyReceivedFunds = IERC20(currency).balanceOf(address(this));
    }
    receivedFunds[currency] = withdrawnFunds[currency] + newlyReceivedFunds;
    emit ERC20IncomeRegistered(currency, newlyReceivedFunds);
    return fees;
  }

  function _updatePaymentFeeCounter(
    address currency
  ) private returns (Fees memory fees) {
    fees = feeManager.getFees(currency);

    uint256 newIncome;
    if (currency == address(0)) {
      newIncome =
        (withdrawnFunds[currency] + address(this).balance) -
        receivedFunds[currency];
    } else {
      newIncome =
        (withdrawnFunds[currency] + IERC20(currency).balanceOf(address(this))) -
        receivedFunds[currency];
    }
    uint256 newPaymentFee = (newIncome * fees.paymentFee) / fees.feeDenominator;
    paymentFees[currency] += newPaymentFee;
    emit FeeAvailable(newPaymentFee, currency);
    return fees;
  }

  function _claimHolderFunds(
    address currency,
    address holder,
    uint256 holderShares,
    uint256 totalSupply,
    bool collectRelayerFee
  ) internal {
    if (currencyManager.currencyMap(currency) == false) {
      revert CurrencyNotSupported();
    }

    Fees memory fees;

    if (_hasUnregisteredIncome(currency)) {
      fees = _registerIncome(currency);
    } else {
      fees = feeManager.getFees(currency);
    }
    if (fees.maxRelayerFee == 0) {
      revert ClaimWithRelayerNotSupported();
    }
    if (holderFundsCounters[currency][holder] != receivedFunds[currency]) {
      uint256 amount = _calculateClaimableAmount(
        receivedFunds[currency],
        currency,
        holder,
        holderShares,
        totalSupply,
        fees
      );

      if (amount > 0) {
        holderFundsCounters[currency][holder] = receivedFunds[currency];
        withdrawnFunds[currency] += amount;
        uint256 relayerCut = 0;
        if (collectRelayerFee == true) {
          relayerCut = (amount * fees.relayerFee) / fees.feeDenominator;
          if (relayerCut > fees.maxRelayerFee) {
            relayerCut = fees.maxRelayerFee;
          }
          amount = amount - relayerCut;
          _transferFunds(currency, msg.sender, relayerCut);
        }
        _transferFunds(currency, holder, amount);
        emit HolderFundsClaimed(holder, amount, currency);
      }
    }
  }

  function _transferFunds(
    address currency,
    address receiver,
    uint256 amount
  ) private {
    if (currency == address(0)) {
      (bool success, ) = receiver.call{value: amount}('');

      if (success == false) {
        fallbackVault.registerIncomingFunds{value: amount}(receiver);
      }
    } else {
      IERC20(currency).safeTransfer(receiver, amount);
    }
  }

  function _calculateClaimableAmount(
    uint256 _receivedFunds,
    address currency,
    address holder,
    uint256 holderShares,
    uint256 totalSupply,
    Fees memory fees
  ) internal view returns (uint256 claimableAmount) {
    uint256 amount = ((_receivedFunds - holderFundsCounters[currency][holder]) *
      holderShares) / totalSupply;
    uint256 paymentFee = ((amount * fees.paymentFee) / fees.feeDenominator);
    claimableAmount = amount - paymentFee;
    return claimableAmount;
  }

  function _authorizeUpgrade(address) internal override onlyAdmin {}

  receive() external payable {
    emit NativeCoinReceived(msg.sender, msg.value);
  }
}
