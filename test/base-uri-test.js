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
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address);
        await this.botz.deployed();
    });

    it('Tests modification with authorization', async function () {
        assert(await this.botz.baseTokenURI() === "ipfs");

        // unauthorized changes invalid
        try {
            await this.botz.connect(this.accounts[6]).setBaseTokenURI("ipfs://example-dir.com");
        } catch(e) {
            console.log("\t5 Unauthorized update to baseTokenURI: revert caught");
            assert(await this.botz.baseTokenURI() === "ipfs");
        }

        await this.botz.connect(this.accounts[1]).setBaseTokenURI("ipfs://example-dir.com");
        assert(await this.botz.baseTokenURI() === "ipfs://example-dir.com");

    })
    
});

