const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;


describe('setPrice & no limit on mint', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });

    it('Can update price', async function() {
        expect(await this.botz.getPrice()).to.equal(ethers.utils.parseEther("0.055"));
        await expect(this.botz.connect(this.accounts[5]).setPrice(ethers.utils.parseEther("0.5"))).to.be.reverted;
        await this.botz.connect(this.accounts[0]).setPrice(ethers.utils.parseEther("0.5"));
        expect(await this.botz.getPrice()).to.equal(ethers.utils.parseEther("0.5"));
        await this.botz.connect(this.accounts[0]).setPrice(ethers.utils.parseEther("0.055"));
    });


    it('no mint limit per txn', async function() {
        const hundredTokens = {value: ethers.utils.parseEther("5.5")}
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(100, hundredTokens);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(100);
    });

});

