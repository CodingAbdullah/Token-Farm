// SPDX-License-Identifier: MIT

pragma solidity >= 0.4.0;

contract Bank {

   // Implement withdraw(), deposit() here..
    address private manager;
    mapping(address => uint) private holders;

    constructor() {
        manager = msg.sender;
    }

    // Working on this token functionality

    function deposit() external view returns(uint256) {
        return 0;
    }

    function withdraw() external view returns(uint256) {
        return 0;
    }
}