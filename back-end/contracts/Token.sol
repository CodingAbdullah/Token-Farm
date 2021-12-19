// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.0;

//import '../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol';

// Creating a custom token earned through sending ETH to bank
// Implementing all EIP standard requirements for ERC20

contract Token {
    address owner;

    constructor() {
        owner = msg.sender;
    }

   function totalSupply() external returns (uint theTotalSupply) {
       return 0 ;

   }

   function balanceOf(address _owner) external returns (uint balance) {
       return 0;
   }

   function transfer(address _to, uint _value) external returns (bool success) {
       return true;
   }

   function transferFrom(address _from, address _to, uint _value) external returns (bool success) {
       return true;
   }

   function approve(address _spender, uint _value) external returns (bool success) {
       return true;
   }

   function allowance(address _owner, address _spender) external returns (uint remaining) {
       return 0;
   }
}