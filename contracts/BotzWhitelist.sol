// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

// this contract will have msg.sender be the gnosis safe account
contract BotzWhitelist is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    mapping (address => bool) private whitelistClaimed;

    bytes32 whitelistRoot;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    function initialize(address admin1, address admin2, address admin3) public initializer {
        _setupRole(ADMIN_ROLE, admin1);
        _setupRole(ADMIN_ROLE, admin2);
        _setupRole(ADMIN_ROLE, admin3);
        _setupRole(OWNER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    function setWhitelistRoot(bytes32 _root) external onlyRole(ADMIN_ROLE) {
        whitelistRoot = _root;
    }

    function setWhitelist(address _address) external onlyRole(ADMIN_ROLE) {
        whitelistClaimed[_address] = false;
    }

    function getWhitelistRoot() public view returns(bytes32) {
        return whitelistRoot;
    }

    function checkClaimed(address _sender) public view returns (bool) {
        return whitelistClaimed[_sender];
    }

    function updateWhilelist(address _sender, bool _val) external onlyRole(ADMIN_ROLE) {
        whitelistClaimed[_sender] = _val;
    }
}