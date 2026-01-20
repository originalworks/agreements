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

abstract contract Agreement is
  IAgreement,
  Initializable,
  IPaymentFeeSource,
  ERC165Upgradeable,
  ERC1155HolderUpgradeable,
  UUPSUpgradeable
{
  using SafeERC20 for IERC20;

  mapping(address => uint256) public receivedFunds;
  mapping(address => uint256) public withdrawnFunds;
  mapping(address => uint256) public fees;
  mapping(address => uint256) public feesCollected;
  mapping(address => mapping(address => uint256)) public holderFundsCounters;
  mapping(address => bool) private admins;

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
    (, uint256 paymentFee, uint256 paymentFeeDenominator) = feeManager
      .getFees();
    uint256 availableFee = fees[currency] - feesCollected[currency];

    if (_hasUnregisteredIncome(currency)) {
      uint256 currentBalance = _getContractBalance(currency);
      uint256 newTotal = withdrawnFunds[currency] + currentBalance;
      uint256 newReceived = newTotal - receivedFunds[currency];
      return availableFee + (newReceived * paymentFee) / paymentFeeDenominator;
    } else {
      return availableFee;
    }
  }

  function collectFee(address currency) external override {
    require(
      msg.sender == address(feeManager),
      'AgreementERC1155: Only FeeManager can collect fee'
    );
    if (_hasUnregisteredIncome(currency)) {
      _registerIncome(currency);
    }
    uint256 availableFee = fees[currency] - feesCollected[currency];
    withdrawnFunds[currency] += availableFee;
    feesCollected[currency] += availableFee;
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
      revert AlreadyAdmin();
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
  ) internal returns (uint256 currentFee, uint256 paymentFeeDenominator) {
    (currentFee, paymentFeeDenominator) = _updateFee(currency);
    uint256 newlyReceivedFunds;
    if (currency == address(0)) {
      newlyReceivedFunds = address(this).balance;
    } else {
      newlyReceivedFunds = IERC20(currency).balanceOf(address(this));
    }
    receivedFunds[currency] = withdrawnFunds[currency] + newlyReceivedFunds;
    emit ERC20IncomeRegistered(currency, newlyReceivedFunds);
    return (currentFee, paymentFeeDenominator);
  }

  function _updateFee(address currency) private returns (uint256, uint256) {
    (, uint paymentFee, uint256 paymentFeeDenominator) = feeManager.getFees();

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
    uint256 newFee = (newIncome * paymentFee) / paymentFeeDenominator;
    fees[currency] += newFee;
    emit FeeAvailable(newFee, fees[currency], currency);
    return (paymentFee, paymentFeeDenominator);
  }

  function _authorizeUpgrade(address) internal override onlyAdmin {}

  receive() external payable {
    emit NativeCoinReceived(msg.sender, msg.value);
  }
}
