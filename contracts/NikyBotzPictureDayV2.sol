// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./NikyBotzPictureDay.sol";


contract NikyBotzPictureDayV2 is NikyBotzPictureDay {

    function version() public virtual pure returns(string memory) {
        return "version 2";
    }

}