// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

contract ContractWithoutReceiveFunction {
    uint256 public someParameter;

    function setSomeParameter(uint256 _newParameter) public {
        someParameter = _newParameter;
    }
}
