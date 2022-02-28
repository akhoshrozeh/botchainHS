// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BotzStaking {
    IERC721 public botzNFT;
    IERC20 public botzTokens;

    // in seconds
    uint256 week = 7 * 24 * 3600;

    // dummy values right now.. 
    // Rewards mechanism; based off Synthetix's
    //  L(t)
    uint256 public totalStakeCount;

    uint256 public rewardRate = 100;
    uint256 public lastUpdateTime;

    // s = summation from 0 to b: (R / L(t))
    uint256 public rewardPerTokenStored; 

    // p = sumamtion from 0 to a-1: R/L(t)
    mapping (address => uint256) public userRewardPerTokenPaid;

    // updated when user stakes,unstakes,withdraws 
    mapping (address => uint256) public rewards;

    modifier updateReward(address account) {
        _;
    }


    // addresses from REMIX
    // NikyBotz : 0xd9145CCE52D386f254917e481eB44e9943F39138
    // BotzToken: 0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8
    // these should be changed into arguments for the constructor
    constructor() {
        botzNFT = IERC721(0xa131AD247055FD2e2aA8b156A11bdEc81b9eAD95);
        botzTokens = IERC20(0x652c9ACcC53e765e1d96e2455E618dAaB79bA595);

    }



    // notes:
    // if you want to withdraw tokens, it has be from a certain token
    // it'd be better to just only withdraw when you unstakes

    struct Staker {
        // total $botz this account has from all stakes
        uint256 totalAccumulation;

        // keeps track of total current stakes by user u
        // l(u, t) 
        uint256 userStakes;
        
        // maps the tokenId to the Stake object
        mapping (uint256 => Stake) tokenIdToStake; 
    }

    struct Stake {
        // uint256 tokenId;'
        uint256 tier;
        uint256 stakedTS;
        uint256 accumulation;
        uint256 commitment; // in seconds
        bool penalty; // true until block.timestamp - stakedTS >= commitment (in seconds)
    }

    // mapping (address => bool) stakerExists;

    // staker to stake details
    mapping (address => Staker) stakers;

    // rewards
    mapping (address => uint256) tokenRewards;

    mapping (uint256 => address) tokenIdToStaker;


    // r(u, a, b) = )summation from a to b) R * ( l(u,t) / L(t))
    // function reward(Staker staker_) public {
    //     r()
    // }
    function rewardPerToken() public view returns (uint256) {

    }

    function earned(address account) public view returns (uint256) {

    }



    // ! sender must set Approval for all for this contract address before calling the stake() function
    //      -> this is because the scope of msg.sender when botzNFt.safeTransferFrom is called is 'this' address
    // re-entrancy vulnerability ?
    function stake(uint256[] memory tokenIds_, uint256 tier_, uint256 commitment_) public payable updateReward(msg.sender) { 
        // add requirement that msg.sender has approved this contract
        // require(botzNFT._isApprovedOrOwner());



        // verify all NFTs are owner by 
        for (uint256 i; i < tokenIds_.length; i++) {
            require(botzNFT.ownerOf(tokenIds_[i]) == msg.sender, "Only stake owned tokens");
        }


        // do merkle verification on token id belonging to tree 'tier_'



        // // if already has a stake
        // if (!stakerExists[msg.sender]) {
        //     stakerExists[msg.sender] = true;
        // }


        // for each nft: transfer them to this contract, create a stake for each NFT, add each stake to the Staker object
        for (uint256 i; i < tokenIds_.length; i++) {
            
            // create the stake
            Stake memory s = Stake(tier_, block.timestamp, 0, commitment_, true);

            // store the stake                
            stakers[msg.sender].tokenIdToStake[i] = s;

            tokenIdToStaker[tokenIds_[i]] = msg.sender;


            botzNFT.safeTransferFrom(msg.sender, address(this), tokenIds_[i]);
        }
        stakers[msg.sender].userStakes += tokenIds_.length;
        totalStakeCount += tokenIds_.length;
        
    }

    function unstake(uint256[] memory tokenIds_) external updateReward(msg.sender) {
        for (uint256 i; i < tokenIds_.length; i++) {
            require(botzNFT.ownerOf(tokenIds_[i]) == address(this), "Only unstake staked tokens");
            require(msg.sender == tokenIdToStaker[tokenIds_], "Only staker can unstake");
        }


        for (uint256 i; i < tokenIds_.length; i++) {
            
            // store the stake                
            stakers[msg.sender].tokenIdToStake[i] = 0x0;

            tokenIdToStaker[tokenIds_[i]] = 0x0;


            botzNFT.safeTransferFrom(address(this), msg.sender, tokenIds_[i]);
        }

        stakers[msg.sender].userStakes -= tokenIds_.length;
        totalStakeCount -= tokenIds_.length;



    }

    // function withdraw() external updateReward(msg.sender) {
    //     uint256 reward = rewards[msg.sender];
    //     rewards[msg.sender] = 0;
    //     rewardsToken.transfer(msg.sender, reward);
    // }   

    // function withdraw(uint256 _tokenId) public {
    //     botzNFT.safeTransferFrom(address(this), msg.sender, _tokenId);
    //     uint256 timePassed = block.timestamp - stakes[msg.sender].stakedTS;
    //     stakingTime[msg.sender] += timePassed;
    //     delete stakes[msg.sender];
    //     // botzTokens.mint(timePassed);
    // }

    // function getAmount() public view returns (uint256) {
        
    //     return stakingTime[msg.sender]; 
    // }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    
}