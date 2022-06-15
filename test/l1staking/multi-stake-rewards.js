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


    it('Random tiers and commitments (10 tokens, 10 times)', async function() {
        // run the rand
        let kBound = 10
        for(let k  = 0; k < kBound; k++) {
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





            // *******


            let numTokens = 10

            // Staking 10 tokens of different tiers and commitments, randomly Generated
            let tokenIds = []
            let randomTiers = []
            let randomCommitments = []
            for(let i = 0; i < numTokens; i++) {
                tokenIds.push(i+1);
                randomTiers.push(randTier());
                randomCommitments.push(randCommitment());
            }

            let sig = createSignature(tokenIds, randomTiers, this.accounts[0]);
            
            // console.log('Token Ids:', tokenIds)
            // console.log('Random Tiers:', randomTiers)
            // console.log('Random Commitments', randomCommitments);



            // buy the nfts
            const tenTokens = {value: ethers.utils.parseEther("0.55")}
            await this.nft.connect(this.accounts[10]).mintSchoolBotz(numTokens, tenTokens);
            expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(numTokens);

            // setup block.timestamp
            const weekTime = 604800;
            let currTimestamp = 2000000000;
            const year = 31536000;
            await network.provider.send("evm_mine", [currTimestamp]);

            // stake 10 tokens
            await this.staking.connect(this.accounts[10]).stake(tokenIds, randomTiers, randomCommitments, sig);

            expect(bigToNorm(await this.staking.connect(this.accounts[10]).tokensStaked())).to.eql(tokenIds);

            // Let 12 weeks pass and withdraw (this collects all the rewards)
            let twelveWeeks = weekTime * 12;
            currTimestamp += twelveWeeks;
            await network.provider.send("evm_mine", [currTimestamp]);

            // await expect(this.staking.connect(this.accounts[9]).withdraw(tokenIds)).to.be.revertWith('withdrawer!=owner');
            
            await this.staking.connect(this.accounts[10]).withdraw(tokenIds);
            let totalEarned = await this.staking.connect(this.accounts[10]).totalEarned()
            let rewards = await this.staking.connect(this.accounts[10]).getRewards();
            expect(totalEarned).to.equal(rewards);
            // console.log('totalEanred: ', totalEarned);
            // console.log('rewards: ', rewards);

            // debugging var
            let bonusSum = 0;
            let earnedSum = 0;

            let expectedRewards = 0;
            for(let i = 0; i < numTokens; i++) {
                // add up daily rates for all 10 tokens (bonuses)
                // console.log('*******************************************************');
                // console.log('Tier: ', randomTiers[i], 'Commitment: ', randomCommitments[i]);
                expectedRewards += rewardChart[0][randomTiers[i]][12];
                earnedSum += rewardChart[0][randomTiers[i]][12];
                // console.log('base earnings: ', rewardChart[0][randomTiers[i]][12])
                
                // add up the bonuses for each
                expectedRewards += rewardChart[1][randomTiers[i]][randomCommitments[i]];
                bonusSum += rewardChart[1][randomTiers[i]][randomCommitments[i]];
                // console.log('bonus: ', rewardChart[1][randomTiers[i]][randomCommitments[i]])
                
            }
            // console.log('******************');
            // console.log('bonusSum: ', bonusSum)
            // console.log('EarnedSum: ', earnedSum)
            // console.log('difference: ', Math.abs(expectedRewards - (rewards / (10e5))) )

            // console.log('expectedRewards: ', expectedRewards);
            // console.log('Actual Rewards: ', rewards / (10e5));
            expect(expectedRewards).to.equal(rewards / (10e5));

            // console.log(rewardChart)

            console.log("Passed round ", k);
        }        

    }).timeout(10000000);






    it('Correct rewards earned after collecting commitments', async function() {
        // run the rand
        let kBound = 10
        for(let k  = 0; k < kBound; k++) {
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





            // *******


            let numTokens = 10

            // Staking 10 tokens of different tiers and commitments, randomly Generated
            let tokenIds = []
            let randomTiers = []
            let randomCommitments = []
            for(let i = 0; i < numTokens; i++) {
                tokenIds.push(i+1);
                randomTiers.push(randTier());
                randomCommitments.push(randCommitment());
            }

            let sig = createSignature(tokenIds, randomTiers, this.accounts[0]); 
            
            // console.log('Token Ids:', tokenIds)
            // console.log('Random Tiers:', randomTiers)
            // console.log('Random Commitments', randomCommitments);



            // buy the nfts
            const tenTokens = {value: ethers.utils.parseEther("0.55")}
            await this.nft.connect(this.accounts[10]).mintSchoolBotz(numTokens, tenTokens);
            expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(numTokens);

            // setup block.timestamp
            const weekTime = 604800;
            let currTimestamp = 2000000000;

            await network.provider.send("evm_mine", [currTimestamp]);

            // stake 10 tokens
            await this.staking.connect(this.accounts[10]).stake(tokenIds, randomTiers, randomCommitments, sig);

            expect(bigToNorm(await this.staking.connect(this.accounts[10]).tokensStaked())).to.eql(tokenIds);

            // Let 12 weeks pass and withdraw (this collects all the rewards)
            let twelveWeeks = weekTime * 12;
            currTimestamp += twelveWeeks;
            await network.provider.send("evm_mine", [currTimestamp]);

            // await expect(this.staking.connect(this.accounts[9]).withdraw(tokenIds)).to.be.revertWith('withdrawer!=owner');
            
            
            // get the rewards after 12 weeks and commitments collected
            await this.staking.connect(this.accounts[10]).collectCommitmentBonuses(tokenIds);
            let totalEarned = await this.staking.connect(this.accounts[10]).totalEarned()

            // debugging var
            let bonusSum = 0;
            let earnedSum = 0;

            // calculate what the rewards should be
            let expectedRewards = 0;
            for(let i = 0; i < numTokens; i++) {
                // add up daily rates for all 10 tokens (bonuses)
                // console.log('*******************************************************');
                // console.log('Tier: ', randomTiers[i], 'Commitment: ', randomCommitments[i]);
                expectedRewards += rewardChart[0][randomTiers[i]][12];
                earnedSum += rewardChart[0][randomTiers[i]][12];
                // console.log('base earnings: ', rewardChart[0][randomTiers[i]][12])
                
                // add up the bonuses for each
                expectedRewards += rewardChart[1][randomTiers[i]][randomCommitments[i]];
                bonusSum += rewardChart[1][randomTiers[i]][randomCommitments[i]];
                // console.log('bonus: ', rewardChart[1][randomTiers[i]][randomCommitments[i]])
                
            }
            // console.log('******************');
            // console.log('bonusSum: ', bonusSum)
            // console.log('EarnedSum: ', earnedSum)
            // console.log('difference: ', Math.abs(expectedRewards - (rewards / (10e5))) )

            // console.log('expectedRewards: ', expectedRewards);
            // console.log('Actual Rewards: ', rewards / (10e5));

            // rewards after colleectig commitmetns but not withdrawing
            expect(expectedRewards).to.equal(totalEarned / (10e5));
            expect(expectedRewards).to.equal(earnedSum + bonusSum);


            // Wait another 12 weeks, and verify the sums are correct
            currTimestamp += twelveWeeks + 1;
            await network.provider.send("evm_mine", [currTimestamp]);

            // get totalEarned after 12
            let currRew = await this.staking.connect(this.accounts[10]).totalEarned();
            // console.log('rewards after first week:',totalEarned / (10e5) )
            // console.log('should be currRew = bonusSum + 2 * earnedSum');
            // console.log('currRew', currRew/(10e5));
            // console.log('bonusSum + 2 * earnedSum: ', earnedSum * 2 + bonusSum);

            expect(currRew/(10e5)).to.equal(bonusSum + earnedSum * 2);
            // console.log('earnedSum * 2: ', earnedSum * 2)
            // console.log('bonusSum: ', bonusSum);
            // expect(postCollRew).to.equal(earnedSum * 2 + postCollRew/(10e5));

            

            console.log("\t\tPassed round ", k);
            // console.log('*****************');
        }        

    });


});