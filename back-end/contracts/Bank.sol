// SPDX-License-Identifier: MIT

contract Bank {

   // Implement withdraw(), deposit() here..
    address private manager;

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