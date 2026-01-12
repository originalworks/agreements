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
  error CircularDependency();
  error MaxDepthExceeded();
  error MaxParentsExceeded();
  error DuplicateParent();
  error AccessDenied();

  event AgreementFactoryAddressChanged(address previous, address current);
  event MaxDepthIncreased(uint8 currentDepth);
  event MaxParentsIncreased(uint8 currentDepth);

  mapping(address => address[]) public parentsOf;

  IAgreementFactory agreementFactory;
  uint8 public maxDepth;
  uint8 public maxParents;

  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
    __ERC165_init();

    maxDepth = 3;
    maxParents = 5;
  }

  // To ensure backward compatibility only increasing
  // the value of 'maxDepth' and 'maxParents' should be allowed
  function increaseMaxDepth() external onlyOwner {
    maxDepth++;
    emit MaxDepthIncreased(maxDepth);
  }

  function increaseMaxParents() external onlyOwner {
    maxParents++;
    emit MaxParentsIncreased(maxParents);
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
    parentsOf[child].push(parent);
  }

  function registerChildParentRelation(address parent) external {
    if (
      agreementFactory.createdAgreements(msg.sender) &&
      agreementFactory.createdAgreements(parent)
    ) {
      _checkForCircularDependency(msg.sender, parent);
      parentsOf[msg.sender].push(parent);
    }
  }

  function removeChildParentRelation(address parent) external {
    if (
      agreementFactory.createdAgreements(msg.sender) &&
      agreementFactory.createdAgreements(parent)
    ) {
      for (uint256 i = 0; i < parentsOf[msg.sender].length; i++) {
        if (parentsOf[msg.sender][i] == parent) {
          parentsOf[msg.sender][i] = parentsOf[msg.sender][
            parentsOf[msg.sender].length - 1
          ];
          parentsOf[msg.sender].pop();
        }
      }
    }
  }

  function _checkForCircularDependency(
    address child,
    address parent
  ) internal view {
    if (parentsOf[child].length == maxParents) {
      revert MaxParentsExceeded();
    }
    address[] memory nodeStack = new address[](maxDepth + 1);
    uint8[] memory parentIndexStack = new uint8[](maxDepth + 1);

    uint256 stackSize = 1;
    nodeStack[0] = parent;
    parentIndexStack[0] = 0;

    while (stackSize > 0) {
      uint256 depth = stackSize - 1;

      if (depth >= maxDepth) {
        revert MaxDepthExceeded();
      }

      address current = nodeStack[depth];

      if (current == child) {
        revert CircularDependency();
      }

      address[] storage parents = parentsOf[current];

      uint256 parentCount = parents.length;
      uint8 parentIdx = parentIndexStack[depth];

      if (parentIdx < parentCount) {
        address next = parents[parentIdx];
        parentIndexStack[depth] = parentIdx + 1;

        nodeStack[stackSize] = next;
        parentIndexStack[stackSize] = 0;
        stackSize++;
      } else {
        stackSize--;
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
