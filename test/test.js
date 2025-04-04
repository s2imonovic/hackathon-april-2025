const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require("bignumber.js");

describe("ZetaOrderBookIzumi", function () {
    let orderBook;
    let owner;
    let user1;
    let user2;
    let mockGateway;
    let mockSwapRouter;
    let mockUSDC;
    let mockLimitOrderManager;
    let mockWZETA;
    let mockFactory;
    let mockPool;

    // Mock data
    const callbackChain = "0x1234567890123456789012345678901234567890";
    const callbackAddress = "0x1234567890abcdef1234567890abcdef12345678";

    beforeEach(async function () {
        // Get signers
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock contracts
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
        mockWZETA = await MockERC20.deploy("Wrapped ZETA", "WZETA", 18);

        // Setup mock gateway
        const MockGateway = await ethers.getContractFactory("MockGateway");
        mockGateway = await MockGateway.deploy();

        // Setup mock swap router
        const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
        mockSwapRouter = await MockSwapRouter.deploy();

        // Setup mock limit order manager
        const MockLimitOrderManager = await ethers.getContractFactory("MockLimitOrderManager");
        mockLimitOrderManager = await MockLimitOrderManager.deploy();

        // Setup mock factory and pool
        const MockFactory = await ethers.getContractFactory("MockFactory");
        mockFactory = await MockFactory.deploy();

        const MockPool = await ethers.getContractFactory("MockPool");
        mockPool = await MockPool.deploy();

        // Setup factory to return the mock pool
        await mockFactory.setPool(mockPool.target);

        // Deploy order book contract
        const ZetaOrderBook = await ethers.getContractFactory("ZetaOrderBookIzumi");
        orderBook = await ZetaOrderBook.deploy(
            mockGateway.target,
            mockSwapRouter.target,
            mockUSDC.target,
            callbackChain,
            callbackAddress,
            mockLimitOrderManager.target,
            mockWZETA.target
        );

        // Mint some tokens to users for testing
        await mockUSDC.mint(user1.address, ethers.parseUnits("10000", 6));
        await mockUSDC.mint(user2.address, ethers.parseUnits("10000", 6));

        // Approve orderBook to spend tokens
        await mockUSDC.connect(user1).approve(orderBook.target, ethers.MaxUint256);
        await mockUSDC.connect(user2).approve(orderBook.target, ethers.MaxUint256);
    });

    describe("Deposit and Withdrawal", function () {
        it("Should allow USDC deposits", async function () {
            const depositAmount = ethers.parseUnits("1000", 6);

            await orderBook.connect(user1).depositUsdc(depositAmount);

            expect(await orderBook.userUsdcBalance(user1.address)).to.equal(depositAmount);
            expect(await orderBook.contractUsdcBalance()).to.equal(depositAmount);
        });

        it("Should allow ZETA deposits", async function () {
            const depositAmount = ethers.parseEther("1");

            await orderBook.connect(user1).depositZeta({ value: depositAmount });

            expect(await orderBook.userZetaBalance(user1.address)).to.equal(depositAmount);
            expect(await orderBook.contractZetaBalance()).to.equal(depositAmount);
        });

        it("Should allow USDC withdrawals", async function () {
            const depositAmount = ethers.parseUnits("1000", 6);
            const withdrawAmount = ethers.parseUnits("500", 6);

            await orderBook.connect(user1).depositUsdc(depositAmount);
            await orderBook.connect(user1).withdrawUsdc(withdrawAmount);

            expect(await orderBook.userUsdcBalance(user1.address)).to.equal(depositAmount - withdrawAmount);
            expect(await orderBook.contractUsdcBalance()).to.equal(depositAmount - withdrawAmount);
        });

        it("Should allow ZETA withdrawals", async function () {
            const depositAmount = ethers.parseEther("1");
            const withdrawAmount = ethers.parseEther("0.5");

            await orderBook.connect(user1).depositZeta({ value: depositAmount });

            const balanceBefore = await ethers.provider.getBalance(user1.address);
            const tx = await orderBook.connect(user1).withdrawZeta(withdrawAmount);

            expect(await orderBook.userZetaBalance(user1.address)).to.equal(depositAmount - withdrawAmount);
            expect(await orderBook.contractZetaBalance()).to.equal(depositAmount - withdrawAmount);

            // Check that user received ZETA (accounting for gas costs)
            const balanceAfter = await ethers.provider.getBalance(user1.address);
            expect(balanceAfter).to.be.closeTo(
                balanceBefore + withdrawAmount,
                ethers.parseEther("0.001")
            );
        });

        it("Should revert USDC withdrawal if insufficient balance", async function () {
            const depositAmount = ethers.parseUnits("100", 6);
            const withdrawAmount = ethers.parseUnits("200", 6);

            await orderBook.connect(user1).depositUsdc(depositAmount);

            await expect(
                orderBook.connect(user1).withdrawUsdc(withdrawAmount)
            ).to.be.revertedWithCustomError(orderBook, "InsufficientFunds");
        });
    });

    describe("Order Creation", function () {
        it("Should create a sell order", async function () {
            const depositAmount = ethers.parseEther("1");
            const targetPrice = ethers.parseUnits("5", 6); // 5 USDC per ZETA
            const slippageBps = 50; // 0.5%

            // Setup order manager mock
            await mockLimitOrderManager.setDeactiveSlot(1);

            // Setup pool mock for price to point conversion
            await mockPool.setCurrentPoint(1000);
            await mockPool.setPointDelta(1);

            // Deposit ZETA first
            // await orderBook.connect(user1).depositZeta({ value: depositAmount });

            // Create the sell order
            // const tx = await orderBook.connect(user1).createSellOrder(targetPrice, slippageBps);
            // const receipt = await tx.wait();

            // // Check the events
            // const orderCreatedEvent = receipt.events?.find(e => e.event === "OrderCreated");
            // expect(orderCreatedEvent).to.not.be.undefined;
            // expect(orderCreatedEvent.args.orderType).to.equal(0); // SELL
            // expect(orderCreatedEvent.args.amount).to.equal(depositAmount);
            // expect(orderCreatedEvent.args.price).to.equal(targetPrice);
            //
            // // Check that user's ZETA balance is reduced
            // expect(await orderBook.userZetaBalance(user1.address)).to.equal(0);
        });

        it("Should create a buy order", async function () {
            const depositAmount = ethers.parseUnits("5000", 6); // 5000 USDC
            const zetaAmount = ethers.parseEther("1");
            const targetPrice = ethers.parseUnits("5", 6); // 5 USDC per ZETA
            const slippageBps = 50; // 0.5%

            // Setup order manager mock
            await mockLimitOrderManager.setDeactiveSlot(1);

            // Setup pool mock for price to point conversion
            await mockPool.setCurrentPoint(1000);
            await mockPool.setPointDelta(1);

            // Deposit USDC first
            await orderBook.connect(user1).depositUsdc(depositAmount);

            // Create the buy order
            const tx = await orderBook.connect(user1).createBuyOrder(zetaAmount, targetPrice, slippageBps);
            const receipt = await tx.wait();

            // Check the events
            const orderCreatedEvent = receipt.events?.find(e => e.event === "OrderCreated");
            expect(orderCreatedEvent).to.not.be.undefined;
            expect(orderCreatedEvent.args.orderType).to.equal(1); // BUY
            expect(orderCreatedEvent.args.amount).to.equal(zetaAmount);
            expect(orderCreatedEvent.args.price).to.equal(targetPrice);

            // Check that user's USDC balance is reduced by the correct amount
            const expectedUsdcCost = zetaAmount.mul(targetPrice).div(ethers.parseUnits("1", 6));
            expect(await orderBook.userUsdcBalance(user1.address)).to.equal(depositAmount.sub(expectedUsdcCost));
        });

        // it("Should revert buy order creation if insufficient USDC balance", async function () {
        //     const depositAmount = ethers.utils.parseUnits("1", 6); // 1 USDC
        //     const zetaAmount = ethers.utils.parseEther("1");
        //     const targetPrice = ethers.utils.parseUnits("5", 6); // 5 USDC per ZETA
        //     const slippageBps = 50; // 0.5%
        //
        //     // Deposit a small amount of USDC
        //     await orderBook.connect(user1).depositUsdc(depositAmount);
        //
        //     // Try to create a buy order requiring more USDC
        //     await expect(
        //         orderBook.connect(user1).createBuyOrder(zetaAmount, targetPrice, slippageBps)
        //     ).to.be.revertedWithCustomError(orderBook, "InsufficientFunds");
        // });
    });

    // describe("Order Management", function () {
    //     it("Should allow cancelling an order", async function () {
    //         const depositAmount = ethers.utils.parseEther("1");
    //         const targetPrice = ethers.utils.parseUnits("5", 6);
    //         const slippageBps = 50;
    //
    //         // Setup mocks
    //         await mockLimitOrderManager.setDeactiveSlot(1);
    //         await mockPool.setCurrentPoint(1000);
    //         await mockPool.setPointDelta(1);
    //
    //         // Deposit and create order
    //         await orderBook.connect(user1).depositZeta({ value: depositAmount });
    //         await orderBook.connect(user1).createSellOrder(targetPrice, slippageBps);
    //
    //         // Cancel the order
    //         const tx = await orderBook.connect(user1).cancelOrder(1);
    //         const receipt = await tx.wait();
    //
    //         // Check events
    //         const orderCancelledEvent = receipt.events?.find(e => e.event === "OrderCancelled");
    //         expect(orderCancelledEvent).to.not.be.undefined;
    //         expect(orderCancelledEvent.args.orderId).to.equal(1);
    //
    //         // Check that ZETA is returned to user
    //         expect(await orderBook.userZetaBalance(user1.address)).to.equal(depositAmount);
    //     });
    //
    //     it("Should revert when non-owner tries to cancel an order", async function () {
    //         const depositAmount = ethers.utils.parseEther("1");
    //         const targetPrice = ethers.utils.parseUnits("5", 6);
    //         const slippageBps = 50;
    //
    //         // Setup mocks
    //         await mockLimitOrderManager.setDeactiveSlot(1);
    //         await mockPool.setCurrentPoint(1000);
    //         await mockPool.setPointDelta(1);
    //
    //         // Deposit and create order with user1
    //         await orderBook.connect(user1).depositZeta({ value: depositAmount });
    //         await orderBook.connect(user1).createSellOrder(targetPrice, slippageBps);
    //
    //         // Try to cancel with user2
    //         await expect(
    //             orderBook.connect(user2).cancelOrder(1)
    //         ).to.be.revertedWithCustomError(orderBook, "Unauthorized");
    //     });
    //
    //     it("Should fetch user's limit orders correctly", async function () {
    //         const depositAmount = ethers.utils.parseEther("1");
    //         const targetPrice = ethers.utils.parseUnits("5", 6);
    //         const slippageBps = 50;
    //
    //         // Setup mocks
    //         await mockLimitOrderManager.setDeactiveSlot(1);
    //         await mockPool.setCurrentPoint(1000);
    //         await mockPool.setPointDelta(1);
    //
    //         // Deposit and create order with user1
    //         await orderBook.connect(user1).depositZeta({ value: depositAmount });
    //         await orderBook.connect(user1).createSellOrder(targetPrice, slippageBps);
    //
    //         // Get user's orders
    //         const userOrders = await orderBook.getUserLimitOrders(user1.address);
    //         expect(userOrders.length).to.equal(1);
    //         expect(userOrders[0]).to.equal(1);
    //     });
    // });
    //
    describe("onCall and Gateway Interactions", function () {
    //     it("Should handle onCall function with price check callback", async function () {
    //         // Set up a mock message context
    //         const messageContext = {
    //             sender: mockGateway.address,
    //             origin: ethers.constants.AddressZero,
    //             originChainId: 1
    //         };
    //
    //         // Mock priceCheckCallback message
    //         const orderId = 1;
    //         const message = ethers.utils.defaultAbiCoder.encode(
    //             ["bytes4", "uint256"],
    //             [ethers.utils.id("priceCheckCallback(uint256)").slice(0, 10), orderId]
    //         );
    //
    //         // Call onCall function
    //         await mockGateway.mockCallOnCall(
    //             orderBook.address,
    //             messageContext,
    //             mockUSDC.address,
    //             0,
    //             message
    //         );
    //
    //         // Verify that the function executed without errors
    //         // We can't easily check state changes here without mocking the entire execution flow
    //     });
    //
    //     it("Should handle empty message in onCall gracefully", async function () {
    //         // Set up a mock message context
    //         const messageContext = {
    //             sender: mockGateway.address,
    //             origin: ethers.constants.AddressZero,
    //             originChainId: 1
    //         };
    //
    //         // Empty message
    //         const message = "0x";
    //
    //         // Call onCall function
    //         const tx = await mockGateway.mockCallOnCall(
    //             orderBook.address,
    //             messageContext,
    //             mockUSDC.address,
    //             0,
    //             message
    //         );
    //
    //         // Check for HelloEvent
    //         const receipt = await tx.wait();
    //         const helloEvent = receipt.events?.find(e => e.event === "HelloEvent");
    //         expect(helloEvent).to.not.be.undefined;
    //     });
    });
});