// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

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
  event NamespaceEdited(address[] forAddresses, string[] newNamespaces);

  mapping(address => string) public namespaces;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize() public initializer {
    __Ownable_init(msg.sender);
  }

  function setNamespaceForAddresses(
    address[] calldata addressesArray,
    string[] calldata _namespaces
  ) public onlyOwner {
    require(
      addressesArray.length == _namespaces.length && _namespaces.length > 0,
      'NamespaceRegistry: wrong input'
    );
    for (uint i = 0; i < addressesArray.length; i++) {
      namespaces[addressesArray[i]] = _namespaces[i];
    }
    emit NamespaceEdited(addressesArray, _namespaces);
  }

  function getNamespaceForAddress(
    address addressToCheck
  ) public view returns (string memory) {
    if (
      keccak256(abi.encodePacked(namespaces[addressToCheck])) ==
      keccak256(abi.encodePacked(''))
    ) {
      return 'UNKNOWN:';
    } else {
      return string.concat(namespaces[addressToCheck], ':');
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
