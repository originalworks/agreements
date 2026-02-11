// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import './EIP3009.sol';

contract ERC20TokenMock is
  ERC20Upgradeable,
  OwnableUpgradeable,
  EIP3009,
  UUPSUpgradeable
{
  string public constant version = '2';
  uint8 private _decimalPoints;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    string memory name,
    string memory symbol,
    uint8 decimalPoints
  ) public initializer {
    __ERC20_init(name, symbol);
    __EIP712_init_unchained(name, '2');
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
    _decimalPoints = decimalPoints;
  }

  function mintTo(address user, uint256 amount) public {
    _mint(user, amount);
  }

  function decimals() public view override returns (uint8) {
    return _decimalPoints;
  }

  function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {
    _transferWithAuthorization(
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
      v,
      r,
      s
    );
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner {}
}
