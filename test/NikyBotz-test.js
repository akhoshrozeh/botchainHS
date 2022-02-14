// require('hardhat-contract-sizer');
// const hre = require("hardhat");
const assert = require("assert");
const { ethers } = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');


// before('get factories', async function () {
//     this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
//     this.accounts = await hre.ethers.getSigners();
//     this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
//         this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
//         await botz.deployed();
// });


// this.accounts[0] should be the owner (the multisig wallet)
// this.accounts[1-3] should be admins which are personal EOA (johann's, gilly's, etc.)
describe('Initial State', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
        
    });
    
    it('Correct Name, Symbol, Owner', async function () {
        assert(await this.botz.name() === 'Botz');
        assert(await this.botz.symbol() === 'BTZ');
        assert(await this.botz.owner() === this.accounts[0].address);
    })

    it('Admins are set', async function () {
        assert(await this.botz.hasRole("0x" + keccak256('OWNER_ROLE').toString('hex'), this.accounts[0].address) === true);
        assert(await this.botz.hasRole("0x" + keccak256('ADMIN_ROLE').toString('hex'), this.accounts[0].address) === true);
        assert(await this.botz.hasRole("0x" + keccak256('ADMIN_ROLE').toString('hex'), this.accounts[1].address) === true);
        assert(await this.botz.hasRole("0x" + keccak256('ADMIN_ROLE').toString('hex'), this.accounts[2].address) === true);
        assert(await this.botz.hasRole("0x" + keccak256('ADMIN_ROLE').toString('hex'), this.accounts[3].address) === true);
        assert(await this.botz.hasRole("0x" + keccak256('ADMIN_ROLE').toString('hex'), this.accounts[4].address) === false);
    })
});



describe('Provenance Hash', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
        
    });

    it('Test inital condition', async function() {
        assert(await this.botz.provenanceHash() === "");
    })

    it('Sets correctly with authorization and only once', async function() {
        try {
            await this.botz.connect(this.accounts[5]).setProvenanceHash("0x123123_test_hash_str");
        }
        catch(e) {
            console.log("\tUnauthorized: revert caught");
            assert(await this.botz.provenanceHash() === "");
        }
        
        await this.botz.connect(this.accounts[1]).setProvenanceHash("0x123123_test_hash_str");
        assert(await this.botz.provenanceHash() === "0x123123_test_hash_str");

        try {
            await this.botz.connect(this.accounts[0]).setProvenanceHash("0x456456_test_hash_str");
        }
        catch(e) {
            console.log("\tAlready set hash: revert caught");
            assert(await this.botz.provenanceHash() === "0x123123_test_hash_str");
        }
        

    })
});

describe('Timestamp Validation', async function () {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });

    it('\tSets reveal timestamp with authorization', async function () {
        // Check IC
        assert(await this.botz.REVEAL_TIMESTAMP() == '1645747200');

        // Check REVEAL_TIMESTAMP is only set by admins
        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[2]).setRevealTS(time);
        assert(await this.botz.REVEAL_TIMESTAMP() == time);

        try {
            await this.botz.connect(this.accounts[5]).setRevealTS(time+100);
            
        }
        catch(e) {
            console.log("\tUnauthorized change in REVEAL_TIMESTAMP: revert caught")
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
        await this.botz.connect(this.accounts[3]).setWhitelistTS(time, time + 100);
        assert(await this.botz.WHITELIST_SALE_TIMESTAMP_BEGIN() == time);
        assert(await this.botz.WHITELIST_SALE_TIMESTAMP_END() == time + 100);

        try {
            await this.botz.connect(this.accounts[7]).setWhitelistTS(time+1000, time + 2000);
        }
        catch(e) {
            console.log("\tUnauthorized change in WHITELIST_SALE_TIMESTAMP_BEGIN/END: revert caught")
            assert(await this.botz.WHITELIST_SALE_TIMESTAMP_BEGIN() == time);
            assert(await this.botz.WHITELIST_SALE_TIMESTAMP_END() == time+100);
        }   


        // TODO: Check mintFromWhitelist is working correctly w/ regards to 'presaleIsOpen' modifier/guard
        // * Should pass once MerkleTree is working


    })


    // it('', async function () {
    
    // })
    
    
});

describe('Base URI', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });

    it('Tests modification with authorization', async function () {
        assert(await this.botz.baseTokenURI() === "ipfs");

        // unauthorized changes invalid
        try {
            await this.botz.connect(this.accounts[6]).setBaseTokenURI("ipfs://example-dir.com");
        } catch(e) {
            console.log("\tUnauthorized update to baseTokenURI: revert caught");
            assert(await this.botz.baseTokenURI() === "ipfs");
        }

        await this.botz.connect(this.accounts[3]).setBaseTokenURI("ipfs://example-dir.com");
        assert(await this.botz.baseTokenURI() === "ipfs://example-dir.com");

    })

    it('', async function () {
    
    })
    
});




describe('Whitelist Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });
    
});


describe('Reserve Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });

    it('100 max', async function () {
        for(let i = 0; i < 100; i++)
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        try {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        catch(e) {
            console.log("\tError Caught: couldnt mint 101th reserve token");
            assert( await this.botz.getReserveMintCount() == 100);
            assert( await this.botz.balanceOf(this.accounts[1].address) == 100);

        }
    });

    


});


describe('Public Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });

});





describe('Transfer of Tokens', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });

    

});



describe('Whitelist', async function() {

});


describe('Transfer Balances', async function() {

});


describe('Access Control', async function() {

});



describe('', async function() {

});
