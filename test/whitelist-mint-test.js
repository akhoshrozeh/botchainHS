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
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipAllMintState();
        await this.botz.connect(this.accounts[1]).flipWhitelistMintState();
    });

    

    it('Only admin can change whitelist root', async function () {
        await expect(this.botz.connect(this.accounts[4]).setWhitelistRoot(keccak256("bad_hash"))).to.be.reverted;
        await this.botz.connect(this.accounts[1]).setWhitelistRoot(keccak256("good_hash"));
        expect(await this.botz.getWhitelistRoot()).to.equal("0x" + keccak256("good_hash").toString("hex"));
    });
    

    it('Whitelist address can mint <= 2 tokens', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}
        const twoToken = {value: ethers.utils.parseEther("0.2")}

        // const time = Math.floor(Date.now() / 1000);
        // await this.botz.connect(this.accounts[1]).setWhitelistTS(time - 1000, time + 2000);
        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
        const leaf = keccak256(addresses[6])
        const proof = mt.getHexProof(leaf);

        // mints 1, then another. tries to mint 3rd and fails
        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);

        await this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken);
        expect(await this.botz.getPublicMintCount()).to.equal(1);
        
        await this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken);
        expect(await this.botz.getPublicMintCount()).to.equal(2);
        
        await expect(this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken)).to.be.revertedWith('Whitelist mint limit');



        // mints 1, then tries to mint 2 which fails (max of 2)
        const leaf2 = keccak256(addresses[15]);
        const proof2 = mt.getHexProof(leaf2);

        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);

        await this.botz.connect(this.accounts[15]).mintFromWhitelist(1, proof2, oneToken);
        expect(await this.botz.getPublicMintCount()).to.equal(3);

        
        await expect(this.botz.connect(this.accounts[15]).mintFromWhitelist(2, proof2, twoToken)).to.be.revertedWith('Whitelist mint limit');
        expect(await this.botz.getPublicMintCount()).to.equal(3);
        

    });

    it('Valid amount of eth sent when minting from whitelist', async function () {
        const badOne = {value: ethers.utils.parseEther("0.079999")}
        const badTwo = {value: ethers.utils.parseEther("0.159999")}

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
        expect(await this.botz.balanceOf(this.accounts[7].address)).to.equal(0);

    });

    it('Correct tokenIDs exist after minting', async function () {
        // 3 tokens have already 
        expect(await this.botz.getPublicMintCount()).to.equal(3);

        // check the first 3 of botz contract
        expect(await this.botz.ownerOf(1)).to.equal(this.accounts[6].address);
        expect(await this.botz.ownerOf(2)).to.equal(this.accounts[6].address);
        expect(await this.botz.ownerOf(3)).to.equal(this.accounts[15].address);

        // create a new contract instance (easier to test with new contract)
        this.botz2 = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz2.deployed();
        await this.botz2.connect(this.accounts[1]).flipAllMintState();
        await this.botz2.connect(this.accounts[1]).flipWhitelistMintState();
        // const time = Math.floor(Date.now() / 1000);
        // await this.botz2.connect(this.accounts[1]).setWhitelistTS(time - 1000, time + 2000);
        const twoToken = {value: ethers.utils.parseEther("0.16")}


        // tokens from whitelist are under the 'public' domain 
        // therefore ids are [1,5900] in order

        // create a whitelist with all accounts
        let addresses = Array();
        for(let i = 0; i < this.accounts.length - 1; i++) {
            addresses.push(this.accounts[i].address);
        }

        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
    
        await this.botz2.connect(this.accounts[1]).setWhitelistRoot(rootHash);


        // mint the rest, and check the token doesnt before minting and does after
        // with 1500 spots and 2 tokens per acc, the whitelist minting will only ever mint a max of 3000 tokens
        for(let i = 1; i < addresses.length - 1; i+=2) {
            const leaf = keccak256(addresses[i])
            const proof = mt.getHexProof(leaf);

            await expect(this.botz2.ownerOf(i)).to.be.revertedWith("ERC721: owner query for nonexistent token");
            await expect(this.botz2.ownerOf(i+1)).to.be.revertedWith("ERC721: owner query for nonexistent token");

            await this.botz2.connect(this.accounts[i]).mintFromWhitelist(2, proof, twoToken);

            expect(await this.botz2.ownerOf(i)).to.equal(this.accounts[i].address);
            expect(await this.botz2.ownerOf(i+1)).to.equal(this.accounts[i].address);

            expect(await this.botz2.getPublicMintCount()).to.equal(i+1);
        }


        // Address not on whitelist tries to mint from whitelist
        const leaf = keccak256(addresses[19])
        const proof = mt.getHexProof(leaf);
        await expect(this.botz2.mintFromWhitelist(2, proof, twoToken)).to.be.revertedWith("Invalid address");
        expect(await this.botz2.balanceOf(this.accounts[19].address)).to.equal(0);



    })


    
});
