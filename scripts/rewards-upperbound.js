// const assert = require("assert");
// const { ethers, waffle, network} = require("hardhat");
// const { expect } = require('chai');
// const keccak256 = require('keccak256');
// const { MerkleTree } = require('merkletreejs');
// const { BigNumber, utils } = require("ethers");
// const { createSign } = require("crypto");
// const provider = waffle.provider;

// const commitmentBonuses = [0, 2, 5, 8, 11, 15, 20, 28, 39, 54, 76, 105, 147];
// function createRewardChart(commitmentBonuses) {
//     let res = []
//     let tierRates = [500, 400, 250];
    
//     // compute earned
//     let earned = []
//     for(let i = 0; i < 3; i++) {
//         let weeklyRates = [];
//         for(let j = 0; j <= 12; j++) {
//             currWeek = tierRates[i] * 7 * j;
//             weeklyRates.push(currWeek)
//         }
//         earned.push(weeklyRates);
//     }
//     res.push(earned);

//     // compute bones
//     let bonus = []
//     for(let i = 0; i < 3; i++) {
//         let weeklyBonuses = [];
//         for(let j = 0; j <= 12; j++) {
//             let currBonus = tierRates[i] * 7 * j * commitmentBonuses[j] / 100;
//             weeklyBonuses.push(currBonus)
//         }
//         bonus.push(weeklyBonuses);
//     }

//     res.push(bonus);

//     // compute total 
//     let total = []
//     for(let i = 0; i < 3; i++) {
//         let weeklyTotals = [];
//         for(let j = 0; j <= 12; j++) {
//             let currTotal = res[0][i][j] + res[1][i][j];
//             weeklyTotals.push(currTotal)
//         }
//         total.push(weeklyTotals);
//     }

//     res.push(total);
//     // console.log("bonus:", res[0], "end")

//     return res;

// }

// const rewardChart = createRewardChart(commitmentBonuses);
// // console.log(createRewardChart(commitmentBonuses));


// // converts array of BigNumbers to regular numbers
// function bigToNorm(x) {
//     let res = []
//     for(let i  = 0; i < x.length; i++) {
//         res.push(x[i].toNumber());
//     }
//     return res;
// }

// describe('Rewards Upperbounds', async function() {
//     before('get factories', async function () {
//         await hre.network.provider.send("hardhat_reset")

//         // * Deploy all three contracts
//         this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
//         this.accounts = await hre.ethers.getSigners();
//         this.nft = await this.factory.deploy('BCHS', 'BTZ', 'ipfs',
//             this.accounts[0].address, this.accounts[1].address);
//         await this.nft.deployed();
        
//         this.factory = await hre.ethers.getContractFactory('Botz')
//         this.accounts = await hre.ethers.getSigners();
//         this.botz = await this.factory.deploy();
//         await this.botz.deployed();
        
//         this.factory = await hre.ethers.getContractFactory('PictureDayStaking')
//         this.accounts = await hre.ethers.getSigners();
//         this.staking = await this.factory.deploy(this.nft.address, this.botz.address, this.accounts[0].address);
//         await this.staking.deployed();

//         // Turn on minting
//         await this.nft.connect(this.accounts[0]).flipAllMintState();
//         await this.nft.connect(this.accounts[0]).flipPublicMintState();

//         // authorize staking contract to mint
//         await this.botz.authorize(this.staking.address);

//         // approve everyone
//         for(let i = 0; i < 10; i++) {
//             await this.nft.connect(this.accounts[i]).setApprovalForAll(this.staking.address, true);
//         }
        
        
//     });

//     it('max rewards', async function () {
//         async function createSignature(tokens, tiers, signer) {
//             if(tokens.length != tiers.length) {
//                 console.log("BAD LENGTH IN CREATESIGNATURE()")
//                 return -1;
//             }

//             let types = []
//             for(let i = 0; i < tokens.length*2; i++) {
//                 types.push("uint256");
//             }

//             let values = tokens.concat(tiers);

//             let messageHash = ethers.utils.solidityKeccak256(types, values)
//             let sig = await signer.signMessage(hre.ethers.utils.arrayify(messageHash));
//             return sig;
//         }

//         const weekTime = 604800;
//         let currTimestamp = 2000000000;
//         const year = 31536000;
//         const tenTokens = {value: ethers.utils.parseEther("0.55")}
        

//         // minting 10 botz everytime (the max)
//         // mint 5,450 tokens
//         for(let itr = 1; itr <= 545; itr++) {
//             await this.nft.connect(this.accounts[0]).mintSchoolBotz(10, tenTokens);
//             // expect(await this.nft.getPublicMintCount()).to.equal(itr * 10);
//         }
        
//         await this.nft.connect(this.accounts[0]).mintSchoolBotz(5, tenTokens);
//         console.log("mint count: ", await this.nft.getPublicMintCount());
//         await expect(this.nft.connect(this.accounts[0]).mintSchoolBotz(1, tenTokens)).to.be.revertedWith('Over token limit.');
//         // await this.nft.connect(this.accounts[0]).mintSchoolBotz(10, tenTokens);
//         // console.log("mint count: ", await this.nft.getPublicMintCount());
        
//         // get the last 100 tokens
//         await this.nft.connect(this.accounts[0]).mintReserveSchoolBotz(100, this.accounts[0].address);
//         expect(await this.nft.balanceOf(this.accounts[0].address)).to.equal(5555);
//         await expect(this.nft.connect(this.accounts[0]).mintReserveSchoolBotz(1, this.accounts[0].address)).to.be.revertedWith('Over reserve limit');


        

//         // split up staking due to gas block limits
//         // do first 2500 
//         // create the tiers
//         let tiers = []
//         let tokens = []
//         let commitments = [12,12,12,12,12,12,12,12,12,12];
         
//         for(let i = 1; i <= 5555; i++) {
//             tokens.push(i)

//             // tokens 1,2 : tier0
//             if(1 <= i && i <= 10) {
//                 tiers.push(0)
//             }
//             // tokens 3,4: tier1
//             else if(11 <= i && i <= 227) {
//                 tiers.push(1)
//             }
//             // tokens 5-10: tier2
//             else {
//                 tiers.push(2)
//             }
//         }
        
//         await network.provider.send("evm_mine", [currTimestamp]);
        
//         // stake 5550
//         for(let i = 1; i <= 5555; i+=40) {
//             if(i + 40 > 5555) break;
//             let currTiers = tiers.slice(i-1, i-1+40);
//             let currTokens = tokens.slice(i-1, i-1+40);
            
//             // console.log('currTiers: ', currTiers)
//             // console.log('currTokens: ', currTokens)
//             let sig = createSignature(currTokens, currTiers, this.accounts[0]);
//             expect(sig).not.to.equal(-1);
            
//             await this.staking.connect(this.accounts[0]).stake(currTokens, currTiers, commitments, sig);
//             // console.log("staked: ", await this.nft.balanceOf(this.staking.address));
//             // console.log('i: ', i);
//         }
        
//         let toStake = 5555 - await this.nft.balanceOf(this.staking.address);
//         console.log('toStake:', toStake); 
//         currTimestamp += 12 * weekTime + 10;
//         await this.staking.connect(this.accounts[])
//         await network.provider.send("evm_mine", [currTimestamp]);

//         // set ts
//         // !todo: split up stakes -> over gas block limit
//         // stake all tokens 



//         // tokens = []
//         // tiers = []
//         // commitments = []
//         // // stake the rest
//         // for(let i = 2501; i <= 5555; i++) {
//         //     tokens.push(i);
//         //     tiers.push(2);
//         //     commitments.push(12);
//         // }

//         // sig = await createSignature(tokens, tiers, this.accounts[0]);
//         // await this.staking.connect(this.accounts[0]).stake(tokens, tiers, commitments, sig);
//         // expect(await this.nft.balanceOf(this.staking.address)).to.equal(5555);


//         // currTimestamp += 12 * weekTime;
//         // await network.provider.send("evm_mine", [currTimestamp]);
//         // let totEarned = (await this.staking.connect(this.accounts[0]).totalEarned()) / (10e5)

//         // console.log("total Earned: ", totEarned);

//         // should be 295,410,024
//         // expect()



        
//     }).timeout(10000000);;

// });
