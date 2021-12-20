const assert = require("assert");
const Web3 = require("web3");
const ganache = require("ganache-cli");
const { TOKEN_ABI, TOKEN_BYTECODE } = require("../compile"); // Import ABI and Bytecode of Token Contract from Compile file

let accounts;
let token;

const web3 = new Web3(ganache.provider({
    gasLimit: 2000000000000000000,
    gasPrice: 20
}));

beforeEach(async () => {

    accounts = await web3.eth.getAccounts();

    token = await new web3.eth.Contract(TOKEN_ABI)
    .deploy({
        data: TOKEN_BYTECODE,
        arguments: ["Dollar", "$", 12] // Creating a sample token
    })
    .send({
        gas: 10000000000000,
        from: accounts[0] // First account
    });
});

describe("Testing Basic Contract Functionality", async () => {

    it("Token contract deployment", async () => {
        assert.ok(token.options.address); // Check Contract Address
    });

    it("Token name", async () => {
        const tokenName = await token.methods.getName().call(); // Check Token Name
        assert(tokenName === "Dollar");
    });

    it("Token supply", async () => {
        const tokenSupply = await token.methods.totalSupply().call();
        assert(tokenSupply == 1000000000000); // Check the total supply
    });

    it("Inital circulating supply after mint", async () => {
        const circulatingSupply = await token.methods.getCirculatingSupply().call();
        const totalCirculatingSupply = await token.methods.getTotalCirculatingSupply().call();
        
        assert(circulatingSupply == 1000); // Check supply after initial mint
        assert(totalCirculatingSupply == 1000);
    });

    it("Initial mint wallet balance", async () => {
        const balance = await token.methods.balanceOf(accounts[0]).call(); // Check balance of minted account
        assert(balance == 1000);
    });
});

describe("Transfer & Allowance Functionality", async () => {
    
    it("Transfer from account to another with allowance using approve", async () => {
        try {
            await token.methods.approve(accounts[1], 250).send({ from: accounts[0] }); // Approve a valid amount from token balance

            const allowance = await token.methods.allowance(accounts[0], accounts[1]).call(); // Verify allowance
            assert(allowance == 250);
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Transfer from account to another with exceeding allowance using approve", async () => {
        try {
            await token.methods.approve(accounts[1], 1250).send({ from: accounts[0] }).call(); // Disapprove an allowance exceeding account token balance
            assert(false); 
        }
        catch(err){
            assert(err);
        }
    });
});


// ADDING MORE CASES LATER...