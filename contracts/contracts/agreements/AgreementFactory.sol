// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import '../interfaces/IFeeManager.sol';
import '../interfaces/IAgreementRelationsRegistry.sol';
import '../interfaces/IAgreementERC20.sol';
import '../interfaces/IAgreementERC1155.sol';
import '../interfaces/ICurrencyManager.sol';
import '../interfaces/IFallbackVault.sol';
import '../interfaces/ICreationFeeSource.sol';
import '../interfaces/INamespaceRegistry.sol';
import '../interfaces/IAgreementFactory.sol';
import '../interfaces/IAgreementRelationsRegistry.sol';

contract AgreementFactory is
  IAgreementFactory,
  Initializable,
  OwnableUpgradeable,
  ICreationFeeSource,
  UUPSUpgradeable
{
  using ERC165Checker for address;

  IFeeManager private feeManager;
  address private currencyManager;
  IAgreementRelationsRegistry private agreementRelationsRegistry;
  address private agreementERC20Implementation;
  address private agreementERC1155Implementation;
  address private fallbackVault;
  address private namespaceRegistry;

  mapping(address => bool) public createdAgreements;

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
    require(
      _feeManager.supportsInterface(type(IFeeManager).interfaceId),
      'AgreementFactory: Wrong interface at FeeManager address'
    );
    require(
      _agreementRelationsRegistry.supportsInterface(
        type(IAgreementRelationsRegistry).interfaceId
      ),
      'AgreementFactory: Wrong interface at AgreementRelationsRegistry address'
    );
    require(
      _currencyManager.supportsInterface(type(ICurrencyManager).interfaceId),
      'AgreementFactory: Wrong interface at CurrencyManager address'
    );
    require(
      _fallbackVault.supportsInterface(type(IFallbackVault).interfaceId),
      'AgreementFactory: Wrong interface at FallbackVault address'
    );
    require(
      _namespaceRegistry.supportsInterface(
        type(INamespaceRegistry).interfaceId
      ),
      'AgreementFactory: Wrong interface at NamespaceRegistry address'
    );

    __Ownable_init(msg.sender);
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
    require(
      newImplementation != address(0),
      'AgreementFactory: agreement address cannot be 0'
    );
    require(
      newImplementation.code.length > 0,
      'AgreementFactory: agreement implementation must be a contract'
    );
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
      agreementRelationsRegistry.registerInitialRelation(
        address(agreement),
        params.holders[i].account
      );
    }
    emit AgreementCreated(address(agreement), TokenStandard.ERC20, rwaId);
  }

  function createERC20(
    IAgreementERC20.CreateERC20Params calldata params
  ) public payable {
    (uint256 creationFee, , ) = feeManager.getFees();
    require(msg.value >= creationFee, 'AgreementFactory: Insufficient fee');

    _createERC20(params);
  }

  function createBatchERC20(
    IAgreementERC20.CreateERC20Params[] calldata input
  ) public payable {
    (uint256 creationFee, , ) = feeManager.getFees();
    require(
      msg.value >= creationFee * input.length,
      'AgreementFactory: Insufficient fee'
    );

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
      agreementRelationsRegistry.registerInitialRelation(
        address(agreement),
        params.holders[i].account
      );
    }
    emit AgreementCreated(address(agreement), TokenStandard.ERC1155, rwaId);
  }

  function createERC1155(
    IAgreementERC1155.CreateERC1155Params calldata params
  ) public payable {
    (uint256 creationFee, , ) = feeManager.getFees();
    require(msg.value >= creationFee, 'AgreementFactory: Insufficient fee');
    _createERC1155(params);
  }

  function createBatchERC1155(
    IAgreementERC1155.CreateERC1155Params[] calldata input
  ) public payable {
    (uint256 creationFee, , ) = feeManager.getFees();
    require(
      msg.value >= creationFee * input.length,
      'AgreementFactory: Insufficient fee'
    );

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
    require(
      msg.sender == address(feeManager),
      'AgreementFactory: Only FeeManager can collect fee'
    );
    address payable feeManagerAddr = payable(address(feeManager));
    feeManagerAddr.transfer(address(this).balance);
    emit FeeCollected(address(this).balance, address(0));
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}
}
