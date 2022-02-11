const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

// Used to test MerkleProof library

let whitelist = [
    "0x00000000219ab540356cbb839cbe05303d7705fa",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf",
    "0x73bceb1cd57c711feac4224d062b0f6ff338501e",
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8",
    "0x9bf4001d307dfd62b26a2f1307ee0c0307632d59",
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
    "0x61edcdf5bb737adffe5043706e7c5bb1f1a56eea",
    "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
    "0x1b3cb81e51011b549d78bf720b0d924ac763a7c2"
];

const leaves = whitelist.map(addr => keccak256(addr));
const mt = new MerkleTree(leaves, keccak256, {sortPairs: true});
const rootHash = mt.getRoot();

console.log("Whitelist Merkle Tree\n", mt.toString());
let s = "b3da79c550c88dcedbcba332ec6fafc93150ae6d8f5d4d940a88df9391ae2920";
console.log(s.length)

