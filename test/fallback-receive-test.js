
const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;


describe('Fallback and Receive', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('BOTZ', 'BOTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        
    });

    it('Contract accepts eth', async function () {
        const payment = {value: ethers.utils.parseEther("0.2")}

        let balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('0.0');
        
        // receive is called (msg.data is empty)
        await this.accounts[10].sendTransaction({
            to: this.botz.address,
            value: ethers.utils.parseEther("1.0")
        });
        
        // fallback is called (msg.data is not empty)
        await this.accounts[10].sendTransaction({
            to: this.botz.address,
            value: ethers.utils.parseEther("1.0"),
            data: '0x32'
        });

        balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance).to.equal('2.0');
    });

    
});