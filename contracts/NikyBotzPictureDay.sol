// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./ERC721TradableUpgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";



contract NikyBotzPictureDay is ERC721TradableUpgradeable, OwnableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {

    // IMPORTANT: Always add new variables at the bottom of the last declared variable to avoid storage collisions
    uint256 public constant SCHOOLBOTZ_PRICE = 0.1 ether; 

    uint256 public constant MAX_PUBLIC_SCHOOLBOTZ = 4000;

    // Use Unix Timestamp for exact time
    // * This is currently a placeholder (2/22/22 at 12:00:00 AM)
    uint256 public constant PUBLIC_SALE_TIMESTAMP = 1645747200;

    uint256 public constant WHITELIST_SALE_TIMESTAMP_BEGIN = 1645747200;

    uint256 public constant WHITELIST_SALE_TIMESTAMP_END = 1645747200;

    uint256 public constant maxSchoolBoyzPurchase = 100;

    bytes32 whitelistRoot;

    uint256 private currPublicID;

    uint256 private currReserveID;

    // bool private provenanceHashSet;

    // string public provenanceHash;

    string private _customBaseURI;

    mapping (address => bool) whitelistClaimed;

    // Access Control Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");   // can do all other admin actions
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");   // can withdraw money from contract



    // modifier publicSaleOn // this checks if sale has started & there any tokens left available to mint for the public
    // 

    // Event that let's public know when provenance hash was set; added trust
    event ProvenanceHashSet(string provHash);
 
    function initialize(string memory _name, 
                        string memory _symbol, 
                        address proxyRegAddress, 
                        string memory customBaseURI,
                        address admin1, address admin2, address admin3) 
                        public initializer 
    {
        __ERC721_init(_name, _symbol, proxyRegAddress);
        _customBaseURI = customBaseURI;
        _setupRole(ADMIN_ROLE, admin1);
        _setupRole(ADMIN_ROLE, admin2);
        _setupRole(ADMIN_ROLE, admin3);
        _setupRole(OWNER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // global varibles
        currPublicID = 1;
        currReserveID = 4001;
        // provenanceHashSet = false;
        // provenanceHash = "";
        whitelistRoot = "";
                        
    }


    modifier presaleIsOpen {
        require(block.timestamp >= WHITELIST_SALE_TIMESTAMP_BEGIN && block.timestamp <= WHITELIST_SALE_TIMESTAMP_END, "Not open");
        _;
    }

    modifier validNumOfTokens(uint8 numberOfTokens) {
        require(numberOfTokens == 1 || numberOfTokens == 2, "presale token limit");
        _;
    }

    // should also check that there are tokens left to mint
    modifier publicSaleIsOpen {
        require(block.timestamp >= PUBLIC_SALE_TIMESTAMP, "Not open");
        _;
    }
    
    // set timestamp check before mint
    // function setProvenanceHash(string memory provHash) external onlyRole(ADMIN_ROLE) {
    //     require(provenanceHashSet == false);
    //     provenanceHash = provHash;
    //     provenanceHashSet = true;
    // }

    function setBaseTokenURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _customBaseURI = newBaseURI;
    }

    function baseTokenURI() public view override (ERC721TradableUpgradeable) returns (string memory) {
        return _customBaseURI;
    }

    function setWhitelistRoot(bytes32 _root) external onlyRole(ADMIN_ROLE) {
        whitelistRoot = _root;
    }

    function setWhitelist(address _address) external onlyRole(ADMIN_ROLE) {
        whitelistClaimed[_address] = false;
    }

    


    // reserver tokens [4000, 4100] for owner
    // add check for tokenid to start at 4001
    function mintReserveSchoolBotz(uint256 numberOfTokens, address _mintTo) external onlyRole(ADMIN_ROLE) {
        require(currReserveID <= 4100, "All minted");
        require(numberOfTokens + currReserveID <= 4101, "Token limit");

        uint256 currReserveIndex = currReserveID;
        for(uint i = 0; i < numberOfTokens; i++) {
            _safeMint(_mintTo, currReserveIndex);
            currReserveIndex = currReserveIndex + 1;
        }
        currReserveID = currReserveIndex;
    }

   

    // proof should be 'calldata' and not memory ? need to research this.
    function mintFromWhitelist(uint8 numberOfTokens, bytes32[] memory proof) external payable presaleIsOpen validNumOfTokens(numberOfTokens) {
        require(SCHOOLBOTZ_PRICE * numberOfTokens >= msg.value, "Bad value"); 
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, getWhitelistRoot(), leaf) == true, "Bad address");
        require(whitelistClaimed[msg.sender] == false, "Already claimed");

        uint256 currIndex = currPublicID;
        for(uint i = 0; i < numberOfTokens; i++) {
            if (currPublicID <= MAX_PUBLIC_SCHOOLBOTZ) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;
        whitelistClaimed[msg.sender] = true;
    }

    function mintSchoolBotz(uint8 numberOfTokens) external payable validNumOfTokens(numberOfTokens) publicSaleIsOpen {
        require(numberOfTokens + currPublicID <= MAX_PUBLIC_SCHOOLBOTZ + 1, ">Token limit");
        require(SCHOOLBOTZ_PRICE * numberOfTokens >= msg.value, "Bad value"); 

        uint256 currIndex = currPublicID;
        
        for(uint i = 0; i < numberOfTokens; i++) {
            if (currPublicID <= MAX_PUBLIC_SCHOOLBOTZ) {
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

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}



    // * GETTERS

     // returns have reserve tokens have been minted
    // function getReserveMintCount() public view returns (uint256) {
    //     return currReserveID - 4001;
    // }

    // function getPublicMintCount() public view returns (uint256) {
    //     return currPublicID - 1;
    // }

    function getWhitelistRoot() public view returns(bytes32) {
        return whitelistRoot;
    }

    // Overriding functions 
    function _msgSender() internal override(ContextUpgradeable) view returns (address sender) {
        return super._msgSender();
    }

    // override function from ERC721.sol and AccessControl.sol
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721TradableUpgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _msgData() internal view override(ContextUpgradeable) returns (bytes calldata) {
        return super._msgData();
    }

}