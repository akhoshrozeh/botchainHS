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
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
    });


    it('Can only mint 1 or 2 at a time', async function () {
        await this.botz.connect(this.accounts[0]).flipSaleState();
        const threeToken = {value: ethers.utils.parseEther("0.3")}
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(3, threeToken)).to.be.revertedWith("Invalid no. of tokens");
        await this.botz.connect(this.accounts[0]).flipSaleState();
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
        expect(await this.botz.getPublicMintCount()).to.equal(0);
        
        // Buying tokens with no enough eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, badOneToken)).to.be.revertedWith("Invalid msg.value");
        expect(await this.botz.getPublicMintCount()).to.equal(0);
        
        // Buying 1 and 2 tokens
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        expect(await this.botz.getPublicMintCount()).to.equal(1);
        
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoToken);
        expect(await this.botz.getPublicMintCount()).to.equal(3);
    });
    
    
    it('Contract balance is updated correctly with each txn', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}
        // 3 tokens have been minted so far in this test group, so contract balance should be 0.3 eth
        // balance is in wei
        let balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('0.3');

        // mint 100 more
        for(let i = 0; i < 100; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        }

        // verify correct no. of mints
        let totalMints = await this.botz.getPublicMintCount();
        expect(totalMints).to.equal('103');

        // verify balance of contract == totalMints * 0.1
        balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('10.3');
    });

    // // this test takes about 2 minutes!
    // it('Max minting of 5900 tokens', async function () {

    //     // deploy new contract instance
    //     this.botz2 = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
    //         this.accounts[0].address, this.accounts[1].address);
    //      await this.botz2.deployed();
    //     await this.botz2.connect(this.accounts[1]).flipSaleState();

    //     const oneToken = {value: ethers.utils.parseEther("0.1")}
    //     const twoToken = {value: ethers.utils.parseEther("0.2")}

    //     for(let i = 1; i <= 5900; i+=2) {
    //         // check tokens dont exist
    //         await expect(this.botz2.ownerOf(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
    //         await expect(this.botz2.ownerOf(i+1)).to.be.revertedWith("ERC721: owner query for nonexistent token");

    //         // mint two tokens
    //         await this.botz2.connect(this.accounts[10]).mintSchoolBotz(2, twoToken);

    //         // these tokens should now exist
    //         expect(await this.botz2.ownerOf(i)).to.equal(this.accounts[10].address);
    //         expect(await this.botz2.ownerOf(i+1)).to.equal(this.accounts[10].address);

    //         expect(await this.botz2.getPublicMintCount()).to.equal(i+1);
    //     }
        
    //     // can't mint anymore
    //     expect(await this.botz2.getPublicMintCount()).to.equal(5900);
    //     await expect(this.botz2.connect(this.accounts[10]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Over token limit.")
    //     await expect(this.botz2.connect(this.accounts[10]).mintSchoolBotz(2, twoToken)).to.be.revertedWith("Over token limit.")



    // }).timeout(10000000);
    

});

