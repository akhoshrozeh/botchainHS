const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Withdraw Balances', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipAllMintState();
        await this.botz.connect(this.accounts[1]).flipPublicMintState();
    });

    it('Only owner can withdraw', async function () {
        const twoToken = {value: ethers.utils.parseEther("0.2")}
        // Add some funds to the contract first
        for(let i = 0; i < 30; i++) {
            await this.botz.connect(this.accounts[10]).mintSchoolBotz(2, twoToken);
        }

        // Should be 6 eth in the contract now (30 iterations * 2 tokens * .1 eth)
        let balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('6.0');

        
        // Save owner funds before withdraw
        let balanceBefore = await provider.getBalance(this.accounts[0].address);
        balanceBefore = ethers.utils.formatEther(balanceBefore);
        
        // No other accounts can call withdrawFunds()
        for(let i = 1; i <= 19; i++) {
            await expect(this.botz.connect(this.accounts[i]).withdrawFunds()).to.be.reverted;
        }

        // Owner withdraws funds
        await this.botz.connect(this.accounts[0]).withdrawFunds();

        // Owner account should now have 6 eth
        let balanceAfter = await provider.getBalance(this.accounts[0].address);
        balanceAfter = ethers.utils.formatEther(balanceAfter);
        let diff = Math.round(balanceAfter - balanceBefore);
        expect(diff).to.equal(6);




    });
    
});