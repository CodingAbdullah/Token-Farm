// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.0;

// import '../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol';

// Creating a custom token earned through sending ETH to bank
// Implementing all EIP standard requirements for ERC20

contract Token {
    uint256 constant private MAX_SUPPLY = 1000000000000; // Max supply that will ever exist
    uint256 private CIRCULATING_SUPPLY = 0; // Circulating supply within wallets, exchanges
    uint256 private TOTAL_CIRCULATING_SUPPLY = 0; // Includes supply of circulating and those tokens burnt
    mapping(address => uint256) private holders;
    string private name;
    string private symbol;
    uint8 private decimals;                                             
    mapping(address => mapping(address => uint256)) private _allowances; // [Sender][Recipient] ([Giver][Spender]) --> allowance

    constructor(string memory n, string memory s, uint8 d) {
        name = n;
        symbol = s;
        decimals = d;

        _mint(msg.sender, 1000); // Allow the contract creator to recieve tokens
    }

    function getName() external view returns (string memory) {
        return name; // Return the name of token
    }

    function getSymbol() external view returns (string memory) {
        return symbol; // Return the symbol of token
    }

    function getDecimals() external view returns (uint8) {
        return decimals; // Return the decimals of token
    }

    function totalSupply() public pure returns (uint256) {
        return MAX_SUPPLY; // Maximum Supply will always be 1 trillion
    }

    function getCirculatingSupply() public view returns(uint256) {
        return CIRCULATING_SUPPLY; // Returns the current supply in the market (wallet + exchanges)
    }

    function getTotalCirculatingSupply() public view returns(uint256) {
        return TOTAL_CIRCULATING_SUPPLY; // Returns the total supply of those tokens in circulation as well as those burned
    }

    function balanceOf(address account) public view returns (uint256) {
        return holders[account]; // Balance of a particular account
    }

    function approve(address spender, uint256 amount) public returns(bool) {
        require(address(spender) != address(0));
        require(holders[msg.sender] >= amount, "Insufficient allowance");

        _allowances[msg.sender][spender] += amount; // Assign allowance of spender to caller's token holdings

        return true;
    }

    function transfer(address recipient, uint amount) public returns (bool) {
        require(address(recipient) != address(0), "Address cannot be null");
        require(_allowances[msg.sender][recipient] >= amount, "Insufficient allowance");
        require(holders[msg.sender] >= amount, "Insufficient balance");
        
        holders[msg.sender] -= amount; // Transfer and adjust balances accordingly
        holders[recipient] += amount;   


        _allowances[msg.sender][recipient] -= amount; // Reduce the alotted allowance of caller's token holdings to spender

        return true;
    }

    function transferFrom(address sender, address recipient, uint amount) public returns (bool) {
        require(address(sender) != address(0), "Address cannot be null");
        require(address(recipient) != address(0), "Address cannot be null");
        require(_allowances[sender][recipient] >= amount, "Insufficient allowance"); // Cannot transfer more than holdings
        require(holders[sender] >= amount, "Insufficient balance");

        holders[sender] -= amount; // Transfer and adjust balances accordingly
        holders[recipient] += amount;

        _allowances[sender][recipient] -= amount; // Reduce the alotted allowance of sender's token holdings to recipient

        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender]; // Get the allowance of a particular owner to spender
    }

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        require(address(spender) != address(0), "Address cannot be null");
        require(holders[msg.sender] >= _allowances[msg.sender][spender] + addedValue, "Insufficient Balance"); // Cannot allow more than holdings

        _allowances[msg.sender][spender] += addedValue; // Adjust the alotted allowance accordingly

        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        require(address(spender) != address(0), "Address cannot be null");
        require(_allowances[msg.sender][spender] - subtractedValue >= 0, "Cannot subtract more than what is allocated"); // Cannot remove more than holdings

        _allowances[msg.sender][spender] -= subtractedValue; // Adjust the alotted allowance accordingly
        
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(address(sender) != address(0), "Address cannot be null");
        require(address(recipient) != address(0), "Address cannot be null");
        require(_allowances[sender][recipient] >= amount, "Insufficient Balance"); // Cannot transfer more than holdings
        require(holders[sender] >= amount, "Insufficient balance");

        holders[sender] -= amount; // Transfer and adjust balances
        holders[recipient] += amount;

        _allowances[sender][recipient] -= amount; // Adjust the alotted allowance accordingly
    }

    function _mint(address account, uint256 amount) internal {
        require(address(account) != address(0));
        require(MAX_SUPPLY - TOTAL_CIRCULATING_SUPPLY >= amount, "Cannot mint more than available supply"); 
        
        holders[account] += amount; // Add mint value to current balance, adjust supply values
        CIRCULATING_SUPPLY += amount;
        TOTAL_CIRCULATING_SUPPLY += amount;
    }

    function _burn(address account, uint256 amount) internal {
        require(address(account) != address(0), "Address cannot be null");
        require(holders[account] >= amount, "Insufficient amount");

        holders[account] -= amount; // Remove token holdings from current account, adjust supply values
        CIRCULATING_SUPPLY -= amount;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(address(owner) != address(0), "Address cannot be null");
        require(address(spender) != address(0), "Address cannot be null");
        require(holders[owner] >= amount, "Insufficient allowance");
        
        _allowances[owner][spender] += amount; // Add the alotted allowance
    }

    function _burnFrom(address account, uint256 amount) internal {
        require(address(account) != address(0), "Address cannot be null");
        require(holders[account] >= amount, "Insufficient amount");

        holders[account] -= amount; // Remove token holdings from current account, adjust supply values
        CIRCULATING_SUPPLY -= amount;

        _allowances[account][msg.sender] -= amount; // Remove the alotted allowances from caller's account
    }
}