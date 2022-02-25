// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

// import "./ERC721Tradable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @author Anthony Khoshrozeh and Studio Dev
/// @title The ERC721 Contract for Niky Botz Picture Day
contract NikyBotzPictureDay is ERC721, AccessControl, Ownable {
    uint256 private currPublicID = 1;

    uint256 private currReserveID = 5901;

    bytes32 public whitelistRoot = "";

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    bytes32 public constant SYSADMIN_ROLE = keccak256("SYSADMIN_ROLE");

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    string public provenanceHash = "";

    string private _customBaseURI = "";

    // getters? 
    // Must be true for any minting to possibly occur
    bool private _allMintOn = false;

    // Must be true and allMintOn must be true to mint publicly
    bool private _publicMintOn = false;

    // Must be true and allMintOn must be true to mint from whitelist
    bool private _whitelistMintOn = false;


    bool private _provenanceHashSet = false;
    
    mapping(address => uint8) private _hasMinted;

    event ProvenanceHashSet(string provHash);



    modifier allMintOn() {
        require(_allMintOn, "All minting off");
        _;
    }

    modifier publicMintOn() {
        require(_publicMintOn, "Public minting off");
        _;
    }

    modifier whitelistMintOn() {
        require(_whitelistMintOn, "Whitelist minting off");
        _;
    }

    /**
    @notice For public and whitelist mists, ensures mintee can only mint 1 or 2 tokens per txn
    */
    modifier validNumOfTokens(uint8 numTokens) {
        require(numTokens == 1 || numTokens == 2, "Invalid no. of tokens");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory customBaseURI,
        address multisig,
        address sysadmin
    ) ERC721(name, symbol) {
        _customBaseURI = customBaseURI;

        _setupRole(OWNER_ROLE, multisig);

        _setupRole(SYSADMIN_ROLE, multisig);
        _setupRole(SYSADMIN_ROLE, sysadmin);

        _setupRole(MANAGER_ROLE, multisig);
        _setupRole(MANAGER_ROLE, sysadmin);

        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(SYSADMIN_ROLE, SYSADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, SYSADMIN_ROLE);

        // We don't want the deployer to own the contract
        transferOwnership(multisig);
    }

    fallback() external payable {}

    receive() external payable {}

    /**
    @notice This function can only be set once. This is to ensure metadata integrity before any sales begin
    @dev This will be a hash of the concatenation of all images/metadata hashed sequentially
    */
    function setProvenanceHash(string memory provHash)
        external
        onlyRole(MANAGER_ROLE)
    {
        require(_provenanceHashSet == false, "Already set");
        provenanceHash = provHash;
        _provenanceHashSet = true;
        emit ProvenanceHashSet(provenanceHash);
    }

    /**
    @notice Sets the base URI for all tokens
    */
    function setBaseTokenURI(string memory newBaseURI)
        external
        onlyRole(MANAGER_ROLE)
    {
        _customBaseURI = newBaseURI;
    }

    /**
    @notice Sets the whitelist root
    @dev The _root should be the root (a keccack256 hash) of a merkle tree of all whitelist addresses
    */
    function setWhitelistRoot(bytes32 root) external onlyRole(MANAGER_ROLE) {
        whitelistRoot = root;
    }



    /**
    @notice Mints up to a max. of 100 tokens (by managers)
    @dev The token ids for these resevered are [5901, 6000]
    */
    function mintReserveSchoolBotz(uint256 numTokens, address mintToAddress)
        external
        allMintOn
        onlyRole(MANAGER_ROLE)
    {
        require(numTokens + currReserveID <= 6001, "Over reserve limit");

        uint256 currReserveIndex = currReserveID;
        for (uint256 i = 0; i < numTokens; i++) {
            _safeMint(mintToAddress, currReserveIndex);
            currReserveIndex = currReserveIndex + 1;
        }
        currReserveID = currReserveIndex;
    }

    /*
    @notice Mints up to 2 tokens if msg.sender is on whitelist, each cost 0.1 eth
    @dev See https://github.com/miguelmota/merkletreejs-solidity for how to construct 'proof' on client side
    @param proof This should be a merkle proof that verifies msg.sender is a part of the merkle root (whitelist root)
    */
    function mintFromWhitelist(uint8 numTokens, bytes32[] memory proof)
        external
        payable
        whitelistMintOn
        allMintOn
        validNumOfTokens(numTokens)
    {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(proof, getWhitelistRoot(), leaf) == true,
            "Invalid address"
        );
        require(
            0.1 ether * numTokens <= msg.value,
            "Invalid ether value sent."
        );
        require(
            _hasMinted[msg.sender] + numTokens <= 2,
            "Whitelist mint limit"
        );

        uint256 currIndex = currPublicID;
        for (uint256 i = 0; i < numTokens; i++) {
            if (currPublicID <= 5900) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;
        _hasMinted[msg.sender] += numTokens;
    }

    /**
    @notice Mints up to 2 tokens, each cost 0.1 eth
    */
    function mintSchoolBotz(uint8 numTokens)
        external
        payable
        publicMintOn
        allMintOn
        validNumOfTokens(numTokens)
    {
        require(numTokens + currPublicID <= 5901, "Over token limit.");
        require(0.1 ether * numTokens <= msg.value, "Invalid msg.value");

        uint256 currIndex = currPublicID;

        for (uint256 i = 0; i < numTokens; i++) {
            if (currPublicID <= 5900) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        currPublicID = currIndex;
    }

    /**
    @notice Only owner can withdraw funds from contract
    */
    function withdrawFunds() public onlyRole(OWNER_ROLE) {
        address payable wallet = payable(owner());

        (bool sent, ) = wallet.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }

    /**
    @return number of tokens minted from reserves
    */
    function getReserveMintCount() public view returns (uint256) {
        return currReserveID - 5901;
    }

    /**
    @return number of tokens minted from whitlist and public
    */
    function getPublicMintCount() public view returns (uint256) {
        return currPublicID - 1;
    }

    /**
    @return the whitelist root (merkle root)
    */
    function getWhitelistRoot() public view returns (bytes32) {
        return whitelistRoot;
    }

    /**
    @return the base URI for tokens
    */
    function baseTokenURI()
        public
        view
        returns (string memory)
    {
        return _customBaseURI;
    }

    /**
    @notice flips the sale state
    */
    // function flipSaleState() public onlyRole(MANAGER_ROLE) {
    //     _saleIsOn = !_saleIsOn;
    // }

    function flipAllMintState() public onlyRole(MANAGER_ROLE) {
        _allMintOn = !_allMintOn;
    }


    function flipPublicMintState() public onlyRole(MANAGER_ROLE) {
        _publicMintOn = !_publicMintOn;
    }


    function flipWhitelistMintState() public onlyRole(MANAGER_ROLE) {
        _whitelistMintOn = !_whitelistMintOn;
    }


    /**
    @dev Must be overriden
    */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
    @dev Must be overriden
    */
    // function _msgSender()
    //     internal
    //     view
    //     override(ERC721, Context)
    //     returns (address sender)
    // {
    //     return super._msgSender();
    // }
}
