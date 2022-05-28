const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

const oneToken = {value: ethers.utils.parseEther("0.1")}
const twoToken = {value: ethers.utils.parseEther("0.2")}

describe('Transfer of Tokens', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        this.botz.connect(this.accounts[1]).flipAllMintState();
        this.botz.connect(this.accounts[1]).flipPublicMintState();
    });


    it('Account can transfer ownership of a token', async function () {
        // buys a token (tokenID = 1)
        await this.botz.connect(this.accounts[10]).mintSchoolBotz(1, oneToken);

        // transfer to acc15
        await expect(await this.botz.ownerOf(1)).to.equal(this.accounts[10].address);
        await this.botz.connect(this.accounts[10])["safeTransferFrom(address,address,uint256)"](this.accounts[10].address, this.accounts[15].address, 1);
        
        // transfer back to acc10
        await expect(await this.botz.ownerOf(1)).to.equal(this.accounts[15].address);
        await this.botz.connect(this.accounts[15])["safeTransferFrom(address,address,uint256)"](this.accounts[15].address, this.accounts[10].address, 1);
        await expect(await this.botz.ownerOf(1)).to.equal(this.accounts[10].address);
        
        // Note: returns unexpected amount of data 
        // await expect( await this.botz["safeTransferFrom(address,address,uint256)"](this.accounts[15].address, this.accounts[8].address, 1)).to.be.reverted;
    });
    
    
    
});

