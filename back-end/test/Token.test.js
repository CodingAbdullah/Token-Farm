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

describe("Increase/Decrease Allowance & Transfer Allocation", async () => {
    it("Increase allowance beyond balance", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.increaseAllowance(accounts[1], 600).send({ from: accounts[0] }); // Disapprove increase beyond balance
            
            assert(false); // Fail immediately if permitted to do so
        }
        catch(err) {
            assert(err);
        }
    });

    it("Increase allowance within balance", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.increaseAllowance(accounts[1], 400).send({ from: accounts[0] });

            const newAllowance = await token.methods.allowance(accounts[0], accounts[1]).call(); // Approve increase within balance
            assert(newAllowance == 900); // New allowance should be 900 after 400 is added
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Decrease allowance beyond balance", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.decreaseAllowance(accounts[1], 1100).send({ from: accounts[0] }); // Disapprove decrease beyond balance
            
            assert(false); // Fail immediately if permitted to do so
        }
        catch(err) {
            assert(err);
        }
    });

    it("Decrease allowance within balance", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.decreaseAllowance(accounts[1], 400).send({ from: accounts[0] }); // Approve decrease within balance

            const newAllowance = await token.methods.allowance(accounts[0], accounts[1]).call();
            assert(newAllowance == 100); // Allowance is 100 after 400 is transferred
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Increase allowance beyond balance after transfer()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer
            await token.methods.increaseAllowance(accounts[1], 600).send({ from: accounts[0] }); // Disapprove increase beyond balance after transfer
            
            assert(false); // Fail immediately if permitted to do so
        }
        catch(err) {
            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const allowance = await token.methods.allowance(accounts[0], accounts[1]).call(); 
            
            assert(err); // Catch error
            assert(accountZeroBalance == 700); // Balance should be 700 after 300 is transferred to Account 1
            assert(accountOneBalance == 300); // Balance should be 300 after initial transfer
            assert(allowance == 200); // Allowance decreases from 500 to 200 after 300 is transfered to Account 1
        }
    });

    it("Increase allowance within balance after transfer()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer
            await token.methods.increaseAllowance(accounts[1], 400).send({ from: accounts[0] }); // Approve increase within balance after transfer
            await token.methods.transfer(accounts[1], 600).send({ from: accounts[0] });

            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const newAllowance = await token.methods.allowance(accounts[0], accounts[1]).call();

            assert(newAllowance == 0); // Allowance should be 0 after all is transferred
            assert(accountZeroBalance == 100); // Account 0 should be 100 after 900 is transferred
            assert(accountOneBalance == 900); // Account 1 should be 900 after transfer
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Decrease allowance beyond balance after transfer()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer
            await token.methods.decreaseAllowance(accounts[1], 300).send({ from: accounts[0] }); // Disapprove decrease beyond balance after transfer
            
            assert(false); // Fail immediately if permitted to do so
        }
        catch(err) {
            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const allowance = await token.methods.allowance(accounts[0], accounts[1]).call();
            
            assert(err); // Catch error
            assert(accountZeroBalance == 700); // Account 0 should have 700 after transfer
            assert(accountOneBalance == 300); // Account 1 should have 300 atter transfer
            assert(allowance == 200); // Allowance should be 200 after decrease allowance request is rejected
        }
    });

    it("Decrease allowance within balance after transfer()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] });
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer
            await token.methods.decreaseAllowance(accounts[1], 100).send({ from: accounts[0] }); // Approve decrease within balance after transfer 
            await token.methods.transfer(accounts[1], 50).send({ from: accounts[0] });

            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const newAllowance = await token.methods.allowance(accounts[0], accounts[1]).call();

            assert(newAllowance == 50); // New allowance after decrease and transfer should be 50
            assert(accountZeroBalance == 650); // After both transfers, Account 0 should have 650
            assert(accountOneBalance == 350); // After both transfers, Account 1 should have 350
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Increase allowance beyond balance after transferFrom()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] }); 
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer

            await token.methods.approve(accounts[2], 250).send({ from: accounts[1] }); // Allowance
            await token.methods.transferFrom(accounts[1], accounts[2], 200).send({ from: accounts[1] }); // Enable transfer of two independant accounts within allowance

            await token.methods.increaseAllowance(accounts[2], 101).send({ from: accounts[1] }); // Disapprove increase of allowance

            assert(false); // Fail immediately if approved
        }
        catch(err) {
            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const accountTwoBalance = await token.methods.balanceOf(accounts[2]).call();

            const allowanceZeroToOne = await token.methods.allowance(accounts[0], accounts[1]).call();
            const allowanceOneToTwo = await token.methods.allowance(accounts[1], accounts[2]).call();

            assert(err); // Catch error and balances of Account 1 and Account 2 remain the same
            assert(accountZeroBalance == 700); // Initial mint balance is 1000 in Account 0, transfers 300 after approval to Account 1 so 700 remain
            assert(accountOneBalance == 100); // Receives 300 from Account 0, but transfers 200 to Account 1
            assert(accountTwoBalance == 200); // Transfer of more than approval fails so Account 2 receives none
            assert(allowanceZeroToOne == 200); // Allowance reduces from 500 after 300 is tranferred to Account 1
            assert(allowanceOneToTwo == 50); // Allowance reduces to 50 after 200 is transferred to Account 2
        }
    });

    it("Increase allowance within balance after transferFrom()", async () => {
        try {
            // Three-way wallet interaction
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] }); 
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer

            await token.methods.approve(accounts[2], 250).send({ from: accounts[1] }); // Allowance
            await token.methods.transferFrom(accounts[1], accounts[2], 200).send({ from: accounts[1] }); // Enable transfer of two independant accounts within allowance

            await token.methods.increaseAllowance(accounts[2], 49).send({ from: accounts[1] }); // Approve increase allowance 
            await token.methods.transferFrom(accounts[1], accounts[2], 99).send({ from: accounts[1] }); // Enable transfer of two independant accounts within allowance

            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call(); // Check balances of accounts after transfers
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const accountTwoBalance = await token.methods.balanceOf(accounts[2]).call();

            const allowanceZeroToOne = await token.methods.allowance(accounts[0], accounts[1]).call(); // Check remaining allowances after transfers
            const allowanceOneToTwo = await token.methods.allowance(accounts[1], accounts[2]).call();
           
            assert(accountZeroBalance == 700);  // 1000 (mint balance) - 300 tranferred to Account 1 so 700 remain
            assert(accountOneBalance == 1); // Receives 300 from Account 0 but then transfers 299 to Account 2 so 1 remain
            assert(accountTwoBalance == 299); // Account 2 Receives 299 from Account 1
            assert(allowanceZeroToOne == 200); // 500 is the initial alotted allowance but 300 of it is transferred so 200 is the remaining allowance
            assert(allowanceOneToTwo == 0); // 299 is the TOTAL alotted allowance but 299 of it is transferred so 0 is the remaining allowance
        }
        catch(err) {
            assert(!err);
        }
    });

    it("Decrease allowance beyond balance after transferFrom()", async () => {
        try {
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] }); 
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer

            await token.methods.approve(accounts[2], 250).send({ from: accounts[1] }); // Allowance
            await token.methods.transferFrom(accounts[1], accounts[2], 200).send({ from: accounts[1] }); // Enable transfer of two independant accounts within allowance

            await token.methods.decreaseAllowance(accounts[2], 60).send({ from: accounts[1] }); // Disapprove decreasing allowance beyond allotted balance

            assert(false); // Fail immediately if approved
        }
        catch(err) {
            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call();
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const accountTwoBalance = await token.methods.balanceOf(accounts[2]).call();

            const allowanceZeroToOne = await token.methods.allowance(accounts[0], accounts[1]).call();
            const allowanceOneToTwo = await token.methods.allowance(accounts[1], accounts[2]).call();

            assert(err); // Catch error and balances of Account 1 and Account 2 remain the same
            assert(accountZeroBalance == 700); // Initial mint balance is 1000 in Account 0, transfers 300 after approval to Account 1 so 700 remain
            assert(accountOneBalance == 100); // Receives 300 from Account 0, but transfers 200 to Account 2
            assert(accountTwoBalance == 200); // Receives 200 from Account 2
            assert(allowanceZeroToOne == 200); // Allowance reduces from 500 after 300 is tranferred to Account 1
            assert(allowanceOneToTwo == 50); // Allowance reduces to 50 after 200 of the 250 is transferred and failed decrease allowance of 60
        }
    });

    it("Decrease allowance within balance after transferFrom()", async () => {
        try {
            // Three-way wallet interaction
            await token.methods.approve(accounts[1], 500).send({ from: accounts[0] }); 
            await token.methods.transfer(accounts[1], 300).send({ from: accounts[0] }); // Transfer

            await token.methods.approve(accounts[2], 250).send({ from: accounts[1] }); // Allowance
            await token.methods.transferFrom(accounts[1], accounts[2], 200).send({ from: accounts[1] }); // Enable transfer of two independant accounts within allowance

            await token.methods.decreaseAllowance(accounts[2], 20).send({ from: accounts[1] });
            await token.methods.transferFrom(accounts[1], accounts[2], 30).send({ from: accounts[1] }); // Transfer after new alotted allowance

            const accountZeroBalance = await token.methods.balanceOf(accounts[0]).call(); // Check balances of accounts after transfers
            const accountOneBalance = await token.methods.balanceOf(accounts[1]).call();
            const accountTwoBalance = await token.methods.balanceOf(accounts[2]).call();

            const allowanceZeroToOne = await token.methods.allowance(accounts[0], accounts[1]).call(); // Check remaining allowances after transfers
            const allowanceOneToTwo = await token.methods.allowance(accounts[1], accounts[2]).call();

            assert(accountZeroBalance == 700);  // 1000 (mint balance) - 300 tranferred to Account 1 so 700 remain
            assert(accountOneBalance == 70); // Receives 300 from Account 0 but then transfers 230 to Account 2 so 70 remain
            assert(accountTwoBalance == 230); // Account 2 Receives 200 from Account 1, plus 30 of the remaining alotted allowance after reduction to 30
            assert(allowanceZeroToOne == 200); // 500 is the initial alotted allowance but 300 of it is transferred so 200 is the remaining allowance
            assert(allowanceOneToTwo == 0); // 0 is the alotted allowance after all of it is  200 of it is transferred
        }
        catch(err) {
            assert(!err);
        }
    }); 
});

// TESTING COMPLETE..