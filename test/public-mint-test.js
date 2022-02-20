const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

// Public Minting:
//     - can only mint <= 2 per call
//     - public sale must be On
//     - token values are [1,4000]
//     - correct ether is being sent
//     - max of 4000 tokens can be minted from this function (including whitelist sales)

describe('Public Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address);
        await this.botz.deployed();
    });

    // ! needs to send msg.value!
    it('Can only mint 1 or 2 at a time', async function () {
        try {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(3);
        } 
        catch(e) {  
            assert(await this.botz.getPublicMintCount() == 0)
        }
    });

    it('Can only mint during saleOn', async function() {
        // const time = Math.floor(Date.now() / 1000);
        // await this.botz.connect(this.accounts[1]).setPublicSaleTS(time - 120);
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1)).to.be.revertedWith("Sale off");
        this.botz.connect(this.accounts[1]).flipSaleState();
    });

    it('Must send minimum eth price ', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}
        const twoToken = {value: ethers.utils.parseEther("0.2")}
        const badOneToken = {value: ethers.utils.parseEther("0.09999")}
        
        // Buying 1 token with no eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1)).to.be.revertedWith("Invalid msg.value");
        await expect(this.botz.getPublicMintCount() == 0);
        
        // Buying tokens with no enough eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, badOneToken)).to.be.revertedWith("Invalid msg.value");
        await expect(this.botz.getPublicMintCount() == 0);
        
        // Buying 1 and 2 tokens
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        await expect(this.botz.getPublicMintCount() == 1);
        
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoToken);
        await expect(this.botz.getPublicMintCount() == 3);
    });
    
    
    it('Contract balance is updated correctly with each txn', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}
        // 3 tokens have been minted so far in this test group, so contract balance should be 0.3 eth
        // balance is in wei
        let balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance === 0.3);

        // mint 100 more
        for(let i = 0; i < 100; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        }

        // verify correct no. of mints
        let totalMints = await this.botz.getPublicMintCount();
        expect(totalMints === 103);

        // verify balance of contract == totalMints * 0.1
        balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance === 10.3);
    });

    
    // it('Cant mint more than 4000', async function () {
    //     const oneToken = {value: ethers.utils.parseEther("0.1")}
    //     const twoToken = {value: ethers.utils.parseEther("0.2")}
    //     // We've minted 103 so far, so mint 3897 more
    //     await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);

    //     for(let i = 0; i < 1948; i++) {
    //         await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoToken);
    //     }

    //     await expect(this.botz.balanceOf(this.accounts[5].address) === 4000);
    //     await expect(this.botz.getPublicMintCount() == 4000);
    //     await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken).to.be.revertedWith("Purchase would exceed max supply of SchoolBotz"));


    // }).timeout(1000000);
    

});

