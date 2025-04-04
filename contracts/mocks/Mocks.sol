// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimalsValue) ERC20(name, symbol) {
        _decimals = decimalsValue;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        // Override to always succeed in tests
        _transfer(sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        // Override to always succeed in tests
        _approve(_msgSender(), spender, amount);
        return true;
    }
}

// Mock Gateway for testing
contract MockGateway {
    function call(
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        IRevertCaller.CallOptions memory callOptions,
        IRevertCaller.RevertOptions memory revertOptions
    ) external {}

    // Helper function to simulate calling the onCall function
    function mockCallOnCall(
        address orderBookAddress,
        IUniversalContract.MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external {
        IUniversalContract(orderBookAddress).onCall(context, zrc20, amount, message);
    }
}

// Mock interfaces needed for testing
interface IUniversalContract {
    struct MessageContext {
        address sender;
        address origin;
        uint256 originChainId;
    }

    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external;
}

interface IRevertCaller {
    struct CallOptions {
        uint256 gasLimit;
        bool isArbitraryCall;
    }

    struct RevertOptions {
        address revertAddress;
        bool callOnRevert;
        address abortAddress;
        string revertMessage;
        uint256 onRevertGasLimit;
    }
}

// Mock SwapRouter for testing
contract MockSwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        // Mock return values
        uint256[] memory result = new uint256[](path.length);
        result[0] = amountIn;
        result[1] = amountOutMin;
        return result;
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        // Mock return values
        uint256[] memory result = new uint256[](path.length);
        result[0] = msg.value;
        result[1] = amountOutMin;
        return result;
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        // Mock return values
        uint256[] memory result = new uint256[](path.length);
        result[0] = amountIn;
        result[1] = amountOutMin;
        return result;
    }
}

// Mock LimitOrderManager for testing
contract MockLimitOrderManager {
    uint256 private _mockDeactiveSlot;
    uint128 private _mockAmount0;
    uint128 private _mockAmount1;

    function setDeactiveSlot(uint256 slotIdx) external {
        _mockDeactiveSlot = slotIdx;
    }

    function setMockAmounts(uint128 amount0, uint128 amount1) external {
        _mockAmount0 = amount0;
        _mockAmount1 = amount1;
    }

    function getDeactiveSlot(address user) external view returns (uint256 slotIdx) {
        return _mockDeactiveSlot;
    }

    function addLimOrder(
        ILimitOrderManager.AddLimOrderParam calldata params
    ) external returns (uint128 orderID) {
        return uint128(_mockDeactiveSlot);
    }

    function collectLimOrder(
        address recipient,
        uint256 orderIdx,
        uint128 collectDec,
        uint128 collectEarn
    ) external returns (uint128 actualCollectDec, uint128 actualCollectEarn) {
        return (collectDec > 0 ? collectDec : _mockAmount0, collectEarn > 0 ? collectEarn : _mockAmount1);
    }

    function getOrderAmount(uint256 slotIdx) external view returns (uint128 amount0, uint128 amount1) {
        return (_mockAmount0, _mockAmount1);
    }

    function cancelLimOrder(uint256 slotIdx) external {}
}

interface ILimitOrderManager {
    struct AddLimOrderParam {
        address tokenX;
        address tokenY;
        uint24 fee;
        int24 pt;
        uint128 amount;
        bool sellXEarnY;
        uint256 deadline;
    }
}

// Mock Factory for testing
contract MockFactory {
    address private _mockPool;

    function setPool(address pool) external {
        _mockPool = pool;
    }

    function pool(address tokenX, address tokenY, uint24 fee) external view returns (address) {
        return _mockPool;
    }
}

// Mock Pool for testing
contract MockPool {
    int24 private _currentPoint;
    uint160 private _sqrtPrice = 1e18;
    uint128 private _liquidity = 1e18;
    uint256 private _liquidityX = 1e18;
    int24 private _pointDelta = 1;

    function setCurrentPoint(int24 point) external {
        _currentPoint = point;
    }

    function setPointDelta(int24 delta) external {
        _pointDelta = delta;
    }

    function getPoolState() external view returns (int24 currentPoint, uint160 sqrtPrice, uint128 liquidity, uint256 liquidityX) {
        return (_currentPoint, _sqrtPrice, _liquidity, _liquidityX);
    }

    function pointDelta() external view returns (int24) {
        return _pointDelta;
    }
}