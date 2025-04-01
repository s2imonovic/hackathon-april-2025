// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {RevertContext, RevertOptions, AbortContext} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

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

contract ZetaOrderBook is UniversalContract {
    GatewayZEVM public immutable gateway;
    IPyth public immutable pythOracle;
    IZetaSwap public swapRouter;

    // USDT token address
    address public usdtToken;
    // Pyth price feed IDs
    bytes32 public zetaPriceId;
    // External chain connector for the price check loop
    address public callbackChain;
    bytes public callbackAddress;

    enum OrderType { BUY, SELL }

    struct Order {
        uint256 id;
        address owner;
        uint256 amount;   // Amount of ZETA for sell orders or USDT for buy orders
        uint256 price;    // Target price in USDT with 6 decimals
        OrderType orderType;
        bool active;
    }

    // Order storage
    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId = 1;

    // Events
    event OrderCreated(uint256 indexed orderId, address indexed owner, OrderType orderType, uint256 amount, uint256 price);
    event OrderExecuted(uint256 indexed orderId, uint256 executionPrice);
    event OrderCancelled(uint256 indexed orderId);
    event PriceChecked(uint256 indexed orderId, uint256 currentPrice, uint256 targetPrice, bool conditionsMet);
    event SwapCompleted(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
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
        address pythOracleAddress,
        address swapRouterAddress,
        address _usdtToken,
        bytes32 _zetaPriceId,
        address _callbackChain,
        bytes memory _callbackAddress
    ) {
        gateway = GatewayZEVM(gatewayAddress);
        pythOracle = IPyth(pythOracleAddress);
        swapRouter = IZetaSwap(swapRouterAddress);
        usdtToken = _usdtToken;
        zetaPriceId = _zetaPriceId;
        callbackChain = _callbackChain;
        callbackAddress = _callbackAddress;
    }

    // Get latest ZETA price from Pyth
    function getZetaPrice() public view returns (uint256, uint256) {
        PythStructs.Price memory price = pythOracle.getPriceUnsafe(zetaPriceId);
        return (uint256(uint64(price.price)), price.publishTime);
    }

    // Create a sell order for ZETA (native token)
    function createSellOrder(uint256 targetPrice) external payable {
        require(msg.value > 0, "No ZETA sent");

        // Create order
        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            amount: msg.value,
            price: targetPrice,
            orderType: OrderType.SELL,
            active: true
        });

        emit OrderCreated(orderId, msg.sender, OrderType.SELL, msg.value, targetPrice);

        // Check if order can be executed immediately
        checkAndExecuteOrder(orderId);
    }

    // Create a buy order with USDT
    function createBuyOrder(uint256 zetaAmount, uint256 targetPrice) external {
        // Calculate the required USDT amount
        uint256 usdtAmount = (zetaAmount * targetPrice) / 1e6; // Assuming USDT has 6 decimals

        // Transfer USDT from user to this contract
        if (!IZRC20(usdtToken).transferFrom(msg.sender, address(this), usdtAmount)) {
            revert TransferFailed();
        }

        // Create order
        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            amount: zetaAmount, // Amount of ZETA to buy
            price: targetPrice,  // Price willing to pay per ZETA
            orderType: OrderType.BUY,
            active: true
        });

        emit OrderCreated(orderId, msg.sender, OrderType.BUY, zetaAmount, targetPrice);

        // Check if order can be executed immediately
        checkAndExecuteOrder(orderId);
    }

    // Cancel an order
    function cancelOrder(uint256 orderId) external orderExists(orderId) {
        Order storage order = orders[orderId];

        // Only owner can cancel
        if (order.owner != msg.sender) revert Unauthorized();

        // Mark as inactive
        order.active = false;

        // Return funds to owner
        if (order.orderType == OrderType.SELL) {
            // Return native ZETA
            (bool success, ) = order.owner.call{value: order.amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Return USDT
            uint256 usdtAmount = (order.amount * order.price) / 1e6;
            if (!IZRC20(usdtToken).transfer(order.owner, usdtAmount)) {
                revert TransferFailed();
            }
        }

        emit OrderCancelled(orderId);
    }

    // Main function to check if an order can be executed
    function checkAndExecuteOrder(uint256 orderId) public orderExists(orderId) {
        Order storage order = orders[orderId];

        // Get current ZETA price
        (uint256 currentPrice, ) = getZetaPrice();

        bool conditionsMet = false;

        // Check conditions based on order type
        if (order.orderType == OrderType.SELL) {
            // For sell orders, execute if current price >= target price
            conditionsMet = currentPrice >= order.price;
        } else {
            // For buy orders, execute if current price <= target price
            conditionsMet = currentPrice <= order.price;
        }

        emit PriceChecked(orderId, currentPrice, order.price, conditionsMet);

        if (conditionsMet) {
            // Execute the order
            executeOrder(orderId, currentPrice);
        } else {
            // Start the cross-chain loop for continuous price checking
            triggerPriceCheckLoop(orderId);
        }
    }

    // Execute an order
    function executeOrder(uint256 orderId, uint256 executionPrice) internal {
        Order storage order = orders[orderId];

        // Mark order as inactive
        order.active = false;

        if (order.orderType == OrderType.SELL) {
            // SELL Order: Swap native ZETA for USDT

            // Path for swap
            address[] memory path = new address[](2);
            path[0] = address(0); // For swapExactETHForTokens, first path element is ignored but conventionally address(0) or WETH address
            path[1] = usdtToken;

            try swapRouter.swapExactETHForTokens{value: order.amount}(
                0, // Min output
                path,
                order.owner, // Send directly to owner
                block.timestamp + 15 minutes
            ) returns (uint256[] memory amounts) {
                emit SwapCompleted(address(0), usdtToken, order.amount, amounts[1]);
            } catch {
                revert SwapFailed();
            }
        } else {
            // BUY Order: Swap USDT for native ZETA

            // Calculate USDT amount to use
            uint256 usdtAmount = (order.amount * order.price) / 1e6;

            // Approve router
            IZRC20(usdtToken).approve(address(swapRouter), usdtAmount);

            // Path for swap
            address[] memory path = new address[](2);
            path[0] = usdtToken;
            path[1] = address(0); // For swapExactTokensForETH, last element is ignored but conventionally address(0) or WETH address

            try swapRouter.swapExactTokensForETH(
                usdtAmount,
                0, // Min output
                path,
                order.owner, // Send directly to owner
                block.timestamp + 15 minutes
            ) returns (uint256[] memory amounts) {
                emit SwapCompleted(usdtToken, address(0), usdtAmount, amounts[1]);
            } catch {
                revert SwapFailed();
            }
        }

        emit OrderExecuted(orderId, executionPrice);
    }

    // Start the cross-chain loop for price checking
    function triggerPriceCheckLoop(uint256 orderId) internal {
        // Create call options
        CallOptions memory callOptions = CallOptions({
            gasLimit: 200000,
            isArbitraryCall: false
        });

        // Create revert options with updated struct format
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(0),
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: "",
            onRevertGasLimit: 200000
        });

        // Message for the external contract
        bytes memory message = abi.encodeWithSignature(
            "priceCheckCallback(uint256)",
            orderId
        );

        // Call the external contract to trigger the loop
        try gateway.call(
            callbackAddress,
            usdtToken,
            message,
            callOptions,
            revertOptions
        ) {
            // Success, loop initiated
        } catch {
            revert PriceCheckFailed();
        }
    }

    // Main entry point for cross-chain messages
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        // Extract the function selector from the message
        bytes4 selector;
        if (message.length >= 4) {
            // Fixed: Use proper calldata access
            bytes4 tempSelector;
            assembly {
            // Load the first 4 bytes from calldata position message.offset
                tempSelector := calldataload(message.offset)
            }
            // Shift right by 28 bytes (224 bits) to get just the first 4 bytes
            selector = tempSelector >> 224;
        }

        if (selector == bytes4(keccak256("priceCheckCallback(uint256)"))) {
            // Price check callback from external chain
            // Skip the first 4 bytes (function selector) and decode the orderId
            uint256 orderId;
            assembly {
            // Load from calldata at position message.offset + 4 (skipping selector)
                orderId := calldataload(add(message.offset, 4))
            }

            // Check if order still exists and is active
            if (orderId < nextOrderId && orders[orderId].active) {
                // Re-check order conditions
                checkAndExecuteOrder(orderId);
            }
        } else {
            // Simple string handling for the hello message
            emit HelloEvent("Hello on ZetaChain", "Received message");
        }
    }

    // For receiving native ZETA
    receive() external payable {}

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
}