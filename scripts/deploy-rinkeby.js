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

  console.log("Deploying contracts with the account:", deployer.address); 
  // We get the contract to deploy
  const botzCon = await hre.ethers.getContractFactory("NikyBotzPictureDay");
  const botz = await botzCon.deploy("BOTZ", "BOTZ", "https://google.com/", 
  "0x3d0a04cf60dC861d378814fbA0996d669b057d71",
  "0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5"
  );

  await botz.deployed();


  console.log("picture day deployed to:", botz.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
