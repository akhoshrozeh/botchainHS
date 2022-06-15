// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Botz is ERC20, Ownable {

    // Cap is 950,000,000 
    uint constant private _cap = 950000000 * (1 ether);

    // testnet has 9500
    // uint constant private _cap = 9500 * (1 ether);
    // uint private immutable _cap;

    constructor()
    ERC20("BotzCoins", "BOTZ")
    {
    }

    mapping (address => bool) private _authorized;

    modifier onlyAuthorized(address caller) {
        require(_authorized[caller], "not authorized");
        _;
    }

    function authorize(address a) public onlyOwner {
        _authorized[a] = true;
    }

    function unauthorize(address a) public onlyOwner {
        _authorized[a] = false;
    }

    function isAuthorized(address a) public view returns (bool) {
        return _authorized[a];
    }

    // keep track how much staking has minted here
    // only the staking contract should be able to call this
    // mint min(amount, _cap - totalSupply)
    function mint(address account, uint amount) public onlyAuthorized(msg.sender) {
        // require(ERC20.totalSupply() + amount <= cap(), "cap exceeded");
        uint totSupply = ERC20.totalSupply();
        require(amount > 0, "cant mint 0");
        require(totSupply < _cap, "total supply minted");
        
        // not enough to mint 'amount' but still some tokens can be minted
        // THIS BLOCK SHOULD BE RAN ONLY ONCE EVER
        if (totSupply + amount > _cap) {
            // ! safe math in earlier verison
            uint maxAmount = _cap - totSupply;
            assert(maxAmount <= amount);
            _mint(account, maxAmount);
            assert(ERC20.totalSupply() == _cap);
        }

        else {
            _mint(account, amount);
            assert(ERC20.totalSupply() <= _cap);
        }
    }

    function cap() public view returns (uint) {
        return _cap;
    }

}


