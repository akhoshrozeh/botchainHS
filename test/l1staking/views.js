const assert = require("assert");
const { ethers, waffle, network} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const { BigNumber } = require("ethers");
const { create } = require("domain");
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


// converts array of BigNumbers to regular numbers
function bigToNorm(x) {
    let res = []
    for(let i  = 0; i < x.length; i++) {
        res.push(x[i].toNumber());
    }
    return res;
}


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


describe('Views', async function() {
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

        // approve both accounts
        await this.nft.connect(this.accounts[5]).setApprovalForAll(this.staking.address, true);
        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);

        // mint and stake 5 tokens
        let sig5 = createSignature([1,2,3,4,5],[0,1,0,0,0],this.accounts[0]);
        let sig10 = createSignature([6,7,8,9,10],[0,0,0,2,0],this.accounts[0]);
        const fiveToken = {value: ethers.utils.parseEther("0.55")}
        await this.nft.connect(this.accounts[5]).mintSchoolBotz(5, fiveToken);
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(5, fiveToken);
        await network.provider.send("evm_mine", [2000000000]);
        await this.staking.connect(this.accounts[5]).stake([1,2,3,4,5], [0,1,0,0,0], [1,1,1,1,1], sig5);
        await this.staking.connect(this.accounts[10]).stake([6,7,8,9,10], [0,0,0,2,0], [1,1,1,1,1], sig10);
        
    });

    it('totalStaked', async function() {
        expect(await this.staking.totalStaked()).to.equal(10);
    });

    // manual check...
    it('tokenToStake', async function() {
        console.log("manual check here.")
        for(let i = 1; i <= 10; i++) {
            // console.log(await this.staking.tokenToStake(i));
        }
    });

    it('tokenIsStaked', async function() {
        for(let i = 1; i <= 10; i++) {
            expect(await this.staking.tokenIsStaked(i)).to.equal(true);
        }
    });
    
    it('tokenToOwner', async function() {
        for(let i = 1; i <= 5; i++) {
            expect(await this.staking.tokenToOwner(i)).to.equal(this.accounts[5].address);
        }

        for(let i = 6; i <= 10; i++) {
            expect(await this.staking.tokenToOwner(i)).to.equal(this.accounts[10].address);
        }

        await expect(this.staking.tokenToOwner(11)).to.be.revertedWith("token not staked");
    });


   
});




