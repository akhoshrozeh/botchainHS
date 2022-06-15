const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

// converts array of BigNumbers to regular numbers
function bigToNorm(x) {
    let res = []
    for(let i  = 0; i < x.length; i++) {
        res.push(x[i].toNumber());
    }
    return res;
}

describe('Queryable', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', 'ipfs',
            this.accounts[0].address, this.accounts[1].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[0]).flipAllMintState();
        await this.botz.connect(this.accounts[0]).flipPublicMintState();
    });

    it('Getting all tokenIds given address as input', async function() {
        const nftCost = {value: ethers.utils.parseEther("0.275")};

        for(let i = 0; i < 10; i++) {
            for(let j = 0; j < 5; j++) {
                // 10 accounts mint 25 tokens each
                await this.botz.connect(this.accounts[i]).mintSchoolBotz(5, nftCost);
            }
        }

        // these are for the tokens owned by each of the 10 users
        let expected_buckets = []
        let temp = []

        for(let i = 1; i <= 250; i++) {
            temp.push(i);
            if (i % 25 == 0) {
                expected_buckets.push(temp);
                temp = [];
            }
        }
        
        // accounts[0] should have tokens [1,25]
        // accounts[1] should have tokens [26, 50] and so on up to [226,250] by accounts[9]
        for(let i = 0; i < 10; i++) {
            expect(await this.botz.balanceOf(this.accounts[i].address)).to.equal(25);
        }    
        
        // let actual_buckets = []
        // for(j = 0; j < 10; j++) {
        //     let balance = await this.botz.balanceOf(this.accounts[j].address);
        //     let owner = this.accounts[j].address;
            
        //     // console.log("balance: ", balance.toNumber());
        //     // console.log("owner: ", owner);
        //     // console.log("owned tokens: ");
            
        //     // let temp = []
        //     // for(let i = 0; i <= balance-1; i++) {
        //     //     temp.push((await this.botz.tokenOfOwnerByIndex(owner, i)).toNumber());
        //     // }

        //     let temp = await this.botz.tokensOfOwner(owner);

            
        //     actual_buckets.push(temp);
        // }
        
        // expect(expected_buckets).to.eql(actual_buckets);
        
        // console.log("expected: ", expected_buckets);
        // console.log("old: ", actual_buckets);

        // using getTokensOfOwner(address)
        actual_buckets = [];
        for(let i = 0; i < 10; i++) {
            actual_buckets.push(bigToNorm(await this.botz.tokensOfOwner(this.accounts[i].address)));
        }

        console.log("actual buckets: ", actual_buckets);

        // console.log("new: ", actual_buckets)

        expect(actual_buckets).to.eql(expected_buckets);



        
    });


    // it('getTokensOfOwner (returns all tokens at once)', async function() {
    //     await hre.network.provider.send("hardhat_reset");

    // })




    
});

