// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakingRewards is ERC721Holder, ReentrancyGuard {
    // Botz contract
    IERC20 public rewardsToken;
    // BCHS NFT contract
    IERC721 public stakingToken;

    uint public rewardRate = 100;
    uint public lastUpdateTime;
    uint public rewardPerTokenStored;

    mapping(address => uint) public userRewardPerTokenPaid;
    mapping(address => uint) public rewards;

    uint private _totalSupply;
    mapping(address => uint) private _balances;

    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC721(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    // Calculates current rewards given per token
    function rewardPerToken() public view returns (uint) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / _totalSupply);
    }

    // User checks how many Botz they've earned/accrued
    // also used to update rewards for a user (rewards[user])
    function earned(address account) public view returns (uint) {
        return
            ((_balances[account] *
                (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) +
            rewards[account];
    }

    // updates Reward per token
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    // params: tokens -> the erc721 token ids to be staked
    // commitments -> respective commitment options 
    function stake(int[] calldata tokens) external updateReward(msg.sender) {
        require(tokens.length > 0);

        // transfer tokens and update state
        for(uint i; i < tokens.length; i++) {
            require(stakingToken.ownerOf(tokens[i]) == msg.sender, "doesnt own token");

            _totalSupply += 1;
            _balances[msg.sender] += 1;
            stakingToken.safeTransferFrom(msg.sender, address(this), tokens[i]);
        }
        
    }

    // User removes stakes
    function withdraw(uint _amount) external updateReward(msg.sender) {
        _totalSupply -= _amount;
        _balances[msg.sender] -= _amount;
        stakingToken.transfer(msg.sender, _amount);
    }

    // Transfer funds to staker 
    function getReward() external updateReward(msg.sender) {
        uint reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        rewardsToken.transfer(msg.sender, reward);
    }

    function hasStakedTokens(address user) public view returns (bool) {
        require(address != (0));

        if (_balances[user] > 0) {
            return true;
        }

        return false;
    }
}
