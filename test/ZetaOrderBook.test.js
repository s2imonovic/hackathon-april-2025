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

        // Deploy mock USDC first
        const mockUsdc = await ethers.getContractFactory("MockERC20");
        const usdc = await mockUsdc.deploy("USDC", "USDC", 6);

        const ZetaOrderBook = await ethers.getContractFactory("ZetaOrderBook");
        const zetaOrderBook = await ZetaOrderBook.deploy(
            ethers.ZeroAddress, // Mock gateway
            ethers.ZeroAddress, // Mock Pyth oracle
            ethers.ZeroAddress, // Mock swap router
            await usdc.getAddress(), // Use mock USDC address
            ethers.ZeroHash,    // Mock price ID
            ethers.ZeroAddress, // Mock callback chain
            callbackConnector.target
        );

        return { zetaOrderBook, callbackConnector, owner, user1, user2, usdc };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { zetaOrderBook, callbackConnector } = await loadFixture(deployFixture);
            expect(await zetaOrderBook.getAddress()).to.be.properAddress;
            expect(await callbackConnector.getAddress()).to.be.properAddress;
        });
    });

    describe("ZETA Deposits and Withdrawals", function () {
        it("Should track user balance correctly when using depositZeta", async function () {
            const { zetaOrderBook, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");

            // Get initial balances
            const initialUserZetaBalance = await zetaOrderBook.userZetaBalance(user1.address);
            const initialContractZetaBalance = await zetaOrderBook.contractZetaBalance();
            const initialContractEthBalance = await ethers.provider.getBalance(zetaOrderBook.getAddress());

            // Deposit ZETA using depositZeta function
            await expect(zetaOrderBook.connect(user1).depositZeta({ value: amount }))
                .to.emit(zetaOrderBook, "ZetaDeposited")
                .withArgs(user1.address, amount);

            // Log actual values for debugging
            console.log("Contract ETH balance:", await ethers.provider.getBalance(zetaOrderBook.getAddress()));
            console.log("User ZETA balance:", await zetaOrderBook.userZetaBalance(user1.address));
            console.log("Contract ZETA balance:", await zetaOrderBook.contractZetaBalance());

            // Verify balances increased correctly
            expect(await zetaOrderBook.userZetaBalance(user1.address))
                .to.equal(initialUserZetaBalance + amount);
            expect(await zetaOrderBook.contractZetaBalance())
                .to.equal(initialContractZetaBalance + amount);
        });

        it("Should deposit and withdraw ZETA correctly", async function () {
            const { zetaOrderBook, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");

            // Initial balances
            const initialContractBalance = await ethers.provider.getBalance(zetaOrderBook.getAddress());
            const initialUserBalance = await ethers.provider.getBalance(user1.address);
            const initialUserZetaBalance = await zetaOrderBook.userZetaBalance(user1.address);
            const initialContractZetaBalance = await zetaOrderBook.contractZetaBalance();

            // Deposit ZETA by sending directly to the contract
            await user1.sendTransaction({
                to: await zetaOrderBook.getAddress(),
                value: amount
            });

            // Check balances after deposit
            expect(await zetaOrderBook.userZetaBalance(user1.address)).to.equal(initialUserZetaBalance + amount);
            expect(await zetaOrderBook.contractZetaBalance()).to.equal(initialContractZetaBalance + amount);

            // Withdraw ZETA
            await expect(zetaOrderBook.connect(user1).withdrawZeta(amount))
                .to.emit(zetaOrderBook, "ZetaWithdrawn")
                .withArgs(user1.address, amount);

            // Check balances after withdrawal
            expect(await zetaOrderBook.userZetaBalance(user1.address)).to.equal(initialUserZetaBalance);
            expect(await zetaOrderBook.contractZetaBalance()).to.equal(initialContractZetaBalance);

            // Note: We don't check exact ETH balances because gas costs affect them
            // But we can verify the contract balance is back to initial
            const finalContractBalance = await ethers.provider.getBalance(zetaOrderBook.getAddress());
            expect(finalContractBalance).to.equal(initialContractBalance);
        });

        it("Should not allow withdrawal of more ZETA than deposited", async function () {
            const { zetaOrderBook, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");
            const tooMuch = ethers.parseEther("2.0");

            // Deposit some ZETA
            await zetaOrderBook.connect(user1).depositZeta({ value: amount });

            // Try to withdraw more than deposited
            await expect(zetaOrderBook.connect(user1).withdrawZeta(tooMuch))
                .to.be.revertedWithCustomError(zetaOrderBook, "InsufficientFunds");
        });
    });

    describe("USDC Deposits and Withdrawals", function () {
        it("Should deposit and withdraw USDC correctly", async function () {
            const { zetaOrderBook, user1, usdc } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("1000", 6); // 1000 USDC

            // Mint and approve USDC
            await usdc.mint(user1.address, amount);
            await usdc.connect(user1).approve(zetaOrderBook.getAddress(), amount);

            // Get initial balances
            const initialUserUsdcBalance = await zetaOrderBook.userUsdcBalance(user1.address);
            const initialContractUsdcBalance = await zetaOrderBook.contractUsdcBalance();

            // Deposit USDC
            await expect(zetaOrderBook.connect(user1).depositUsdc(amount))
                .to.emit(zetaOrderBook, "UsdcDeposited")
                .withArgs(user1.address, amount);

            // Check balances after deposit
            expect(await zetaOrderBook.userUsdcBalance(user1.address))
                .to.equal(initialUserUsdcBalance + amount);
            expect(await zetaOrderBook.contractUsdcBalance())
                .to.equal(initialContractUsdcBalance + amount);

            // Withdraw USDC
            await expect(zetaOrderBook.connect(user1).withdrawUsdc(amount))
                .to.emit(zetaOrderBook, "UsdcWithdrawn")
                .withArgs(user1.address, amount);

            // Check balances after withdrawal
            expect(await zetaOrderBook.userUsdcBalance(user1.address))
                .to.equal(initialUserUsdcBalance);
            expect(await zetaOrderBook.contractUsdcBalance())
                .to.equal(initialContractUsdcBalance);
        });

        it("Should not allow withdrawal of more USDC than deposited", async function () {
            const { zetaOrderBook, user1, usdc } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("1000", 6); // 1000 USDC
            const tooMuch = ethers.parseUnits("2000", 6); // 2000 USDC

            // Mint and approve USDC
            await usdc.mint(user1.address, amount);
            await usdc.connect(user1).approve(zetaOrderBook.getAddress(), amount);

            // Deposit USDC
            await zetaOrderBook.connect(user1).depositUsdc(amount);

            // Try to withdraw more than deposited
            await expect(zetaOrderBook.connect(user1).withdrawUsdc(tooMuch))
                .to.be.revertedWithCustomError(zetaOrderBook, "InsufficientFunds");
        });
    });
}); 