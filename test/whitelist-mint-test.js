const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Whitelist', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipSaleState();
    });

    

    it('Only admin can change whitelist root', async function () {
        await expect(this.botz.connect(this.accounts[4]).setWhitelistRoot(keccak256("bad_hash"))).to.be.reverted;
        await this.botz.connect(this.accounts[1]).setWhitelistRoot(keccak256("good_hash"));
        await expect(this.botz.getWhitelistRoot() === keccak256("good_hash"));
    });
    

    it('Whitelist address can mint <= 2 tokens', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}

        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setWhitelistTS(time - 1000, time + 2000);
        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
        const leaf = keccak256(addresses[6])
        const proof = mt.getHexProof(leaf);

        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);

        await this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken);
        await expect(this.botz.getPublicMintCount() == 1);
        
        await this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken);
        await expect(this.botz.getPublicMintCount() == 2);
        
        await expect(this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken)).to.be.revertedWith('Whitelist mint limit');


        
    });

    it('Valid amount of eth sent when minting from whitelist', async function () {
        const badOne = {value: ethers.utils.parseEther("0.09999")}
        const badTwo = {value: ethers.utils.parseEther("0.019999")}

        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
        const leaf = keccak256(addresses[7])
        const proof = mt.getHexProof(leaf);

        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);
        
        await expect(this.botz.connect(this.accounts[7]).mintFromWhitelist(1, proof, badOne)).to.be.reverted;
        await expect(this.botz.connect(this.accounts[7]).mintFromWhitelist(2, proof, badTwo)).to.be.reverted;
        await expect(this.botz.balanceOf(this.accounts[7].address) === 0);

    });

    


    
});
