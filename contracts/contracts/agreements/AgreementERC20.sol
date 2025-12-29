// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '../interfaces/IFeeManager.sol';
import '../interfaces/IAgreementRelationsRegistry.sol';
import '../interfaces/ICurrencyManager.sol';
import '../interfaces/IAgreementERC20.sol';
import '../interfaces/IFallbackVault.sol';
import '../interfaces/INamespaceRegistry.sol';

contract AgreementERC20 is
  Initializable,
  ERC20Upgradeable,
  ERC1155HolderUpgradeable,
  IAgreementERC20,
  UUPSUpgradeable
{
  using SafeERC20 for IERC20;

  ICurrencyManager private currencyManager;
  IFeeManager private feeManager;
  IAgreementRelationsRegistry private agreementRelationsRegistry;
  IFallbackVault private fallbackVault;

  mapping(address => uint256) public receivedFunds;
  mapping(address => uint256) public withdrawnFunds;
  mapping(address => uint256) public fees;
  mapping(address => uint256) public feesCollected;

  uint256 private _adminCount;

  mapping(address => mapping(address => uint256)) public holderFundsCounters;
  mapping(address => bool) private admins;

  INamespaceRegistry private namespaceRegistry;
  string public rwaId;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  modifier onlyAdmin() {
    require(
      admins[msg.sender] == true,
      'AgreementERC20: Sender must be an admin'
    );
    _;
  }

  function initialize(
    AgreementERC20InitParams calldata params
  ) public initializer {
    require(params.holders.length > 0, 'AgreementERC20: No holders');
    require(
      params.holders[0].isAdmin,
      'AgreementERC20: First holder must be admin'
    );

    __ERC20_init('OW Agreement', 'share');
    __ERC1155Holder_init();
    __UUPSUpgradeable_init();

    currencyManager = ICurrencyManager(params.currencyManager);
    feeManager = IFeeManager(params.feeManager);
    agreementRelationsRegistry = IAgreementRelationsRegistry(
      params.agreementRelationsRegistry
    );
    fallbackVault = IFallbackVault(params.fallbackVault);
    namespaceRegistry = INamespaceRegistry(params.namespaceRegistry);

    rwaId = params.rwaId;

    for (uint256 i = 0; i < params.holders.length; i++) {
      _addHolder(params.holders[i]);
    }
  }

  function addAdmin(address user) public override onlyAdmin {
    _addAdmin(user);
  }

  function removeAdmin(address user) public override onlyAdmin {
    require(admins[user] == true, 'AgreementERC20: Account is not an admin');
    require(_adminCount > 1, 'AgreementERC20: Cannot remove last admin');
    _adminCount--;
    admins[user] = false;
    emit AdminRemoved(user);
  }

  function claimHolderFunds(address holder, address currency) public override {
    require(
      currencyManager.currencyMap(currency) == true,
      'AgreementERC20: Currency not supported'
    );
    uint256 currentFee;
    uint256 paymentFeeDenominator;

    if (_hasUnregisteredIncome(currency)) {
      (currentFee, paymentFeeDenominator) = _registerIncome(currency);
    } else {
      (, currentFee, paymentFeeDenominator) = feeManager.getFees();
    }
    if (holderFundsCounters[currency][holder] != receivedFunds[currency]) {
      uint256 amount;
      (amount, ) = _calculateClaimableAmount(
        receivedFunds[currency],
        currency,
        holder,
        currentFee,
        paymentFeeDenominator
      );
      if (amount > 0) {
        holderFundsCounters[currency][holder] = receivedFunds[currency];
        withdrawnFunds[currency] += amount;
        if (currency == address(0)) {
          (bool holderWasPaid, ) = holder.call{value: amount}('');

          if (holderWasPaid == false) {
            fallbackVault.registerIncomingFunds{value: amount}(holder);
          }
        } else {
          IERC20(currency).safeTransfer(holder, amount);
        }
        emit HolderFundsClaimed(holder, amount, currency);
      }
    }
  }

  function collectFee(address currency) public override {
    require(
      msg.sender == address(feeManager),
      'AgreementERC20: Only FeeManager can collect fee'
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
  ) public override onlyAdmin {
    IERC20(agreement).safeTransfer(recipient, amount);
  }

  function transferOwnedERC1155Shares(
    address agreement,
    address recipient,
    uint256 amount
  ) public override onlyAdmin {
    IERC1155(agreement).safeTransferFrom(
      address(this),
      recipient,
      1,
      amount,
      ''
    );
  }

  function isAdmin(address user) public view override returns (bool) {
    return admins[user];
  }

  function getAvailableFee(
    address currency
  ) public view override returns (uint256) {
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

  function getClaimableAmount(
    address currency,
    address holder
  ) public view override returns (uint256 claimableAmount, uint256 fee) {
    require(
      currencyManager.currencyMap(currency) == true,
      'AgreementERC20: Currency not supported'
    );
    uint256 currentFee;
    uint256 paymentFeeDenominator;

    (, currentFee, paymentFeeDenominator) = feeManager.getFees();
    uint256 _receivedFunds = withdrawnFunds[currency] +
      _getContractBalance(currency);

    return
      _calculateClaimableAmount(
        _receivedFunds,
        currency,
        holder,
        currentFee,
        paymentFeeDenominator
      );
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC1155HolderUpgradeable) returns (bool) {
    return
      interfaceId == type(IAgreement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _authorizeUpgrade(address) internal override onlyAdmin {}

  function _update(address from, address to, uint256 amount) internal override {
    if (balanceOf(to) == 0 && to.code.length > 0) {
      agreementRelationsRegistry.registerChildParentRelation(to);
    }
    if (balanceOf(from) == amount && from.code.length > 0) {
      agreementRelationsRegistry.removeChildParentRelation(from);
    }
    if (from != address(0)) {
      address[] memory currencyArray = currencyManager.getCurrencyArray();
      for (uint i = 0; i < currencyArray.length; i++) {
        claimHolderFunds(from, currencyArray[i]);
        holderFundsCounters[currencyArray[i]][from] = receivedFunds[
          currencyArray[i]
        ];
      }
    }
    if (to != address(0)) {
      address[] memory currencyArray = currencyManager.getCurrencyArray();
      for (uint i = 0; i < currencyArray.length; i++) {
        claimHolderFunds(to, currencyArray[i]);
        holderFundsCounters[currencyArray[i]][to] = receivedFunds[
          currencyArray[i]
        ];
      }
    }
    super._update(from, to, amount);
  }

  function _calculateClaimableAmount(
    uint256 _receivedFunds,
    address currency,
    address holder,
    uint256 currentFee,
    uint256 paymentFeeDenominator
  ) private view returns (uint256 claimableAmount, uint256 fee) {
    uint256 amount = ((_receivedFunds - holderFundsCounters[currency][holder]) *
      balanceOf(holder)) / totalSupply();
    fee = ((amount * currentFee) / paymentFeeDenominator);
    claimableAmount = amount - ((amount * currentFee) / paymentFeeDenominator);
    return (claimableAmount, fee);
  }

  function _getContractBalance(
    address currency
  ) private view returns (uint256) {
    if (currency == address(0)) {
      return address(this).balance;
    } else {
      return IERC20(currency).balanceOf(address(this));
    }
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

  function _addHolder(Holder calldata holder) private {
    require(
      holder.balance > 0 || holder.isAdmin,
      'AgreementERC20: Holder balance is zero'
    );
    require(
      holder.account != address(0),
      'AgreementERC20: Holder account is zero'
    );
    require(balanceOf(holder.account) == 0, 'AgreementERC20: Duplicate holder');
    _mint(holder.account, holder.balance);
    if (holder.isAdmin) {
      _addAdmin(holder.account);
    }
  }

  function _addAdmin(address user) private {
    require(user != address(0), 'AgreementERC20: Invalid admin');
    require(
      admins[user] == false,
      'AgreementERC20: Account is already an admin'
    );
    admins[user] = true;
    _adminCount++;
    emit AdminAdded(user);
  }

  function _hasUnregisteredIncome(
    address currency
  ) private view returns (bool) {
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
  ) private returns (uint256 currentFee, uint256 paymentFeeDenominator) {
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

  receive() external payable {
    emit NativeCoinReceived(msg.sender, msg.value);
  }
}
