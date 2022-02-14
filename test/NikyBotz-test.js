require('hardhat-contract-sizer');
const hre = require("hardhat");
const assert = require("assert");
const { expect } = require("chai");
const { ethers } = require("hardhat");

before('get factories', async function () {
    this.v1 = await hre.ethers.getContractFactory('NikyBotzPictureDay')
    // this.v2 = await hre.ethers.getContractFactory('NikyBotzPictureDayV2')

});

describe('Upgradability', async function() {
    it('deploys proxy', async function () {
        const botz = await hre.upgrades.deployProxy(this.b, ['Botz', 'BTZ', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0', 'ipfs',
        '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28', '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28', '0x5B7E00c8eDC439aA66F38b8d40BFc8f87d0a2D28'], {kind: 'uups'});
        assert(await botz.name() == 'Botz');
    });
});


describe('Initial State', async function() {

});


describe('Whitelist Minting', async function() {

});


describe('Reserve Minting', async function() {

});


describe('Public Minting', async function() {

});


describe('Transfer of Tokens', async function() {

});


describe('Provenance Hash', async function() {

});


describe('Whitelist Root', async function() {

});


describe('Transfer Balances', async function() {

});


describe('Access Control', async function() {

});



describe('', async function() {

});