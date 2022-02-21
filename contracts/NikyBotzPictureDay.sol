// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./ERC721Tradable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract NikyBotzPictureDay is ERC721Tradable, AccessControl {
    uint256 private currPublicID = 1;

    uint256 private currReserveID = 5901;

    // Use Unix Timestamp for exact time
    // * This is currently a placeholder (2/22/22 at 12:00:00 AM)
    uint256 public whitelistBeginTS = 1645747200;

    uint256 public whitelistEndTS = 1645747500;

    uint256 public revealTS = 1645747200;

    bytes32 public whitelistRoot = "";

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    bytes32 public constant SYSADMIN_ROLE = keccak256("SYSADMIN_ROLE");

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    string public provenanceHash = "";

    string private _customBaseURI = "";

    bool private _provenanceHashSet = false;

    // getter?
    bool private _saleIsOn = false;

    mapping(address => uint8) private hasMinted;

    event ProvenanceHashSet(string provHash);

    modifier presaleIsOpen() {
        require(
            block.timestamp >= whitelistBeginTS &&
                block.timestamp <= whitelistEndTS,
            "Presale Off"
        );
        _;
    }

    modifier saleOn() {
        require(_saleIsOn == true, "Sale off");
        _;
    }

    modifier validNumOfTokens(uint8 numTokens) {
        require(
            numTokens == 1 || numTokens == 2,
            "Invalid no. of tokens"
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address proxyRegAddress,
        string memory customBaseURI,
        address multisig,
        address sysadmin
    ) ERC721Tradable(name, symbol, proxyRegAddress) {
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

    // Can only be set once!
    function setProvenanceHash(string memory provHash)
        external
        onlyRole(MANAGER_ROLE)
    {
        require(_provenanceHashSet == false, "Already set");
        provenanceHash = provHash;
        _provenanceHashSet = true;
        emit ProvenanceHashSet(provenanceHash);
    }

    function flipSaleState() public onlyRole(MANAGER_ROLE) {
        _saleIsOn = !_saleIsOn;
    }

    function setBaseTokenURI(string memory newBaseURI)
        external
        onlyRole(MANAGER_ROLE)
    {
        _customBaseURI = newBaseURI;
    }

    function baseTokenURI()
        public
        view
        override(ERC721Tradable)
        returns (string memory)
    {
        return _customBaseURI;
    }

    function setWhitelistRoot(bytes32 _root) external onlyRole(MANAGER_ROLE) {
        whitelistRoot = _root;
    }

    // UNIX epoch time
    function setRevealTS(uint256 ts) external onlyRole(MANAGER_ROLE) {
        revealTS = ts;
    }

    function setWhitelistTS(uint256 tsBegin, uint256 tsEnd)
        external
        onlyRole(MANAGER_ROLE)
    {
        whitelistBeginTS = tsBegin;
        whitelistEndTS = tsEnd;
    }

    // reserver tokens [4000, 4100] for owner
    // add check for tokenid to start at 4001
    function mintReserveSchoolBotz(uint256 numTokens, address _mintTo)
        external
        saleOn
        onlyRole(MANAGER_ROLE)
    {
        require(numTokens + currReserveID <= 6001, "Over reserve limit");

        uint256 currReserveIndex = currReserveID;
        for (uint256 i = 0; i < numTokens; i++) {
            _safeMint(_mintTo, currReserveIndex);
            currReserveIndex = currReserveIndex + 1;
        }
        currReserveID = currReserveIndex;
    }

    function mintFromWhitelist(uint8 numTokens, bytes32[] memory proof)
        external
        payable
        saleOn
        presaleIsOpen
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
            hasMinted[msg.sender] + numTokens <= 2,
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
        hasMinted[msg.sender] += numTokens;
    }

    function mintSchoolBotz(uint8 numTokens)
        external
        payable
        saleOn
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

    function withdrawFunds() public onlyRole(OWNER_ROLE) {
        address payable wallet = payable(owner());

        (bool sent, ) = wallet.call{
            value: address(this).balance
        }("");
        require(sent, "Failed to send Ether");
    }

    function getReserveMintCount() public view returns (uint256) {
        return currReserveID - 5901;
    }

    function getPublicMintCount() public view returns (uint256) {
        return currPublicID - 1;
    }

    function getWhitelistRoot() public view returns (bytes32) {
        return whitelistRoot;
    }

    // Overriding functions
    function _msgSender()
        internal
        view
        override(ERC721Tradable, Context)
        returns (address sender)
    {
        return super._msgSender();
    }

    // override function from ERC721.sol and AccessControl.sol
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
