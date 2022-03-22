const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;


describe('Autolocking mechanism', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipAllMintState();
        await this.botz.connect(this.accounts[1]).flipPublicMintState();

    });

    it('check locking at 1500 tokens', async function () {
        const onePayment = {value: ethers.utils.parseEther("0.1")}
        const twoPayment = {value: ethers.utils.parseEther("0.2")}

        for(let i = 0; i < 749; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment);
        }
        
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(1498);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(1499);
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(1499);
        
        expect(await this.botz.getMintState()).to.eql([true, true, false]);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(1500);

        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment)).to.be.reverted;
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;

        expect(await this.botz.getMintState()).to.eql([true, false, false]);

        await this.botz.connect(this.accounts[0]).flipPublicMintState();
        
    });


    it('checking locking at 3000 tokens', async function () {
        const onePayment = {value: ethers.utils.parseEther("0.1")}
        const twoPayment = {value: ethers.utils.parseEther("0.2")}

        for(let i = 0; i < 749; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment);
        }
        
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(2998);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(2999);
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(2999);
        
        expect(await this.botz.getMintState()).to.eql([true, true, false]);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(3000);

        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment)).to.be.reverted;
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;

        expect(await this.botz.getMintState()).to.eql([true, false, false]);

        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });
    
    
    it('checking locking at 4500 tokens', async function () {
        const onePayment = {value: ethers.utils.parseEther("0.1")}
        const twoPayment = {value: ethers.utils.parseEther("0.2")}

        for(let i = 0; i < 749; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment);
        }
        
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(4498);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(4499);
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(4499);
        
        expect(await this.botz.getMintState()).to.eql([true, true, false]);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(4500);

        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment)).to.be.reverted;
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;

        expect(await this.botz.getMintState()).to.eql([true, false, false]);

        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });

    it('checking locking at 5900 tokens', async function () {
        const onePayment = {value: ethers.utils.parseEther("0.1")}
        const twoPayment = {value: ethers.utils.parseEther("0.2")}

        for(let i = 0; i < 699; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment);
        }
        
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(5898);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(5899);
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(5899);
        
        expect(await this.botz.getMintState()).to.eql([true, true, false]);
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment);
        expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(5900);

        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, onePayment)).to.be.reverted;
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoPayment)).to.be.reverted;

        expect(await this.botz.getMintState()).to.eql([true, false, false]);

        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });

});