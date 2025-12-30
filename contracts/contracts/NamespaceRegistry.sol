// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.32;

import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import './interfaces/INamespaceRegistry.sol';

contract NamespaceRegistry is
  INamespaceRegistry,
  OwnableUpgradeable,
  ERC165Upgradeable,
  UUPSUpgradeable
{
  event NamespaceEdited(address forAddress, string newNamespace);

  error NamespaceNotFound(address namespaceOwner);
  error WrongInput();
  error AlreadyRegistered(string namespace);

  mapping(address => string) public namespaces;
  mapping(string => bool) public usedNamespaces;

  uint256[50] private __gap;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ERC165_init();
    __UUPSUpgradeable_init();
  }

  function setNamespaceForAddresses(
    address[] calldata addressesArray,
    string[] calldata _namespaces
  ) public onlyOwner {
    if (
      addressesArray.length != _namespaces.length || _namespaces.length == 0
    ) {
      revert WrongInput();
    }
    uint256 len = addressesArray.length;
    for (uint i = 0; i < len; i++) {
      _setNamespaceForAddress(addressesArray[i], _namespaces[i]);
    }
  }

  function removeNamespaceForAddress(address namespaceOwner) public onlyOwner {
    _removeNamespaceForAddress(namespaceOwner);
    emit NamespaceEdited(namespaceOwner, '');
  }

  function _removeNamespaceForAddress(address namespaceOwner) internal {
    if (usedNamespaces[namespaces[namespaceOwner]] == false) {
      revert NamespaceNotFound(namespaceOwner);
    }
    usedNamespaces[namespaces[namespaceOwner]] = false;
    namespaces[namespaceOwner] = '';
  }

  function _setNamespaceForAddress(
    address namespaceOwner,
    string calldata namespaceToSet
  ) internal {
    if (usedNamespaces[namespaceToSet] == true) {
      revert AlreadyRegistered(namespaceToSet);
    }
    if (bytes(namespaceToSet).length == 0) {
      revert WrongInput();
    }
    if (bytes(namespaces[namespaceOwner]).length != 0) {
      _removeNamespaceForAddress(namespaceOwner);
    }
    namespaces[namespaceOwner] = namespaceToSet;
    usedNamespaces[namespaceToSet] = true;

    emit NamespaceEdited(namespaceOwner, namespaceToSet);
  }

  function getNamespaceForAddress(
    address addressToCheck
  ) public view returns (string memory) {
    string memory namespace = namespaces[addressToCheck];

    if (bytes(namespace).length == 0) {
      return 'UNKNOWN:';
    } else {
      return string.concat(namespace, ':');
    }
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165Upgradeable) returns (bool) {
    return
      interfaceId == type(INamespaceRegistry).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}
}
