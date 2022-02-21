
const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Provenance Hash', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        
    });

    it('Test inital condition', async function() {
        assert(await this.botz.provenanceHash() === "");
    })

    it('Sets correctly with authorization and only once', async function() {

        await expect(this.botz.connect(this.accounts[5]).setProvenanceHash("0x123123_test_hash_str")).to.be.reverted;
        expect(await this.botz.provenanceHash()).to.equal("");
        
        
        await this.botz.connect(this.accounts[1]).setProvenanceHash("0x123123_test_hash_str");
        expect(await this.botz.provenanceHash()).to.equal("0x123123_test_hash_str");

        await expect(this.botz.connect(this.accounts[0]).setProvenanceHash("0x456456_test_hash_str")).to.be.revertedWith("Already set");        


    })
});
