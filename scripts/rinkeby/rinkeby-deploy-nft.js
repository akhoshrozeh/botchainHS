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
  
  const name = "SchoolBotz";
  const symbol = "NIKY";
  const baseUri = "https://base-uri-test.com/";
  const multisig = "0xae9084189C042E2A64E7f95bCA7B50626a342f84";
  const sysadmin = "0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5";

  console.log("Deploying contracts with the account:", deployer.address); 
  // We get the contract to deploy
  const m_niky = await hre.ethers.getContractFactory("NikyBotzPictureDay");
  const niky = await m_niky.deploy(name, symbol, baseUri, multisig, sysadmin );

  await niky.deployed();


  console.log("NikyBotzPictureDay deployed to:", niky.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
