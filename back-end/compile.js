const path = require("path");
const fs = require("fs");
const solc = require("solc");

const tokenContractPath = path.resolve(__dirname, 'contracts', 'Token.sol');
const tokenContent = fs.readFileSync(tokenContractPath, {encoding: 'utf-8', flag: 'r'});

const bankContractPath = path.resolve(__dirname, 'contracts', 'Bank.sol');
const bankContent = fs.readFileSync(bankContractPath, {encoding: 'utf-8', flag: 'r'});

var input = [{
    language: 'Solidity',
    sources: {
        'Token.sol' : {
            content: tokenContent
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': [ '*' ]
            }
        }
    }
},
{
    language: 'Solidity',
    sources: {
        'Bank.sol' : {
            content: bankContent
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': [ '*' ]
            }
        }
    }
}];

const token_output = JSON.parse(solc.compile(JSON.stringify(input[0]))).contracts['Token.sol'].Token;
const bank_output = JSON.parse(solc.compile(JSON.stringify(input[1]))).contracts['Bank.sol'].Bank;

module.exports = {
    TOKEN_ABI: token_output.abi,
    TOKEN_BYTECODE: token_output.evm.bytecode.object,
    BANK_API: bank_output.abi,
    BANK_BYTECODE: bank_output.evm.bytecode.object
}