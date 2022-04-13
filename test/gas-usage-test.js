const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;


describe('Gas usage on minting and transfers', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipAllMintState();
        await this.botz.connect(this.accounts[1]).flipPublicMintState();

    });

    // it('call mintSchoolBotz 500 times, minting 1000 tokens', async function () {
    //     const onePayment = {value: ethers.utils.parseEther("0.1")}
    //     const twoPayment = {value: ethers.utils.parseEther("0.2")}
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     // for(let i = 0; i < 500; i++) {
    //     //     await this.botz.connect(this.accounts[0]).mintSchoolBotz(10, eth);
    //     // }
    //     //     expect(await this.botz.balanceOf(this.accounts[0].address)).to.equal(5000);
        
    //     // for(let i = 0; i < 500; i++) {
    //     //     await this.botz.connect(this.accounts[i%10]).mintSchoolBotz(2, twoPayment);
    //     // }

    //     // for(let i = 0; i < 10; i++) {
    //     //     expect(await this.botz.balanceOf(this.accounts[i].address)).to.equal(150);
    //     // }
    // });

    // it('1 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(1, eth);
    //     }
    // });
    // it('2 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(2, eth);
    //     }
    // });
    // it('3 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(3, eth);
    //     }
    // });
    // it('4 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(4, eth);
    //     }
    // });
    // it('5 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(5, eth);
    //     }
    // });
    // it('6 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(6, eth);
    //     }
    // });
    // it('7 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(7, eth);
    //     }
    // });
    // it('8 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(8, eth);
    //     }
    // });
    // it('9 mint', async function () {
    //     const eth = {value: ethers.utils.parseEther("1")}

    //     for(let i = 0; i < 100; i++) {
    //         await this.botz.connect(this.accounts[0]).mintSchoolBotz(9, eth);
    //     }
    // // });
    it('10 mint', async function () {
        const eth = {value: ethers.utils.parseEther("1")}

        for(let i = 0; i < 100; i++) {
            await this.botz.connect(this.accounts[0]).mintSchoolBotz(10, eth);
        }
    });

});