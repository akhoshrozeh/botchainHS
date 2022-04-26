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
        BCHSType tier;
        uint commitment;
        uint lastUpdateTS;
        uint stakeBeginTS;
        bool commitmentCollected;
    }

    enum BCHSType {Tier1, Tier2, Tier3}


    // total number of NFTs staked
    uint private _totalStakedTokens;

    // address to list of tokens address has staked currently
    mapping (address => uint[]) private _addressToTokenIds;

    // maps tokenId to Stake
    mapping (uint => Stake) private _tokenIdToStake;

    // user's address to their rewards
    // note: this is only updated with modifier updateRewards
    //  !!!! these values are scaled UP by 10e5
    mapping (address => uint) private _rewards;

    // check if token is staked in contract
    mapping (uint => bool) private _tokenIsStaked;

    // maps tokenId to staker address 
    mapping (uint => address) private _tokenIdToOwner;

    // given commitment and tokenType, we get the bonus;
    // bonus_i = (CEIL(e^NumWeeks) + 1) * Weeks * Botz Earned Per Week from Token_i
    // mapping: NumWeeks => CEIL(e^NumWeeks)
    mapping (uint => uint) private _commitmentWeeksToBonus;

    mapping (BCHSType => uint) private _tokenDailyRate;

    event Withdrawal(address indexed staker, uint[] tokens);
    event Staked(address indexed staker, uint[] tokens);
    event CommitmentBonusCollected(address indexed staker, uint tokenId);
    event exchangedToBotz(address indexed user, uint amount);
    event exchangedToWrappedBotz(address indexed user, uint amount);



    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC721(_stakingToken);
        rewardsToken = Botz(_rewardsToken);

        // init commitment bonuses (percentages)
        // bonus = multiply totalWeeks * weeklyRate * map[weeks] / 100
        _commitmentWeeksToBonus[0] = 0;
        _commitmentWeeksToBonus[1] = 3;
        _commitmentWeeksToBonus[2] = 8;
        _commitmentWeeksToBonus[3] = 13;
        _commitmentWeeksToBonus[4] = 20;
        _commitmentWeeksToBonus[5] = 33;
        _commitmentWeeksToBonus[6] = 54;
        _commitmentWeeksToBonus[7] = 89;
        _commitmentWeeksToBonus[8] = 147;
        _commitmentWeeksToBonus[9] = 241;
        _commitmentWeeksToBonus[10] = 397;
        _commitmentWeeksToBonus[11] = 653;
        _commitmentWeeksToBonus[12] = 1074;


        // _tokenDailyRate[BCHSType.Tier1] = 1000;  
        _tokenDailyRate[BCHSType.Tier1] = 86400;  // should be awarding 1 per second
        _tokenDailyRate[BCHSType.Tier2] = 800;  
        _tokenDailyRate[BCHSType.Tier3] = 500;  

    }


    // used for just checking what your rewards balance would be at block.timestamp
    function earned() public view returns (uint) {
        uint[] memory tokens = _addressToTokenIds[msg.sender];
        uint totalRewards = _rewards[msg.sender];

        for(uint i; i < tokens.length; i++) {
            Stake memory s = _tokenIdToStake[tokens[i]];

            uint rewards = (((block.timestamp - s.lastUpdateTS) * 10e5) * _tokenDailyRate[s.tier]) / 1 days;
        
            totalRewards += rewards;
        }

        return totalRewards;
    }

    // User checks how many Botz they've earned/accrued
    // also used to update rewards for a user (rewards[user])
    function _earned(uint tokenId) private returns (uint) {
        Stake memory s = _tokenIdToStake[tokenId];

        uint rewards = (((block.timestamp - s.lastUpdateTS) * 10e5)  * _tokenDailyRate[s.tier]) / 1 days;
        
        // update TS in Stake and write
        s.lastUpdateTS = block.timestamp;
        _tokenIdToStake[tokenId] = s;
        
        return rewards;
    }

    // updates user's earned rewards (for all stakes)
    modifier updateReward(address account) {
        uint[] memory tokens = _addressToTokenIds[msg.sender];
        for(uint i; i < tokens.length; i++) {
            _rewards[account] += _earned(tokens[i]);
        }

        _;
    }

    // params: tokens -> the erc721 token ids to be staked
    // commitments -> respective commitment options 
    function stake(uint[] calldata tokens, BCHSType[] calldata tiers, uint[] calldata commitments) external updateReward(msg.sender) {
        require(tokens.length > 0, "tokens.length <= 0");
        require(tokens.length == tiers.length, "tokens != rarities");
        require(tokens.length == commitments.length, "tokens != commitments");
        

        // TODO: verify rarities proofs with signature from
        uint startTime = block.timestamp;
        
        // transfer tokens and update state
        for(uint i; i < tokens.length; i++) {
            require(stakingToken.ownerOf(tokens[i]) == msg.sender, "staker!=owner");
            require(commitments[i] > 0 && commitments[i] <= 12, "invalid commitment");
            require(BCHSType(0) <= tiers[i] && tiers[i] <= BCHSType(2), "invalid tier");

            // move the token to staking contract
            stakingToken.safeTransferFrom(msg.sender, address(this), tokens[i]);

            
            _totalStakedTokens += 1;
            _tokenIsStaked[tokens[i]] = true;
            

            Stake memory s = Stake(tiers[i], commitments[i], startTime, startTime, false);
            _tokenIdToStake[tokens[i]] = s;
            _tokenIdToOwner[tokens[i]] = msg.sender;

            _addressToTokenIds[msg.sender].push(tokens[i]);
        }

        emit Staked(msg.sender, tokens);
        
    }


    // User removes stakes
    function withdraw(uint[] calldata tokens) external updateReward(msg.sender) {
        require(tokens.length > 0, "tokens.length <= 0");
        
        for(uint i; i < tokens.length; i++) {
            require(_tokenIsStaked[tokens[i]], "token not staked");
            address tokenOwner = _tokenIdToOwner[tokens[i]];
            require(tokenOwner == msg.sender, "withdrawer!=owner");
            
            Stake memory s = _tokenIdToStake[tokens[i]];

            bool commitmentCompleted = block.timestamp > s.stakeBeginTS + (s.commitment * 1 weeks) ? true : false;

            // collect the commitment bonus when withdrawing
            if(s.commitment > 0 && !s.commitmentCollected && commitmentCompleted) {
                _collectCommitmentBonus(s, tokenOwner, tokens[i]);
            } 

            delete _tokenIdToOwner[tokens[i]];
            delete _tokenIdToStake[tokens[i]];


            uint[] memory currUserTokens = _addressToTokenIds[msg.sender];

            (uint tokenIndex, bool success) = _getTokenIndex(currUserTokens, tokens[i]);
            require(success, "couldnt get tokenIndex");

            // update list of tokens owner has; swap and pop
            _addressToTokenIds[msg.sender][tokenIndex] = currUserTokens[currUserTokens.length - 1];
            _addressToTokenIds[msg.sender].pop();
            
            _totalStakedTokens -= 1;

            _tokenIsStaked[tokens[i]] = false;

            stakingToken.safeTransferFrom(address(this), msg.sender, tokens[i]);
        }

        emit Withdrawal(msg.sender, tokens);
    }

    // cleans up storage for tokens after a token is withdrawed
    function _getTokenIndex(uint[] memory tokens, uint tokenId) internal pure returns(uint, bool) {
        for (uint i; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                return (i, true); 
            }
        }

        return (0, false);
    }

    // needs to be very secure
    // *** only to be called by withdraw(int[])
    // doesnt mark as commitmentCollected since the stake will be deleted
    function _collectCommitmentBonus(Stake memory s, address tokenOwner, uint tokenId) private {
        require(msg.sender == address(this), "not called from withdraw()");
        
        uint bonus = s.commitment * 7 * _tokenDailyRate[s.tier] * _commitmentWeeksToBonus[s.commitment] / 100;
        
        // scale up
        _rewards[tokenOwner] += (bonus * 10e5);

        emit CommitmentBonusCollected(tokenOwner, tokenId);
    }


    // for public usage
    function collectCommitmentBonus(uint tokenId) public {
        require(_tokenIsStaked[tokenId], "token not staked");
        require(msg.sender == _tokenIdToOwner[tokenId], "only owner collects");
        require(1 <= tokenId && tokenId <= 10000, "invalid tokenId");
        Stake memory s = _tokenIdToStake[tokenId];
        require(s.commitment > 0, "comm=0");
        require(!s.commitmentCollected, "already collected");
        bool commitmentCompleted = block.timestamp > s.stakeBeginTS + (s.commitment * 1 weeks) ? true : false;
        require(commitmentCompleted, "comm not completed");

        uint bonus = s.commitment * 7 * _tokenDailyRate[s.tier] * _commitmentWeeksToBonus[s.commitment] / 100;

        // scale up
        bonus = bonus * 10e5;

        // update stake to be collected
        s.commitmentCollected = true;
        _tokenIdToStake[tokenId] = s;

        // collect rewards
        _rewards[msg.sender] += bonus;

        emit CommitmentBonusCollected(msg.sender, tokenId);

    } 


    // Transfer funds to staker 
    // needs to take tax
    function exchangeToBotz() external updateReward(msg.sender) {
        require(msg.sender != owner(), "sender=owner");
        uint reward = _rewards[msg.sender];

        // 30% tax to exchange to mainnet erc20
        reward = (reward * 75) / 100;
        uint tax = (reward * 25) / 100;

        _rewards[owner()] += tax;

        // scale down with minimal rounding errors
        reward = reward / 10e5;

        _rewards[msg.sender] = 0;
        rewardsToken.mint(msg.sender, reward);

        emit exchangedToBotz(msg.sender, reward);
    }

    function ownerExchangeRewardsTo

    function exchangeToWrappedBotz() external updateReward(msg.sender) {
        // mints _rewards[msg.sender] / 10e5 to Arbitrum contract
    }

    // ***** PUBLIC VIEW FUNCTIONS *****

    function numStakedTokens() public view returns (uint) {
        require(msg.sender != address(0));
        return _addressToTokenIds[msg.sender].length;
    }

    function totalStaked() public view returns (uint) {
        return _totalStakedTokens;
    }

    function tokensStaked() public view returns (uint[] memory) {
        return _addressToTokenIds[msg.sender];
    }

    function tokenToStake(uint tokenId) public view returns (Stake memory) {
        return _tokenIdToStake[tokenId];
    }

    function getRewards() public view returns (uint) {
        return _rewards[msg.sender];
    }

    function adjustedRewards() public view returns (uint) {
        return _rewards[msg.sender] / 10e5;
    }

    function tokenIsStaked(uint tokenId) public view returns (bool) {
        return _tokenIsStaked[tokenId];
    }
    
    function tokenToOwner(uint tokenId) public view returns (address) {
        require(_tokenIsStaked[tokenId], "token not staked");
        return _tokenIdToOwner[tokenId];
    }





}
