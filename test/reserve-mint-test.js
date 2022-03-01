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
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipAllMintState();
    });
    
    it('Only managers can mint reserves', async function () {

        await expect(this.botz.connect(this.accounts[4]).mintReserveSchoolBotz(1, this.accounts[1].address)).to.be.reverted;
        expect(await this.botz.getReserveMintCount()).to.equal(0);
        expect(await this.botz.balanceOf(this.accounts[4].address)).to.equal(0);
    });
    
    it('Can mint <= 100 reserves and reserve mint count is correct', async function () {

        for(let i = 0; i < 99; i++) {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        
        // Try to mint 2 tokens when 99 have already been minted
        await expect(this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(2, this.accounts[1].address)).to.be.revertedWith("Over reserve limit");
        expect(await this.botz.getReserveMintCount()).to.equal(99);
        
       
        
        // Mint the last token
        await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        expect(await this.botz.ownerOf(6000)).to.equal(this.accounts[1].address);
        
        // Try to mint the 101th reserve token
        await expect(this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address)).to.revertedWith("Over reserve limit");
        expect(await this.botz.getReserveMintCount()).to.equal(100);
    });
    
    it('Checking token ids of minted reserve tokens [5901, 6000]', async function () {
        for(let i = 5901; i <= 6000; i++) {
            expect(await this.botz.ownerOf(i)).to.equal(this.accounts[1].address);
        }

        expect(await this.botz.balanceOf(this.accounts[1].address)).to.equal(100);
    }); 
    
    it('Checking reserve token URIs', async function() {
        for(let i = 5901; i <= 6000; i++) {
            expect(await this.botz.tokenURI(i)).to.equal("ipfs" + i);
        }
    });
    
});