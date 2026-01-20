// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import './Agreement.sol';
import '../interfaces/IAgreementERC20.sol';

contract AgreementERC20 is
  Initializable,
  Agreement,
  ERC20Upgradeable,
  IAgreementERC20,
  ReentrancyGuardUpgradeable
{
  using SafeERC20 for IERC20;

  uint256[50] private __gap;

  function initialize(
    AgreementERC20InitParams calldata params
  ) public initializer {
    if (params.holders.length == 0) {
      revert EmptyHoldersInput();
    }
    if (params.holders[0].isAdmin == false) {
      revert FirstHolderMustBeAdmin();
    }

    __ERC20_init('OW Agreement', 'share');
    __ERC1155Holder_init();
    __UUPSUpgradeable_init();

    __Agreement_init(
      AgreementInitParams({
        currencyManager: params.currencyManager,
        feeManager: params.feeManager,
        agreementRelationsRegistry: params.agreementRelationsRegistry,
        fallbackVault: params.fallbackVault,
        namespaceRegistry: params.namespaceRegistry,
        rwaId: params.rwaId
      })
    );

    for (uint256 i = 0; i < params.holders.length; i++) {
      _addHolder(params.holders[i]);
    }
  }

  function claimHolderFunds(
    address holder,
    address currency
  ) public override nonReentrant {
    if (currencyManager.currencyMap(currency) == false) {
      revert CurrencyNotSupported();
    }
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

  function getClaimableAmount(
    address currency,
    address holder
  ) external view override returns (uint256 claimableAmount, uint256 fee) {
    if (currencyManager.currencyMap(currency) == false) {
      revert CurrencyNotSupported();
    }
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
  ) public view virtual override(Agreement) returns (bool) {
    return
      interfaceId == type(IAgreementERC20).interfaceId ||
      super.supportsInterface(interfaceId);
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

  function _addHolder(Holder calldata holder) private {
    if (holder.balance == 0 && holder.isAdmin == false) {
      revert ZeroBalanceHolder();
    }
    if (holder.account == address(0)) {
      revert ZeroAddressNotAllowed();
    }
    if (balanceOf(holder.account) != 0) {
      revert AlreadyExist();
    }
    _mint(holder.account, holder.balance);
    if (holder.isAdmin) {
      _addAdmin(holder.account);
    }
  }

  function _update(address from, address to, uint256 amount) internal override {
    if (to == address(this)) {
      revert SelfTransfer();
    }
    if (to == address(0)) {
      revert BurnNotAllowed();
    }
    if (balanceOf(to) == 0 && to.code.length > 0 && from != address(0)) {
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
}
