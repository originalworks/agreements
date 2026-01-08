// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import './interfaces/IAgreementRelationsRegistry.sol';
import './interfaces/IAgreementFactory.sol';

contract AgreementRelationsRegistry is
  IAgreementRelationsRegistry,
  OwnableUpgradeable,
  ERC165Upgradeable,
  UUPSUpgradeable
{
  error AccessDenied();
  event AgreementFactoryAddressChanged(address previous, address current);
  mapping(address => address[]) private childParentRelations;

  IAgreementFactory agreementFactory;

  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
    __ERC165_init();
  }

  function setAgreementFactoryAddress(
    IAgreementFactory _agreementFactory
  ) external onlyOwner {
    address previous = address(agreementFactory);
    agreementFactory = _agreementFactory;
    emit AgreementFactoryAddressChanged(previous, address(agreementFactory));
  }

  function registerInitialRelation(address child, address parent) external {
    if (msg.sender != address(agreementFactory)) {
      revert AccessDenied();
    }
    _checkForCircularDependency(child, parent);
    childParentRelations[child].push(parent);
  }

  function registerChildParentRelation(address parent) external {
    bool senderIsAgreement = agreementFactory.createdAgreements(msg.sender);

    if (senderIsAgreement == false) {
      revert AccessDenied();
    }
    _checkForCircularDependency(msg.sender, parent);
    childParentRelations[msg.sender].push(parent);
  }

  function removeChildParentRelation(address parent) external {
    bool senderIsAgreement = agreementFactory.createdAgreements(msg.sender);

    if (senderIsAgreement == false) {
      revert AccessDenied();
    }
    for (uint256 i = 0; i < childParentRelations[msg.sender].length; i++) {
      if (childParentRelations[msg.sender][i] == parent) {
        childParentRelations[msg.sender][i] = childParentRelations[msg.sender][
          childParentRelations[msg.sender].length - 1
        ];
        childParentRelations[msg.sender].pop();
      }
    }
  }

  function _checkForCircularDependency(
    address child,
    address parent
  ) private view {
    address[] memory grandParents = childParentRelations[parent];
    for (uint256 i = 0; i < grandParents.length; i++) {
      if (grandParents[i] == child) {
        revert('AgreementRelationsRegistry: Circular dependency not allowed');
      } else {
        _checkForCircularDependency(child, grandParents[i]);
      }
    }
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165Upgradeable) returns (bool) {
    return
      interfaceId == type(IAgreementRelationsRegistry).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}
}
