// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {RevertContext, RevertOptions, AbortContext} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";

// iZiSwap interfaces
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

    function addLimOrder(AddLimOrderParam calldata params) external returns (uint128 orderID);
    function collectLimOrder(address recipient, uint256 orderIdx, uint128 collectDec, uint128 collectEarn) external returns (uint128 actualCollectDec, uint128 actualCollectEarn);
    function getDeactiveSlot(address user) external view returns (uint256 slotIdx);
    function cancelLimOrder(uint256 slotIdx) external;
    function getOrderAmount(uint256 slotIdx) external view returns (uint128 amount0, uint128 amount1);
}

interface IPool {
    function getPoolState() external view returns (int24 currentPoint, uint160 sqrtPrice, uint128 liquidity, uint256 liquidityX);
    function pointDelta() external view returns (int24 pointDelta);
}

interface IFactory {
    function pool(address tokenX, address tokenY, uint24 fee) external view returns (address);
}

// Simple interface for ZetaSwap
interface IZetaSwap {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

// Custom errors for gas efficiency
error NotYourOrder();
error OrderNotInIZiSwap();
error WrapFailed();
error UnwrapFailed();
error OrderNotExecuted();
error OrderAlreadyCollected();
error InvalidTokenOrder();
error InvalidPointRange();

abstract contract OrderManager {
    // Order storage
    mapping(uint256 => uint128) public orderToSlotMapping;
    mapping(address => uint256[]) public userLimitOrders;
    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId = 1;

    enum OrderType { BUY, SELL }

    // More efficient Order struct
    struct Order {
        uint128 amount;   // Reduced from uint256
        uint128 price;    // Reduced from uint256
        address owner;
        uint32 slippage;  // Reduced from uint256 (10000 max)
        OrderType orderType;
        bool active;
    }

    // Function to check iZiSwap order status
    function checkOrderStatus(uint256 orderId) public view virtual returns (bool isExecuted, uint128 amount0, uint128 amount1) {
        uint128 slotIdx = orderToSlotMapping[orderId];
        if (slotIdx == 0) return (false, 0, 0);
        
        // Query iZiSwap for order status
        (amount0, amount1) = ILimitOrderManager(address(this)).getOrderAmount(uint256(slotIdx));
        return (amount0 > 0 || amount1 > 0, amount0, amount1);
    }

    // More efficient order collection with better error handling
    function collectLimitOrder(uint256 orderId) internal virtual {
        // Check if the order exists and belongs to the caller
        bool found = false;
        uint256[] storage userOrders = userLimitOrders[msg.sender];
        uint256 length = userOrders.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (userOrders[i] == orderId) {
                found = true;
                break;
            }
        }
        
        if (!found) revert NotYourOrder();
        
        Order storage order = orders[orderId];
        uint128 slotIdx = orderToSlotMapping[orderId];
        if (slotIdx == 0) revert OrderNotInIZiSwap();
        
        // Check if order is ready to be collected
        (bool isExecuted, uint128 amount0, uint128 amount1) = checkOrderStatus(orderId);
        if (!isExecuted) revert OrderNotExecuted();
        
        // Collect the tokens from the executed limit order
        // For sell orders, we collect USDC (amount1)
        // For buy orders, we collect ZETA (amount0)
        (uint128 actualCollectDec, uint128 actualCollectEarn) = ILimitOrderManager(address(this)).collectLimOrder(
            address(this),
            uint256(slotIdx),
            order.orderType == OrderType.SELL ? amount1 : 0,
            order.orderType == OrderType.BUY ? amount0 : 0
        );
        
        // Update balances based on order type
        if (order.orderType == OrderType.SELL) {
            // For sell orders, we get USDC back
            userUsdcBalance[msg.sender] += actualCollectEarn;
            contractUsdcBalance += actualCollectEarn;
        } else {
            // For buy orders, we get ZETA back
            userZetaBalance[msg.sender] += actualCollectDec;
            contractZetaBalance += actualCollectDec;
        }
        
        // Remove the order from user's list
        removeOrderFromUserList(msg.sender, orderId);
        
        // Clear the slot mapping
        delete orderToSlotMapping[orderId];
        
        emit OrderFilled(orderId, actualCollectDec, actualCollectEarn);
    }

    // Batch check all orders and trigger cross-chain loop
    function checkAllOrdersAndTriggerLoop() internal virtual {
        uint256 totalOrders = nextOrderId - 1;
        bool anyOrdersCollected = false;
        
        // Check all orders
        for (uint256 i = 1; i <= totalOrders; i++) {
            if (!orders[i].active) continue;
            
            uint128 slotIdx = orderToSlotMapping[i];
            if (slotIdx == 0) continue;
            
            (bool isExecuted, uint128 amount0, uint128 amount1) = checkOrderStatus(i);
            if (isExecuted) {
                // Collect the order
                Order storage order = orders[i];
                (uint128 actualCollectDec, uint128 actualCollectEarn) = ILimitOrderManager(address(this)).collectLimOrder(
                    address(this),
                    uint256(slotIdx),
                    order.orderType == OrderType.SELL ? amount1 : 0,
                    order.orderType == OrderType.BUY ? amount0 : 0
                );
                
                // Update balances
                if (order.orderType == OrderType.SELL) {
                    userUsdcBalance[order.owner] += actualCollectEarn;
                    contractUsdcBalance += actualCollectEarn;
                } else {
                    userZetaBalance[order.owner] += actualCollectDec;
                    contractZetaBalance += actualCollectDec;
                }
                
                // Clean up
                removeOrderFromUserList(order.owner, i);
                delete orderToSlotMapping[i];
                emit OrderFilled(i, actualCollectDec, actualCollectEarn);
                anyOrdersCollected = true;
            }
        }
        
        // If any orders were collected or there are active orders, trigger next check
        if (anyOrdersCollected || totalOrders > 0) {
            triggerRemoteCallback(0); // Use 0 as a signal to check all orders
        }
    }

    // Gas-efficient order removal
    function removeOrderFromUserList(address user, uint256 orderId) internal virtual {
        uint256[] storage userOrderList = userLimitOrders[user];
        uint256 lastIndex = userOrderList.length - 1;
        for (uint256 i = 0; i <= lastIndex; i++) {
            if (userOrderList[i] == orderId) {
                if (i != lastIndex) {
                    userOrderList[i] = userOrderList[lastIndex];
                }
                userOrderList.pop();
                return;
            }
        }
    }

    // Events
    event OrderFilled(uint256 indexed orderId, uint256 amount0, uint256 amount1);

    // State variables that need to be accessible
    mapping(address => uint256) public userUsdcBalance;
    mapping(address => uint256) public userZetaBalance;
    uint256 public contractUsdcBalance;
    uint256 public contractZetaBalance;

    // Abstract functions that need to be implemented
    function triggerRemoteCallback(uint256 orderId) internal virtual;
}

contract ZetaOrderBookIzumi is UniversalContract, OrderManager {
    GatewayZEVM public immutable gateway;
    IZetaSwap public swapRouter;

    // USDC token address
    address public usdcToken;
    // External chain connector for the price check loop
    address public callbackChain;
    bytes public callbackAddress;
    // iZiSwap contract references
    ILimitOrderManager public limitOrderManager;
    IFactory public constant IZUMI_FACTORY = IFactory(0x8c7d3063579BdB0b90997e18A770eaE32E1eBb08);
    address public wzetaAddress;

    // Events
    event OrderCreated(uint256 indexed orderId, address indexed owner, OrderType orderType, uint256 amount, uint256 price);
    event OrderPlaced(uint256 indexed orderId, uint256 slotIdx);  // When order is placed in iZiSwap
    event OrderCancelled(uint256 indexed orderId);
    event SwapCompleted(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event UsdcDeposited(address indexed user, uint256 amount);
    event ZetaDeposited(address indexed user, uint256 amount);
    event UsdcWithdrawn(address indexed user, uint256 amount);
    event ZetaWithdrawn(address indexed user, uint256 amount);
    event HelloEvent(string, string);
    event RevertEvent(string, RevertContext);
    event AbortEvent(string, AbortContext);

    error TransferFailed();
    error Unauthorized();
    error InvalidOrder();
    error SwapFailed();
    error PriceCheckFailed();
    error OrderNotActive();
    error InsufficientFunds();

    modifier onlyGateway() {
        if (msg.sender != address(gateway)) revert Unauthorized();
        _;
    }

    modifier orderExists(uint256 orderId) {
        if (orderId >= nextOrderId || !orders[orderId].active) revert InvalidOrder();
        _;
    }

    constructor(
        address payable gatewayAddress,
        address swapRouterAddress,
        address _usdcToken,
        address _callbackChain,
        bytes memory _callbackAddress,
        address _limitOrderManagerAddress,
        address _wzetaAddress
    ) {
        gateway = GatewayZEVM(gatewayAddress);
        swapRouter = IZetaSwap(swapRouterAddress);
        usdcToken = _usdcToken;
        callbackChain = _callbackChain;
        callbackAddress = _callbackAddress;
        limitOrderManager = ILimitOrderManager(_limitOrderManagerAddress);
        wzetaAddress = _wzetaAddress;

        // Approve USDC and WZETA for the router and limit order manager, with checks
        if (!IZRC20(usdcToken).approve(address(swapRouter), type(uint256).max)) {
            revert TransferFailed();
        }
        if (!IZRC20(wzetaAddress).approve(address(swapRouter), type(uint256).max)) {
            revert TransferFailed();
        }
        if (!IZRC20(usdcToken).approve(address(limitOrderManager), type(uint256).max)) {
            revert TransferFailed();
        }
        if (!IZRC20(wzetaAddress).approve(address(limitOrderManager), type(uint256).max)) {
            revert TransferFailed();
        }

        // Verify approvals
        require(
            IZRC20(usdcToken).allowance(address(this), address(limitOrderManager)) == type(uint256).max,
            "USDC approval failed"
        );
        require(
            IZRC20(wzetaAddress).allowance(address(this), address(limitOrderManager)) == type(uint256).max,
            "WZETA approval failed"
        );
    }

    // Create a sell order for ZETA (native token)
    function createSellOrder(uint256 targetPrice, uint256 slippageBps) external {
        uint256 zetaAmount = userZetaBalance[msg.sender];
        if (zetaAmount == 0) revert InsufficientFunds();
        if (slippageBps > 1000) revert InvalidOrder();

        userZetaBalance[msg.sender] -= zetaAmount;

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            amount: uint128(zetaAmount),
            price: uint128(targetPrice),
            owner: msg.sender,
            slippage: uint32(slippageBps),
            orderType: OrderType.SELL,
            active: true
        });

        emit OrderCreated(orderId, msg.sender, OrderType.SELL, zetaAmount, targetPrice);
        placeOrder(orderId);
    }

    // Create a buy order with USDC
    function createBuyOrder(uint256 zetaAmount, uint256 targetPrice, uint256 slippageBps) external {
        uint256 usdcAmount = (zetaAmount * targetPrice) / 1e6;
        if (userUsdcBalance[msg.sender] < usdcAmount) revert InsufficientFunds();
        if (slippageBps > 1000) revert InvalidOrder();

        userUsdcBalance[msg.sender] -= usdcAmount;

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            amount: uint128(zetaAmount),
            price: uint128(targetPrice),
            owner: msg.sender,
            slippage: uint32(slippageBps),
            orderType: OrderType.BUY,
            active: true
        });

        emit OrderCreated(orderId, msg.sender, OrderType.BUY, zetaAmount, targetPrice);
        placeOrder(orderId);
    }

    // Cancel an order
    function cancelOrder(uint256 orderId) external orderExists(orderId) {
        Order storage order = orders[orderId];
        
        // Only owner can cancel
        if (order.owner != msg.sender) revert Unauthorized();
        
        // If the order has been sent to iZiSwap, need to handle cancellation
        uint128 slotIdx = orderToSlotMapping[orderId];
        if (slotIdx != 0) {
            // Try to cancel the limit order in iZiSwap
            try limitOrderManager.cancelLimOrder(uint256(slotIdx)) {
                // Successfully cancelled in iZiSwap
            } catch {
                // If cancellation fails, we'll still proceed with local cancellation
            }
        }
        
        // Mark as inactive
        order.active = false;
        
        // Return funds to owner's balance
        if (order.orderType == OrderType.SELL) {
            // Return ZETA to user's balance
            userZetaBalance[order.owner] += order.amount;
        } else {
            // Return USDC to user's balance
            uint256 usdcAmount = (order.amount * order.price) / 1e6;
            userUsdcBalance[order.owner] += usdcAmount;
        }
        
        // Remove from user's limit orders list
        removeOrderFromUserList(msg.sender, orderId);
        
        emit OrderCancelled(orderId);
    }

    // More efficient wrapping
    function wrapZeta(uint256 amount) internal {
        (bool success, ) = wzetaAddress.call{value: amount}("");
        if (!success) revert WrapFailed();
    }

    // Gas-efficient unwrapping
    function unwrapZeta(uint256 amount) internal {
        (bool success, ) = wzetaAddress.call(abi.encodeWithSignature("withdraw(uint256)", amount));
        if (!success) revert UnwrapFailed();
    }

    // Check if an order is ready to be collected
    function isOrderReadyToCollect(uint256 orderId) external view returns (bool) {
        uint128 slotIdx = orderToSlotMapping[orderId];
        if (slotIdx == 0) return false;
        (uint128 amount0, uint128 amount1) = limitOrderManager.getOrderAmount(uint256(slotIdx));
        return amount0 > 0 || amount1 > 0;
    }

    // Get detailed order status
    function getOrderStatus(uint256 orderId) external view returns (
        bool isActive,
        bool isExecuted,
        uint128 amount0,
        uint128 amount1,
        int24 point
    ) {
        Order storage order = orders[orderId];
        uint128 slotIdx = orderToSlotMapping[orderId];
        
        if (slotIdx == 0) {
            return (order.active, false, 0, 0, 0);
        }
        
        (amount0, amount1) = limitOrderManager.getOrderAmount(uint256(slotIdx));
        bool executed = amount0 > 0 || amount1 > 0;
        
        // Get pool and point
        address sellToken = order.orderType == OrderType.SELL ? wzetaAddress : usdcToken;
        address earnToken = order.orderType == OrderType.SELL ? usdcToken : wzetaAddress;
        IPool pool = IPool(getPoolAddress(sellToken, earnToken));
        (point, , , ) = pool.getPoolState();
        
        return (order.active, executed, amount0, amount1, point);
    }

    // Optimized price to point conversion
    function priceToPoint(uint256 price) internal pure returns (int24) {
        unchecked {
            // Convert price to undecimal price (1e6 -> 1.0)
            uint256 undecimalPrice = price * 1e12;
            
            // Calculate point using log base 1.0001
            uint256 log2Price = log2(undecimalPrice);
            uint256 log2Base = log2(10001);
            
            // Calculate point with proper rounding
            int24 point = int24(int256((log2Price * 1e6) / log2Base));
            
            // Validate point range
            if (point < -800000 || point > 800000) revert InvalidOrder();
            
            return point;
        }
    }

    // Optimized log2 calculation
    function log2(uint256 x) internal pure returns (uint256) {
        unchecked {
            if (x == 0) revert InvalidOrder();
            
            uint256 result = 0;
            uint256 xc = x;
            
            if (xc >= 0x100000000000000000000000000000000) { xc >>= 128; result += 128; }
            if (xc >= 0x10000000000000000) { xc >>= 64; result += 64; }
            if (xc >= 0x100000000) { xc >>= 32; result += 32; }
            if (xc >= 0x10000) { xc >>= 16; result += 16; }
            if (xc >= 0x100) { xc >>= 8; result += 8; }
            if (xc >= 0x10) { xc >>= 4; result += 4; }
            if (xc >= 0x4) { xc >>= 2; result += 2; }
            if (xc >= 0x2) { result += 1; }
            
            return result;
        }
    }

    // Place order in iZiSwap
    function placeOrder(uint256 orderId) internal {
        Order storage order = orders[orderId];
        order.active = false;

        // Get an empty slot for the limit order
        uint256 slotIdx = limitOrderManager.getDeactiveSlot(address(this));
        
        // Determine sell/earn tokens and point calculation
        address sellToken;
        address earnToken;
        int24 orderPoint;
        uint128 sellAmount;
        bool sellXEarnY;
        
        if (order.orderType == OrderType.SELL) {
            sellToken = wzetaAddress;
            earnToken = usdcToken;
            wrapZeta(order.amount);
            orderPoint = priceToPoint(order.price);
            sellAmount = uint128(order.amount);
            sellXEarnY = true;
        } else {
            sellToken = usdcToken;
            earnToken = wzetaAddress;
            orderPoint = priceToPoint(order.price);
            sellAmount = uint128((order.amount * order.price) / 1e6);
            sellXEarnY = false;
        }
        
        // Get pool and point delta
        IPool pool = IPool(getPoolAddress(sellToken, earnToken));
        int24 pointDelta = pool.pointDelta();
        
        // Round point based on token order and slippage
        unchecked {
            if (sellToken < earnToken) {
                orderPoint = (orderPoint / pointDelta) * pointDelta;
                orderPoint += int24(int256(uint256(order.slippage) * uint256(uint24(pointDelta)) / 10000));
            } else {
                orderPoint = ((orderPoint + pointDelta - 1) / pointDelta) * pointDelta;
                orderPoint -= int24(int256(uint256(order.slippage) * uint256(uint24(pointDelta)) / 10000));
            }
        }
        
        if (orderPoint < -800000 || orderPoint > 800000) revert InvalidPointRange();
        
        try limitOrderManager.addLimOrder(ILimitOrderManager.AddLimOrderParam({
            tokenX: sellToken,
            tokenY: earnToken,
            fee: 3000,
            pt: orderPoint,
            amount: sellAmount,
            sellXEarnY: sellXEarnY,
            deadline: block.timestamp + 1 days
        })) {
            orderToSlotMapping[orderId] = uint128(slotIdx);
            userLimitOrders[order.owner].push(orderId);
            emit OrderPlaced(orderId, slotIdx);
        } catch {
            if (order.orderType == OrderType.SELL) {
                userZetaBalance[order.owner] += order.amount;
            } else {
                uint256 usdcAmount = (order.amount * order.price) / 1e6;
                userUsdcBalance[order.owner] += usdcAmount;
            }
            order.active = true;
            revert SwapFailed();
        }
    }

    // Helper to get pool address
    function getPoolAddress(address tokenA, address tokenB) internal view returns (address) {
        // Sort tokens to get the correct pool address
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        // Use 0.3% fee tier (3000)
        return IZUMI_FACTORY.pool(token0, token1, 3000);
    }

    // Function to fetch user's limit orders
    function getUserLimitOrders(address user) external view returns (uint256[] memory) {
        return userLimitOrders[user];
    }

    // Deposit USDC to the contract
    function depositUsdc(uint256 amount) external {
        if (!IZRC20(usdcToken).transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }
        userUsdcBalance[msg.sender] += amount;
        contractUsdcBalance += amount;
        emit UsdcDeposited(msg.sender, amount);
    }

    // Deposit ZETA to the contract
    function depositZeta() external payable {
        if (msg.value == 0) revert InsufficientFunds();
        contractZetaBalance += msg.value;
        userZetaBalance[msg.sender] += msg.value;
        emit ZetaDeposited(msg.sender, msg.value);
    }

    // Withdraw USDC from the contract
    function withdrawUsdc(uint256 amount) external {
        if (userUsdcBalance[msg.sender] < amount) revert InsufficientFunds();
        if (contractUsdcBalance < amount) revert InsufficientFunds();
        
        userUsdcBalance[msg.sender] -= amount;
        contractUsdcBalance -= amount;
        
        if (!IZRC20(usdcToken).transfer(msg.sender, amount)) {
            revert TransferFailed();
        }
        emit UsdcWithdrawn(msg.sender, amount);
    }

    // Withdraw ZETA from the contract
    function withdrawZeta(uint256 amount) external {
        if (userZetaBalance[msg.sender] < amount) revert InsufficientFunds();
        if (contractZetaBalance < amount) revert InsufficientFunds();
        
        userZetaBalance[msg.sender] -= amount;
        contractZetaBalance -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            userZetaBalance[msg.sender] += amount;
            contractZetaBalance += amount;
            revert TransferFailed();
        }
        emit ZetaWithdrawn(msg.sender, amount);
    }

    // For receiving native ZETA
    receive() external payable {
        if (msg.value > 0) {
            contractZetaBalance += msg.value;
            userZetaBalance[msg.sender] += msg.value;
            emit ZetaDeposited(msg.sender, msg.value);
        }
    }

    // Universal contract functions
    function call(
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        CallOptions memory callOptions,
        RevertOptions memory revertOptions
    ) external {
        (, uint256 gasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(
            callOptions.gasLimit
        );
        if (!IZRC20(zrc20).transferFrom(msg.sender, address(this), gasFee)) {
            revert TransferFailed();
        }
        IZRC20(zrc20).approve(address(gateway), gasFee);
        gateway.call(receiver, zrc20, message, callOptions, revertOptions);
    }

    function onRevert(RevertContext calldata context) external onlyGateway {
        emit RevertEvent("Revert on ZetaChain", context);
    }

    function onAbort(AbortContext calldata context) external onlyGateway {
        emit AbortEvent("Abort on ZetaChain", context);
    }

    // Modify triggerRemoteCallback to handle batch checking
    function triggerRemoteCallback(uint256 orderId) internal override {
        CallOptions memory callOptions = CallOptions({
            gasLimit: 200000,
            isArbitraryCall: false
        });

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(0),
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: "",
            onRevertGasLimit: 200000
        });

        bytes memory message = abi.encodeWithSignature(
            "priceCheckCallback(uint256)",
            orderId
        );

        try gateway.call(
            callbackAddress,
            usdcToken,
            message,
            callOptions,
            revertOptions
        ) {
            // Success, loop initiated
        } catch {
            revert PriceCheckFailed();
        }
    }

    // Modify onCall to handle batch checking
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        if (message.length < 4) {
            emit HelloEvent("Hello on ZetaChain", "Received message");
            return;
        }

        bytes4 selector;
        assembly {
            selector := calldataload(message.offset)
            selector := shr(224, selector)
        }

        if (selector == bytes4(keccak256("priceCheckCallback(uint256)"))) {
            uint256 orderId;
            assembly {
                orderId := calldataload(add(message.offset, 4))
            }

            // If orderId is 0, check all orders
            if (orderId == 0) {
                checkAllOrdersAndTriggerLoop();
            } else if (orderId < nextOrderId && orders[orderId].active) {
                // For backward compatibility, still handle single order checks
                (bool isExecuted, , ) = checkOrderStatus(orderId);
                if (isExecuted) {
                    collectLimitOrder(orderId);
                }
                triggerRemoteCallback(orderId);
            }
        } else {
            emit HelloEvent("Hello on ZetaChain", "Received message");
        }
    }
} 