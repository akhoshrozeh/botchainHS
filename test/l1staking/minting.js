const assert = require("assert");
const { ethers, waffle, network} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const { BigNumber } = require("ethers");
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

describe('Minting (Redeeming Rewards)', async function() {
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


    it('Correct rewards minted; rewards zeroed', async function () {
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

        const tenTokens = {value: ethers.utils.parseEther("0.55")}
        

        // mint 10 tier0 tokens and commitment for 12 weeks
       let tokens = [];
       let tiers = [];
       let commitments = [];

       for(let i = 1; i <= 10; i++) {
           tokens.push(i);
           tiers.push(0);
           commitments.push(12);
       }

        let sig = createSignature(tokens, tiers, this.accounts[0]);

        // mint 10 nfts
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(10, tenTokens);   
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(10);


        const weekTime = 604800;
        let currTimestamp = 2000000000;
        const year = 31536000;
        await network.provider.send("evm_mine", [currTimestamp]);

        // approve staking to transfer nfts
        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);

       // stake
       await this.staking.connect(this.accounts[10]).stake(tokens, tiers, commitments, sig);

       // confirm stake
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(10);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(0);
        expect(bigToNorm(await this.staking.connect(this.accounts[10]).tokensStaked())).to.eql(tokens);


        // wait a year
        currTimestamp += year+2;
        await network.provider.send("evm_mine", [currTimestamp]);
        // 500rewards/day * 365 days * 10 tokens = 1,825,00 rewards (no commitment bonus collected)
        let totEarned = await this.staking.connect(this.accounts[10]).totalEarned()/ (10e5)
        let expectedTotEarned = rewardChart[0][0][1] * (365/7) * 10;
        // console.log("totEArned: ", totEarned);
        // console.log('expected: ', expectedTotEarned);

        expect(totEarned).to.equal(expectedTotEarned);

        // minting is off by default
        await expect(this.staking.connect(this.accounts[0]).exchangeToBotz()).to.be.revertedWith('minting off')

        // turn on minting
        await this.staking.connect(this.accounts[0]).flipMintingState();

        // verify erc20 balance is 0
        expect(await this.botz.balanceOf(this.accounts[10].address)).to.equal(0);

        
        // mint botz; zeroes out rewards
        await this.staking.connect(this.accounts[10]).exchangeToBotz();
        
        // check rewards are 0
        expect(await this.staking.connect(this.accounts[10]).totalEarned()).to.equal(0);
        
        // verify erc20 balance
        // scale down 18 decimals
        expect( (await this.botz.balanceOf(this.accounts[10].address)) / (10e18)).to.equal(totEarned);
       



    });
   
    
   
});






describe('Minting max', async function() {
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
        await this.botz.connect(this.accounts[0]).authorize(this.staking.address);

        // turn on minting
        await this.staking.connect(this.accounts[0]).flipMintingState();
        
    });


    it('Max mint of 950M tokens', async function () {
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

        

        const tenTokens = {value: ethers.utils.parseEther("0.55")}
        

        // mint 10 tier0 tokens and commitment for 12 weeks
       let tokens = [];
       let tiers = [];
       let commitments = [];

       for(let i = 1; i <= 10; i++) {
           tokens.push(i);
           tiers.push(0);
           commitments.push(12);
       }

        let sig = createSignature(tokens, tiers, this.accounts[0]);

        // mint 10 nfts
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(10, tenTokens);   
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(10);


        const weekTime = 604800;
        let currTimestamp = 2000000000;
        // earn 5000 a day  
        // 190,000 days = (950M / 5000)
        const timeTilOver950 = 190000 * 24 * 3600;
        // console.log('timeTil1:', timeTilOver950)
        await network.provider.send("evm_mine", [currTimestamp]);

        // approve staking to transfer nfts
        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);

       // stake
       await this.staking.connect(this.accounts[10]).stake(tokens, tiers, commitments, sig);

       // confirm stake
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(10);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(0);
        expect(bigToNorm(await this.staking.connect(this.accounts[10]).tokensStaked())).to.eql(tokens);


        // wait a year
        currTimestamp += timeTilOver950 + weekTime + 2;
        console.log('ts: ', currTimestamp);
        console.log('timeTil: ', timeTilOver950);
        await network.provider.send("evm_mine", [currTimestamp]);

        let totEarned = await this.staking.connect(this.accounts[10]).totalEarned()/ (10e5)
        let expectedTotEarned = 950000000 + rewardChart[0][0][1] * 10;
        console.log("totEArned: ", totEarned);
        console.log('expected: ', expectedTotEarned);

        expect(totEarned).to.equal(expectedTotEarned);


        // verify erc20 balance is 0
        expect(await this.botz.balanceOf(this.accounts[10].address)).to.equal(0);
        
        // mint botz; zeroes out rewards
        await this.staking.connect(this.accounts[10]).exchangeToBotz();
        
        // check rewards are 0
        expect(await this.staking.connect(this.accounts[10]).totalEarned()).to.equal(0);
        
        // verify erc20 balance
        // scale down 18 decimals
       console.log('erc20 bal: ', await this.botz.balanceOf(this.accounts[10].address));
       console.log('erc20 bal div: ', await this.botz.balanceOf(this.accounts[10].address) / (10e18));
        expect( (await this.botz.balanceOf(this.accounts[10].address)) / (10e18)).to.equal(950000000);
        console.log( (await this.botz.balanceOf(this.accounts[10].address)) / (10e18));

        // earn some more rewards
        currTimestamp += weekTime;
        await network.provider.send("evm_mine", [currTimestamp]);
        await expect(this.staking.connect(this.accounts[10]).exchangeToBotz()).to.be.revertedWith('total supply minted');
       



    });
    
});
