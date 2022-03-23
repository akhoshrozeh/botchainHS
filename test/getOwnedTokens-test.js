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

describe('getOwnedTokens', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });


    it('Returns array of all tokenIds', async function () {
        const payment = {value: ethers.utils.parseEther("0.1")}
        for(let i = 0; i < 10; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, payment);
        }

        console.log(await this.botz.getOwnedTokens(this.accounts[5].address));
        await this.botz.connect(this.accounts[5])["safeTransferFrom(address,address,uint256)"](this.accounts[5].address, this.accounts[10].address, 5);
        console.log(await this.botz.getOwnedTokens(this.accounts[5].address));
    });

});
