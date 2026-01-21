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
    address currency,
    bool payRelayer
  ) public override nonReentrant {
    uint256 holderShares = balanceOf(holder);

    _claimHolderFunds(
      currency,
      holder,
      holderShares,
      totalSupply(),
      payRelayer
    );
  }

  function getClaimableAmount(
    address currency,
    address holder,
    bool payRelayer
  )
    external
    view
    override
    returns (uint256 claimableAmount, uint256 relayerCut)
  {
    if (currencyManager.currencyMap(currency) == false) {
      revert CurrencyNotSupported();
    }

    Fees memory fees = feeManager.getFees(currency);
    uint256 _receivedFunds = withdrawnFunds[currency] +
      _getContractBalance(currency);

    uint256 holderShares = balanceOf(holder);

    claimableAmount = _calculateClaimableAmount(
      _receivedFunds,
      currency,
      holder,
      holderShares,
      totalSupply(),
      fees
    );
    if (payRelayer == true) {
      relayerCut = (claimableAmount * fees.relayerFee) / fees.feeDenominator;
      if (relayerCut > fees.maxRelayerFee) {
        relayerCut = fees.maxRelayerFee;
      }
      claimableAmount = claimableAmount - relayerCut;
    }

    return (claimableAmount, relayerCut);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(Agreement) returns (bool) {
    return
      interfaceId == type(IAgreementERC20).interfaceId ||
      super.supportsInterface(interfaceId);
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
      uint256 len = currencyArray.length;
      for (uint i = 0; i < len; ) {
        address currency = currencyArray[i];
        claimHolderFunds(from, currency, false);
        holderFundsCounters[currency][from] = receivedFunds[currency];
        unchecked {
          ++i;
        }
      }
    }
    if (to != address(0)) {
      address[] memory currencyArray = currencyManager.getCurrencyArray();
      uint256 len = currencyArray.length;
      for (uint i = 0; i < len; ) {
        address currency = currencyArray[i];
        claimHolderFunds(to, currency, false);
        holderFundsCounters[currency][to] = receivedFunds[currency];
        unchecked {
          ++i;
        }
      }
    }
    super._update(from, to, amount);
  }
}
