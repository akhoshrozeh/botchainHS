// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./ERC721Tradable.sol"; 
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract NikyBotzPictureDay is ERC721Tradable, AccessControl {

    uint256 private currPublicID = 1;

    uint256 private currReserveID = 4001;

    // Use Unix Timestamp for exact time
    // * This is currently a placeholder (2/22/22 at 12:00:00 AM)
    uint256 public  PUBLIC_SALE_TIMESTAMP = 1645747200;

    uint256 public WHITELIST_SALE_TIMESTAMP_BEGIN = 1645747200;

    uint256 public WHITELIST_SALE_TIMESTAMP_END = 1645747500;

    uint256 public REVEAL_TIMESTAMP = 1645747200;

    uint256 public constant maxSchoolBoyzPurchase = 100;

    bytes32 whitelistRoot = "";

    // Admins can do everything but withdraw
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");   // can do all other admin actions

    // Owner can withdraw. Owner is also an Admin.
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");   // can withdraw money from contract

    string public provenanceHash = "";

    string private _customBaseURI = "";

    bool private _provenanceHashSet = false;

    bool private _saleIsOn = false;

    mapping (address => bool) whitelistClaimed;

    event ProvenanceHashSet(string provHash);


    constructor(
        string memory name, 
        string memory symbol, 
        address proxyRegAddress, 
        string memory customBaseURI,
        address admin1, 
        address admin2, 
        address admin3
        ) ERC721Tradable(name, symbol, proxyRegAddress) {
        _customBaseURI = customBaseURI;
        _setupRole(ADMIN_ROLE, admin1);
        _setupRole(ADMIN_ROLE, admin2);
        _setupRole(ADMIN_ROLE, admin3);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(OWNER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier presaleIsOpen {
        require(block.timestamp >= WHITELIST_SALE_TIMESTAMP_BEGIN && block.timestamp <= WHITELIST_SALE_TIMESTAMP_END, "Whitelist hasn't begun or has ended.");
        _;
    }

    modifier saleOn {
        require(_saleIsOn == true, "Sale off");
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
    



    // Can only be set once!
    function setProvenanceHash(string memory provHash) external onlyRole(ADMIN_ROLE) {
        require(_provenanceHashSet == false, "Already set");
        provenanceHash = provHash;
        _provenanceHashSet = true;
    }

    function flipSaleState() public onlyRole(ADMIN_ROLE) {
        _saleIsOn = !_saleIsOn;
    }

    function setBaseTokenURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _customBaseURI = newBaseURI;
    }

    function baseTokenURI() public view override (ERC721Tradable) returns (string memory) {
        return _customBaseURI;
    }

    function setWhitelistRoot(bytes32 _root) external onlyRole(ADMIN_ROLE) {
        whitelistRoot = _root;
    }

    function setWhitelist(address _address) external onlyRole(ADMIN_ROLE) {
        whitelistClaimed[_address] = false;
    }

    // UNIX epoch time 
    function setRevealTS(uint256 ts) external onlyRole(ADMIN_ROLE) {
        REVEAL_TIMESTAMP = ts;
    }
    function setWhitelistTS(uint256 tsBegin, uint256 tsEnd) external onlyRole(ADMIN_ROLE) {
        WHITELIST_SALE_TIMESTAMP_BEGIN = tsBegin;
        WHITELIST_SALE_TIMESTAMP_END = tsEnd;
    }
    function setPublicSaleTS(uint256 ts) external onlyRole(ADMIN_ROLE) {
        PUBLIC_SALE_TIMESTAMP = ts;
    }
    


    // reserver tokens [4000, 4100] for owner
    // add check for tokenid to start at 4001
    function mintReserveSchoolBotz(uint256 numberOfTokens, address _mintTo) external onlyRole(ADMIN_ROLE) {
        require(currReserveID <= 4100, "All reserve tokens have been minted.");
        require(numberOfTokens + currReserveID <= 4101, "You don't have enough reserved tokens left to mint this many.");

        uint256 currReserveIndex = currReserveID;
        for(uint i = 0; i < numberOfTokens; i++) {
            _safeMint(_mintTo, currReserveIndex);
            currReserveIndex = currReserveIndex + 1;
        }
        currReserveID = currReserveIndex;
    }

   

    // proof should be 'calldata' and not memory ? need to research this.
    function mintFromWhitelist(uint8 numberOfTokens, bytes32[] memory proof) external payable presaleIsOpen saleOn validNumOfTokens(numberOfTokens) {
        require(whitelistClaimed[msg.sender] == false, "Whitelisted address has already claimed tokens");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, getWhitelistRoot(), leaf) == true, "Address cannot be proved to be a part of whitelist.");
        require(0.1 ether * numberOfTokens >= msg.value, "Invalid ether value sent."); 

        uint256 currIndex = currPublicID;
        for(uint i = 0; i < numberOfTokens; i++) {
            if (currPublicID <= 4000) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;
        whitelistClaimed[msg.sender] = true;
    }

    function mintSchoolBotz(uint8 numberOfTokens) external payable saleOn validNumOfTokens(numberOfTokens) publicSaleIsOpen {
        require(numberOfTokens + currPublicID <= 4000 + 1, "Purchase would exceed max supply of SchoolBotz");
        require(0.1 ether * numberOfTokens >= msg.value, "Invalid ether value sent."); 

        uint256 currIndex = currPublicID;
        
        for(uint i = 0; i < numberOfTokens; i++) {
            if (currPublicID <= 4000) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;

    }

    // address.transfer i dont think is the best way to transfer funds anymore... need to check if it needs to be updated
     function transferBalanceToOwner() onlyRole(OWNER_ROLE) public {
        address payable wallet = payable(owner()); 
        wallet.transfer(address(this).balance); 
    }



    // * GETTERS

     // returns have reserve tokens have been minted
    function getReserveMintCount() public view returns (uint256) {
        return currReserveID - 4001;
    }

    function getPublicMintCount() public view returns (uint256) {
        return currPublicID - 1;
    }

    function getWhitelistRoot() public view returns(bytes32) {
        return whitelistRoot;
    }

    // Overriding functions 
    function _msgSender() internal override(ERC721Tradable, Context) view returns (address sender)
    {
        return super._msgSender();
    }

    // override function from ERC721.sol and AccessControl.sol
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}