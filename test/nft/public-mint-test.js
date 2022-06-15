const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

// Public Minting:
//     - can mint <= 10 per txn
//     - public sale must be On
//     - token values are [1,4000]
//     - correct ether is being sent
//     - max of 4000 tokens can be minted from this function (including whitelist sales)

describe('Public Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
    });


    it('No limit (only totalSupply)', async function () {
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
        const amount = {value: ethers.utils.parseEther("306")}
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(5556, amount)).to.be.revertedWith("Over token limit.");
        // await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });

    it('Can only mint during public mint', async function() {
        // const time = Math.floor(Date.now() / 1000);
        // await this.botz.connect(this.accounts[1]).setPublicSaleTS(time - 120);
        const amount = {value: ethers.utils.parseEther("1")}
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, amount)).to.be.revertedWith("Public minting off");
        this.botz.connect(this.accounts[1]).flipPublicMintState();
    });

    it('Must send minimum eth price ', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.055")}
        const twoToken = {value: ethers.utils.parseEther("0.110")}
        const badOneToken = {value: ethers.utils.parseEther("0.054")}
        
        // Buying 1 token with no eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1)).to.be.revertedWith("Invalid msg.value");
        expect(await this.botz.totalSupply()).to.equal(0);
        
        // Buying tokens with no enough eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, badOneToken)).to.be.revertedWith("Invalid msg.value");
        expect(await this.botz.totalSupply()).to.equal(0);
        
        // Buying 1 and 2 tokens
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        expect(await this.botz.totalSupply()).to.equal(1);
        
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoToken);
        expect(await this.botz.totalSupply()).to.equal(3);
    });
    
    
    it('Contract balance is updated correctly with each txn', async function () {
        const hundtoken = {value: ethers.utils.parseEther("5.5")}
        // 3 tokens have been minted so far in this test group, so contract balance should be 0.24 eth
        // balance is in wei
        let balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('0.165');
        expect(await this.botz.totalSupply()).to.equal('3');

        // mint 100 more
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(100, hundtoken);


        // verify correct no. of mints
        let totalMints = await this.botz.totalSupply();
        expect(totalMints).to.equal('103');

        // verify balance of contract == totalMints * 0.08
        balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('5.665');
    });    


    it('Max minting of 5555 tokens', async function() {
        const enough = {value: ethers.utils.parseEther('306')}
        // from earlier tests
        expect(await this.botz.totalSupply()).to.equal('103');
        // 5555 - 103 = 5452
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(5452, enough);
        expect(await this.botz.totalSupply()).to.equal('5555');

        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, enough)).to.be.revertedWith('Over token limit.')

    })
});

