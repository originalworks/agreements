// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '../interfaces/IFeeManager.sol';
import '../interfaces/IAgreementRelationsRegistry.sol';
import '../interfaces/IAgreementERC20.sol';
import '../interfaces/IAgreementERC1155.sol';
import '../interfaces/ICurrencyManager.sol';
import '../interfaces/IFallbackVault.sol';
import '../interfaces/ICreationFeeSource.sol';
import '../interfaces/INamespaceRegistry.sol';
import '../interfaces/IAgreementFactory.sol';

contract AgreementFactory is
  IAgreementFactory,
  Initializable,
  OwnableUpgradeable,
  ICreationFeeSource,
  ReentrancyGuardUpgradeable,
  ERC165Upgradeable,
  UUPSUpgradeable
{
  using ERC165Checker for address;

  error InvalidInterface(bytes4 expectedInterfaceId, address contractAddress);
  error ZeroAddressNotAllowed();
  error NoCodeAddress();
  error IncorrectCreationFee(uint256 expected, uint256 actual);
  error AccessDenied();
  error FeeCollectionFailed();

  IFeeManager private feeManager;
  address private currencyManager;
  IAgreementRelationsRegistry private agreementRelationsRegistry;
  address private agreementERC20Implementation;
  address private agreementERC1155Implementation;
  address private fallbackVault;
  address private namespaceRegistry;

  mapping(address => bool) public createdAgreements;

  uint256[50] private __gap;

  event AgreementCreated(
    address agreementAddress,
    TokenStandard tokenStandard,
    string rwaId
  );
  event AgreementImplementationChanged(
    address agreementImplementation,
    TokenStandard tokenStandard
  );

  enum TokenStandard {
    ERC20,
    ERC1155
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address _agreementERC20Implementation,
    address _agreementERC1155Implementation,
    address _feeManager,
    address _agreementRelationsRegistry,
    address _currencyManager,
    address _fallbackVault,
    address _namespaceRegistry
  ) public initializer {
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
    __ReentrancyGuard_init();
    __ERC165_init();

    checkInterface(type(IFeeManager).interfaceId, _feeManager);
    checkInterface(
      type(IAgreementRelationsRegistry).interfaceId,
      _agreementRelationsRegistry
    );
    checkInterface(type(ICurrencyManager).interfaceId, _currencyManager);
    checkInterface(type(IFallbackVault).interfaceId, _fallbackVault);
    checkInterface(type(INamespaceRegistry).interfaceId, _namespaceRegistry);

    setAgreementImplementation(
      _agreementERC20Implementation,
      TokenStandard.ERC20
    );
    setAgreementImplementation(
      _agreementERC1155Implementation,
      TokenStandard.ERC1155
    );
    feeManager = IFeeManager(_feeManager);
    agreementRelationsRegistry = IAgreementRelationsRegistry(
      _agreementRelationsRegistry
    );
    currencyManager = _currencyManager;
    fallbackVault = _fallbackVault;
    namespaceRegistry = _namespaceRegistry;
  }

  function checkInterface(
    bytes4 interfaceId,
    address contractAddress
  ) internal view {
    if (contractAddress.supportsInterface(interfaceId) == false) {
      revert InvalidInterface(interfaceId, contractAddress);
    }
  }

  function setNamespaceRegistryAddress(address newAddress) public onlyOwner {
    namespaceRegistry = newAddress;
  }

  function getAgreementImplementations()
    public
    view
    returns (address agreementERC20, address agreementERC1155)
  {
    return (agreementERC20Implementation, agreementERC1155Implementation);
  }

  function setAgreementImplementation(
    address newImplementation,
    TokenStandard tokenStandard
  ) public onlyOwner {
    if (newImplementation == address(0)) {
      revert ZeroAddressNotAllowed();
    }
    if (newImplementation.code.length == 0) {
      revert NoCodeAddress();
    }

    if (tokenStandard == TokenStandard.ERC20) {
      agreementERC20Implementation = newImplementation;
    } else {
      agreementERC1155Implementation = newImplementation;
    }
    emit AgreementImplementationChanged(newImplementation, tokenStandard);
  }

  function _createERC20(
    IAgreementERC20.CreateERC20Params calldata params
  ) internal {
    string memory rwaId = getCompleteRwaId(params.unassignedRwaId);

    IAgreementERC20.AgreementERC20InitParams
      memory initializerParams = IAgreementERC20.AgreementERC20InitParams({
        holders: params.holders,
        currencyManager: currencyManager,
        feeManager: address(feeManager),
        agreementRelationsRegistry: address(agreementRelationsRegistry),
        fallbackVault: fallbackVault,
        namespaceRegistry: namespaceRegistry,
        rwaId: rwaId
      });

    bytes memory data = abi.encodeWithSelector(
      IAgreementERC20.initialize.selector,
      initializerParams
    );

    ERC1967Proxy agreement = new ERC1967Proxy(
      agreementERC20Implementation,
      data
    );
    createdAgreements[address(agreement)] = true;

    for (uint i = 0; i < params.holders.length; i++) {
      if (createdAgreements[params.holders[i].account]) {
        agreementRelationsRegistry.registerInitialRelation(
          address(agreement),
          params.holders[i].account
        );
      }
    }
    emit AgreementCreated(address(agreement), TokenStandard.ERC20, rwaId);
  }

  function createERC20(
    IAgreementERC20.CreateERC20Params calldata params
  ) public payable nonReentrant {
    (uint256 creationFee, , ) = feeManager.getFees();
    if (msg.value != creationFee) {
      revert IncorrectCreationFee(creationFee, msg.value);
    }

    _createERC20(params);
  }

  function createBatchERC20(
    IAgreementERC20.CreateERC20Params[] calldata input
  ) public payable nonReentrant {
    (uint256 creationFee, , ) = feeManager.getFees();
    if (msg.value != creationFee * input.length) {
      revert IncorrectCreationFee(creationFee * input.length, msg.value);
    }

    for (uint i = 0; i < input.length; i++) {
      _createERC20(input[i]);
    }
  }

  function _createERC1155(
    IAgreementERC1155.CreateERC1155Params calldata params
  ) internal {
    string memory rwaId = getCompleteRwaId(params.unassignedRwaId);

    IAgreementERC1155.AgreementERC1155InitParams
      memory initializerParams = IAgreementERC1155.AgreementERC1155InitParams({
        contractUri: params.contractURI,
        tokenUri: params.tokenUri,
        holders: params.holders,
        currencyManager: currencyManager,
        feeManager: address(feeManager),
        agreementRelationsRegistry: address(agreementRelationsRegistry),
        fallbackVault: fallbackVault,
        namespaceRegistry: namespaceRegistry,
        rwaId: rwaId
      });
    bytes memory data = abi.encodeWithSelector(
      IAgreementERC1155.initialize.selector,
      initializerParams
    );

    ERC1967Proxy agreement = new ERC1967Proxy(
      agreementERC1155Implementation,
      data
    );
    createdAgreements[address(agreement)] = true;
    for (uint i = 0; i < params.holders.length; i++) {
      if (createdAgreements[params.holders[i].account]) {
        agreementRelationsRegistry.registerInitialRelation(
          address(agreement),
          params.holders[i].account
        );
      }
    }
    emit AgreementCreated(address(agreement), TokenStandard.ERC1155, rwaId);
  }

  function createERC1155(
    IAgreementERC1155.CreateERC1155Params calldata params
  ) public payable nonReentrant {
    (uint256 creationFee, , ) = feeManager.getFees();
    if (msg.value != creationFee) {
      revert IncorrectCreationFee(creationFee, msg.value);
    }
    _createERC1155(params);
  }

  function createBatchERC1155(
    IAgreementERC1155.CreateERC1155Params[] calldata input
  ) public payable nonReentrant {
    (uint256 creationFee, , ) = feeManager.getFees();
    if (msg.value != creationFee * input.length) {
      revert IncorrectCreationFee(creationFee * input.length, msg.value);
    }

    for (uint i = 0; i < input.length; i++) {
      _createERC1155(input[i]);
    }
  }

  function getCompleteRwaId(
    string calldata unassignedRwaId
  ) private view returns (string memory) {
    string memory namespace = INamespaceRegistry(namespaceRegistry)
      .getNamespaceForAddress(msg.sender);
    string memory rwaId = string.concat(namespace, unassignedRwaId);

    return rwaId;
  }

  function collectFee() external {
    if (msg.sender != address(feeManager)) {
      revert AccessDenied();
    }
    address payable feeManagerAddr = payable(address(feeManager));
    uint256 amount = address(this).balance;
    (bool ok, ) = feeManagerAddr.call{value: amount}('');
    if (ok == false) {
      revert FeeCollectionFailed();
    }

    emit FeeCollected(amount, address(0));
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165Upgradeable) returns (bool) {
    return
      interfaceId == type(IAgreementFactory).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}
}
