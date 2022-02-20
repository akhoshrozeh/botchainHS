const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;

describe('Timestamp Validation', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address);
        await this.botz.deployed();
    });

    it('\tSets reveal timestamp with authorization', async function () {
        // Check IC
        assert(await this.botz.REVEAL_TIMESTAMP() == '1645747200');

        // Check REVEAL_TIMESTAMP is only set by admins
        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setRevealTS(time);
        assert(await this.botz.REVEAL_TIMESTAMP() == time);

        // Unauthorized modification of REVEAL_TIMESTAMP
        try {
            await this.botz.connect(this.accounts[5]).setRevealTS(time+100);
        }
        catch(e) {
            console.log("\t3 Unauthorized change in REVEAL_TIMESTAMP: revert caught")
            assert(await this.botz.REVEAL_TIMESTAMP() == time);
        }

        // ! Need to check what reveal timestamp should do.. same as publicsaleTS?, or just an indicator ? talk to johann
    })

    it('Set whitelist timestamps with authorization, can only mint from whitelist during then', async function () {
        // Check IC
        assert(await this.botz.WHITELIST_SALE_TIMESTAMP_BEGIN() == '1645747200');
        assert(await this.botz.WHITELIST_SALE_TIMESTAMP_END() == '1645747500');

        // Check WHITELIST_SALE_TIMESTAMP_BEGIN is only set by admins
        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setWhitelistTS(time, time + 100);
        assert(await this.botz.WHITELIST_SALE_TIMESTAMP_BEGIN() == time);
        assert(await this.botz.WHITELIST_SALE_TIMESTAMP_END() == time + 100);

        try {
            await this.botz.connect(this.accounts[7]).setWhitelistTS(time+1000, time + 2000);
        }
        catch(e) {
            console.log("\t4 Unauthorized change in WHITELIST_SALE_TIMESTAMP_BEGIN/END: revert caught")
            assert(await this.botz.WHITELIST_SALE_TIMESTAMP_BEGIN() == time);
            assert(await this.botz.WHITELIST_SALE_TIMESTAMP_END() == time+100);
        }   


        // TODO: Check mintFromWhitelist is working correctly w/ regards to 'presaleIsOpen' modifier/guard
        // * Should pass once MerkleTree is working


    })



    // it('Set PUBLIC_SALE_TIMESTAMP by only admin, with correct information', async function () {
    //     const time = Math.floor(Date.now() / 1000);
    //     let setTS = await this.botz.PUBLIC_SALE_TIMESTAMP();
    //     try {
    //         await this.botz.connect(this.accounts[5]).setPublicSaleTS(time);
    //     }
    //     catch(e) {
    //         console.log("Unauthorized change to PUBLIC_SALE_TIMESTAMP caught")
    //         let res = await this.botz.PUBLIC_SALE_TIMESTAMP();
    //         assert(await this.botz.PUBLIC_SALE_TIMESTAMP(), setTS);   
    //     }
        
    //     await this.botz.connect(this.accounts[3]).setPublicSaleTS(time);
    //     assert(await this.botz.PUBLIC_SALE_TIMESTAMP() == time);   
    // })
    
    
});

