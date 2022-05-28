// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "./Botz.sol";


interface Mintable {
    function mint(address account, uint amount) external;
}

contract StakingRewards is Ownable, ERC721Holder, ReentrancyGuard  {


    // Botz contract
    Mintable public rewardsToken;
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

    // if true, the users can exchange rewards to Botz tokens
    bool private _mintingOn;
    bool private _paused;

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
        rewardsToken = Mintable(_rewardsToken);

        // commitment bonuses (percentages)
        // bonus = multiply totalWeeks * weeklyRate * _commitmentWeeksToBonus[weeks] / 100
        // [2, 5, 8, 11, 15, 20, 28, 39, 54, 76, 105, 147]
        _commitmentWeeksToBonus[0] = 0;
        _commitmentWeeksToBonus[1] = 2;
        _commitmentWeeksToBonus[2] = 5;
        _commitmentWeeksToBonus[3] = 8;
        _commitmentWeeksToBonus[4] = 11;
        _commitmentWeeksToBonus[5] = 15;
        _commitmentWeeksToBonus[6] = 20;
        _commitmentWeeksToBonus[7] = 28;
        _commitmentWeeksToBonus[8] = 39;
        _commitmentWeeksToBonus[9] = 54;
        _commitmentWeeksToBonus[10] = 76;
        _commitmentWeeksToBonus[11] = 105;
        _commitmentWeeksToBonus[12] = 147;

        
        _tokenDailyRate[BCHSType.Tier1] = 500;  
        _tokenDailyRate[BCHSType.Tier2] = 400;  
        _tokenDailyRate[BCHSType.Tier3] = 250;  

    }


    modifier mintingOn() {
        require(_mintingOn, "minting off");
        _;
    }

    modifier notPaused() {
        require(!_paused, "pause on");
        _;
    }


    // updates user's earned rewards (for all stakes)
    modifier updateReward(address account) {
        uint[] memory tokens = _addressToTokenIds[msg.sender];
        for(uint i; i < tokens.length; i++) {
            _rewards[account] += _earnedSince(tokens[i]);
        }

        _;
    }


    // note: user must approve this contract to transfer erc721s before calling stake()
    // params: tokens -> the erc721 token ids to be staked
    // commitments -> respective commitment options 
    // Note: this function can only be called from the website since it requires a signature verifying tiers of tokens
    function stake(uint[] calldata tokens, BCHSType[] calldata tiers, uint[] calldata commitments) external notPaused nonReentrant updateReward(msg.sender) {
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


    // User removes stakes and collects commitment bonus if applicable
    function withdraw(uint[] calldata tokens) external notPaused nonReentrant updateReward(msg.sender) {
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

   


    // usage: stakers who want to redeem their commitmentBonus rewards without unstaking
    // note: 'redeem' doesnt mean mint erc20s. It means their _rewards balance is updated with the bonus
    function collectCommitmentBonus(uint tokenId) public notPaused nonReentrant {
        require(_tokenIsStaked[tokenId], "token not staked");
        require(msg.sender == _tokenIdToOwner[tokenId], "only owner collects");
        require(1 <= tokenId && tokenId <= 10000, "invalid tokenId");
 
        Stake memory s = _tokenIdToStake[tokenId];
        require(s.commitment > 0, "comm=0");
        require(!s.commitmentCollected, "already collected");

        // check that commitment has been honored
        bool commitmentCompleted = block.timestamp > s.stakeBeginTS + (s.commitment * 1 weeks) ? true : false;
        require(commitmentCompleted, "comm not completed");

        // calculate bonus to be added to rewards
        uint bonus = s.commitment * 7 * _tokenDailyRate[s.tier] * _commitmentWeeksToBonus[s.commitment] * 10e5 / 100;


        // update stake commitment to be collected and write to storage
        s.commitmentCollected = true;
        _tokenIdToStake[tokenId] = s;

        // collect commitment bonus
        _rewards[msg.sender] += bonus;

        emit CommitmentBonusCollected(msg.sender, tokenId);

    } 


    // Transfer funds to staker 
    function exchangeToBotz() external mintingOn nonReentrant updateReward(msg.sender) {
        uint reward = _rewards[msg.sender];
        require(reward > 0, "no rewards");

        // scale down with minimal rounding errors
        reward = reward / 10e5;

        // empty user rewards
        _rewards[msg.sender] = 0;

        // scale up to since decimals = 18 on erc20 contract
        reward = reward * (10 ** 18);

        rewardsToken.mint(msg.sender, reward);

        emit exchangedToBotz(msg.sender, reward);
    }


  

    // User checks how many Botz they've earned/accrued
    // also used to update rewards for a user (rewards[user])
    function _earnedSince(uint tokenId) private returns (uint) {
        Stake memory s = _tokenIdToStake[tokenId];

        uint rewards = (((block.timestamp - s.lastUpdateTS) * 10e5)  * _tokenDailyRate[s.tier]) / 1 days;
        
        // update TS in Stake and write
        s.lastUpdateTS = block.timestamp;
        _tokenIdToStake[tokenId] = s;
        
        return rewards;
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
        
        // divide by 100 since _commitmentWeeksToBonus is a percent
        uint bonus = s.commitment * 7 * _tokenDailyRate[s.tier] * _commitmentWeeksToBonus[s.commitment] * 10e5 / 100;
        
        
        _rewards[tokenOwner] += bonus;

        emit CommitmentBonusCollected(tokenOwner, tokenId);
    }


    
    // ************* OnlyOwner functions ************
    function setRewardsToken(address newContract) public onlyOwner {
        rewardsToken = Mintable(newContract);
    }

    function flipMintingState() public onlyOwner returns(bool) {
        _mintingOn = !_mintingOn;
        return _mintingOn;
    }

    function flipPauseState() public onlyOwner returns (bool) {
        _paused = !_paused;
        return _paused;
    }


    function adjustDailyRates(uint[] calldata rates) public onlyOwner {
        require(rates.length == 3, "invalid length");
        
        _tokenDailyRate[BCHSType.Tier1] = rates[0];  
        _tokenDailyRate[BCHSType.Tier2] = rates[1];  
        _tokenDailyRate[BCHSType.Tier3] = rates[2]; 
    }

    function adjustCommitmentBonuses(uint[] calldata bonuses) public onlyOwner {
        require(bonuses.length == 12, "invalid length");

        for(uint i = 1; i <= bonuses.length; i++) {
            _commitmentWeeksToBonus[i] = bonuses[i];
        }
    }
     
    // transfer all nfts back to owners
    function emergencyTransfer(uint[] calldata tokenIds) public onlyOwner {
        for(uint i; i < tokenIds.length; i++) {
            stakingToken.transferFrom(address(this), _tokenIdToOwner[tokenIds[i]], tokenIds[i]);      
        }
    }





    // ***** PUBLIC VIEW FUNCTIONS *****
    
    // used for just checking what your rewards balance would be at block.timestamp
    function totalEarned() public view returns (uint) {
        uint[] memory tokens = _addressToTokenIds[msg.sender];
        uint totalRewards = _rewards[msg.sender];

        for(uint i; i < tokens.length; i++) {
            Stake memory s = _tokenIdToStake[tokens[i]];

            uint rewards = (((block.timestamp - s.lastUpdateTS) * 10e5) * _tokenDailyRate[s.tier]) / 1 days;
        
            totalRewards += rewards;
        }

        return totalRewards;
    }


    function numStakedTokens() public view returns (uint) {
        require(msg.sender != address(0));
        return _addressToTokenIds[msg.sender].length;
    }

    function tokensStaked() public view returns (uint[] memory) {
        return _addressToTokenIds[msg.sender];
    }

    function totalStaked() public view returns (uint) {
        return _totalStakedTokens;
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
