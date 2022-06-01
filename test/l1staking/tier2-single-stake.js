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

describe('Tier 2: Earned and Total Rewards Correct ', async function() {
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

        // approve first 12 accounts to approve staking contract transfer tokens
        for(let i = 0; i < 12; i++) {
            await this.nft.connect(this.accounts[i]).setApprovalForAll(this.staking.address, true);
        }        
    });

    it('[1-12 weeks]', async function () {
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

        // const tenTokens = {value: ethers.utils.parseEther("0.55")}
        const oneTokens = {value: ethers.utils.parseEther("0.055")}

        let signatures = []
        let totals = []
       // first 12 accounts[0-11] mint 1 each and set commitment 1-12
        for(let i = 0; i < 12; i++) {
            // mint an nft
            await this.nft.connect(this.accounts[i]).mintSchoolBotz(1, oneTokens);   
            expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
            expect(await this.nft.balanceOf(this.accounts[i].address)).to.equal(1);
            signatures.push(await createSignature([i+1], [2], this.accounts[0]));
        }
    
        const weekTime = 604800;
        let currTimestamp = 2000000000;
        const year = 31536000;
    
        // set the block.timestamp when we stake
        await network.provider.send("evm_mine", [currTimestamp]);
        
        // each accounts stake with increasing commitment length [1-12]
        for(let i = 0; i < 12; i++) {
            // hardhat network cant be set back
            if (i > 0) {
                currTimestamp += year;
                await network.provider.send("evm_mine", [currTimestamp]);
            }
    
            // staking with increasing time length
            await this.staking.connect(this.accounts[i]).stake([i+1],[2], [i+1], signatures[i]);
            expect(await this.staking.connect(this.accounts[i]).numStakedTokens()).to.equal(1);
    
            console.log(i+1, 'Weeks Committed ');
            // account[i] stakes with commitment of week i+1
            // go through each week, up to weeks commited
            for(let j = 1; j <= i+1; j++) {
                if(j == 1)
                    currTimestamp += weekTime + 1;
                else 
                    currTimestamp += weekTime;
    
                // update block.timestamp
                await network.provider.send("evm_mine", [currTimestamp]);
    
                let real = (await this.staking.connect(this.accounts[i]).totalEarned()).toNumber()/(10e5);
                
                // rewards for tier[0], section[earned], week[j]
                let expected = rewardChart[0][2][j];
    
                // is earning correct amount weekly
                expect(real).to.eql(expected);
    
                
                // console.log("real:\t ", real);
                // console.log("expected:", expected);
    
                // try to collect but reverts because not enough time
                if(j < i) {
                    await expect(this.staking.connect(this.accounts[i]).collectCommitmentBonuses([i+1])).to.be.revertedWith("comm not completed");
                }
                
            }
            
            await this.staking.connect(this.accounts[i]).collectCommitmentBonuses([i+1]);


            // Just extra processing to ensure we grabbing the right values
            // we have to account for the rounding error in hh localnet timing, but in tier2, some expected earnings should be x.5
            // So we cant just use the floor function
            let t = await this.staking.connect(this.accounts[i]).totalEarned() / (10e5);
            let tFloor = Math.floor(await this.staking.connect(this.accounts[i]).totalEarned() / (10e5));
            
            if(Math.abs(t - 0.5) > tFloor) {
                totals.push(tFloor + 0.5);
            }
            else
                totals.push(tFloor);

            // console.log("total earned with bonus: ", t, tFloor);
    
        }
    
        console.log('totals:', totals);
        let expTots = rewardChart[2][2];
        expTots.shift();
        console.log('rewardsChart tier2 totals:', expTots);
        // reward chart contains week 0
        expect(totals).to.eql(expTots);

    
    });
    



});    



