const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

// note: the owner of contract is the deployer. however, we want the only account to be OWNER_ROLE is the gnosis safe contract account

describe('Access Control', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        
    });

    it('correct admins for each role', async function () {
        const OWNER_ROLE = keccak256("OWNER_ROLE");
        const SYSADMIN_ROLE = keccak256("SYSADMIN_ROLE");
        const MANAGER_ROLE = keccak256("MANAGER_ROLE");

        await expect(await this.botz.getRoleAdmin(OWNER_ROLE)).to.equal("0x" + OWNER_ROLE.toString('hex'));
        await expect(await this.botz.getRoleAdmin(SYSADMIN_ROLE)).to.equal("0x" + SYSADMIN_ROLE.toString('hex'));
        await expect(await this.botz.getRoleAdmin(MANAGER_ROLE)).to.equal("0x" + SYSADMIN_ROLE.toString('hex'));
    });


    it('Only OWNER_ROLE can grant/revoke OWNER roles to accounts', async function () {
        const OWNER_ROLE = keccak256("OWNER_ROLE");

        // this.account[0].address is only one with OWNER role; OWNER is the role admin
        for(let i = 1; i < 20; i++) {
            await expect(await this.botz.hasRole(OWNER_ROLE, this.accounts[i].address)).to.equal(false);
            await expect(this.botz.connect(this.accounts[i]).grantRole(OWNER_ROLE, this.accounts[i].address)).to.be.reverted;
            await expect(this.botz.connect(this.accounts[i]).revokeRole(OWNER_ROLE, this.accounts[0].address)).to.be.reverted;
        }

        // verify role admin
        await expect(await this.botz.getRoleAdmin(OWNER_ROLE)).to.equal("0x" + OWNER_ROLE.toString("hex"));

        // OWNER can grant and revoke OWNER roles
        await this.botz.connect(this.accounts[0]).grantRole(OWNER_ROLE, this.accounts[10].address);
        expect(await this.botz.hasRole(OWNER_ROLE, this.accounts[10].address)).to.equal(true);
        await this.botz.connect(this.accounts[0]).revokeRole(OWNER_ROLE, this.accounts[10].address);
        expect(await this.botz.hasRole(OWNER_ROLE, this.accounts[10].address)).to.equal(false);

    });
    
    
    it('Only SYSADMIN_ROLE can grant/revoke SYSADMIN roles to accounts', async function () {
        const SYSADMIN_ROLE = keccak256("SYSADMIN_ROLE");

        // this.account[1].address is only one with SYSADMIN role; SYSADMIN is the role admin
        for(let i = 2; i < 20; i++) {
            await expect(await this.botz.hasRole(SYSADMIN_ROLE, this.accounts[i].address)).to.equal(false);
            await expect(this.botz.connect(this.accounts[i]).grantRole(SYSADMIN_ROLE, this.accounts[i].address)).to.be.reverted;
            await expect(this.botz.connect(this.accounts[i]).revokeRole(SYSADMIN_ROLE, this.accounts[1].address)).to.be.reverted;
        }
        
        // verify role admin
        await expect(await this.botz.getRoleAdmin(SYSADMIN_ROLE)).to.equal("0x" + SYSADMIN_ROLE.toString("hex"));

        // SYSADMIN can grant and revoke SYSADMIN roles
        await this.botz.connect(this.accounts[1]).grantRole(SYSADMIN_ROLE, this.accounts[10].address);
        expect(await this.botz.hasRole(SYSADMIN_ROLE, this.accounts[10].address)).to.equal(true);
        await this.botz.connect(this.accounts[1]).revokeRole(SYSADMIN_ROLE, this.accounts[10].address);
        expect(await this.botz.hasRole(SYSADMIN_ROLE, this.accounts[10].address)).to.equal(false);
        
    });
    
    it('Only SYSADMIN_ROLE can grant/revoke MANAGER roles to accounts', async function () {
        const SYSADMIN_ROLE = keccak256("SYSADMIN_ROLE");
        const MANAGER_ROLE = keccak256("MANAGER_ROLE");

        // this.account[1].address is only one with SYSADMIN role; SYSADMIN is the role admin
        for(let i = 2; i < 20; i++) {
            await expect(await this.botz.hasRole(MANAGER_ROLE, this.accounts[i].address)).to.equal(false);
            await expect(this.botz.connect(this.accounts[i]).grantRole(MANAGER_ROLE, this.accounts[i].address)).to.be.reverted;
            await expect(this.botz.connect(this.accounts[i]).revokeRole(MANAGER_ROLE, this.accounts[1].address)).to.be.reverted;
        }
        
        // let's grant an account MANAGER_ROLE through the SYSADMIN 
        await this.botz.connect(this.accounts[1]).grantRole(MANAGER_ROLE, this.accounts[7].address);

        await expect(await this.botz.hasRole(MANAGER_ROLE, this.accounts[7].address)).to.equal(true);
        
        // Make sure this new 'MANAGER' cannot give others 'MANAGER' access
        await expect(this.botz.connect(this.accounts[7]).grantRole(MANAGER_ROLE, this.accounts[8].address)).to.be.reverted;
        
        // Take away his privileges
        await this.botz.connect(this.accounts[1]).revokeRole(MANAGER_ROLE, this.accounts[7].address);
        
        // Verify these accounts are not MANAGERs
        await expect(await this.botz.hasRole(MANAGER_ROLE, this.accounts[7].address)).to.equal(false);
        await expect(await this.botz.hasRole(MANAGER_ROLE, this.accounts[8].address)).to.equal(false);


        // verify role admin
        await expect(await this.botz.getRoleAdmin(MANAGER_ROLE)).to.equal("0x" + SYSADMIN_ROLE.toString("hex"));

    });


    it('Only OWNER can call withdraw()', async function () {
        for(let i = 1; i < 20; i++) {
            await expect(this.botz.connect(this.accounts[i]).withdrawFunds()).to.be.reverted;
        }

        await this.botz.connect(this.accounts[0]).withdrawFunds();
    });

    it('Verify ownership is transferred from contract deployer to "multisig" address', async function () {
        this.botz2 = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[10].address, this.accounts[1].address);

        // accounts[10] is the multisig arg; this address should be the owner after constructor called
        expect(await this.botz2.owner()).to.equal(this.accounts[10].address);
        await this.botz2.connect(this.accounts[10]).transferOwnership(this.accounts[0].address);
        expect(await this.botz.owner()).to.equal(this.accounts[0].address);

    })



    




    
});