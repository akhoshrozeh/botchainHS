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
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipSaleState();
    });

    it('Only owner can withdraw', async function () {
        const twoToken = {value: ethers.utils.parseEther("0.2")}
        // Add some funds to the contract first
        for(let i = 0; i < 30; i++) {
            await this.botz.connect(this.accounts[10]).mintSchoolBotz(2, twoToken);
        }

        // Should be 6 eth in the contract now (30 iterations * 2 tokens * .1 eth)
        await expect(provider.getBalance(this.botz.address) == 6 * 10 ** 18);

        await expect(provider.getBalance(this.accounts[0].address) == 0);
        
        // No other accounts can call withdrawFunds()
        for(let i = 1; i <= 19; i++) {
            await expect(this.botz.connect(this.accounts[i]).withdrawFunds()).to.be.reverted;
        }

        // Owner withdraws funds
        await this.botz.connect(this.accounts[0]).withdrawFunds();

        // Owner account should now have 6 eth
        await expect(provider.getBalance(this.accounts[0].address) == 6 * 10 ** 18);



    });
    
});