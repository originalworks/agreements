// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.32;
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import './interfaces/IPaymentFeeSource.sol';
import './interfaces/ICreationFeeSource.sol';
import './interfaces/IFeeManager.sol';

contract FeeManager is
  IFeeManager,
  OwnableUpgradeable,
  UUPSUpgradeable,
  ERC165Upgradeable
{
  using SafeERC20 for IERC20;

  error FailedNativeCoinWithdrawal();
  error FeeTooHigh();

  // STORAGE

  uint256 public creationFee;
  uint256 public paymentFee;
  uint256 public relayerFee;
  uint256 public constant PAYMENT_FEE_DENOMINATOR = 1e18;

  uint256[50] private __gap;

  // EVENTS

  event CreationFeeChanged(uint256 creationFee);
  event PaymentFeeChanged(uint256 paymentFee);
  event RelayerFeeChanged(uint256 relayerFee);

  // INIT

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    uint256 initialCreationFee,
    uint256 initialPaymentFee,
    uint256 initialRelayerFee
  ) public initializer {
    __Ownable_init(msg.sender);
    __ERC165_init();
    __UUPSUpgradeable_init();
    setPaymentFee(initialPaymentFee);
    setCreationFee(initialCreationFee);
    setRelayerFee(initialRelayerFee);
  }

  // GETTER

  function getFees()
    external
    view
    returns (
      uint256 _creationFee,
      uint256 _paymentFee,
      uint256 _relayerFee,
      uint256 _paymentFeeDenominator
    )
  {
    return (creationFee, paymentFee, relayerFee, PAYMENT_FEE_DENOMINATOR);
  }

  function owner()
    public
    view
    override(IFeeManager, OwnableUpgradeable)
    returns (address)
  {
    return OwnableUpgradeable.owner();
  }

  // SETTERS

  function setCreationFee(uint256 newFee) public onlyOwner {
    creationFee = newFee;
    emit CreationFeeChanged(newFee);
  }

  function setPaymentFee(uint256 newFee) public onlyOwner {
    if (newFee >= PAYMENT_FEE_DENOMINATOR) {
      revert FeeTooHigh();
    }
    paymentFee = newFee;
    emit PaymentFeeChanged(newFee);
  }

  function setRelayerFee(uint256 newFee) public onlyOwner {
    if (newFee >= PAYMENT_FEE_DENOMINATOR) {
      revert FeeTooHigh();
    }
    relayerFee = newFee;
    emit RelayerFeeChanged(newFee);
  }

  // LOGIC

  function collectCreationFee(ICreationFeeSource from) external onlyOwner {
    from.collectFee();
  }

  function collectPaymentFee(
    IPaymentFeeSource from,
    address currency
  ) external onlyOwner {
    from.collectFee(currency);
  }

  function withdrawNativeCoins(address to) external onlyOwner {
    (bool success, ) = to.call{value: address(this).balance}('');
    if (!success) {
      revert FailedNativeCoinWithdrawal();
    }
  }

  function withdrawERC20(address to, IERC20 token) external onlyOwner {
    token.safeTransfer(to, token.balanceOf(address(this)));
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165Upgradeable) returns (bool) {
    return
      interfaceId == type(IFeeManager).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  receive() external payable {}
}
