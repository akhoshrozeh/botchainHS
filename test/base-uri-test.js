const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Base URI', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[0]).flipAllMintState();


        // accounts[2] is a manager
        await this.botz.connect(this.accounts[1]).grantRole(keccak256('MANAGER_ROLE'), this.accounts[2].address);
    });

    it('Only manager can change base URI', async function () {
        expect(await this.botz.baseTokenURI()).to.equal('ipfs');

        // unauthorized changes invalid
        await expect(this.botz.connect(this.accounts[6]).setBaseTokenURI("ipfs://example-dir.com")).to.be.reverted;
        await expect(await this.botz.baseTokenURI()).to.equal('ipfs');
        
        // manager can set 
        await this.botz.connect(this.accounts[2]).setBaseTokenURI("ipfs://example-dir.com/");
        await expect(await this.botz.baseTokenURI()).to.equal('ipfs://example-dir.com/');

    });

    it('Token URIs are baseURI + tokenID', async function () {
        console.log("base uri:", await this.botz.baseTokenURI());
        for(let i = 0; i < 20; i++) {
            let tokenId = i+5901;
            await this.botz.connect(this.accounts[2]).mintReserveSchoolBotz(1, this.accounts[3].address);
            await expect(await this.botz.tokenURI(tokenId)).to.equal('ipfs://example-dir.com/'+(tokenId));
        }
    
        expect(await this.botz.balanceOf(this.accounts[3].address)).to.equal(20);
        expect(await this.botz.getReserveMintCount()).to.equal(20);

        
    });

    it('Changing baseURI changes tokenURI for already minted tokens', async function () {
        for(let i = 0; i < 20; i++) {
            let tokenId = i+5901;
            await expect(await this.botz.tokenURI(tokenId)).to.equal('ipfs://example-dir.com/'+(tokenId));
        }
    
        expect(await this.botz.balanceOf(this.accounts[3].address)).to.equal(20);
        expect(await this.botz.getReserveMintCount()).to.equal(20);
        await this.botz.connect(this.accounts[2]).setBaseTokenURI("ipfs://new_base_uri.com/");
        for(let i = 0; i < 20; i++) {
            let tokenId = i+5901;
            await expect(await this.botz.tokenURI(tokenId)).to.equal('ipfs://new_base_uri.com/'+(tokenId));
        }
    });





    
});

