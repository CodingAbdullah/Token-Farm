require("dotenv").config({ path: '.env' });
const { TOKEN_ABI, TOKEN_BYTECODE } = require("../back-end/compile");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");

const provider = new HDWalletProvider({
    mnemonic: {
        phrase: process.env.PHASE
    },
    providerOrUrl: process.env.ROPSTEN_NETWORK
});

const web3 = new Web3(provider);

deploy = async () => {
    const contract = new web3.eth.Contract(TOKEN_ABI)
                        .deploy({ data: TOKEN_BYTECODE, arguments: ["Dollar", "$", 12] })
                        .send({ from: process.env.ACCOUNT_ADDRESS, gas: 10000000000000 });

    console.log("Deployed by: " + process.env.ACCOUNT_ADDRESS);
    console.log("Deployed to Ropsten, address is: " + contract.options.address);
    provider.engine.stop();
}

deploy(); // Deploy the script