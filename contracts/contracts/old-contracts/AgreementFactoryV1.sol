// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '../agreements/AgreementProxy.sol';
import '../interfaces/IFeeManager.sol';
import '../interfaces/ILendingContract.sol';
import '../interfaces/IAgreementRelationsRegistry.sol';
import './interfaces/IAgreement.sol';
import '../interfaces/IHolder.sol';
import '../interfaces/ISplitCurrencyListManager.sol';
import '../interfaces/IFallbackVault.sol';
import '../interfaces/ICreationFeeSource.sol';

contract AgreementFactoryV1 is
    Initializable,
    OwnableUpgradeable,
    IHolder,
    ICreationFeeSource,
    UUPSUpgradeable
{
    using ERC165CheckerUpgradeable for address;

    IFeeManager private feeManager;
    address private lendingContract;
    address private splitCurrencyListManager;
    address private agreementRelationsRegistry;
    address private agreementERC20Implementation;
    address private agreementERC1155Implementation;
    address private fallbackVault;

    event AgreementCreated(
        address agreementAddress,
        address agreementImplementation
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
        address _lendingContract,
        address _agreementRelationsRegistry,
        address _splitCurrencyListManager,
        address _fallbackVault
    ) public initializer {
        require(
            _feeManager.supportsInterface(type(IFeeManager).interfaceId),
            'AgreementFactory: Wrong interface at FeeManager address'
        );
        require(
            _lendingContract.supportsInterface(
                type(ILendingContract).interfaceId
            ),
            'AgreementFactory: Wrong interface at LendingContract address'
        );
        require(
            _agreementRelationsRegistry.supportsInterface(
                type(IAgreementRelationsRegistry).interfaceId
            ),
            'AgreementFactory: Wrong interface at AgreementRelationsRegistry address'
        );
        require(
            _splitCurrencyListManager.supportsInterface(
                type(ISplitCurrencyListManager).interfaceId
            ),
            'AgreementFactory: Wrong interface at SplitCurrencyListManager address'
        );
        require(
            _fallbackVault.supportsInterface(type(IFallbackVault).interfaceId),
            'AgreementFactory: Wrong interface at FallbackVault address'
        );

        __Ownable_init();
        setAgreementImplementation(
            _agreementERC20Implementation,
            TokenStandard.ERC20
        );
        setAgreementImplementation(
            _agreementERC1155Implementation,
            TokenStandard.ERC1155
        );
        feeManager = IFeeManager(_feeManager);
        lendingContract = _lendingContract;
        agreementRelationsRegistry = _agreementRelationsRegistry;
        splitCurrencyListManager = _splitCurrencyListManager;
        fallbackVault = _fallbackVault;
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
            AddressUpgradeable.isContract(newImplementation),
            'AgreementFactory: agreement implementation must be a contract'
        );
        if (tokenStandard == TokenStandard.ERC20) {
            agreementERC20Implementation = newImplementation;
        } else {
            agreementERC1155Implementation = newImplementation;
        }
        emit AgreementImplementationChanged(newImplementation, tokenStandard);
    }

    function create(
        string memory _dataHash,
        Holder[] memory holders,
        TokenStandard tokenStandard
    ) public payable {
        (uint256 creationFee, , ) = feeManager.getFees();
        require(msg.value >= creationFee, 'AgreementFactory: Insufficient fee');
        address _implementation;
        if (tokenStandard == TokenStandard.ERC20) {
            _implementation = agreementERC20Implementation;
        } else {
            _implementation = agreementERC1155Implementation;
        }
        bytes memory data = abi.encodeWithSelector(
            IAgreement.initialize.selector,
            _dataHash,
            holders,
            splitCurrencyListManager,
            feeManager,
            lendingContract,
            agreementRelationsRegistry,
            fallbackVault
        );
        AgreementProxy agreement = new AgreementProxy(_implementation, data);
        emit AgreementCreated(address(agreement), _implementation);
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
