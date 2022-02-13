const hre = require("hardhat");
const assert = require("assert");
require('hardhat-contract-sizer');
const { ethers } = require("hardhat");

before('get factories', async function () {
    this.b1 = await hre.ethers.getContractFactory('NikyBotzPictureDay')
});

it('goes to mars', async function () {
    const botz = await hre.upgrades.deployProxy(this.b1, ['Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
    '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28', '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28', '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28'], {kind: 'uups'});
    // console.log(await botz.name());
    assert(await botz.name() == 'Botz');
});


// 'Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
//         '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28', '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28', '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28'