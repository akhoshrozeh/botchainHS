// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Botz.sol";

contract StakingRewards is Ownable, ERC721Holder, ReentrancyGuard  {

    // Botz contract
    Botz public rewardsToken;
    // BCHS NFT contract
    IERC721 public stakingToken;

    struct Stake {
        address tokenOwner;
        uint tokenID;
        uint tokenRarity;
        uint tokenCommitment;
        uint stakeBeginTS;
        uint commitmentOverTS;
        bool commitmentCollected;
    }

    // the base rate
    uint private _rewardRate = 100;
    uint private _lastUpdateTime;
    
    // totalSum of (1 / _totalWeight) from t=0 to t=block.timestamp
    uint private _rewardPerWeightStored;

    // total number of NFTs staked
    uint private _totalSupply;

    // for i in totalSupply: totalWeight += token[i] * rarity[i]
    uint private _totalWeight; 

    // merkle root to verify rarities for NFTs
    bytes32 private _raritiesMerkleRoot;


    mapping(address => uint) private _userRewardPerWeightPaid;
    mapping(address => uint) private _rewards;
    mapping (uint => Stake) private _tokenToStake;

    mapping(address => uint) private _balances;

    // for i in balances[user]: userWeight += rarity[i] // say 5 is most rare with values [1, 5]
    mapping(address => uint) private userWeight;

    mapping (uint => bool) private _tokenIsStaked;

    event RewardRateSet(uint rate);

    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC721(_stakingToken);
        rewardsToken = Botz(_rewardsToken);
    }

    function setRaritiesRoot(bytes32 root) public onlyOwner {
        _raritiesMerkleRoot = root;
    }

    // Calculates current rewards given per token
    function rewardPerToken() public view returns (uint) {
        if (_totalSupply == 0) {
            return _rewardPerWeightStored;
        }
        return
            _rewardPerWeightStored +
            (((block.timestamp - _lastUpdateTime) * _rewardRate * 1e18) / _totalWeight);

        // original
        // if (_totalSupply == 0) {
        //     return _rewardPerWeightStored;
        // }
        // return
        //     _rewardPerWeightStored +
        //     (((block.timestamp - _lastUpdateTime) * _rewardRate * 1e18) / _totalSupply);
    }

    // User checks how many Botz they've earned/accrued
    // also used to update rewards for a user (rewards[user])
    function earned(address account) public view returns (uint) {
        return
            ((userWeight[account] *
                (rewardPerToken() - _userRewardPerWeightPaid[account])) / 1e18) +
            _rewards[account];
    }

    // updates Reward per token
    modifier updateReward(address account) {
        // adjust reward per token since last update
        _rewardPerWeightStored = rewardPerToken();
        _lastUpdateTime = block.timestamp;

        _rewards[account] = earned(account);
        _userRewardPerWeightPaid[account] = _rewardPerWeightStored;
        _;
    }

    // params: tokens -> the erc721 token ids to be staked
    // commitments -> respective commitment options 
    function stake(uint[] calldata tokens, uint[] calldata rarities, uint[] calldata commitments) external updateReward(msg.sender) {
        require(tokens.length > 0, "tokens.length <= 0");
        require(tokens.length == rarities.length, "tokens != rarities");
        require(tokens.length == commitments.length, "tokens != commitments");
        

        // TODO: verify rarities proofs with merkle root

        // transfer tokens and update state
        for(uint i; i < tokens.length; i++) {
            require(stakingToken.ownerOf(tokens[i]) == msg.sender, "doesnt own token");
            require(commitments[i] > 0 && commitments[i] <= 10, "invalid commitment");

            stakingToken.safeTransferFrom(msg.sender, address(this), tokens[i]);
            _totalSupply += 1;
            _balances[msg.sender] += 1;

            // ASSUMING that the rarity is a direct multipler (likely temporary);
            userWeight[msg.sender] += rarities[i];
            _totalWeight +=  rarities[i];

            uint startTime = block.timestamp;
            
            Stake memory s = Stake(msg.sender, tokens[i], rarities[i], commitments[i], 
                                    startTime, startTime + commitments[i] * 1 weeks, false);

            _tokenToStake[tokens[i]] = s;

            _tokenIsStaked[tokens[i]] = true;
        
        }
        
    }

    // User removes stakes
    function withdraw(uint[] calldata tokens) external updateReward(msg.sender) {
        require(tokens.length > 0, "tokens.length <= 0");

        for(uint i; i < tokens.length; i++) {
            Stake memory s = _tokenToStake[tokens[i]];
            require(s.tokenOwner == msg.sender, "msg.sender isnt staker");

            // collect the commitment bonus if 
            if(block.timestamp > s.commitmentOverTS && !s.commitmentCollected) {
                collectCommitmentBonus(tokens[i]);
            }

            // update l(u, t)
            userWeight[msg.sender] -= s.tokenRarity;
            _totalWeight -= s.tokenRarity;

            _totalSupply -= 1;
            _balances[msg.sender] -= 1;

            _tokenIsStaked[tokens[i]] = false;

            stakingToken.safeTransferFrom(address(this), msg.sender, tokens[i]);
            
            delete _tokenToStake[tokens[i]];
        }
        

    }

    // Transfer funds to staker 
    function getReward() external updateReward(msg.sender) {
        uint reward = _rewards[msg.sender];
        _rewards[msg.sender] = 0;
        rewardsToken.mint(msg.sender, reward);
    }

    function collectCommitmentBonus(uint id) public {
        Stake memory s = _tokenToStake[id];
        require(s.tokenID != 0, "token nonexistent");
        require(msg.sender == s.tokenOwner, "not owner");
        require(s.commitmentCollected == false, "already collected");
        require(block.timestamp > s.commitmentOverTS, "commitment not over");

        s.commitmentCollected = true;
        _tokenToStake[id] = s;
        _rewards[msg.sender] += calcCommBonus(s.tokenCommitment);

        require(_tokenToStake[id].commitmentCollected == true, "commColl not updated");
    }

    // Calculates commitment bonus given a number in weeks
    function calcCommBonus(uint numWeeks) private pure returns (uint) {
        return numWeeks * 10;
    }

    function stakedTokens(address user) public view returns (uint) {
        require(user!= address(0));
        return _balances[user];
    }

    function getWeight(address user) public view returns (uint) {
        return userWeight[user];
    }

    function getStake(uint id) public view returns (Stake memory) {
        return _tokenToStake[id];
    }

    function tokenOwner(uint id) public view returns (address) {
        return _tokenToStake[id].tokenOwner;
    }

    function setRewardRate(uint rate) public onlyOwner {
        _rewardRate = rate;
        emit RewardRateSet(rate);
    }


}
