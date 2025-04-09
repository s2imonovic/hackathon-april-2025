// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {RevertContext, RevertOptions, AbortContext} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Replace IZetaSwap with these interfaces
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 limitSqrtPrice;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
    function exactInput(ExactInputParams calldata params) external returns (uint256 amountOut);
}

interface INativeSwapRouter {
    function wrapExactInputSingle(ISwapRouter.ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function unwrapExactInputSingle(ISwapRouter.ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

contract ZetaOrderBook is UniversalContract {
    using SafeERC20 for IERC20;
    
    GatewayZEVM public immutable gateway;
    IPyth public immutable pythOracle;
    INativeSwapRouter public swapRouter;

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

    // Connected gas token address
    address public immutable connectedGasZRC20;

    // Contract owner
    address public owner;

    enum OrderType { BUY, SELL }

    struct Order {
        uint256 id;
        address owner;
        uint256 amount;   // Amount of ZETA for sell orders or USDC for buy orders
        uint256 priceLow; // Target price low in USDC with 6 decimals
        uint256 priceHigh; // Target price high in USDC with 6 decimals
        uint256 slippage; // Slippage tolerance in basis points (1% = 100)
        OrderType orderType;
        bool active;
    }

    // Order storage
    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId = 1;
    mapping(address => uint256) public userActiveOrderId; // Track active order per user

    // User balances
    mapping(address => uint256) public userUsdcBalance;
    mapping(address => uint256) public userZetaBalance;
    mapping(address => uint256) public userUsdcBalanceLocked;
    mapping(address => uint256) public userZetaBalanceLocked;

    // Events
    event OrderCreated(uint256 indexed orderId, address indexed owner, OrderType orderType, uint256 amount, uint256 priceLow, uint256 priceHigh);
    event OrderExecuted(uint256 indexed orderId, uint256 executionPrice, OrderType orderType);
    event OrderCancelled(uint256 indexed orderId);
    event PriceChecked(uint256 indexed orderId, uint256 currentPrice, uint256 targetPriceLow, uint256 targetPriceHigh, bool conditionsMet);
    event SwapCompleted(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event UsdcDeposited(address indexed user, uint256 amount);
    event ZetaDeposited(address indexed user, uint256 amount);
    event UsdcWithdrawn(address indexed user, uint256 amount);
    event ZetaWithdrawn(address indexed user, uint256 amount);
    event HelloEvent(string, string);
    event RevertEvent(string, RevertContext);
    event AbortEvent(string, AbortContext);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ContractMigrated(address indexed newContract);
    event StateMigrated(address indexed newContract, uint256 nextOrderId);

    error TransferFailed();
    error Unauthorized();
    error InvalidOrder();
    error SwapFailed();
    error PriceCheckFailed();
    error OrderNotActive();
    error InsufficientFunds();
    error SlippageExceeded(uint256 expectedAmount, uint256 receivedAmount, uint256 slippageBps);
    error InvalidMigrationTarget();
    error MigrationInProgress();
    error NotMigratingContract();
    error MigrationTransferFailed();
    error MigrationPermanentlyDisabled();

    // State migration variables
    bool public isMigrating;
    address public migrationTarget;
    bool public migrationPermanentlyDisabled;

    modifier migrationEnabled() {
        if (migrationPermanentlyDisabled) revert MigrationPermanentlyDisabled();
        _;
    }

    modifier notMigrating() {
        if (isMigrating) revert MigrationInProgress();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

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
        bytes memory _callbackAddress,
        address _connectedGasZRC20,
        address _owner
    ) {
        gateway = GatewayZEVM(gatewayAddress);
        pythOracle = IPyth(pythOracleAddress);
        swapRouter = INativeSwapRouter(swapRouterAddress);
        usdcToken = _usdcToken;
        zetaPriceId = _zetaPriceId;
        callbackChain = _callbackChain;
        callbackAddress = _callbackAddress;
        connectedGasZRC20 = _connectedGasZRC20;
        owner = _owner;
        
        // Approve gateway to spend ETH.BASE for gas fees for loop function
        IZRC20(_connectedGasZRC20).approve(
            address(gateway),
            type(uint256).max
        );
    }

    // Transfer ownership to a new address
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // Get latest ZETA price from Pyth
    function getZetaPrice() public view returns (uint256, uint256) {
        PythStructs.Price memory price = pythOracle.getPriceUnsafe(zetaPriceId); // TODO: Only keep this for the demo
        // PythStructs.Price memory price = pythOracle.getPriceNoOlderThan(zetaPriceId, 120); // 2 minutes or less.
        
        return (uint256(uint64(price.price))/100, price.publishTime);
    }

    // Set migration state (can be used to cancel migration)
    function setMigrationState(bool _isMigrating, address _migrationTarget) external onlyOwner migrationEnabled {
        isMigrating = _isMigrating;
        migrationTarget = _migrationTarget;
    }

    // Deposit USDC to the contract
    function depositUsdc(uint256 amount) external notMigrating {
        if (!IZRC20(usdcToken).transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }
        userUsdcBalance[msg.sender] += amount;
        contractUsdcBalance += amount;
        emit UsdcDeposited(msg.sender, amount);
    }

    // Deposit ZETA to the contract
    function depositZeta() external payable notMigrating {
        if (msg.value == 0) revert InsufficientFunds();
        contractZetaBalance += msg.value;
        userZetaBalance[msg.sender] += msg.value;
        emit ZetaDeposited(msg.sender, msg.value);
    }

    // Withdraw all unlocked USDC from the contract
    function withdrawUsdc() external notMigrating {
        uint256 amount = userUsdcBalance[msg.sender];
        if (amount <= 0) revert InsufficientFunds();
        if (contractUsdcBalance < amount) revert InsufficientFunds();
        
        if (!IZRC20(usdcToken).transfer(msg.sender, amount)) {
            revert TransferFailed();
        }
        userUsdcBalance[msg.sender] -= amount;
        contractUsdcBalance -= amount;
        emit UsdcWithdrawn(msg.sender, amount);
    }

    // Withdraw ZETA from the contract
    function withdrawZeta() external notMigrating {
        uint256 amount = userZetaBalance[msg.sender];
        if (amount <= 0) revert InsufficientFunds();
        if (contractZetaBalance < amount) revert InsufficientFunds();
        
        // Use a payable function to send ZETA
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            // Revert the balance changes if transfer fails
            revert TransferFailed();
        }
        userZetaBalance[msg.sender] -= amount;
        contractZetaBalance -= amount;
        emit ZetaWithdrawn(msg.sender, amount);
    }

    // Create a sell order for ZETA (native token) for a specific orderId
    function _createSellOrder(uint256 targetPriceLow, uint256 targetPriceHigh, uint256 slippageBps, uint256 orderId) internal {
        // get the owner of the order
        address orderOwner = orders[orderId].owner;

        uint256 zetaToSellAmount = userZetaBalance[orderOwner];
        if (zetaToSellAmount == 0) revert InsufficientFunds();
        if (slippageBps > 1000) revert InvalidOrder(); // Max 10% slippage


        // Lock ZETA from user's balance
        userZetaBalance[orderOwner] -= zetaToSellAmount;
        userZetaBalanceLocked[orderOwner] += zetaToSellAmount;

        orders[orderId] = Order({
            id: orderId,
            owner: orderOwner, // maintain the owner of the order
            amount: zetaToSellAmount,
            priceLow: targetPriceLow,
            priceHigh: targetPriceHigh,
            slippage: slippageBps,
            orderType: OrderType.SELL,
            active: true
        });

        emit OrderCreated(orderId, orderOwner, OrderType.SELL, zetaToSellAmount, targetPriceLow, targetPriceHigh);

        // Check if order can be executed immediately
        checkAndExecuteOrder(orderId);
    }

    // Create a sell order for ZETA (native token)
    function createSellOrder(uint256 targetPriceLow, uint256 targetPriceHigh, uint256 slippageBps) external notMigrating {
        // Check if user already has an active order
        if (userActiveOrderId[msg.sender] != 0 && orders[userActiveOrderId[msg.sender]].active) {
            revert InvalidOrder();
        }

        // Create order
        uint256 orderId = nextOrderId++;
        // set the owner of the order
        orders[orderId].owner = msg.sender;
        userActiveOrderId[msg.sender] = orderId;
        _createSellOrder(targetPriceLow, targetPriceHigh, slippageBps, orderId);
    }

    // Create a buy order with USDC
    function _createBuyOrder(uint256 targetPriceLow, uint256 targetPriceHigh, uint256 slippageBps, uint256 orderId) internal {
        // get the owner of the order
        address orderOwner = orders[orderId].owner;
        uint256 usdcAmount = userUsdcBalance[orderOwner];
        uint256 zetaToBuyAmount = (usdcAmount / targetPriceLow) * 1e18; 

        if (slippageBps > 1000) revert InvalidOrder(); // Max 10% slippage

        // Lock USDC from user's balance
        userUsdcBalance[orderOwner] -= usdcAmount;
        userUsdcBalanceLocked[orderOwner] += usdcAmount;

        orders[orderId] = Order({
            id: orderId,
            owner: orderOwner, // maintain the owner of the order
            amount: zetaToBuyAmount,
            priceLow: targetPriceLow,
            priceHigh: targetPriceHigh,
            slippage: slippageBps,
            orderType: OrderType.BUY,
            active: true
        });

        emit OrderCreated(orderId, orderOwner, OrderType.BUY, zetaToBuyAmount, targetPriceLow, targetPriceHigh);

        // Check if order can be executed immediately
        checkAndExecuteOrder(orderId);
    }

    // Create a buy order with USDC
    function createBuyOrder(uint256 targetPriceLow, uint256 targetPriceHigh, uint256 slippageBps) external notMigrating {
        // Check if user already has an active order
        if (userActiveOrderId[msg.sender] != 0 && orders[userActiveOrderId[msg.sender]].active) {
            revert InvalidOrder();
        }

        uint256 usdcAmount = userUsdcBalance[msg.sender];

        // Check if user has enough USDC balance
        if (userUsdcBalance[msg.sender] < usdcAmount) revert InsufficientFunds();
        if (slippageBps > 1000) revert InvalidOrder(); // Max 10% slippage

        // Create order
        uint256 orderId = nextOrderId++;
        
        // set the owner of the order
        orders[orderId].owner = msg.sender;
        userActiveOrderId[msg.sender] = orderId;
        _createBuyOrder(targetPriceLow, targetPriceHigh, slippageBps, orderId);
    }

    function setupFollowupOrder(uint256 orderId, OrderType orderType) internal {
        // Unlock any locked ZETA and USDC from the user's balance so it is available for the next sell order or withdrawal
        address orderOwner = orders[orderId].owner;
        userZetaBalance[orderOwner] += userZetaBalanceLocked[orderOwner];
        userZetaBalanceLocked[orderOwner] = 0;
        userUsdcBalance[orderOwner] += userUsdcBalanceLocked[orderOwner];
        userUsdcBalanceLocked[orderOwner] = 0;

        // If the followup orderType is SELL, use the internal _createSellOrder function
        if (orderType == OrderType.SELL) {
            // sell all ZETA for USDC at the target price.
            _createSellOrder(orders[orderId].priceLow, orders[orderId].priceHigh, orders[orderId].slippage, orderId);
        } else {
            // buy ZETA for all USDC at the target price.
            _createBuyOrder(orders[orderId].priceLow, orders[orderId].priceHigh, orders[orderId].slippage, orderId);
        }
        orders[orderId].orderType = orderType;
    }

    // Cancel an order
    function cancelOrder(uint256 orderId) external orderExists(orderId) notMigrating {
        Order storage order = orders[orderId];
        address orderOwner = orders[orderId].owner;

        // Only owner can cancel
        if (orderOwner != msg.sender) revert Unauthorized();

        // Mark as inactive
        order.active = false;
        userActiveOrderId[msg.sender] = 0; // Clear user's active order
        
        // Unlock any locked ZETA and USDC from the user's balance so it is available for the next sell order or withdrawal
        userZetaBalance[orderOwner] += userZetaBalanceLocked[orderOwner];
        userZetaBalanceLocked[orderOwner] = 0;
        userUsdcBalance[orderOwner] += userUsdcBalanceLocked[orderOwner];
        userUsdcBalanceLocked[orderOwner] = 0;

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
            conditionsMet = currentPrice >= order.priceHigh;
        } else {
            // For buy orders, execute if current price <= target price
            conditionsMet = currentPrice <= order.priceLow;
        }

        emit PriceChecked(orderId, currentPrice, order.priceLow, order.priceHigh, conditionsMet); // TODO: Remove this because it will get noisy

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

        if (order.orderType == OrderType.SELL) {
            // SELL Order: Swap native ZETA for USDC
            // Calculate minimum USDC output based on order price and slippage
            uint256 minUsdcOutput = (order.amount * order.priceHigh * (10000 - order.slippage)) / 1e22;

            // Create params for wrapExactInputSingle
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: address(0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf), // WZETA
                tokenOut: usdcToken,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: order.amount,
                amountOutMinimum: minUsdcOutput,
                limitSqrtPrice: 0
            });

            try swapRouter.wrapExactInputSingle{value: order.amount}(params) returns (uint256 amountOut) {
                if (amountOut < minUsdcOutput) {
                    triggerPriceCheckLoop(orderId);
                    return;  // Exit without reverting
                }
                userUsdcBalance[order.owner] += amountOut; // increase available balance with the profit only
                userZetaBalanceLocked[order.owner] -= order.amount; // decrease locked balance with the amount of ZETA swapped.
                contractUsdcBalance += amountOut; // increase contract USDC holdings
                contractZetaBalance -= order.amount; // decrease contract ZETA holdings

                emit SwapCompleted(address(0), usdcToken, order.amount, amountOut);
                emit OrderExecuted(orderId, executionPrice, OrderType.SELL);

                // Flip order to BUY and increase userUsdcBalanceLocked (since the order is active)
                setupFollowupOrder(orderId, OrderType.BUY);
            } catch {
                // If swap fails, try again after another loop
                triggerPriceCheckLoop(orderId);
                return;  // Exit without reverting
            }
        } else {
            // BUY Order: Swap USDC for native ZETA
            // Calculate USDC amount to use
            uint256 usdcAmount = (order.amount * order.priceLow) / 1e18;
            
            // Calculate minimum ZETA output based on slippage
            uint256 minZetaOutput = (order.amount * (10000 - order.slippage)) / 10000;

            // Approve router
            IERC20(usdcToken).approve(address(swapRouter), usdcAmount);

            // Create params for unwrapExactInputSingle
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: usdcToken,
                tokenOut: address(0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf), // WZETA
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: usdcAmount,
                amountOutMinimum: minZetaOutput,
                limitSqrtPrice: 0
            });

            try swapRouter.unwrapExactInputSingle(params) returns (uint256 amountOut) {
                if (amountOut < minZetaOutput) {
                    IERC20(usdcToken).approve(address(swapRouter), 0);  // Reset approval
                    triggerPriceCheckLoop(orderId);
                    return;  // Exit without reverting
                }
                userZetaBalance[order.owner] += amountOut; // increase available balance
                userUsdcBalanceLocked[order.owner] -= usdcAmount; // decrease locked balance with the amount of ZETA swapped.
                contractZetaBalance += amountOut; // increase contract ZETA holdings
                contractUsdcBalance -= usdcAmount; // decrease contract USDC holdings

                IERC20(usdcToken).approve(address(swapRouter), 0);  // Reset approval
                emit SwapCompleted(usdcToken, address(0), usdcAmount, amountOut);
                emit OrderExecuted(orderId, executionPrice, OrderType.BUY);
                // Flip order to SELL and increase userZetaBalanceLocked (since the order is active)
                setupFollowupOrder(orderId, OrderType.SELL);
            } catch {
                // If swap fails, try again after another loop
                IERC20(usdcToken).approve(address(swapRouter), 0);  // Reset approval
                triggerPriceCheckLoop(orderId);
                return;  // Exit without reverting
            }
        }
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

        // Query gas fee for the call
        (, uint256 gasFee) = IZRC20(connectedGasZRC20).withdrawGasFeeWithGasLimit(callOptions.gasLimit);
        
        // Ensure we have enough balance
        if (IZRC20(connectedGasZRC20).balanceOf(address(this)) < gasFee) {
            revert InsufficientFunds();
        }

        // Approve gateway to spend gas fee
        IZRC20(connectedGasZRC20).approve(address(gateway), gasFee); // TODO: Is this the best way to do this? Note: Constructor currently sets max possible approval.

        bytes memory message = abi.encodeWithSignature(
            "priceCheckCallback(uint256)",
            orderId
        );

        // Convert callbackAddress to bytes
        bytes memory receiver = abi.encodePacked(callbackAddress);

        // Call the external contract to trigger the loop
        try gateway.call(
            receiver,
            connectedGasZRC20,
            message,
            callOptions,
            revertOptions
        ) {
            IZRC20(connectedGasZRC20).approve(address(gateway), 0);
            // Success, loop initiated
            // emit HelloEvent("ZetaHopper", "Outbound Callback");
        } catch {
            IZRC20(connectedGasZRC20).approve(address(gateway), 0);
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
            selector = bytes4(message[:4]);
        }

        if (selector == bytes4(keccak256("checkAndExecuteOrder(uint256)"))) {
            // This is the Price check callback from external chain
            // Skip the first 4 bytes (function selector) and decode the orderId
            uint256 orderId = abi.decode(message[4:], (uint256));

            // Check if order is active
            if (orders[orderId].active) {
                // Re-check order conditions
                checkAndExecuteOrder(orderId);
            }
        } else {
            // Simple string handling for the hello message
            emit HelloEvent("Hello on ZetaChain", "Received message");
        }
    }

    // Sweep connected gas token back to owner
    function sweepConnectedGas() external onlyOwner {
        uint256 balance = IZRC20(connectedGasZRC20).balanceOf(address(this));
        if (balance == 0) revert InsufficientFunds();
        
        if (!IZRC20(connectedGasZRC20).transfer(owner, balance)) {
            revert TransferFailed();
        }
    }

    // Migrate contract state and funds to a new contract
    function migrateToNewContract(address newContract) external onlyOwner migrationEnabled {
        if (newContract == address(0)) revert InvalidMigrationTarget();
        if (isMigrating) revert MigrationInProgress();
        
        isMigrating = true;
        migrationTarget = newContract;
        
        // Transfer all USDC to new contract
        if (contractUsdcBalance > 0) {
            if (!IZRC20(usdcToken).transfer(newContract, contractUsdcBalance)) {
                isMigrating = false;
                migrationTarget = address(0);
                revert TransferFailed();
            }
        }

        // Transfer all ZETA to new contract
        if (contractZetaBalance > 0) {
            (bool success, ) = payable(newContract).call{value: contractZetaBalance}("");
            if (!success) {
                isMigrating = false;
                migrationTarget = address(0);
                revert TransferFailed();
            }
        }

        // Transfer all connected gas token to new contract
        uint256 gasBalance = IZRC20(connectedGasZRC20).balanceOf(address(this));
        if (gasBalance > 0) {
            if (!IZRC20(connectedGasZRC20).transfer(newContract, gasBalance)) {
                isMigrating = false;
                migrationTarget = address(0);
                revert TransferFailed();
            }
        }

        // Emit migration event
        emit ContractMigrated(newContract);
    }

    // Function to be called by the new contract to receive state
    function receiveMigrationState(
        uint256 _nextOrderId,
        Order[] calldata _orders,
        address[] calldata _users,
        uint256[] calldata _userUsdcBalances,
        uint256[] calldata _userZetaBalances,
        uint256[] calldata _userUsdcBalancesLocked,
        uint256[] calldata _userZetaBalancesLocked,
        uint256[] calldata _userActiveOrderIds
    ) external {
        if (!isMigrating || msg.sender != migrationTarget) revert NotMigratingContract();
        
        // Set next order ID
        nextOrderId = _nextOrderId;
        
        // Migrate orders
        for (uint256 i = 0; i < _orders.length; i++) {
            orders[i] = _orders[i];
        }
        
        // Migrate user balances and active order IDs
        for (uint256 i = 0; i < _users.length; i++) {
            userUsdcBalance[_users[i]] = _userUsdcBalances[i];
            userZetaBalance[_users[i]] = _userZetaBalances[i];
            userUsdcBalanceLocked[_users[i]] = _userUsdcBalancesLocked[i];
            userZetaBalanceLocked[_users[i]] = _userZetaBalancesLocked[i];
            userActiveOrderId[_users[i]] = _userActiveOrderIds[i];
        }
        
        // Reset migration state
        isMigrating = false;
        migrationTarget = address(0);
        
        emit StateMigrated(msg.sender, _nextOrderId);
    }

    // Function to get all active orders for migration
    function getActiveOrders() external view returns (Order[] memory) {
        Order[] memory activeOrders = new Order[](nextOrderId);
        for (uint256 i = 0; i < nextOrderId; i++) {
            if (orders[i].active) {
                activeOrders[i] = orders[i];
            }
        }
        return activeOrders;
    }

    // Function to get all users with non-zero balances for migration
    function getUsersWithBalances() external view returns (
        address[] memory users,
        uint256[] memory usdcBalances,
        uint256[] memory zetaBalances,
        uint256[] memory usdcBalancesLocked,
        uint256[] memory zetaBalancesLocked,
        uint256[] memory activeOrderIds
    ) {
        // Count users with non-zero balances
        uint256 count = 0;
        for (uint256 i = 0; i < nextOrderId; i++) {
            if (orders[i].active) {
                address user = orders[i].owner;
                if (userUsdcBalance[user] > 0 || userZetaBalance[user] > 0 ||
                    userUsdcBalanceLocked[user] > 0 || userZetaBalanceLocked[user] > 0) {
                    count++;
                }
            }
        }

        // Initialize arrays
        users = new address[](count);
        usdcBalances = new uint256[](count);
        zetaBalances = new uint256[](count);
        usdcBalancesLocked = new uint256[](count);
        zetaBalancesLocked = new uint256[](count);
        activeOrderIds = new uint256[](count);

        // Fill arrays
        uint256 index = 0;
        for (uint256 i = 0; i < nextOrderId; i++) {
            if (orders[i].active) {
                address user = orders[i].owner;
                if (userUsdcBalance[user] > 0 || userZetaBalance[user] > 0 ||
                    userUsdcBalanceLocked[user] > 0 || userZetaBalanceLocked[user] > 0) {
                    users[index] = user;
                    usdcBalances[index] = userUsdcBalance[user];
                    zetaBalances[index] = userZetaBalance[user];
                    usdcBalancesLocked[index] = userUsdcBalanceLocked[user];
                    zetaBalancesLocked[index] = userZetaBalanceLocked[user];
                    activeOrderIds[index] = userActiveOrderId[user];
                    index++;
                }
            }
        }

        return (users, usdcBalances, zetaBalances, usdcBalancesLocked, zetaBalancesLocked, activeOrderIds);
    }

    // For receiving native ZETA and connected gas token
    receive() external payable {
        // When receiving ZETA directly (not through depositZeta), add it to the contract's balance and sender's balance
        if (msg.value > 0) {
            if (isMigrating) {
                // During migration, forward all incoming ZETA to the migration target
                (bool success, ) = payable(migrationTarget).call{value: msg.value}("");
                if (!success) revert MigrationTransferFailed();
            } else {
                contractZetaBalance += msg.value;
                userZetaBalance[msg.sender] += msg.value;
                emit ZetaDeposited(msg.sender, msg.value);
            }
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

    // Permanently disable migration functionality
    function disableMigration() external onlyOwner {
        if (isMigrating) revert MigrationInProgress();
        migrationPermanentlyDisabled = true;
    }
}