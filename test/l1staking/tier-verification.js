const assert = require("assert");
const { ethers, waffle, network} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const { BigNumber, utils } = require("ethers");
const { createSign } = require("crypto");
const provider = waffle.provider;

const commitmentBonuses = [0, 2, 5, 8, 11, 15, 20, 28, 39, 54, 76, 105, 147];
function createRewardChart(commitmentBonuses) {
    let res = []
    let tierRates = [500, 400, 250];
    
    // compute earned
    let earned = []
    for(let i = 0; i < 3; i++) {
        let weeklyRates = [];
        for(let j = 0; j <= 12; j++) {
            currWeek = tierRates[i] * 7 * j;
            weeklyRates.push(currWeek)
        }
        earned.push(weeklyRates);
    }
    res.push(earned);

    // compute bones
    let bonus = []
    for(let i = 0; i < 3; i++) {
        let weeklyBonuses = [];
        for(let j = 0; j <= 12; j++) {
            let currBonus = tierRates[i] * 7 * j * commitmentBonuses[j] / 100;
            weeklyBonuses.push(currBonus)
        }
        bonus.push(weeklyBonuses);
    }

    res.push(bonus);

    // compute total 
    let total = []
    for(let i = 0; i < 3; i++) {
        let weeklyTotals = [];
        for(let j = 0; j <= 12; j++) {
            let currTotal = res[0][i][j] + res[1][i][j];
            weeklyTotals.push(currTotal)
        }
        total.push(weeklyTotals);
    }

    res.push(total);
    // console.log("bonus:", res[0], "end")

    return res;

}

const rewardChart = createRewardChart(commitmentBonuses);
// console.log(createRewardChart(commitmentBonuses));


// converts array of BigNumbers to regular numbers
function bigToNorm(x) {
    let res = []
    for(let i  = 0; i < x.length; i++) {
        res.push(x[i].toNumber());
    }
    return res;
}

function randTier() {
    return Math.floor(Math.random() * 3);
}

function randCommitment() {
    return Math.floor(Math.random() * 12) + 1;
}

describe('Multi Staking, Different Tiers Rewards Check', async function() {
    before('get factories', async function () {
        await hre.network.provider.send("hardhat_reset")

       


        // * Deploy all three contracts
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();

 

        this.nft = await this.factory.deploy('BCHS', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.nft.deployed();
        
        this.factory = await hre.ethers.getContractFactory('Botz')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy();
        await this.botz.deployed();
        
        this.factory = await hre.ethers.getContractFactory('PictureDayStaking')
        this.accounts = await hre.ethers.getSigners();
        this.staking = await this.factory.deploy(this.nft.address, this.botz.address, this.accounts[0].address);
        await this.staking.deployed();

        // Turn on minting
        await this.nft.connect(this.accounts[0]).flipAllMintState();
        await this.nft.connect(this.accounts[0]).flipPublicMintState();

        // authorize staking contract to mint
        await this.botz.authorize(this.staking.address);

        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);
        
        
    });

    // 66 byte string, which represents 32 bytes of data
// let messageHash = ethers.utils.solidityKeccak256( ...stuff here... );

// // 32 bytes of data in Uint8Array
// let messageHashBinary = ethers.utils.arrayify(messageHash);

// // To sign the 32 bytes of data, make sure you pass in the data
// let signature = await wallet.signMessage(messageHashBinary);


    it('verification fails with invalid tiers, valid sigs for correct token', async function() {

        async function createSignature(tokens, tiers, signer) {
            if(tokens.length != tiers.length) {
                console.log("BAD LENGTH IN CREATESIGNATURE()")
                return -1;
            }

            let types = []
            for(let i = 0; i < tokens.length*2; i++) {
                types.push("uint256");
            }

            let values = tokens.concat(tiers);

            let messageHash = ethers.utils.solidityKeccak256(types, values)
            let sig = await signer.signMessage(hre.ethers.utils.arrayify(messageHash));
            return sig;
        }

        // createSignature([1,2,3], [0,0,0], this.accounts[0]);

        // accounts[0] is the admin, and all tokenIds,tiers are signed by him        
        let tokens = []
        let tiers = []
        let commitments = []

        // create the tiers
        for(let i = 1; i <= 10; i++) {
            tokens.push(i);
            commitments.push(12);

            // tokens 1,2 : tier0
            if(i == 1 || i == 2) {
                tiers.push(0)
            }
            // tokens 3,4: tier1
            else if(i == 3 || i == 4) {
                tiers.push(1)
            }
            // tokens 5-10: tier2
            else {
                tiers.push(2)
            }
        }

        const sig = createSignature(tokens, tiers, this.accounts[0]);

        // mint 10 botz
        const tenTokens = {value: ethers.utils.parseEther("0.55")}
        
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(10, tenTokens);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(10);

        function arrayEquals(a, b) {
            return Array.isArray(a) &&
              Array.isArray(b) &&
              a.length === b.length &&
              a.every((val, index) => val === b[index]);
          }

        // create an invalid tier and attempt to stake each loop
        for(let i = 0; i < 10; i++) {
            let currBadTier = []

            for(let j = 0; j < 10; j++) {
                currBadTier.push(Math.floor(Math.random() * 3));
            }
            
            // console.log(currBadTier);
            if(! arrayEquals(currBadTier, tiers)) {
                // console.log('invalid tier:', currBadTier);
                // invalidTiers.push(currBadTier);
                await expect(this.staking.connect(this.accounts[10]).stake(tokens, currBadTier, commitments, sig)).to.be.revertedWith('tier verification fail');
            }
            else {
                console.log('valid tier:', currBadTier);

            }
        }



        


        // // tokens 1 and 2: user tries use invalid tiers with real signatures
        // // iterate through each token
        // for(let i = 1; i <= 2; i++) {
        //     // iterate through tiers
        //     for(let j = 0; j <= 2; j++) {
        //         // not the valid tier
        //         if(j != 0) {
        //             await expect(this.staking.connect(this.accounts[10]).stake([i], [j], [1], signatures[i-1])).to.be.revertedWith('tier verification fail');
        //         }
        //     }
        // }
        // // tokens 2 and 3: user tries use invalid tiers with real signatures
        // // iterate through each token
        // for(let i = 3; i <= 4; i++) {
        //     // iterate through tiers
        //     for(let j = 0; j <= 2; j++) {
        //         // not the valid tier
        //         if(j != 1) {
        //             await expect(this.staking.connect(this.accounts[10]).stake([i], [j], [1], signatures[i-1])).to.be.revertedWith('tier verification fail');
        //         }
        //     }
        // }
        // // tokens 4-10: user tries use invalid tiers with real signatures
        // // iterate through each token
        // for(let i = 5; i <= 10; i++) {
        //     // iterate through tiers
        //     for(let j = 0; j <= 2; j++) {
        //         // not the valid tier
        //         if(j != 2) {
        //             await expect(this.staking.connect(this.accounts[10]).stake([i], [j], [1], signatures[i-1])).to.be.revertedWith('tier verification fail');
        //         }
        //     }
        // }

    });

    it('verification fails with non-admin signer', async function () {
        async function createSignature(tokens, tiers, signer) {
            if(tokens.length != tiers.length) {
                console.log("BAD LENGTH IN CREATESIGNATURE()")
                return -1;
            }

            let types = []
            for(let i = 0; i < tokens.length*2; i++) {
                types.push("uint256");
            }

            let values = tokens.concat(tiers);

            let messageHash = ethers.utils.solidityKeccak256(types, values)
            let sig = await signer.signMessage(hre.ethers.utils.arrayify(messageHash));
            return sig;
        }

        let tokens = []
        let tiers = []
        let commitments = []

        // create the tiers
        for(let i = 1; i <= 10; i++) {
            tokens.push(i);
            commitments.push(12);

            // tokens 1,2 : tier0
            if(i == 1 || i == 2) {
                tiers.push(0)
            }
            // tokens 3,4: tier1
            else if(i == 3 || i == 4) {
                tiers.push(1)
            }
            // tokens 5-10: tier2
            else {
                tiers.push(2)
            }
        }

        const nonAdminSig = await createSignature(tokens, tiers, this.accounts[10]);
        expect(nonAdminSig).not.to.equal(-1);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(10);

        await expect(this.staking.connect(this.accounts[10]).stake(tokens, tiers, commitments, nonAdminSig)).to.be.revertedWith('tier verification fail');
        
    });

    it('verfication passes with valid signature and data', async function() {
        async function createSignature(tokens, tiers, signer) {
            if(tokens.length != tiers.length) {
                console.log("BAD LENGTH IN CREATESIGNATURE()")
                return -1;
            }

            let types = []
            for(let i = 0; i < tokens.length*2; i++) {
                types.push("uint256");
            }

            let values = tokens.concat(tiers);

            let messageHash = ethers.utils.solidityKeccak256(types, values)
            let sig = await signer.signMessage(hre.ethers.utils.arrayify(messageHash));
            return sig;
        }

        let tokens = []
        let tiers = []
        let commitments = []

        // create the tiers
        for(let i = 1; i <= 10; i++) {
            tokens.push(i);
            commitments.push(12);

            // tokens 1,2 : tier0
            if(i == 1 || i == 2) {
                tiers.push(0)
            }
            // tokens 3,4: tier1
            else if(i == 3 || i == 4) {
                tiers.push(1)
            }
            // tokens 5-10: tier2
            else {
                tiers.push(2)
            }
        }

        const adminSig = await createSignature(tokens, tiers, this.accounts[0]);

        expect(adminSig).not.to.equal(-1);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(10);


        await this.staking.connect(this.accounts[10]).stake(tokens, tiers, commitments, adminSig);
        
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(0);
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(10);
    })
    

});
