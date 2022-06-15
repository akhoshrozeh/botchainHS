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

describe('Staking: branches', async function() {
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
        
    });


    it('tokens.length <= 0', async function () {
        let sig = createSignature([1],[1],this.accounts[0]);
        await expect(this.staking.connect(this.accounts[0]).stake([],[],[], sig)).to.be.revertedWith('tokens.length <= 0');
    });

    it('tokens.length == tiers.length == commitments.length', async function() {
        let sig = createSignature([1],[1],this.accounts[0]);
        await expect(this.staking.connect(this.accounts[0]).stake([1],[1, 2],[1,2], sig)).to.be.revertedWith('tokens != tiers');
        await expect(this.staking.connect(this.accounts[0]).stake([1],[1],[1,2], sig)).to.be.revertedWith('tokens != commitments');
    })

    it('staker!=owner', async function() {
        let sig = createSignature([1],[1],this.accounts[0]);

        // mint nfts
        const fiveToken = {value: ethers.utils.parseEther("0.55")}
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(5, fiveToken);
        expect(await this.nft.totalSupply()).to.equal(5);
        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);

        await expect(this.staking.connect(this.accounts[11]).stake([1], [1], [1], sig)).to.be.revertedWith("staker!=owner");

    });
    
    it('invalid commitment', async function() {
        let sig = createSignature([1],[1],this.accounts[0]);
        await expect(this.staking.connect(this.accounts[10]).stake([1], [1], [-1], sig)).to.be.reverted;
        await expect(this.staking.connect(this.accounts[10]).stake([1], [1], [13], sig)).to.be.revertedWith("invalid commitment");
        await expect(this.staking.connect(this.accounts[10]).stake([1], [1], [100], sig)).to.be.revertedWith("invalid commitment");

    })

    it('invalid tier', async function() {
        let sig = createSignature([1],[3],this.accounts[0]);
        let sig2 = createSignature([1],[5],this.accounts[0]);
        let sig3 = createSignature([1],[10],this.accounts[0]);
        // await expect(this.staking.connect(this.accounts[10]).stake([1], [-1], [1], sig)).to.be.reverted;
        console.log('ch')
        await expect(this.staking.connect(this.accounts[10]).stake([1], [3], [1], sig)).to.be.reverted;
        await expect(this.staking.connect(this.accounts[10]).stake([1], [5], [1], sig2)).to.be.reverted;
        await expect(this.staking.connect(this.accounts[10]).stake([1], [10], [1], sig3)).to.be.reverted;
    })
   
});



describe('Withdraw,Collecting Commitment bonuses: branches', async function() {
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

        // approve staking contract
        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);

        
        
    });
    
    
    it('tokens.length <= 0', async function () {
        // mint and stake 5 tokens
        let sig = createSignature([1,2,3,4,5],[0,0,0,0,0],this.accounts[0]);
        const fiveToken = {value: ethers.utils.parseEther("0.55")}
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(5, fiveToken);
        await network.provider.send("evm_mine", [2000000000]);
        await this.staking.connect(this.accounts[10]).stake([1,2,3,4,5], [0,0,0,0,0], [1,1,1,1,1], sig);

        await expect(this.staking.connect(this.accounts[10]).withdraw([])).to.be.revertedWith("tokens.length <= 0");
        
    });
    
    it('token not staked', async function(){
        await expect(this.staking.connect(this.accounts[10]).withdraw([6])).to.be.revertedWith("token not staked");
        await expect(this.staking.connect(this.accounts[10]).withdraw([0])).to.be.revertedWith("token not staked");
        await expect(this.staking.connect(this.accounts[10]).withdraw([10])).to.be.revertedWith("token not staked");
        await expect(this.staking.connect(this.accounts[10]).withdraw([1,2,3,4,5,6])).to.be.revertedWith("token not staked");
        await expect(this.staking.connect(this.accounts[10]).withdraw([1,2,3,3,4,5])).to.be.revertedWith("token not staked");
    });
    
    it('withdrawer!=owner', async function() {
        await expect(this.staking.connect(this.accounts[11]).withdraw([1,2,3,4,5])).to.be.revertedWith("withdrawer!=owner");
        await expect(this.staking.connect(this.accounts[11]).withdraw([1,3])).to.be.revertedWith("withdrawer!=owner");
        await expect(this.staking.connect(this.accounts[11]).withdraw([5,3,4,1,2])).to.be.revertedWith("withdrawer!=owner");
        await expect(this.staking.connect(this.accounts[11]).withdraw([4])).to.be.revertedWith("withdrawer!=owner");
    })


    // COMMITMENT BONUSES

    it('only owner collects', async function() {
        const weekTime = 604800;
        let currTimestamp = 2000000000;
        currTimestamp += weekTime + 10;
        await network.provider.send("evm_mine", [currTimestamp]);

        await expect(this.staking.connect(this.accounts[11]).collectCommitmentBonuses([1,2,3,4,5])).to.be.revertedWith('only owner collects');
        await expect(this.staking.connect(this.accounts[11]).collectCommitmentBonuses([1,2,3])).to.be.revertedWith('only owner collects');
        await expect(this.staking.connect(this.accounts[11]).collectCommitmentBonuses([1,2,3,4,5,6])).to.be.revertedWith('only owner collects');
        await expect(this.staking.connect(this.accounts[11]).collectCommitmentBonuses([4])).to.be.revertedWith('only owner collects');
    })
    
    it('commitment already collected', async function () {
        await this.staking.connect(this.accounts[10]).collectCommitmentBonuses([1]);
        await expect(this.staking.connect(this.accounts[10]).collectCommitmentBonuses([1])).to.be.revertedWith("already collected");
        // await expect(this.staking.connect(this.accounts[10]).collectCommitmentBonuses([1,2,3,4,5,6])).to.be.revertedWith('only owner collects');
        // await expect(this.staking.connect(this.accounts[10]).collectCommitmentBonuses([6])).to.be.revertedWith('only owner collects');

    });



    

    it('cant mint 0 rewards', async function() {
        await this.staking.connect(this.accounts[0]).flipMintingState();
        await expect(this.staking.connect(this.accounts[5]).exchangeToBotz()).to.be.revertedWith("no rewards");
    })

    it('bad adjustRates length', async function() {
        await expect(this.staking.connect(this.accounts[0]).adjustDailyRates([1,2])).to.be.revertedWith("invalid length");
        await expect(this.staking.connect(this.accounts[0]).adjustDailyRates([1,2,3,4])).to.be.revertedWith("invalid length");

        await expect(this.staking.connect(this.accounts[0]).adjustCommitmentBonuses([1,2,3,4,5,6,7,8,9,10,11,12,13])).to.be.revertedWith("invalid length");
        await expect(this.staking.connect(this.accounts[0]).adjustCommitmentBonuses([1,2,3,4,5,6,7,8,9,10,11])).to.be.revertedWith("invalid length");
    });

    
   
   
});




