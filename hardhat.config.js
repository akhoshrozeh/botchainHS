require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require('solidity-coverage')
require("hardhat-gas-reporter");
const dotenv = require('dotenv')

require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

dotenv.config()

const privKey = process.env.PRIV_KEY;
const infuraURL = process.env.INFURA_URL;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.10",

  // networks: {
  //   rinkeby: {
  //     url: infuraURL,
  //     accounts: [privKey]
  //   }
  // }, 
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_KEY
  // }
};
