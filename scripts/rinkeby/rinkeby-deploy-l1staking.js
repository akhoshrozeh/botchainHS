// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const [deployer] = await ethers.getSigners(); //get the account to deploy the contract

  const stakingToken = "0xa60E4CA8EC9AB91Cc06969cF2cBaFD496fB5C0B8";
  const rewardsToken = "0x3f8d6215ecC16EB9A27BD92caD549D9C722477d2";
  const admin = "0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5";


  console.log("Deploying contracts with the account:", deployer.address); 
  // We get the contract to deploy
  const m_staking = await hre.ethers.getContractFactory("PictureDayStaking");
  const staking = await m_staking.deploy(stakingToken, rewardsToken, admin);

  await staking.deployed();


  console.log("PictureDayStaking deployed to:", staking.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
