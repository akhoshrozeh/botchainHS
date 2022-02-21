
const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

// this.accounts[0] should be the owner (the multisig wallet)
// this.accounts[1-3] should be admins which are personal EOA (johann's, gilly's, etc.)
describe('Initial State', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        
    });
    
    it('Correct Name, Symbol, Owner', async function () {
        expect(await this.botz.name()).to.equal("Botz");
        expect(await this.botz.symbol()).to.equal("BTZ");
        expect(await this.botz.owner()).to.equal(this.accounts[0].address);
    })

    it('Roles and their admins are correct', async function () {

        const OWNER_HASH = "0x" + keccak256('OWNER_ROLE').toString('hex');
        const SYSADMIN_HASH = "0x" + keccak256('SYSADMIN_ROLE').toString('hex');
        const MANAGER_HASH = "0x" + keccak256('MANAGER_ROLE').toString('hex');

        // Multi-sig account (accounts[0]) is the only OWNER
        // It is also a SYSADMIN and MANAGER
        expect(await this.botz.hasRole(OWNER_HASH, this.accounts[0].address)).to.equal(true);
        expect(await this.botz.hasRole(SYSADMIN_HASH, this.accounts[0].address)).to.equal(true);
        expect(await this.botz.hasRole(MANAGER_HASH, this.accounts[0].address)).to.equal(true);
        
        expect(await this.botz.hasRole(SYSADMIN_HASH, this.accounts[1].address)).to.equal(true);
        expect(await this.botz.hasRole(MANAGER_HASH, this.accounts[1].address)).to.equal(true);

        //
        expect(await this.botz.getRoleAdmin(OWNER_HASH)).to.equal(OWNER_HASH);
        expect(await this.botz.getRoleAdmin(SYSADMIN_HASH)).to.equal(SYSADMIN_HASH);
        expect(await this.botz.getRoleAdmin(MANAGER_HASH)).to.equal(SYSADMIN_HASH);



        expect(await this.botz.hasRole(OWNER_HASH, this.accounts[1].address)).to.equal(false);
        expect(await this.botz.hasRole(OWNER_HASH, this.accounts[2].address)).to.equal(false);
        expect(await this.botz.hasRole(OWNER_HASH, this.accounts[3].address)).to.equal(false);

        expect(await this.botz.hasRole(SYSADMIN_HASH, this.accounts[2].address)).to.equal(false);
        expect(await this.botz.hasRole(SYSADMIN_HASH, this.accounts[3].address)).to.equal(false);
        expect(await this.botz.hasRole(SYSADMIN_HASH, this.accounts[4].address)).to.equal(false);

        expect(await this.botz.hasRole(MANAGER_HASH, this.accounts[2].address)).to.equal(false);
        expect(await this.botz.hasRole(MANAGER_HASH, this.accounts[3].address)).to.equal(false);
        expect(await this.botz.hasRole(MANAGER_HASH, this.accounts[4].address)).to.equal(false);

    })
});
