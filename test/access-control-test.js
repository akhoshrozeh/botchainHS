const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Access Control', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address);
        await this.botz.deployed();
        
    });



    it('Only OWNER_ROLE admin can grant or revoke OWNER roles to accounts', async function () {
        const OWNER_ROLE = keccak256("OWNER_ROLE");

        // no one else can grant or revoke
        for(let i = 1; i < 20; i++) {
            await expect(await this.botz.hasRole(OWNER_ROLE, this.accounts[i].address)).to.equal(false);
            await expect(this.botz.connect(this.accounts[i]).grantRole(OWNER_ROLE, this.accounts[i].address)).to.be.reverted;
            await expect(this.botz.connect(this.accounts[i]).revokeRole(OWNER_ROLE, this.accounts[0].address)).to.be.reverted;
        }

        // verify role admin
        await expect(await this.botz.getRoleAdmin(OWNER_ROLE)).to.equal("0x" + OWNER_ROLE.toString("hex"));

    });

    it('Only OWNER can cal withdraw()', async function () {
        for(let i = 1; i < 20; i++) {
            await expect(this.botz.connect(this.accounts[i]).withdrawFunds()).to.be.reverted;
        }

        await this.botz.connect(this.accounts[0]).withdrawFunds();
    });

    




    
});