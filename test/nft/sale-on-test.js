// const assert = require("assert");
// const { ethers, waffle} = require("hardhat");
// const { expect } = require('chai');
// const keccak256 = require('keccak256');
// const { MerkleTree } = require('merkletreejs');
// const provider = waffle.provider;
// const oneToken = {value: ethers.utils.parseEther("0.1")}

// describe('Sale Minting', async function() {
//     before('get factories', async function () {
//         this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
//         this.accounts = await hre.ethers.getSigners();
//         this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
//             this.accounts[0].address, this.accounts[1].address);
//         await this.botz.deployed();
       
//     });
   
//     // sale state is initialed to 'off' or 'false'
//     it('Sale state is initialized to false; no minting by anyone', async function () {

//         // JUnk whitelist setup; means sale state is first requirement checked
//         let junkProof = Array();
//         for(let i = 0; i < 20; i++) {
//             junkProof.push(keccak256(i));
//         }
//         const mt = new MerkleTree(junkProof, keccak256, {sortPairs: true});
//         const rootHash = mt.getHexRoot();
//         const leaf = keccak256(junkProof[0])
//         const proof = mt.getHexProof(leaf);
//         await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);

    
//         await expect(this.botz.connect(this.accounts[0]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Sale off");
//         await expect(this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(1, this.accounts[5].address)).to.be.revertedWith("Sale off");
//         await expect(this.botz.connect(this.accounts[0]).mintFromWhitelist(1, proof, oneToken)).to.be.revertedWith("Sale off");
        
//         await expect(this.botz.connect(this.accounts[1]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Sale off");
//         await expect(this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[5].address)).to.be.revertedWith("Sale off");
//         await expect(this.botz.connect(this.accounts[1]).mintFromWhitelist(1, proof, oneToken)).to.be.revertedWith("Sale off");
        
        
//         await expect(this.botz.connect(this.accounts[2]).mintSchoolBotz(1, oneToken)).to.be.revertedWith("Sale off");
//         await expect(this.botz.connect(this.accounts[2]).mintReserveSchoolBotz(1, this.accounts[5].address)).to.be.revertedWith("Sale off");
//         await expect(this.botz.connect(this.accounts[2]).mintFromWhitelist(1, proof, oneToken)).to.be.revertedWith("Sale off");
//     });
  
  
//     it('Only MANAGERS can flip sale state', async function () {
//         // Currently assigned roles to acccounts 
//         //  accounts[0]: OWNER, SYSADMIN, MANAGER
//         //  accounts[1]: SYSADMIN, MANAGER

//         // accounts[2] should revert
//         await expect(this.botz.connect(this.accounts[2]).flipSaleState()).to.be.reverted;

//         // sale still off
//         await expect(this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(1, this.accounts[5].address)).to.be.revertedWith("Sale off");
        
//         // manager flips sale state
//         await this.botz.connect(this.accounts[1]).flipSaleState();

//         // we can call a minting function now
//         await this.botz.connect(this.accounts[0]).mintReserveSchoolBotz(1, this.accounts[5].address);

//         // minted tokens sent to account
//         await expect(await this.botz.balanceOf(this.accounts[5].address)).to.equal(1);
    
//     });
  
// });