pragma solidity 0.8.10;

import './EchidnaNikyBotzPictureDay.sol';

contract TestNikyBotzPictureDay is EchidnaNikyBotzPictureDay {
    constructor() 
        
        EchidnaNikyBotzPictureDay(
        "BOTZ", "BOTZ", "https://google.com/", 
        0x3d0a04cf60dC861d378814fbA0996d669b057d71,
        0x652BBC3beC62FF7ef9157B73FcbDe0C1eb91b2a5)
         {}

        
    function echidna_public_mints_lte_5900() public returns (bool){
        _publicMintOn = true;
        return _currPublicID <= 100; 
    }


}