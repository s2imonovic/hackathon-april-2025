const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ZetaOrderBook", function () {
    async function deployFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        const CallbackConnector = await ethers.getContractFactory("CallbackConnector");
        const callbackConnector = await CallbackConnector.deploy(
            ethers.ZeroAddress, // Mock gateway
            ethers.ZeroAddress  // Mock universal contract
        );

        const ZetaOrderBook = await ethers.getContractFactory("ZetaOrderBook");
        const zetaOrderBook = await ZetaOrderBook.deploy(
            ethers.ZeroAddress, // Mock gateway
            ethers.ZeroAddress, // Mock Pyth oracle
            ethers.ZeroAddress, // Mock swap router
            ethers.ZeroAddress, // Mock USDC token
            ethers.ZeroHash,    // Mock price ID
            ethers.ZeroAddress, // Mock callback chain
            callbackConnector.target
        );

        return { zetaOrderBook, callbackConnector, owner, user1, user2 };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { zetaOrderBook, callbackConnector } = await loadFixture(deployFixture);
            expect(await zetaOrderBook.getAddress()).to.be.properAddress;
            expect(await callbackConnector.getAddress()).to.be.properAddress;
        });
    });

    describe("Order Creation", function () {
        it("Should create a sell order", async function () {
            const { zetaOrderBook, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");
            const price = ethers.parseUnits("1.0", 6); // 1 USDC

            await expect(zetaOrderBook.connect(user1).createSellOrder(price, {
                value: amount
            })).to.emit(zetaOrderBook, "OrderCreated")
                .withArgs(1, user1.address, 1, amount, price); // 1 = SELL
        });

        it("Should create a buy order", async function () {
            const { zetaOrderBook, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");
            const price = ethers.parseUnits("1.0", 6); // 1 USDC

            // Mock USDC transfer
            const mockUsdc = await ethers.getContractFactory("MockERC20");
            const usdc = await mockUsdc.deploy("USDC", "USDC", 6);
            await usdc.mint(user1.address, ethers.parseUnits("1000", 6));
            await usdc.connect(user1).approve(zetaOrderBook.getAddress(), ethers.parseUnits("1000", 6));

            await expect(zetaOrderBook.connect(user1).createBuyOrder(amount, price))
                .to.emit(zetaOrderBook, "OrderCreated")
                .withArgs(1, user1.address, amount, price, 0); // 0 = BUY
        });
    });

    describe("Order Cancellation", function () {
        it("Should cancel an order", async function () {
            const { zetaOrderBook, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");
            const price = ethers.parseUnits("1.0", 6);

            // Create order
            await zetaOrderBook.connect(user1).createSellOrder(price, {
                value: amount
            });

            // Cancel order
            await expect(zetaOrderBook.connect(user1).cancelOrder(1))
                .to.emit(zetaOrderBook, "OrderCancelled")
                .withArgs(1);
        });

        it("Should not allow non-owner to cancel order", async function () {
            const { zetaOrderBook, user1, user2 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");
            const price = ethers.parseUnits("1.0", 6);

            // Create order
            await zetaOrderBook.connect(user1).createSellOrder(price, {
                value: amount
            });

            // Try to cancel with different user
            await expect(zetaOrderBook.connect(user2).cancelOrder(1))
                .to.be.revertedWithCustomError(zetaOrderBook, "Unauthorized");
        });
    });
}); 