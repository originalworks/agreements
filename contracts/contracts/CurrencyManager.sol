// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.32;
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './interfaces/ICurrencyManager.sol';

contract CurrencyManager is
  OwnableUpgradeable,
  ICurrencyManager,
  ERC165Upgradeable,
  UUPSUpgradeable
{
  error AlreadyListed();
  error NotListed();

  address constant NATIVE_CURRENCY = address(0);

  mapping(address => bool) public currencyMap;
  address[] private currencyArray;

  uint256[50] private __gap;

  event CurrencyAdded(
    address currencyAddress,
    string symbol,
    string name,
    uint8 decimals
  );
  event CurrencyRemoved(address currencyAddress);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address[] calldata initialList) public initializer {
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
    __ERC165_init();

    for (uint i = 0; i < initialList.length; i++) {
      if (initialList[i] == NATIVE_CURRENCY) {
        _addNativeCurrency();
      } else {
        addCurrency(initialList[i]);
      }
    }
  }

  function _addNativeCurrency() internal {
    currencyMap[NATIVE_CURRENCY] = true;
    currencyArray.push(NATIVE_CURRENCY);
    emit CurrencyAdded(NATIVE_CURRENCY, '', 'native coin', 18);
  }

  function getCurrencyArray() external view returns (address[] memory) {
    return currencyArray;
  }

  function addCurrency(address currency) public onlyOwner {
    if (currencyMap[currency] == true) {
      revert AlreadyListed();
    }
    if (currency == NATIVE_CURRENCY) {
      _addNativeCurrency();
    } else {
      currencyMap[currency] = true;
      currencyArray.push(currency);

      string memory symbol = IERC20Metadata(currency).symbol();
      string memory name = IERC20Metadata(currency).name();
      uint8 decimals = IERC20Metadata(currency).decimals();

      emit CurrencyAdded(currency, symbol, name, decimals);
    }
  }

  function removeCurrency(address currency) external onlyOwner {
    if (currencyMap[currency] == false) {
      revert NotListed();
    }

    currencyMap[currency] = false;
    for (uint i = 0; i < currencyArray.length; i++) {
      if (currency == currencyArray[i]) {
        currencyArray[i] = currencyArray[currencyArray.length - 1];
        currencyArray.pop();
        break;
      }
    }

    emit CurrencyRemoved(currency);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165Upgradeable) returns (bool) {
    return
      interfaceId == type(ICurrencyManager).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}
}
