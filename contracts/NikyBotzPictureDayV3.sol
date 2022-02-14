// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./NikyBotzPictureDayV2.sol";


contract NikyBotzPictureDayV3 is NikyBotzPictureDayV2 {

    function version() public virtual override(NikyBotzPictureDayV2) pure returns(string memory) {
        return "version 3";
    }

}