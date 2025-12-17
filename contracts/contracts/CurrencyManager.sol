// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;
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
  mapping(address => bool) public currencyMap;
  address[] private currencyArray;

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

  function initialize(address[] memory initialList) public initializer {
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
    __ERC165_init();

    for (uint i = 0; i < initialList.length; i++) {
      if (initialList[i] == address(0)) {
        currencyMap[initialList[i]] = true;
        currencyArray.push(initialList[i]);
        emit CurrencyAdded(initialList[i], '', 'native coin', 0);
      } else {
        addCurrency(initialList[i]);
      }
    }
  }

  function getCurrencyArray() external view returns (address[] memory) {
    return currencyArray;
  }

  function addCurrency(address currency) public onlyOwner {
    require(
      currencyMap[currency] == false,
      'CurrencyManager: currency already listed'
    );
    currencyMap[currency] = true;
    currencyArray.push(currency);

    string memory symbol = IERC20Metadata(currency).symbol();
    string memory name = IERC20Metadata(currency).name();
    uint8 decimals = IERC20Metadata(currency).decimals();

    emit CurrencyAdded(currency, symbol, name, decimals);
  }

  function removeCurrency(address currency) external onlyOwner {
    require(
      currencyMap[currency] == true,
      'CurrencyManager: currency not listed'
    );
    require(
      currency != address(0),
      'CurrencyManager: can not remove native coin address'
    );
    currencyMap[currency] = false;
    for (uint i = 0; i < currencyArray.length; i++) {
      if (currency == currencyArray[i]) {
        currencyArray[i] = currencyArray[currencyArray.length - 1];
        currencyArray.pop();
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
