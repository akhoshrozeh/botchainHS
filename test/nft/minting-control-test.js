const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

// There are 3 bools (or can think if as bits) that control WHEN minting can occur
// There are 3 functions for 3 different types of minting: reserves, whitelist, and public
// _allPublicOn
describe('Minting control', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();

        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

    
        // setup whitelist proof1
        this.leaves = addresses.map(addr => keccak256(addr));
        this.mt = new MerkleTree(this.leaves, keccak256, {sortPairs: true});
        this.rootHash = this.mt.getHexRoot();

        this.leaf1 = keccak256(addresses[0])
        this.proof1 = this.mt.getHexProof(this.leaf1);
        
        this.leaf2 = keccak256(addresses[0])
        this.proof2 = this.mt.getHexProof(this.leaf2);
    
        await this.botz.connect(this.accounts[0]).setWhitelistRoot(this.rootHash);
    });



    // test in init-state-test.js to make sure all mint bits are false
    

    // all bits are 
    it('000', async function () {
        console.log("*** The bits XXX for the test correspond to allMintOn, PublicMintOn, WhitelistMintOn respectively ***");

        expect(await this.botz.getMintState()).to.eql([false,false,false]);

        const oneToken = {value: ethers.utils.parseEther("0.1")};
        await expect(this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1)).to.be.revertedWith("All minting off");
        await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Public minting off");
        await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken)).to.be.revertedWith("Whitelist minting off");
    });

    it('001', async function () {
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
        expect(await this.botz.getMintState()).to.eql([false,false,true]);
        
        const oneToken = {value: ethers.utils.parseEther("0.1")};
        await expect(this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1)).to.be.revertedWith("All minting off");
        await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Public minting off");
        await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken)).to.be.revertedWith("All minting off");
        
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
    });
    
    it('010', async function () {
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
        expect(await this.botz.getMintState()).to.eql([false,true,false]);
        
        const oneToken = {value: ethers.utils.parseEther("0.1")};
        await expect(this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1)).to.be.revertedWith("All minting off");
        await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("All minting off");
        await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken)).to.be.revertedWith("Whitelist minting off");
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });
    
    it('011', async function () {
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
        expect(await this.botz.getMintState()).to.eql([false,true,true]);
        
        const oneToken = {value: ethers.utils.parseEther("0.1")};
        await expect(this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1)).to.be.revertedWith("All minting off");
        await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("All minting off");
        await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken)).to.be.revertedWith("All minting off");

        await this.botz.connect(this.accounts[0]).flipPublicMintState();
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
    });
    
    it('100', async function () {
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        expect(await this.botz.getMintState()).to.eql([true,false,false]);
        
        const oneToken = {value: ethers.utils.parseEther("0.1")};

        // verify reserve minting now works
        await this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1);
        expect(await this.botz.getReserveMintCount()).to.equal(1);

        await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Public minting off");
        await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken)).to.be.revertedWith("Whitelist minting off");

        await this.botz.connect(this.accounts[0]).flipAllMintState();
    });

    it('101', async function () {
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
        expect(await this.botz.getMintState()).to.eql([true,false,true]);
        
        const oneToken = {value: ethers.utils.parseEther("0.1")};
        
        // verify reserve minting now works (now 2 reserve tokens have been minted)
        await this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1);
        expect(await this.botz.getReserveMintCount()).to.equal(2);
        
        await this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken);
        expect(await this.botz.totalSupply()).to.equal(3);
        
        await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Public minting off");

        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
    });
    
    it('110', async function () {
            await this.botz.connect(this.accounts[0]).flipAllMintState();
            await this.botz.connect(this.accounts[0]).flipPublicMintState();

            expect(await this.botz.getMintState()).to.eql([true,true,false]);
            
            const oneToken = {value: ethers.utils.parseEther("0.1")};
            
            // verify reserve minting now works (now 2 reserve tokens have been minted)
            await this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1);
            expect(await this.botz.getReserveMintCount()).to.equal(3);
            
            await this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken);
            expect(await this.botz.totalSupply()).to.equal(5);

            await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken)).to.be.revertedWith("Whitelist minting off");

            await this.botz.connect(this.accounts[0]).flipAllMintState();
            await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });

    it('111', async function () {
        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
        expect(await this.botz.getMintState()).to.eql([true,true,true]);

        const oneToken = {value: ethers.utils.parseEther("0.1")};

         // verify reserve minting now works (now 2 reserve tokens have been minted)
         await this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(this.accounts[0].address, 1);
         expect(await this.botz.getReserveMintCount()).to.equal(4);

         await this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken);
         expect(await this.botz.totalSupply()).to.equal(7);

         await this.botz.connect(this.accounts[0]).mintFromWhitelist(1, this.proof1, oneToken);
         expect(await this.botz.totalSupply()).to.equal(8);

        await this.botz.connect(this.accounts[0]).flipWhitelistMintState();
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });


    
});