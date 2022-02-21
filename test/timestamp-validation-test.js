const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Timestamp Validation', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
    });

    it('Sets reveal timestamp with authorization', async function () {
        // Check IC
        assert(await this.botz.revealTS() == '1645747200');

        // Check revealTS is only set by admins
        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setRevealTS(time);
        assert(await this.botz.revealTS() == time);

        // Unauthorized modification of revealTS

        await expect(this.botz.connect(this.accounts[5]).setRevealTS(time+100)).to.be.reverted;
        expect(await this.botz.revealTS()).to.equal(time)

    })

    it('Set whitelist timestamps with authorization', async function () {
        // Check IC
        assert(await this.botz.whitelistBeginTS() == '1645747200');
        assert(await this.botz.whitelistEndTS() == '1645747500');



        // Check whitelistBeginTS is only set by admins
        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setWhitelistTS(time, time + 100);
        
        assert(await this.botz.whitelistBeginTS() == time);
        assert(await this.botz.whitelistEndTS() == time + 100);

        await expect(this.botz.connect(this.accounts[7]).setWhitelistTS(time+1000, time + 2000)).to.be.reverted;
        assert(await this.botz.whitelistBeginTS() == time);
        assert(await this.botz.whitelistEndTS() == time+100);

    })

    it('Can only mint from whitelist presale timeslot', async function () {
        const twoToken = {value: ethers.utils.parseEther("0.2")}

        // turn sale state on
        await this.botz.connect(this.accounts[0]).flipSaleState();

        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

        // Set up whitelist and set root hash in contract
        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
        const leaf = keccak256(addresses[10])
        const proof = mt.getHexProof(leaf);

        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);

        // Set presale timeslot in the past
        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setWhitelistTS(time - 10000, time - 9000);
        await expect(this.botz.connect(this.accounts[10]).mintFromWhitelist(1, proof)).to.be.revertedWith("Presale Off");
        
        // Update timeslot to [now, now + 100 s] and mint from whitelist
        const time_2 = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setWhitelistTS(time_2 - 1000, time_2 + 1000);
        
        await this.botz.connect(this.accounts[10]).mintFromWhitelist(2, proof, twoToken);
        
        expect(await this.botz.balanceOf(this.accounts[10].address)).to.equal(2);
        
    });

    
});

