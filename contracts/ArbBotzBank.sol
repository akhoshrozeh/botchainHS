// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IArbToken";

contract ArbBotzBank is ERC20, Ownable, IArbToken {

    address public l1Address;
    constructor()
    ERC20("BOTZ20NAME", "BOTZ20SYM")
    {
        authorized[msg.sender] = true;
    }

    mapping (address => bool) authorized;

    modifier onlyAuthorized(address caller) {
        require(authorized[caller], "not authorized");
        _;
    }

    function authorize(address a) public onlyOwner {
        authorized[a] = true;
    }

    function unauthorize(address a) public onlyOwner {
        authorized[a] = false;
    }

    // only the staking contract should be able to call this
    function mint(address account, uint amount) public onlyAuthorized(msg.sender) {
        _mint(account, amount);
    }

}


