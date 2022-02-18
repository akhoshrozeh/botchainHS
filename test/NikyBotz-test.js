// require('hardhat-contract-sizer');
// const hre = require("hardhat");
const assert = require("assert");
const { ethers, waffle} = require("hardhat");
const { expect } = require('chai');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');
const provider = waffle.provider;


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
        assert(await this.botz.hasRole("0x" + keccak256('OWNER_ROLE').toString('hex'), this.accounts[4].address) === false);
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
            let f = await this.botz.connect(this.accounts[5]).setProvenanceHash("0x123123_test_hash_str");
        }
        catch(e) {
            console.log("\t1 Unauthorized set of provenance hash: revert caught");
            assert(await this.botz.provenanceHash() === "");
        }
        
        await this.botz.connect(this.accounts[1]).setProvenanceHash("0x123123_test_hash_str");
        assert(await this.botz.provenanceHash() === "0x123123_test_hash_str");

        try {
            await this.botz.connect(this.accounts[0]).setProvenanceHash("0x456456_test_hash_str");
        }
        catch(e) {
            console.log("\t2 Already set hash: revert caught");
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
        await this.botz.connect(this.accounts[3]).setWhitelistTS(time, time + 100);
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
            console.log("\t5 Unauthorized update to baseTokenURI: revert caught");
            assert(await this.botz.baseTokenURI() === "ipfs");
        }

        await this.botz.connect(this.accounts[3]).setBaseTokenURI("ipfs://example-dir.com");
        assert(await this.botz.baseTokenURI() === "ipfs://example-dir.com");

    })
    
});



// Write tests after testing whitelist verification
describe('Whitelist Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });


  
    
    // it('', async function () {

    // });
    
    // it('', async function () {

    // });
    
    
});


describe('Reserve Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
        this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipSaleState();
    });
    
    it('Only admins can mint reserves', async function () {
        try {
            await this.botz.connect(this.accounts[4]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        catch(e) {
            console.log("\t6 Unauthorized reserve minting: revert caught");
            assert( await this.botz.getReserveMintCount() == 0);
            assert( await this.botz.balanceOf(this.accounts[4].address) == 0);
        }
    });
    
    it('Can mint <= 100 reserves and reserve mint count is correct', async function () {

        for(let i = 0; i < 99; i++) {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        
        
        // Try to mint 2 tokens when 99 have already been minted
        try {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(2, this.accounts[1].address);
        }
        catch(e) {
            console.log("\t7 Error Caught: Number of tokens to mint goes over limit");
            assert( await this.botz.getReserveMintCount() == 99);
        }
        
        // Mint the last token
        await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        assert(await this.botz.ownerOf(4100) == this.accounts[1].address);
        
        // Try to mint the 101th reserve token
        try {
            await this.botz.connect(this.accounts[1]).mintReserveSchoolBotz(1, this.accounts[1].address);
        }
        catch(e) {
            console.log("\t8 Error Caught: couldnt mint 101th reserve token");
            assert( await this.botz.getReserveMintCount() == 100);
        }

        
    });
    
    it('Checking token ids of minted reserve tokens [4001, 4100]', async function () {
        for(let i = 4001; i <= 4100; i++) {
            assert(await this.botz.ownerOf(i) == this.accounts[1].address);
        }

        await expect(this.botz.balanceOf(this.accounts[1].address) === 100);
    }); 
    
    it('Checking reserve token URIs', async function() {
        for(let i = 4001; i <= 4100; i++) {
            assert(await this.botz.tokenURI(i) === "ipfs" + i);
        }
    });
    
});

// Public Minting:
//     - can only mint <= 2 per call
//     - public sale must be On
//     - token values are [1,4000]
//     - correct ether is being sent
//     - max of 4000 tokens can be minted from this function (including whitelist sales)

describe('Public Minting', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });

    it('Can only mint 1 or 2 at a time', async function () {
        try {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(3);
        } 
        catch(e) {  
            assert(await this.botz.getPublicMintCount() == 0)
        }
    });

    it('Can only mint during saleOn', async function() {
        // const time = Math.floor(Date.now() / 1000);
        // await this.botz.connect(this.accounts[1]).setPublicSaleTS(time - 120);
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1)).to.be.revertedWith("Sale off");
        this.botz.connect(this.accounts[1]).flipSaleState();
    });

    it('Must send minimum eth price ', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}
        const twoToken = {value: ethers.utils.parseEther("0.2")}
        const badOneToken = {value: ethers.utils.parseEther("0.09999")}
        
        // Buying 1 token with no eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1)).to.be.revertedWith("Invalid msg.value");
        await expect(this.botz.getPublicMintCount() == 0);
        
        // Buying tokens with no enough eth
        await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, badOneToken)).to.be.revertedWith("Invalid msg.value");
        await expect(this.botz.getPublicMintCount() == 0);
        
        // Buying 1 and 2 tokens
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        await expect(this.botz.getPublicMintCount() == 1);
        
        await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoToken);
        await expect(this.botz.getPublicMintCount() == 3);
    });
    
    
    it('Contract balance is updated correctly with each txn', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}
        // 3 tokens have been minted so far in this test group, so contract balance should be 0.3 eth
        // balance is in wei
        let balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance === 0.3);

        // mint 100 more
        for(let i = 0; i < 100; i++) {
            await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);
        }

        // verify correct no. of mints
        let totalMints = await this.botz.getPublicMintCount();
        expect(totalMints === 103);

        // verify balance of contract == totalMints * 0.1
        balance = await provider.getBalance(this.botz.address);
        balance = ethers.utils.formatEther(balance);
        expect(balance === 10.3);
    });

    
    // it('Cant mint more than 4000', async function () {
    //     const oneToken = {value: ethers.utils.parseEther("0.1")}
    //     const twoToken = {value: ethers.utils.parseEther("0.2")}
    //     // We've minted 103 so far, so mint 3897 more
    //     await this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken);

    //     for(let i = 0; i < 1948; i++) {
    //         await this.botz.connect(this.accounts[5]).mintSchoolBotz(2, twoToken);
    //     }

    //     await expect(this.botz.balanceOf(this.accounts[5].address) === 4000);
    //     await expect(this.botz.getPublicMintCount() == 4000);
    //     await expect(this.botz.connect(this.accounts[5]).mintSchoolBotz(1, oneToken).to.be.revertedWith("Purchase would exceed max supply of SchoolBotz"));


    // }).timeout(1000000);
    

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
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipSaleState();
    });

    

    it('Only admin can change whitelist root', async function () {
        await expect(this.botz.connect(this.accounts[4]).setWhitelistRoot(keccak256("bad_hash"))).to.be.reverted;
        await this.botz.connect(this.accounts[2]).setWhitelistRoot(keccak256("good_hash"));
        await expect(this.botz.getWhitelistRoot() === keccak256("good_hash"));
    });
    

    it('Whitelist address can mint <= 2 tokens', async function () {
        const oneToken = {value: ethers.utils.parseEther("0.1")}

        const time = Math.floor(Date.now() / 1000);
        await this.botz.connect(this.accounts[1]).setWhitelistTS(time - 1000, time + 2000);
        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
        const leaf = keccak256(addresses[6])
        const proof = mt.getHexProof(leaf);

        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);

        await this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken);
        await expect(this.botz.getPublicMintCount() == 1);
        
        await this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken);
        await expect(this.botz.getPublicMintCount() == 2);
        
        await expect(this.botz.connect(this.accounts[6]).mintFromWhitelist(1, proof, oneToken)).to.be.revertedWith('Whitelist mint limit');


        
    });

    it('Valid amount of eth sent when minting from whitelist', async function () {
        const badOne = {value: ethers.utils.parseEther("0.09999")}
        const badTwo = {value: ethers.utils.parseEther("0.019999")}

        let addresses = Array();
        for(let i = 0; i < this.accounts.length; i++) {
            addresses.push(this.accounts[i].address);
        }

        const leaves = addresses.map(addr => keccak256(addr));
        const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
        const rootHash = mt.getHexRoot();
        const leaf = keccak256(addresses[7])
        const proof = mt.getHexProof(leaf);

        await this.botz.connect(this.accounts[1]).setWhitelistRoot(rootHash);
        
        await expect(this.botz.connect(this.accounts[7]).mintFromWhitelist(1, proof, badOne)).to.be.reverted;
        await expect(this.botz.connect(this.accounts[7]).mintFromWhitelist(2, proof, badTwo)).to.be.reverted;
        await expect(this.botz.balanceOf(this.accounts[7].address) === 0);

    });

    


    
});


describe('Withdraw Balances', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
        await this.botz.connect(this.accounts[1]).flipSaleState();
    });

    it('Only owner can withdraw', async function () {
        const twoToken = {value: ethers.utils.parseEther("0.2")}
        // Add some funds to the contract first
        for(let i = 0; i < 30; i++) {
            await this.botz.connect(this.accounts[10]).mintSchoolBotz(2, twoToken);
        }

        // Should be 6 eth in the contract now (30 iterations * 2 tokens * .1 eth)
        await expect(provider.getBalance(this.botz.address) == 6 * 10 ** 18);

        await expect(provider.getBalance(this.accounts[0].address) == 0);
        
        // No other accounts can call withdrawFunds()
        for(let i = 1; i <= 19; i++) {
            await expect(this.botz.connect(this.accounts[i]).withdrawFunds()).to.be.reverted;
        }

        // Owner withdraws funds
        await this.botz.connect(this.accounts[0]).withdrawFunds();

        // Owner account should now have 6 eth
        await expect(provider.getBalance(this.accounts[0].address) == 6 * 10 ** 18);



    });
    
});


describe('Access Control', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
        
    });




    
});




describe('', async function() {
    before('get factories', async function () {
        this.factory = await hre.ethers.getContractFactory('NikyBotzPictureDay')
        this.accounts = await hre.ethers.getSigners();
        this.botz = await this.factory.deploy('Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
                this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
        await this.botz.deployed();
    });
    
});

