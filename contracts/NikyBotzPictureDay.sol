pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";  
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";  
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract NikyBotzPictureDay is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable  {

    string public NBPC_PROVENANCE = "";

    uint256 public constant SCHOOLBOTZ_PRICE = 0.1 ether; 

    uint256 public constant MAX_SCHOOLBOTZ = 4100;

    // uint256 public REVEAL_TIMESTAMP;

    uint256 public constant MAX_OWNER_MINTS = 100;

    uint256 private ownerMintCount = 0;

    // Use Unix Timestamp for exact time
    // * This is currently a placeholder (2/22/22 at 12:00:00 AM)
    uint256 public constant PUBLIC_SALE_TIMESTAMP = 1645747200;

    uint256 public constant WHITELIST_SALE_TIMESTAMP_BEGIN = 1645747200;

    uint256 public constant WHITELIST_SALE_TIMESTAMP_END = 1645747200;

    uint256 public constant maxSchoolBoyzPurchase = 100;

    string private _customBaseURI;

    // Counters.Counter private _tokenIds;


    // Event that let's public know when provenance hash was set; added trust
    event ProvenanceHashSet(string provHash);

    constructor(string memory name, string memory symbol, string memory customBaseURI, uint256 saleStart) 
    ERC721(name, symbol) {
        _customBaseURI = customBaseURI;
    }
    
    // Set when all tokens have been minted
    function setProvenanceHash(string memory provenanceHash) public onlyOwner {
        NBPC_PROVENANCE = provenanceHash;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _customBaseURI = newBaseURI;
    }

    // Overriding function to return correct baseURI for the collection
     function _baseURI() internal view virtual override returns (string memory) {
        // Change to this to the actual baseURI later
        return _customBaseURI;
    }

    // Question: Should numberOfTokens <= 2?
    // Question: Should the public mint function be halted when owner still has mints left and (100 - ownerMintCount) + totalSupply() == 4100?
    function ownerMintSchoolBotz(uint256 numberOfTokens) external onlyOwner {
        require(numberOfTokens +ownerMintCount <= MAX_OWNER_MINTS, "Owner can only save up to 100 tokens");

        uint supply = totalSupply();
        for(uint i = 0; i < numberOfTokens; i++) {
            _safeMint(msg.sender, supply + i);
            ownerMintCount += 1;
        }
    }

    function getOwnerMintCount() public view returns (uint256) {
        return ownerMintCount;
    }

    
    function mintFromWhitelist(uint numberOfTokens, bytes32[] memory proof, bytes32 root, bytes32 leaf) external payable {
        require(numberOfTokens == 1 || numberOfTokens == 2, "Can only mint 1 or 2 tokens during whitelist exclusive pre-sale.");
        require(MerkleProof.verify(proof, root, leaf) == true, "Address cannot be proved to be a part of whitelist.");
        require(block.timestamp >= WHITELIST_SALE_TIMESTAMP_BEGIN && block.timestamp <= WHITELIST_SALE_TIMESTAMP_END, "Whitelist hasn't begun or has ended.");

    }

    // Note: Need to check if _safeMint should be overriden to make sure others cannot bypass
    //      these checks to mint a token
    function mintSchoolBotz(uint numberOfTokens) external payable {
        require(block.timestamp >= PUBLIC_SALE_TIMESTAMP, "Cannot mint until after public sale begins.");
        require(numberOfTokens == 1 || numberOfTokens == 2, "Can only mint 1 or 2 tokens at a time");
        require(totalSupply() + numberOfTokens <= MAX_SCHOOLBOTZ, "Purchase would exceed max supply of SchoolBotz");
        require(msg.value / (10 ** 18) >= numberOfTokens * SCHOOLBOTZ_PRICE);
        // uint256 tokenId = current(_tokenIds);
        // increment(_tokenIds);
        
        for(uint i = 0; i < numberOfTokens; i++) {
            uint mintIndex = totalSupply();
            if (totalSupply() < MAX_SCHOOLBOTZ) {
                _safeMint(msg.sender, mintIndex);
                _setTokenURI(mintIndex, "google.com/");
            }
        }

    }






    // ! OVERRIDES
    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}