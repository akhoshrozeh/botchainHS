// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title The ERC721 Contract for Niky Botz Picture Day
contract EchidnaNikyBotzPictureDay is ERC721, AccessControl, Ownable {
    uint256 public _currPublicID = 1;

    uint256 public _currReserveID = 5901;

    bytes32 public whitelistRoot = "";

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    bytes32 public constant SYSADMIN_ROLE = keccak256("SYSADMIN_ROLE");

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    string public provenanceHash = "";

    string public _customBaseURI = "";

    // Must be true for any minting to possibly occur
    bool public _allMintOn = false;

    // Must be true and allMintOn must be true to mint publicly
    bool public _publicMintOn = false;

    // Must be true and allMintOn must be true to mint from whitelist
    bool public _whitelistMintOn = false;

    bool public _provenanceHashSet = false;

    bool public _1500Locked = false;

    bool public _3000Locked = false;

    bool public _4500Locked = false;

    bool public _5900Locked = false;

    mapping(address => uint8) public _hasMinted;

    event ProvenanceHashSet(string provHash);

    event WhitelistRootUpdated(bytes32 root);

    event AllMintOnStateFlipped(bool state);

    event PublicMintOnStateFlipped(bool state);

    event WhitelistMintOnStateFlipped(bool state);

    event AutoLock(uint256 minted);

    // S
    // so first we need to check if numTokens will go over S
    modifier checkAutoLocks(uint256 numTokens) {
        uint256 currMinted = _currPublicID - 1;

        // If this goes over the lock limit and it has been locked yet
        if (
            (_1500Locked == false && currMinted + numTokens > 1500) ||
            (_3000Locked == false && currMinted + numTokens > 3000) ||
            (_4500Locked == false && currMinted + numTokens > 4500) ||
            (_5900Locked == false && currMinted + numTokens > 5900)
        ) {
            revert("over lock limit");
        }

        // minting is stopped after this mint (modifier is after sale check)
        if (_1500Locked == false && currMinted + numTokens == 1500) {
            _1500Locked = true;
            _publicMintOn = false;
            _whitelistMintOn = false;
            emit AutoLock(1500);
        }

        if (_3000Locked == false && currMinted + numTokens == 3000) {
            _3000Locked = true;
            _publicMintOn = false;
            _whitelistMintOn = false;
            emit AutoLock(3000);
        }

        if (_4500Locked == false && currMinted + numTokens == 4500) {
            _4500Locked = true;
            _publicMintOn = false;
            _whitelistMintOn = false;
            emit AutoLock(4500);
        }

        if (_5900Locked == false && currMinted + numTokens == 5900) {
            _5900Locked = true;
            _publicMintOn = false;
            _whitelistMintOn = false;
            emit AutoLock(5900);
        }

        _;
    }

    /**
    @notice Used for all 3 minting functions
    */
    modifier allMintOn() {
        require(_allMintOn, "All minting off");
        _;
    }

    /**
    @notice Used for 'mintSchoolBotz' function
    */
    modifier publicMintOn() {
        require(_publicMintOn, "Public minting off");
        _;
    }

    /**
    @notice Used for 'mintFromWhitelist' function
    */
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
        emit WhitelistRootUpdated(whitelistRoot);
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
        require(numTokens + _currReserveID <= 6001, "Over reserve limit");

        uint256 currReserveIndex = _currReserveID;
        for (uint256 i = 0; i < numTokens; i++) {
            _safeMint(mintToAddress, currReserveIndex);
            currReserveIndex = currReserveIndex + 1;
        }
        _currReserveID = currReserveIndex;
    }

    /*
    @notice Mints up to 2 tokens if msg.sender is on whitelist, each cost 0.1 eth
    @dev See https://github.com/miguelmota/merkletreejs-solidity for how to construct 'proof' on client side
    @param proof This should be a merkle proof that verifies msg.sender is a part of the merkle root (whitelist root)
    */
    function mintFromWhitelist(uint8 numTokens, bytes32[] calldata proof)
        external
        payable
        whitelistMintOn
        allMintOn
        validNumOfTokens(numTokens)
        checkAutoLocks(numTokens)
    {
        require(numTokens + _currPublicID <= 5901, "Over token limit.");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(proof, getWhitelistRoot(), leaf) == true,
            "Invalid address"
        );
        require(
            0.08 ether * numTokens <= msg.value,
            "Invalid ether value sent."
        );
        require(
            _hasMinted[msg.sender] + numTokens <= 2,
            "Whitelist mint limit"
        );

        uint256 currIndex = _currPublicID;
        for (uint256 i = 0; i < numTokens; i++) {
            if (currIndex <= 5900) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        _currPublicID = currIndex;
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
        checkAutoLocks(numTokens)
    {
        // move the memory variable up here; reduces a read
        require(numTokens + _currPublicID <= 5901, "Over token limit.");
        require(0.1 ether * numTokens <= msg.value, "Invalid msg.value");

        uint256 currIndex = _currPublicID;

        for (uint256 i = 0; i < numTokens; i++) {
            if (currIndex <= 5900) {
                _safeMint(msg.sender, currIndex);
                currIndex = currIndex + 1;
            }
        }

        _currPublicID = currIndex;
    }

    /**
    @notice Only owner can withdraw funds from contract
    */
    function withdrawFunds() public onlyRole(OWNER_ROLE) onlyOwner {
        address payable wallet = payable(owner());

        (bool sent, ) = wallet.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }

    /**
    @return number of tokens minted from reserves
    */
    function getReserveMintCount() public view returns (uint256) {
        return _currReserveID - 5901;
    }

    /**
    @return number of tokens minted from whitlist and public
    */
    function getPublicMintCount() public view returns (uint256) {
        return _currPublicID - 1;
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
    function baseTokenURI() public view returns (string memory) {
        return _customBaseURI;
    }

    /**
    @return the TokenURI given the tokenId
    */
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(baseTokenURI(), Strings.toString(_tokenId))
            );
    }

    /**
    @notice Flips the _allMintOn state
    */
    function flipAllMintState() public onlyRole(MANAGER_ROLE) {
        _allMintOn = !_allMintOn;
        emit AllMintOnStateFlipped(_allMintOn);
    }

    /**
    @notice Flips the _publicMintOn state
    */
    function flipPublicMintState() public onlyRole(MANAGER_ROLE) {
        _publicMintOn = !_publicMintOn;
        emit PublicMintOnStateFlipped(_publicMintOn);
    }

    /**
    @notice Flips the _whitelistMintOn state
    */
    function flipWhitelistMintState() public onlyRole(MANAGER_ROLE) {
        _whitelistMintOn = !_whitelistMintOn;
        emit WhitelistMintOnStateFlipped(_whitelistMintOn);
    }

    /**
    @return the 3 minting states
    */
    function getMintState()
        public
        view
        returns (
            bool,
            bool,
            bool
        )
    {
        return (_allMintOn, _publicMintOn, _whitelistMintOn);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
