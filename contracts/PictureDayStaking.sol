// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

interface Mintable {
    function mint(address account, uint256 amount) external;
}

contract PictureDayStaking is AccessControl, ERC721Holder, ReentrancyGuard {
    // Botz contract
    Mintable public rewardsToken;
    // BCHS NFT contract
    IERC721 public stakingToken;

    struct Stake {
        uint256 commitment;
        uint256 lastUpdateTS;
        uint256 stakeBeginTS;
        BCHSType tier;
        bool commitmentCollected;
    }

    enum BCHSType {
        Tier1,
        Tier2,
        Tier3
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // total number of NFTs staked
    uint256 private _totalStakedTokens;

    // if true, the users can exchange rewards to Botz tokens
    bool private _mintingOn;

    // if true, then staking, withdrawing, collecting is paused
    bool private _paused;

    // address to list of tokens address has staked currently
    mapping(address => uint256[]) private _addressToTokenIds;

    // maps tokenId to Stake
    mapping(uint256 => Stake) private _tokenIdToStake;

    // user's address to their rewards
    // NOTE: these values are scaled UP by 10e5 to account for second by second reward calculation
    mapping(address => uint256) private _rewards;

    // check if token is staked in contract
    mapping(uint256 => bool) private _tokenIsStaked;

    // maps tokenId to staker address
    mapping(uint256 => address) private _tokenIdToOwner;

    // given commitment and tokenType, we get the bonus;
    // maps a week [1-12] to a bonus percentage
    mapping(uint256 => uint256) private _commitmentWeeksToBonus;

    // given a token tier, get the daily reward rate
    mapping(BCHSType => uint256) private _tokenDailyRate;

    event Withdrawal(address indexed staker, uint256[] tokens);
    event Staked(address indexed staker, uint256[] tokens);
    event CommitmentBonusCollected(address indexed staker, uint256 tokenId);
    event exchangedToBotz(address indexed user, uint256 amount);
    event exchangedToWrappedBotz(address indexed user, uint256 amount);

    constructor(
        address _stakingToken,
        address _rewardsToken,
        address admin
    ) {
        stakingToken = IERC721(_stakingToken);
        rewardsToken = Mintable(_rewardsToken);

        _setupRole(ADMIN_ROLE, admin);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        // commitment bonuses (percentages)
        // bonus =  commitmentWeeks * dailyRate * 7 * _commitmentWeeksToBonus[weeks] * 10e5 / 100
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
        uint256[] memory tokens = _addressToTokenIds[msg.sender];
        for (uint256 i; i < tokens.length; i++) {
            _rewards[account] += _earnedSince(tokens[i]);
        }

        _;
    }

    // note: user must approve this contract to transfer erc721s before calling stake()
    // params: tokens -> the erc721 token ids to be staked
    // commitments -> respective commitment options
    // Note: this function can only be called from the server since it requires a signature verifying tiers of tokens
    function stake(
        uint256[] calldata tokens,
        BCHSType[] calldata tiers,
        uint256[] calldata commitments,
        bytes calldata signature
    ) external notPaused nonReentrant updateReward(msg.sender) {
        require(tokens.length > 0, "tokens.length <= 0");
        require(tokens.length == tiers.length, "tokens != tiers");
        require(tokens.length == commitments.length, "tokens != commitments");

        // verify tiers with admin signature
        require(
            _verifySignature(signature, tokens, tiers),
            "tier verification fail"
        );

        uint256 startTime = block.timestamp;

        // transfer tokens and update state
        for (uint256 i; i < tokens.length; i++) {
            require(
                stakingToken.ownerOf(tokens[i]) == msg.sender,
                "staker!=owner"
            );
            require(
                commitments[i] > 0 && commitments[i] <= 12,
                "invalid commitment"
            );

            require(
                BCHSType(0) <= tiers[i] && tiers[i] <= BCHSType(2),
                "invalid tier"
            );

            // move the token to staking contract
            stakingToken.safeTransferFrom(msg.sender, address(this), tokens[i]);

            _totalStakedTokens += 1;
            _tokenIsStaked[tokens[i]] = true;

            Stake memory s = Stake(
                commitments[i],
                startTime,
                startTime,
                tiers[i],
                false
            );
            _tokenIdToStake[tokens[i]] = s;
            _tokenIdToOwner[tokens[i]] = msg.sender;

            _addressToTokenIds[msg.sender].push(tokens[i]);
        }

        emit Staked(msg.sender, tokens);
    }

    

    // User removes stakes and collects commitment bonus if applicable
    function withdraw(uint256[] calldata tokens)
        external
        notPaused
        nonReentrant
        updateReward(msg.sender)
    {
        require(tokens.length > 0, "tokens.length <= 0");

        for (uint256 i; i < tokens.length; i++) {
            require(_tokenIsStaked[tokens[i]], "token not staked");
            address tokenOwner = _tokenIdToOwner[tokens[i]];
            require(tokenOwner == msg.sender, "withdrawer!=owner");

            Stake memory s = _tokenIdToStake[tokens[i]];

            bool commitmentCompleted = block.timestamp >=
                s.stakeBeginTS + (s.commitment * 1 weeks)
                ? true
                : false;

            // collect the commitment bonus when withdrawing
            if (
                s.commitment > 0 &&
                !s.commitmentCollected &&
                commitmentCompleted
            ) {
                _collectCommitmentBonusFromWithdraw(s, tokenOwner, tokens[i]);
            }

            delete _tokenIdToOwner[tokens[i]];
            delete _tokenIdToStake[tokens[i]];

            uint256[] memory currUserTokens = _addressToTokenIds[msg.sender];

            (uint256 tokenIndex, bool success) = _getTokenIndex(
                currUserTokens,
                tokens[i]
            );
            require(success, "couldnt get tokenIndex");

            // update list of tokens owner has; swap and pop
            // length cant be zero since require(tokenOwner == msg.sender) wouldve failed
            _addressToTokenIds[msg.sender][tokenIndex] = currUserTokens[
                currUserTokens.length - 1
            ];
            _addressToTokenIds[msg.sender].pop();

            _totalStakedTokens -= 1;

            _tokenIsStaked[tokens[i]] = false;

            stakingToken.safeTransferFrom(address(this), msg.sender, tokens[i]);
        }

        emit Withdrawal(msg.sender, tokens);
    }

    // what the public interacts with
    function collectCommitmentBonuses(uint256[] calldata tokenIds)
        public
        notPaused
        nonReentrant
    {
        for (uint256 i; i < tokenIds.length; i++) {
            require(
                msg.sender == _tokenIdToOwner[tokenIds[i]],
                "only owner collects"
            );
            _collectCommitmentBonus(tokenIds[i]);
        }
    }

    // Transfer funds to staker
    function exchangeToBotz()
        external
        mintingOn
        nonReentrant
        updateReward(msg.sender)
    {
        uint256 reward = _rewards[msg.sender];
        require(reward > 0, "no rewards");

        // scale down with minimal rounding errors
        reward = reward / 10e5;

        // empty user rewards
        _rewards[msg.sender] = 0;

        // scale up to since decimals = 18 on erc20 contract
        reward = reward * 10e18;

        rewardsToken.mint(msg.sender, reward);

        emit exchangedToBotz(msg.sender, reward);
    }

    // usage: stakers who want to redeem their commitmentBonus rewards without unstaking
    // note: 'redeem' does NOT mean mint erc20s. It means their _rewards balance is updated with the bonus
    function _collectCommitmentBonus(uint256 tokenId) private {
        require(_tokenIsStaked[tokenId], "token not staked");
        // require(msg.sender == _tokenIdToOwner[tokenId], "only owner collects");
        require(1 <= tokenId && tokenId <= 10000, "invalid tokenId");

        Stake memory s = _tokenIdToStake[tokenId];
        require(!s.commitmentCollected, "already collected");
        require(s.commitment > 0, "comm=0");

        // check that commitment has been honored
        bool commitmentCompleted = block.timestamp >=
            s.stakeBeginTS + (s.commitment * 1 weeks)
            ? true
            : false;
        require(commitmentCompleted, "comm not completed");

        // calculate bonus to be added to rewards
        uint256 bonus = (s.commitment *
            7 *
            _tokenDailyRate[s.tier] *
            _commitmentWeeksToBonus[s.commitment] *
            10e5) / 100;

        // update stake commitment to be collected and write to storage
        s.commitmentCollected = true;
        _tokenIdToStake[tokenId] = s;

        // collect commitment bonus
        _rewards[msg.sender] += bonus;

        emit CommitmentBonusCollected(msg.sender, tokenId);
    }

    // verifies that tiers are valid for given tokens by checking admin account (on server) signed the data
    function _verifySignature(
        bytes calldata signature,
        uint256[] calldata tokenIds,
        BCHSType[] calldata tiers
    ) private view returns (bool) {
        bytes32 dataHash = keccak256(abi.encodePacked(tokenIds, tiers));
        bytes32 message = ECDSA.toEthSignedMessageHash(dataHash);
        address recoveredAddress = ECDSA.recover(message, signature);
        return hasRole(ADMIN_ROLE, recoveredAddress);
    }



    // User checks how many Botz they've earned/accrued
    // also used to update rewards for a user (rewards[user])
    function _earnedSince(uint256 tokenId) private returns (uint256) {
        Stake memory s = _tokenIdToStake[tokenId];

        uint256 rewards = (((block.timestamp - s.lastUpdateTS) * 10e5) *
            _tokenDailyRate[s.tier]) / 1 days;

        // update TS in Stake and write
        s.lastUpdateTS = block.timestamp;
        _tokenIdToStake[tokenId] = s;

        return rewards;
    }

    // used internally for withdrawal
    // cleans up storage for tokens after a token is withdrawed
    function _getTokenIndex(uint256[] memory tokens, uint256 tokenId)
        internal
        pure
        returns (uint256, bool)
    {
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                return (i, true);
            }
        }

        return (0, false);
    }

    //  only to be called by withdraw(int[])
    // doesnt mark as commitmentCollected since the stake will be deleted
    function _collectCommitmentBonusFromWithdraw(
        Stake memory s,
        address tokenOwner,
        uint256 tokenId
    ) private {
        // require(msg.sender == address(this), "not called from withdraw()");

        // divide by 100 since _commitmentWeeksToBonus is a percent
        uint256 bonus = (s.commitment *
            7 *
            _tokenDailyRate[s.tier] *
            _commitmentWeeksToBonus[s.commitment] *
            10e5) / 100;

        _rewards[tokenOwner] += bonus;

        emit CommitmentBonusCollected(tokenOwner, tokenId);
    }



    // ************* Only ADMIN functions ************
    function setRewardsToken(address newContract) public onlyRole(ADMIN_ROLE) {
        rewardsToken = Mintable(newContract);
    }

    function flipMintingState() public onlyRole(ADMIN_ROLE) returns (bool) {
        _mintingOn = !_mintingOn;
        return _mintingOn;
    }

    function flipPauseState() public onlyRole(ADMIN_ROLE) returns (bool) {
        _paused = !_paused;
        return _paused;
    }

    function adjustDailyRates(uint256[] calldata rates)
        public
        onlyRole(ADMIN_ROLE)
    {
        require(rates.length == 3, "invalid length");

        _tokenDailyRate[BCHSType.Tier1] = rates[0];
        _tokenDailyRate[BCHSType.Tier2] = rates[1];
        _tokenDailyRate[BCHSType.Tier3] = rates[2];
    }

    function adjustCommitmentBonuses(uint256[] calldata bonuses)
        public
        onlyRole(ADMIN_ROLE)
    {
        require(bonuses.length == 12, "invalid length");

        for (uint256 i; i < bonuses.length; i++) {
            _commitmentWeeksToBonus[i + 1] = bonuses[i];
        }
    }

    // this will be called serveral time by another, authorized, external contract if needed
    // this is done
    function emergencyTransfer(uint256 tokenId) public onlyRole(ADMIN_ROLE) {
        address staker = _tokenIdToOwner[tokenId];
        require(staker != address(0), "bad address");
        stakingToken.transferFrom(address(this), staker, tokenId);
    }




    // ***** PUBLIC VIEW FUNCTIONS *****

    // used for just checking what your rewards balance would be at block.timestamp
    function totalEarned() public view returns (uint256) {
        uint256[] memory tokens = _addressToTokenIds[msg.sender];
        uint256 totalRewards = _rewards[msg.sender];

        for (uint256 i; i < tokens.length; i++) {
            Stake memory s = _tokenIdToStake[tokens[i]];

            uint256 rewards = (((block.timestamp - s.lastUpdateTS) * 10e5) *
                _tokenDailyRate[s.tier]) / 1 days;

            totalRewards += rewards;
        }

        return totalRewards;
    }

    function numStakedTokens() public view returns (uint256) {
        return _addressToTokenIds[msg.sender].length;
    }

    function tokensStaked() public view returns (uint256[] memory) {
        return _addressToTokenIds[msg.sender];
    }

    function totalStaked() public view returns (uint256) {
        return _totalStakedTokens;
    }

    function tokenToStake(uint256 tokenId) public view returns (Stake memory) {
        return _tokenIdToStake[tokenId];
    }

    function getRewards() public view returns (uint256) {
        return _rewards[msg.sender];
    }

    function tokenIsStaked(uint256 tokenId) public view returns (bool) {
        return _tokenIsStaked[tokenId];
    }

    function tokenToOwner(uint256 tokenId) public view returns (address) {
        require(_tokenIsStaked[tokenId], "token not staked");
        return _tokenIdToOwner[tokenId];
    }
}
