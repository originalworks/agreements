// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

import '../../interfaces/IHolder.sol';
import '../../interfaces/IPaymentFeeSource.sol';

interface IAgreementERC1155 is IHolder, IPaymentFeeSource {
    event AdminAdded(address account);
    event AdminRemoved(address account);
    event DataHashChanged(string dataHash);
    event FeeAvailable(uint256 newFee, uint256 totalFee, address currency);
    event HolderFundsClaimed(address account, uint256 value, address currency);
    event NativeCoinReceived(address from, uint256 amount);
    event ContractUriChanged(string contactUri);

    function initialize(
        string memory _contractUri,
        string memory _dataHash,
        Holder[] memory holders,
        address _splitCurrencyListManager,
        address _feeManager,
        address _lendingContract,
        address _agreementRelationsRegistry,
        address _fallbackVault
    ) external;
}
