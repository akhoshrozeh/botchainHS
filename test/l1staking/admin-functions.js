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


    it('Setting Rewards Token', async function () {
       expect(await this.staking.rewardsToken()).to.equal(this.botz.address);
       
       // create another botz contract
       this.factory = await hre.ethers.getContractFactory('Botz')
       this.botz2 = await this.factory.deploy();
       await this.botz2.deployed();
       console.log('botz: ', this.botz.address)
       console.log('botz2: ', this.botz2.address)
       
       // non admin fails to update it
       await expect(this.staking.connect(this.accounts[1]).setRewardsToken(this.botz2.address)).to.be.reverted;
       expect(await this.staking.rewardsToken()).to.equal(this.botz.address);
       
        //  rewards token is now update
       console.log('rewardsToken before:', await this.staking.rewardsToken());
       await this.staking.connect(this.accounts[0]).setRewardsToken(this.botz2.address);
       expect(await this.staking.rewardsToken()).to.equal(this.botz2.address);
       console.log('rewardsToken after:', await this.staking.rewardsToken());

    });

    it('Pause state', async function() {
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

        // non admin cant flip pause state
        await expect( this.staking.connect(this.accounts[1]).flipPauseState()).to.be.reverted;

        // staking is paused
        await this.staking.connect(this.accounts[0]).flipPauseState();
        
        const oneToken = {value: ethers.utils.parseEther("0.055")}
        const sig = createSignature([1], [0], this.accounts[0]);
        
        // mint nft
        await this.nft.connect(this.accounts[10]).mintSchoolBotz(1, oneToken);   
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(1);
        
        
        
        // approve staking to transfer nfts
        await this.nft.connect(this.accounts[10]).setApprovalForAll(this.staking.address, true);
        
        // try to stake
        await expect(this.staking.connect(this.accounts[10]).stake([1], [0], [1], sig)).to.be.revertedWith("pause on");
        
        // flip state
        await this.staking.connect(this.accounts[0]).flipPauseState();
       
        const weekTime = 604800;
        let currTimestamp = 2000000000;
        await network.provider.send("evm_mine", [currTimestamp]);
        
        // now can stake
        await this.staking.connect(this.accounts[10]).stake([1], [0], [1], sig);
        expect(await this.staking.connect(this.accounts[10]).numStakedTokens()).to.equal(1);
        
        
        // flip state
        await this.staking.connect(this.accounts[0]).flipPauseState();
        
        // week passes; -1 to account to failed
        currTimestamp += weekTime;
        await network.provider.send("evm_mine", [currTimestamp]);
        
        // cant withdraw
        await expect(this.staking.connect(this.accounts[10]).withdraw([1])).to.be.revertedWith("pause on");
        await expect(this.staking.connect(this.accounts[10]).collectCommitmentBonuses([1])).to.be.revertedWith("pause on");
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(1);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(0);
        
        // unpause
        await this.staking.connect(this.accounts[0]).flipPauseState();

        await this.staking.connect(this.accounts[10]).collectCommitmentBonuses([1]);
        await this.staking.connect(this.accounts[10]).withdraw([1]);

        expect(await this.staking.connect(this.accounts[10]).getRewards() / (10e5)).to.be.closeTo(rewardChart[2][0][1], 0.05);

        expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.accounts[10].address)).to.equal(1);
    })


    it('Updating daily rates for tiers', async function() {
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


        const oneToken = {value: ethers.utils.parseEther("0.055")}
        const sig = createSignature([2], [0], this.accounts[0]);
        
        // mint nft
        await this.nft.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);   
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.accounts[5].address)).to.equal(1);
        
        // approve staking to transfer nfts
        await this.nft.connect(this.accounts[5]).setApprovalForAll(this.staking.address, true);
        
        
        // update rewards (double them)
        await this.staking.connect(this.accounts[0]).adjustDailyRates([1000,800,500]);
        
        const weekTime = 604800;
        let currTimestamp = 2008000000;
        await network.provider.send("evm_mine", [currTimestamp]);
        
        
        // stake for one week
        await this.staking.connect(this.accounts[5]).stake([2], [0], [1], sig);
        
        // one week passes
        currTimestamp += weekTime;
        await network.provider.send("evm_mine", [currTimestamp]);
        
        await this.staking.connect(this.accounts[5]).withdraw([2]);
        
        expect(await this.staking.connect(this.accounts[5]).getRewards() / (10e5)).to.equal(rewardChart[2][0][1] * 2)
        console.log(await this.staking.connect(this.accounts[5]).getRewards() / (10e5))

        // reset rates
        await this.staking.connect(this.accounts[0]).adjustDailyRates([500,400,250]);
    });
    
    it('Adjust commitment bonuses', async function() {
        
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


        const oneToken = {value: ethers.utils.parseEther("0.055")}
        const sig = createSignature([3], [0], this.accounts[0]);
        
        // mint nft
        await this.nft.connect(this.accounts[6]).mintSchoolBotz(1, oneToken);   
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.accounts[6].address)).to.equal(1);
        
        // approve staking to transfer nfts
        await this.nft.connect(this.accounts[6]).setApprovalForAll(this.staking.address, true);
        
        
        // update rewards (double them)
        await this.staking.connect(this.accounts[0]).adjustCommitmentBonuses([0,0,0,0,0,0,0,0,0,0,0,0]);
        
        const weekTime = 604800;
        let currTimestamp = 2010000000;
        await network.provider.send("evm_mine", [currTimestamp]);

        
        // stake for one week
        await this.staking.connect(this.accounts[6]).stake([3], [0], [1], sig);
        
        // one week passes
        currTimestamp += weekTime;
        await network.provider.send("evm_mine", [currTimestamp]);

        await this.staking.connect(this.accounts[6]).withdraw([3]);

        // rewards are whats earned; commtiment bonuses are all 0%
        expect(await this.staking.connect(this.accounts[6]).getRewards() / (10e5)).to.equal(rewardChart[0][0][1])
        console.log(await this.staking.connect(this.accounts[6]).getRewards() / (10e5))

    });
   

    
   
});

describe('Emergency Transfer', async function() {
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

    it('Transfers tokens back to owners', async function() {
        // accounts 1 thru 5 mint each and stake it (accounts[1] owns 1,2,3,4,5 , acc[2] owns 6,7,8,9,10 etc.)
        const tenTokens = {value: ethers.utils.parseEther("0.55")}
        // minting and staking
        let tokenId = 1;
        for(let j = 1; j <= 5; j++){
            await this.nft.connect(this.accounts[j]).mintSchoolBotz(5, tenTokens);
            let tokens = [];
            let tiers = [];
            let commitments = [];

            let bound = tokenId + 5;
            for(let i = tokenId; i < bound; i++) {
                tokens.push(tokenId);
                tiers.push(0);
                commitments.push(12);

                tokenId++;
            }
            expect(await this.nft.balanceOf(this.accounts[j].address)).to.equal(5);
            // console.log('tokens', tokens)
            let sig = createSignature(tokens, tiers, this.accounts[0]);
            
            // approve staking to transfer and stake
            await this.nft.connect(this.accounts[j]).setApprovalForAll(this.staking.address, true);
            await this.staking.connect(this.accounts[j]).stake(tokens, tiers, commitments, sig);
            
            // verify tokens staked 
            expect(bigToNorm(await this.staking.connect(this.accounts[j]).tokensStaked())).to.eql(tokens);
            expect(await this.nft.balanceOf(this.accounts[j].address)).to.equal(0);
            expect(await this.nft.balanceOf(this.staking.address)).to.equal(tokenId-1);
        } 
        
        expect(await this.nft.balanceOf(this.staking.address)).to.equal(25);
        
        // Now we can calculate who owns what off-chain, and the call the contract
        // In a real situation, we'd create a custom contract so we can batch these emergency transfers
        for(let i = 1; i <= 25; i++) {
            await this.staking.connect(this.accounts[0]).emergencyTransfer(i);
            expect(await this.nft.balanceOf(this.staking.address)).to.equal(25 - i);
            
        }
        // check theyre transfered back
        expect(await this.nft.balanceOf(this.accounts[1].address)).to.equal(5);
        expect(await this.nft.balanceOf(this.accounts[2].address)).to.equal(5);
        expect(await this.nft.balanceOf(this.accounts[3].address)).to.equal(5);
        expect(await this.nft.balanceOf(this.accounts[4].address)).to.equal(5);
        expect(await this.nft.balanceOf(this.accounts[5].address)).to.equal(5);


       



    })
});





describe('Emergency Transfer', async function() {
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

    it('cant transfer token not in staking contract', async function() {
        // cant transfer token that isnt in staing contract
        for(let i = 1; i <= 25; i++) {
           await expect(this.staking.connect(this.accounts[0]).emergencyTransfer(i)).to.be.revertedWith("bad address");
        }

    })
});
