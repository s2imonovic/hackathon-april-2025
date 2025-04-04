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

    // USDC token address
    address public usdcToken;
    // Pyth price feed IDs
    bytes32 public zetaPriceId;
    // External chain connector for the price check loop
    address public callbackChain;
    bytes public callbackAddress;

    // Contract balances
    uint256 public contractZetaBalance;
    uint256 public contractUsdcBalance;

    enum OrderType { BUY, SELL }

    struct Order {
        uint256 id;
        address owner;
        uint256 amount;   // Amount of ZETA for sell orders or USDC for buy orders
        uint256 price;    // Target price in USDC with 6 decimals
        uint256 slippage; // Slippage tolerance in basis points (1% = 100)
        OrderType orderType;
        bool active;
    }

    // Order storage
    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId = 1;

    // User balances
    mapping(address => uint256) public userUsdcBalance;
    mapping(address => uint256) public userZetaBalance;

    // Events
    event OrderCreated(uint256 indexed orderId, address indexed owner, OrderType orderType, uint256 amount, uint256 price);
    event OrderExecuted(uint256 indexed orderId, uint256 executionPrice);
    event OrderCancelled(uint256 indexed orderId);
    event PriceChecked(uint256 indexed orderId, uint256 currentPrice, uint256 targetPrice, bool conditionsMet);
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
        address pythOracleAddress,
        address swapRouterAddress,
        address _usdcToken,
        bytes32 _zetaPriceId,
        address _callbackChain,
        bytes memory _callbackAddress
    ) {
        gateway = GatewayZEVM(gatewayAddress);
        pythOracle = IPyth(pythOracleAddress);
        swapRouter = IZetaSwap(swapRouterAddress);
        usdcToken = _usdcToken;
        zetaPriceId = _zetaPriceId;
        callbackChain = _callbackChain;
        callbackAddress = _callbackAddress;

        // Approve USDC for the router
        IZRC20(usdcToken).approve(address(swapRouter), type(uint256).max);
    }

    // Get latest ZETA price from Pyth
    function getZetaPrice() public view returns (uint256, uint256) {
        PythStructs.Price memory price = pythOracle.getPriceUnsafe(zetaPriceId); // TODO: Only keep this for the demo
        // PythStructs.Price memory price = pythOracle.getPriceNoOlderThan(zetaPriceId, 120); // 2 minutes or less.
        return (uint256(uint64(price.price)), price.publishTime);
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
        
        // Use a payable function to send ZETA
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            // Revert the balance changes if transfer fails
            userZetaBalance[msg.sender] += amount;
            contractZetaBalance += amount;
            revert TransferFailed();
        }
        emit ZetaWithdrawn(msg.sender, amount);
    }

    // Create a sell order for ZETA (native token)
    function createSellOrder(uint256 targetPrice, uint256 slippageBps) external {
        uint256 zetaAmount = userZetaBalance[msg.sender];
        if (zetaAmount == 0) revert InsufficientFunds();
        if (slippageBps > 1000) revert InvalidOrder(); // Max 10% slippage

        // Deduct ZETA from user's balance
        userZetaBalance[msg.sender] -= zetaAmount;

        // Create order
        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            amount: zetaAmount,
            price: targetPrice,
            slippage: slippageBps,
            orderType: OrderType.SELL,
            active: true
        });

        emit OrderCreated(orderId, msg.sender, OrderType.SELL, zetaAmount, targetPrice);

        // Check if order can be executed immediately
        checkAndExecuteOrder(orderId);
    }

    // Create a buy order with USDC
    function createBuyOrder(uint256 zetaAmount, uint256 targetPrice, uint256 slippageBps) external {
        // Calculate the required USDC amount
        uint256 usdcAmount = (zetaAmount * targetPrice) / 1e6;

        // Check if user has enough USDC balance
        if (userUsdcBalance[msg.sender] < usdcAmount) revert InsufficientFunds();
        if (slippageBps > 1000) revert InvalidOrder(); // Max 10% slippage

        // Deduct USDC from user's balance
        userUsdcBalance[msg.sender] -= usdcAmount;

        // Create order
        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            amount: zetaAmount,
            price: targetPrice,
            slippage: slippageBps,
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

        // Return funds to owner's balance
        if (order.orderType == OrderType.SELL) {
            // Return ZETA to user's balance
            userZetaBalance[order.owner] += order.amount;
        } else {
            // Return USDC to user's balance
            uint256 usdcAmount = (order.amount * order.price) / 1e6;
            userUsdcBalance[order.owner] += usdcAmount;
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
            // SELL Order: Swap native ZETA for USDC
            // Calculate minimum USDC output based on order price and slippage
            uint256 minUsdcOutput = (order.amount * order.price * (10000 - order.slippage)) / (1e6 * 10000);

            // Path for swap
            address[] memory path = new address[](2);
            path[0] = address(0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf); // WZETA
            path[1] = usdcToken;

            // Ensure contract has enough native ZETA
            if (address(this).balance < order.amount) {
                order.active = true;
                revert InsufficientFunds();
            }

            try swapRouter.swapExactETHForTokens{value: order.amount}(
                minUsdcOutput,
                path,
                address(this),
                block.timestamp + 15 minutes
            ) returns (uint256[] memory amounts) {
                // Add USDC to user's balance and contract's balance
                userUsdcBalance[order.owner] += amounts[1];
                contractUsdcBalance += amounts[1];
                emit SwapCompleted(address(0), usdcToken, order.amount, amounts[1]);
            } catch {
                // If swap fails, return ZETA to user's balance and restore order
                userZetaBalance[order.owner] += order.amount;
                order.active = true;
                revert SwapFailed();
            }
        } else {
            // BUY Order: Swap USDC for native ZETA
            // Calculate USDC amount to use
            uint256 usdcAmount = (order.amount * order.price) / 1e6;
            
            // Calculate minimum ZETA output based on slippage
            uint256 minZetaOutput = (order.amount * (10000 - order.slippage)) / 10000;

            // Path for swap
            address[] memory path = new address[](2);
            path[0] = usdcToken;
            path[1] = address(0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf); // WZETA

            // Ensure contract has enough USDC
            if (contractUsdcBalance < usdcAmount) {
                order.active = true;
                revert InsufficientFunds();
            }

            try swapRouter.swapExactTokensForETH(
                usdcAmount,
                minZetaOutput,
                path,
                address(this),
                block.timestamp + 15 minutes
            ) returns (uint256[] memory amounts) {
                // Add ZETA to user's balance and contract's balance
                userZetaBalance[order.owner] += amounts[1];
                contractZetaBalance += amounts[1];
                emit SwapCompleted(usdcToken, address(0), usdcAmount, amounts[1]);
            } catch {
                // If swap fails, return USDC to user's balance and restore order
                userUsdcBalance[order.owner] += usdcAmount;
                order.active = true;
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

        (, uint256 gasFee) = IZRC20(usdcToken).withdrawGasFeeWithGasLimit(
            callOptions.gasLimit
        );
        if (!IZRC20(usdcToken).transferFrom(msg.sender, address(this), gasFee)) {
            revert TransferFailed();
        }
        IZRC20(usdcToken).approve(address(gateway), gasFee);

        // Call the external contract to trigger the loop
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
    receive() external payable {
        // When receiving ZETA directly (not through depositZeta), add it to the contract's balance and sender's balance
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
}
