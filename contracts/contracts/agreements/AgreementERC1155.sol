// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import './Agreement.sol';
import '../interfaces/IAgreementERC1155.sol';

contract AgreementERC1155 is
  Initializable,
  Agreement,
  ERC1155Upgradeable,
  IAgreementERC1155,
  ReentrancyGuardUpgradeable
{
  using SafeERC20 for IERC20;

  uint256 public totalSupply;
  string public contractURI;

  uint256[50] private __gap;

  function initialize(
    AgreementERC1155InitParams calldata params
  ) public initializer {
    if (params.holders.length == 0) {
      revert EmptyHoldersInput();
    }
    if (params.holders[0].isAdmin == false) {
      revert FirstHolderMustBeAdmin();
    }

    __ERC1155_init(params.tokenUri);
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

    contractURI = params.contractUri;

    for (uint256 i = 0; i < params.holders.length; i++) {
      _addHolder(params.holders[i]);
    }
  }

  function setContractUri(string calldata newContractUri) external onlyAdmin {
    contractURI = newContractUri;
    emit ContractUriChanged(newContractUri);
  }

  function setUri(string calldata newUri) external onlyAdmin {
    _setURI(newUri);
    emit DataHashChanged(newUri);
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
  ) public view virtual override(Agreement, ERC1155Upgradeable) returns (bool) {
    return
      interfaceId == type(IAgreementERC1155).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _addHolder(Holder calldata holder) private {
    if (holder.balance == 0 && holder.isAdmin == false) {
      revert ZeroBalanceHolder();
    }
    if (holder.account == address(0)) {
      revert ZeroAddressNotAllowed();
    }
    if (balanceOf(holder.account, 1) != 0) {
      revert AlreadyExist();
    }
    _mint(holder.account, 1, holder.balance, '');
    if (holder.isAdmin) {
      _addAdmin(holder.account);
    }
  }

  function _calculateClaimableAmount(
    uint256 _receivedFunds,
    address currency,
    address holder,
    uint256 currentFee,
    uint256 paymentFeeDenominator
  ) private view returns (uint256 claimableAmount, uint256 fee) {
    uint256 amount = ((_receivedFunds - holderFundsCounters[currency][holder]) *
      balanceOf(holder, 1)) / totalSupply;
    fee = ((amount * currentFee) / paymentFeeDenominator);
    claimableAmount = amount - ((amount * currentFee) / paymentFeeDenominator);
    return (claimableAmount, fee);
  }

  function _update(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts
  ) internal override {
    if (to == address(this)) {
      revert SelfTransfer();
    }
    if (to == address(0)) {
      revert BurnNotAllowed();
    }
    for (uint256 i = 0; i < amounts.length; i++) {
      if (balanceOf(to, 1) == 0 && to.code.length > 0 && from != address(0)) {
        agreementRelationsRegistry.registerChildParentRelation(to);
      }
      if (
        from != address(0) &&
        balanceOf(from, 1) == amounts[i] &&
        from.code.length > 0
      ) {
        agreementRelationsRegistry.removeChildParentRelation(from);
      }
      if (from != address(0)) {
        address[] memory currencyArray = currencyManager.getCurrencyArray();
        for (uint ii = 0; ii < currencyArray.length; ii++) {
          claimHolderFunds(from, currencyArray[ii]);
          holderFundsCounters[currencyArray[ii]][from] = receivedFunds[
            currencyArray[ii]
          ];
        }
      }
      if (to != address(0)) {
        address[] memory currencyArray = currencyManager.getCurrencyArray();
        for (uint ii = 0; ii < currencyArray.length; ii++) {
          claimHolderFunds(to, currencyArray[ii]);
          holderFundsCounters[currencyArray[ii]][to] = receivedFunds[
            currencyArray[ii]
          ];
        }
      }

      if (from == address(0)) {
        totalSupply += amounts[i];
      }
    }

    super._update(from, to, ids, amounts);
  }
}
