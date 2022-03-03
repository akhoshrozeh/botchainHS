# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

# Contract Format
Follow the instructions here to use plug-in to lint your code:
`https://github.com/prettier-solidity/prettier-plugin-solidity`

# Run Test coverage
1. To install, follow instructions here: `https://github.com/sc-forks/solidity-coverage`
2. Run `hh coverage --testfiles "test/*"` in the the home directory
3. Open `index.html` inside `coverage/` that is created from the test coverage

# View test coverage
1. `cd` into `coverage` directory and open `index.html` in the browser.

# Mythril testing
1. To run, install mythril and then run `myth analyze NikyBotzPictureDay.sol` inside /contracts directory
2. The output from the test is in the home directory of the project, name `myth_analyze_output`

# Slither testing
1. Install slither, and run `slither NikyBotzPictureDay.sol` inside `contracts/` directory
 OR
 to pipe the output of slither into a file, run this:
 `slither contract.sol 2>&1 | tee slither_output_file`
 
 # Verifying on Etherscan
 Version 0 is deployed on Rinkeby, which can be found at `https://rinkeby.etherscan.io/address/0x5b1070F7aE553b67C5Affb71f489a52BB2437F42`.
 To verify the contract, you need to upload the source code, which includes all dependencies. I used `multisol` which automatically creates 
 a folder with all contracts in the dependency graph. Then verifying is easy. You can follow the instructions here to use to:
 `https://github.com/paulrberg/multisol`
