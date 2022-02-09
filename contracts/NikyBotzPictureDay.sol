pragma solidity 0.8.10;

import "./ERC721Tradable.sol"; 
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract NikyBotzPictureDay is ERC721Tradable  {

    
    uint256 public constant SCHOOLBOTZ_PRICE = 0.1 ether; 

    uint256 public constant MAX_PUBLIC_SCHOOLBOTZ = 4000;

    uint256 public constant MAX_RESERVED_SCHOOLBOTZ = 100;

    uint256 public constant MAX_SCHOOLBOTZ = MAX_RESERVED_SCHOOLBOTZ + MAX_PUBLIC_SCHOOLBOTZ;

    // uint256 private MAX_OWNER_MINTS = 100;


    uint256 private currPublicID = 1;

    uint256 private currReserveID = 4001;

    // Use Unix Timestamp for exact time
    // * This is currently a placeholder (2/22/22 at 12:00:00 AM)
    uint256 public constant PUBLIC_SALE_TIMESTAMP = 1645747200;

    uint256 public constant WHITELIST_SALE_TIMESTAMP_BEGIN = 1645747200;

    uint256 public constant WHITELIST_SALE_TIMESTAMP_END = 1645747200;

    uint256 public constant maxSchoolBoyzPurchase = 100;

    bool private provenanceHashSet = false;

    string public provenanceHash = "";

    string private _customBaseURI;

    bytes32 whitelistRoot = "";


    // Counters.Counter private _tokenIds;

    // modifier publicSaleOn // this checks if sale has started & there any tokens left available to mint for the public
    // 

    // Event that let's public know when provenance hash was set; added trust
    event ProvenanceHashSet(string provHash);

    constructor(string memory name, string memory symbol, address proxyRegAddress, string memory customBaseURI) 
    ERC721Tradable(name, symbol, proxyRegAddress) {
        _customBaseURI = customBaseURI;
    }

    modifier presaleIsOpen {
        require(block.timestamp >= WHITELIST_SALE_TIMESTAMP_BEGIN && block.timestamp <= WHITELIST_SALE_TIMESTAMP_END, "Whitelist hasn't begun or has ended.");
        _;
    }

    modifier validNumOfTokens(uint8 numberOfTokens) {
        require(numberOfTokens == 1 || numberOfTokens == 2, "Can only mint 1 or 2 tokens during whitelist exclusive pre-sale.");
        _;
    }

    // should also check that there are tokens left to mint
    modifier publicSaleIsOpen {
        require(block.timestamp >= PUBLIC_SALE_TIMESTAMP, "Cannot mint until after public sale begins.");
        _;
    }
    
    // set timestamp check before mint
    function setProvenanceHash(string memory provHash) external onlyOwner {
        require(provenanceHashSet == false);
        provenanceHash = provHash;
        provenanceHashSet = true;
    }

    function setBaseTokenURI(string memory newBaseURI) external onlyOwner {
        _customBaseURI = newBaseURI;
    }

    function baseTokenURI() public view override (ERC721Tradable) returns (string memory) {
        return _customBaseURI;
    }

    function setWhitelistRoot(bytes32 _root) external view onlyOwner {
        whitelistRoot = _root;
    }

    


    // reserver tokens [4000, 4100] for owner
    // add check for tokenid to start at 4001
    function mintReserveSchoolBotz(uint256 numberOfTokens, address _mintTo) external onlyOwner {
        require(currReserveID <= 4100, "All reserve tokens have been minted.");
        require(numberOfTokens + currReserveID <= 4101, "You don't have enough reserved tokens left to mint this many.");

        uint256 currReserveIndex = currReserveID;
        for(uint i = 0; i < numberOfTokens; i++) {
            _safeMint(_mintTo, currReserveIndex);
            currReserveIndex = currReserveIndex + 1;
        }
        currReserveID = currReserveIndex;
    }

   

    
    function mintFromWhitelist(uint numberOfTokens, bytes32[] memory proof) external payable presaleIsOpen validNumOfTokens(numberOfTokens) {
        require(MerkleProof.verify(proof, getWhitelistRoot(), msg.sender) == true, "Address cannot be proved to be a part of whitelist.");
        require(SCHOOLBOTZ_PRICE * numberOfTokens >= msg.value, "Invalid ether value sent."); 

        uint256 currIndex = currPublicID;
        for(uint i = 0; i < numberOfTokens; i++) {
            if (currPublicID <= MAX_PUBLIC_SCHOOLBOTZ) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;
    }

    function mintSchoolBotz(uint numberOfTokens) external payable validNumOfTokens(numberOfTokens) publicSaleIsOpen {
        require(numberOfTokens + currPublicID <= MAX_PUBLIC_SCHOOLBOTZ + 1, "Purchase would exceed max supply of SchoolBotz");
        require(SCHOOLBOTZ_PRICE * numberOfTokens >= msg.value, "Invalid ether value sent."); 

        uint256 currIndex = currPublicID;
        
        for(uint i = 0; i < numberOfTokens; i++) {
            if (currPublicID <= MAX_PUBLIC_SCHOOLBOTZ) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;

    }



    // * GETTERS

     // returns have reserve tokens have been minted
    function getReserveMintCount() public view returns (uint256) {
        return currReserveID - 4001;
    }

    function getPublicMintCount() public view returns (uint256) {
        return currPublicID - 1;
    }

    function getWhitelistRoot() external view returns(bytes32) {
        return whitelistRoot;
    }
}