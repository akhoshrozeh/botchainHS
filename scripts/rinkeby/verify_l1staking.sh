#!/bin/bash
#  address _stakingToken,address _rewardsToken, address admin
# hh verify --network rinkeby {deployment_address} "SchoolBotz" "NIKY" "https://google.com/" "0x3d0a04cf60dC861d378814fbA0996d669b057d71" "0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5"   
# hh verify --network rinkeby 0x25ebb0A46c8a59A7fad72f898ffd82585D82099A "0x03b7FC8d6637d9CcD74aD709989fAc4839C0A058" "0x2523336837ee9a2582002B0dB51613c55CE24fba" "0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5"
hh verify --network rinkeby 0x08035054BE6bf1ac2b523bA97A9539687b17EdBD "0xa60E4CA8EC9AB91Cc06969cF2cBaFD496fB5C0B8" "0x3f8d6215ecC16EB9A27BD92caD549D9C722477d2" "0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5";

# erc30s

# hh verify --network l1 0x3f8d6215ecC16EB9A27BD92caD549D9C722477d2 "0x917dc9a69F65dC3082D518192cd3725E1Fa96cA2" "0x70C143928eCfFaf9F5b406f7f4fC28Dc43d68380"

# hh verify --network l1 0x2523336837ee9a2582002B0dB51613c55CE24fba "0x917dc9a69F65dC3082D518192cd3725E1Fa96cA2" "0x70C143928eCfFaf9F5b406f7f4fC28Dc43d68380"
# hh verify --network l1 0xbbDE89Dee1519a71c496E97D6D4a8db071a65Af5 "0x9b014455AcC2Fe90c52803849d0002aeEC184a06" "0x2523336837ee9a2582002B0dB51613c55CE24fba"

  const name = "SchoolBotz";
  const symbol = "NIKY";
  const baseUri = "https://base-uri-test.com/";

hh verify --network mainnet 0x5b1070F7aE553b67C5Affb71f489a52BB2437F42 "SchoolBotz" "NIKY" "https://base-uri-test.com/" "0x6B1A77e8E277b2300cD8b1eC342C9d2cEd17688e" "0x83fB7063f84300696d5687525594a9aF49d1f017"   
