const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Reserve Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipSaleState();
    });
    
    it('Only admins can mint reserves', async function () {
        try {
            await this.botz.connect(this.accounts[4]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        catch(e) {
            console.log("\t6 Unauthorized reserve minting: revert caught");
            assert( await this.botz.getReserveMintCount() == 0);
            assert( await this.botz.balanceOf(this.accounts[4].address) == 0);
        }
    });
    
    it('Can mint <= 100 reserves and reserve mint count is correct', async function () {

        for(let i = 0; i < 99; i++) {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        
        
        // Try to mint 2 tokens when 99 have already been minted
        try {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(2, this.accounts[1].address);
        }
        catch(e) {
            console.log("\t7 Error Caught: Number of tokens to mint goes over limit");
            assert( await this.botz.getReserveMintCount() == 99);
        }
        
        // Mint the last token
        await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        assert(await this.botz.ownerOf(6000) == this.accounts[1].address);
        
        // Try to mint the 101th reserve token
        try {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        catch(e) {
            console.log("\t8 Error Caught: couldnt mint 101th reserve token");
            assert( await this.botz.getReserveMintCount() == 100);
        }

        
    });
    
    it('Checking token ids of minted reserve tokens [4001, 4100]', async function () {
        for(let i = 5901; i <= 6000; i++) {
            assert(await this.botz.ownerOf(i) == this.accounts[1].address);
        }

        await expect(this.botz.balanceOf(this.accounts[1].address) === 100);
    }); 
    
    it('Checking reserve token URIs', async function() {
        for(let i = 5901; i <= 6000; i++) {
            assert(await this.botz.tokenURI(i) === "ipfs" + i);
        }
    });
    
});