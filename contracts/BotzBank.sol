// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICustomToken";

contract BotzBank is ERC20, Ownable, ICustomToken {

    address public bridge;
    address public router;
    bool private shouldRegisterGateway;

    constructor(address bridge_, address router_)
    ERC20("BOTZ20NAME", "BOTZ20SYM")
    {
        authorized[msg.sender] = true;
        bridge = bridge_;
        router = router_;
    }

    mapping (address => bool) authorized;

    modifier onlyAuthorized(address caller) {
        require(authorized[caller], "not authorized");
        _;
    }

    function authorize(address a) public onlyOwner {
        authorized[a] = true;
    }

    function unauthorize(address a) public onlyOwner {
        authorized[a] = false;
    }

    // only the staking contract should be able to call this
    function mint(address account, uint amount) public onlyAuthorized(msg.sender) {
        _mint(account, amount);
    }
    
    function isArbitrumEnabled() external view override returns (uint8) {
        require(shouldRegisterGateway, "NOT_EXPECTED_CALL");
        return uint8(0xa4b1);
    }

    function registerTokenOnL2(
        address l2CustomTokenAddress,
        uint256 maxSubmissionCostForCustomBridge,
        uint256 maxSubmissionCostForRouter,
        uint256 maxGasForCustomBridge,
        uint256 maxGasForRouter,
        uint256 gasPriceBid,
        uint256 valueForGateway,
        uint256 valueForRouter,
        address creditBackAddress
    ) public payable override {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        IL1CustomGateway(bridge).registerTokenToL2{ value: valueForGateway }(
            l2CustomTokenAddress,
            maxGasForCustomBridge,
            gasPriceBid,
            maxSubmissionCostForCustomBridge,
            creditBackAddress
        );

        IGatewayRouter(router).setGateway{ value: valueForRouter }(
            bridge,
            maxGasForRouter,
            gasPriceBid,
            maxSubmissionCostForRouter,
            creditBackAddress
        );

        shouldRegisterGateway = prev;
    }
}


