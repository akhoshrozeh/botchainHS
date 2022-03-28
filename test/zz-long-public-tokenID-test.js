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

describe('zz-Public Minting TokenID (~2 min)', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        // this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
        //     this.accounts[0].address, this.accounts[1].address);
        // await this.botz.deployed();

    });

  // this test takes about 2 minutes!
    it('Max minting of 5900 tokens', async function () {

        // deploy new contract instance
        this.botz2 = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz2.deployed();
        await this.botz2.connect(this.accounts[1]).flipAllMintState();
        await this.botz2.connect(this.accounts[1]).flipPublicMintState();
        await this.botz2.connect(this.accounts[1]).flipWhitelistMintState();
        expect(await this.botz2.getMintState()).to.eql([true, true, true]);

        const oneToken = {value: ethers.utils.parseEther("0.1")}
        const twoToken = {value: ethers.utils.parseEther("0.2")} 

        // have to unflip at 1500, 3000, 4500, and 5900
        for(let i = 1; i <= 5900; i+=2) {
            // check tokens dont exist
            await expect(this.botz2.ownerOf(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
            await expect(this.botz2.ownerOf(i+1)).to.be.revertedWith("ERC721: owner query for nonexistent token");

            let c = await this.botz2.getPublicMintCount();

            if(c == 1500 || c == 3000 || c == 4500) {
                expect(await this.botz2.getMintState()).to.eql([true, false, false]);
                await this.botz2.connect(this.accounts[0]).flipPublicMintState();
                await this.botz2.connect(this.accounts[0]).flipWhitelistMintState();
                expect(await this.botz2.getMintState()).to.eql([true, true, true]);
            }

            
            expect(await this.botz2.getMintState()).to.eql([true, true, true]);
            
            // mint two tokens
            await this.botz2.connect(this.accounts[10]).mintSchoolBotz(2, twoToken);
            
            // these tokens should now exist
            expect(await this.botz2.ownerOf(i)).to.equal(this.accounts[10].address);
            expect(await this.botz2.ownerOf(i+1)).to.equal(this.accounts[10].address);
            
            expect(await this.botz2.getPublicMintCount()).to.equal(i+1);
        }
        
        // can't mint anymore
        expect(await this.botz2.getPublicMintCount()).to.equal(5900);
        
        expect(await this.botz2.getMintState()).to.eql([true, false, false]);
        await this.botz2.connect(this.accounts[0]).flipPublicMintState();
        await this.botz2.connect(this.accounts[0]).flipWhitelistMintState();
        expect(await this.botz2.getMintState()).to.eql([true, true, true]);

        await expect(this.botz2.connect(this.accounts[10]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Over token limit.")
        await expect(this.botz2.connect(this.accounts[10]).mintSchoolBotz(2, twoToken)).to.be.revertedWith("Over token limit.")
        expect(await this.botz2.getMintState()).to.eql([true, true, true]);


    }).timeout(10000000);
});