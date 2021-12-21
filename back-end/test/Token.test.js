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

describe("Basic Contract Functionality", async () => {
    it("Token contract deployment", async () => {
        assert.ok(token.options.address); // Check Contract Address
    });

    it("Token name", async () => {
        const tokenName = await token.methods.getName().call(); // Check Token Name
        assert(tokenName === "Dollar");
    });

    it("Token symbol", async () => {
        const tokenSymbol = await token.methods.getSymbol().call(); // Check Token Symbol
        assert(tokenSymbol === "$");
    });

    it("Token decimals", async () => {
        const tokenDecimals = await token.methods.getDecimals().call(); // Check Token Decimals
        assert(tokenDecimals == 12);
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
    it("Approve allowance using approve()", async () => {
        try {
            await token.methods.approve(accounts[1], 250).send({ from: accounts[0] }); // Approve a valid amount from token balance

            const allowance = await token.methods.allowance(accounts[0], accounts[1]).call(); // Verify allowance
            assert(allowance == 250);
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Disapprove allowance exceeding token holding using approve()", async () => {
        try {
            await token.methods.approve(accounts[1], 1250).send({ from: accounts[0] }); // Disapprove an allowance exceeding account token balance
            assert(false); 
        }
        catch(err){
            assert(err);
        }
    });

    it("Transfer token to another within allowance using transfer()", async () => {
        try {
            await token.methods.approve(accounts[1], 250).send({ from: accounts[0] }); // Allowance
            await token.methods.transfer(accounts[1], 150).send({ from: accounts[0] }); // Transfer

            // Run checks to see if token transfer took place
            const accountBalanceRecipient = await token.methods.balanceOf(accounts[1]).call();
            const accountBalanceSender = await token.methods.balanceOf(accounts[0]).call();
            const allowanceAfterTransfer = await token.methods.allowance(accounts[0], accounts[1]).call();

            // Test values 1000, alotted 250, transferred 150. So balance in original should be 850, 150 in the recipient and 250-150 = 100 left for allowance
            assert(accountBalanceSender == 850);
            assert(accountBalanceRecipient == 150);
            assert(allowanceAfterTransfer == 100);
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Disapprove token transfer to another exceeding allowance using transfer()", async () => {
        try {
            await token.methods.approve(accounts[1], 250).send({ from: accounts[0] }); // Allowance
            await token.methods.transfer(accounts[1], 450).send({ from: accounts[0] }); // Transfer

            assert(false); // Fail immediately should account transfer more token than it has
        }
        catch(err) {
            // Run checks to see if NO token transfer took place
            const accountBalanceRecipient = await token.methods.balanceOf(accounts[1]).call();
            const accountBalanceSender = await token.methods.balanceOf(accounts[0]).call();
            const allowanceAfterTransfer = await token.methods.allowance(accounts[0], accounts[1]).call();

            assert(err); // Should catch error and balances remain the same
            assert(accountBalanceSender == 1000);
            assert(accountBalanceRecipient == 0); // No token should be sent as transfer is void
            assert(allowanceAfterTransfer == 250); // The allowance is set to 250
        }
    });

    it("Transfer token to another within allowance using transferFrom()", async () => {
        try {
            // Three-way wallet interaction
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] }); 
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer

            await token.methods.approve(accounts[2], 250).send({ from: accounts[1] }); // Allowance
            await token.methods.transferFrom(accounts[1], accounts[2], 200).send({ from: accounts[1] }); // Enable transfer of two independant accounts within allowance

            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call(); // Check balances of accounts after transfers
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const accountTwoBalance = await token.methods.balanceOf(accounts[2]).call();

            const allowanceZeroToOne = await token.methods.allowance(accounts[0], accounts[1]).call(); // Check remaining allowances after transfers
            const allowanceOneToTwo = await token.methods.allowance(accounts[1], accounts[2]).call();

           
            assert(accountZeroBalance == 700);  // 1000 (mint balance) - 300 tranferred to Account 1 so 700 remain
            assert(accountOneBalance == 100); // Receives 300 from Account 0 but then transfers 200 to Account 2 so 100 remain
            assert(accountTwoBalance == 200); // Account 2 Receives 200 from Account 1
            assert(allowanceZeroToOne == 200); // 500 is the initial alotted allowance but 300 of it is transferred so 200 is the remaining allowance
            assert(allowanceOneToTwo == 50); // 250 is the initial alotted allowance but 200 of it is transferred so 50 is the remaining allowance
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Disapprove token transfer to another exceeding allowance using transferFrom()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] }); // Allowance
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer

            await token.methods.approve(accounts[2], 250).send({ from: accounts[1] });
            await token.methods.transferFrom(accounts[1], accounts[2], 500).send({ from: accounts[1] }); // Disable transfer of two independant accounts with transfer exceeeding allowance

            assert(false); // Fail immediately if approved
        }
        catch(err) {
            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const accountTwoBalance = await token.methods.balanceOf(accounts[2]).call();

            const allowanceZeroToOne = await token.methods.allowance(accounts[0], accounts[1]).call();
            const allowanceOneToTwo = await token.methods.allowance(accounts[1], accounts[2]).call();

            assert(err); // Should catch error and balances of Account 1 and Account 2 remain the same
            assert(accountZeroBalance == 700); // Initial mint balance is 1000 in Account 0, transfers 300 after approval to Account 1 so 700 remain
            assert(accountOneBalance == 300); // Receives 300 from Account 0
            assert(accountTwoBalance == 0); // Transfer of more than approval fails so Account 2 receives none
            assert(allowanceZeroToOne == 200); // Allowance reduces from 500 after 300 is tranferred to Account 1
            assert(allowanceOneToTwo == 250); // Allowance remains the same after failed transfer, 250 for Account 2
        }
    });
});

// ADD CASES FOR INCREASE/DECREASE ALLOWANCES AND APPROVALS/TRANSFERS...