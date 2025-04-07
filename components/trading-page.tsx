"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { useAccount, useWriteContract, useReadContract } from "wagmi"
import contractAbis from "@/deployments/abis/contract-abis-mainnet.json"
import contractAddresses from "@/deployments/addresses/contract-addresses.json"

const zetaOrderBookABI = contractAbis.mainnet.ZetaOrderBook.abi
const zetaOrderBookAddress = contractAddresses.mainnet.ZetaOrderBook as `0x${string}`

// Updated OrderDetails interface according to new contract:
// Fields: id, owner, amount, priceLow, priceHigh, slippage, orderType, active
interface OrderDetails {
  0: bigint
  1: string
  2: bigint
  3: bigint
  4: bigint
  5: bigint
  6: number
  7: boolean
}

export function TradingPage() {
  // Existing states
  const [amount, setAmount] = useState("1000")

  // States for deposit and order creation
  // Note: The new contract expects two price values: targetPriceLow and targetPriceHigh
  const [depositUsdcAmount, setDepositUsdcAmount] = useState("")
  const [depositZetaAmount, setDepositZetaAmount] = useState("")
  const [orderTargetPriceLow, setOrderTargetPriceLow] = useState("")
  const [orderTargetPriceHigh, setOrderTargetPriceHigh] = useState("")
  const [orderSlippage, setOrderSlippage] = useState("")

  // New states for withdrawal actions (still kept if needed for UI hints)
  const [withdrawUsdcAmount, setWithdrawUsdcAmount] = useState("")
  const [withdrawZetaAmount, setWithdrawZetaAmount] = useState("")

  // New state for cancelling orders
  const [cancelOrderId, setCancelOrderId] = useState("")

  // New states for token switches
  const [depositType, setDepositType] = useState<"usdc" | "zeta">("usdc")
  const [withdrawType, setWithdrawType] = useState<"usdc" | "zeta">("usdc")

  // State for market price data
  const [zetaPrice, setZetaPrice] = useState<bigint | null>(null)
  const [priceTimestamp, setPriceTimestamp] = useState<bigint | null>(null)

  // Wallet connection details
  const { address, chainId } = useAccount()

  // Write contract hooks
  const { writeContract: writeDepositUsdc } = useWriteContract()
  const { writeContract: writeDepositZeta } = useWriteContract()
  const { writeContract: writeCreateSellOrder } = useWriteContract()
  const { writeContract: writeCreateBuyOrder } = useWriteContract()
  const { writeContract: writeWithdrawUsdc } = useWriteContract()
  const { writeContract: writeWithdrawZeta } = useWriteContract()
  const { writeContract: writeCancelOrder } = useWriteContract()

  // Read contract hooks
  const { data: nextOrderIdData, refetch: refetchNextOrderId } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "nextOrderId",
    chainId,
  })

  const { data: contractZetaBalanceData, refetch: refetchContractZetaBalance } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "contractZetaBalance",
    chainId,
  })

  const { data: contractUsdcBalanceData, refetch: refetchContractUsdcBalance } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "contractUsdcBalance",
    chainId,
  })

  const { data: orderDetailsData, refetch: refetchOrderDetails } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "orders",
    args: [cancelOrderId ? parseInt(cancelOrderId) : 0],
    chainId,
  }) as { data: OrderDetails | undefined, refetch: () => void }

  const { data: userUsdcBalanceData, refetch: refetchUserUsdcBalance } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "userUsdcBalance",
    args: [address],
    chainId,
  })

  const { data: userZetaBalanceData, refetch: refetchUserZetaBalance } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "userZetaBalance",
    args: [address],
    chainId,
  })

  const { data: zetaPriceData, refetch: refetchPrice } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "getZetaPrice",
    chainId,
  })

  const { data: userActiveOrderIdData, refetch: refetchUserActiveOrderId } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "userActiveOrderId",
    args: [address],
    chainId,
  })

  // Read the active order details using the active order ID (if non-zero)
  const { data: currentOrderData, refetch: refetchCurrentOrder } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "orders",
    args: [
      userActiveOrderIdData && userActiveOrderIdData.toString() !== "0"
        ? Number(userActiveOrderIdData.toString())
        : 0
    ],
    chainId,
  }) as { data: OrderDetails | undefined, refetch: () => void }

  useEffect(() => {
    if (zetaPriceData) {
      const [price, timestamp] = zetaPriceData as [bigint, bigint]
      // Note: the contract divides the raw price by 100, adjust display as needed.
      setZetaPrice(price)
      setPriceTimestamp(timestamp)
    }
  }, [zetaPriceData])

  useEffect(() => {
    if (nextOrderIdData) {
      console.log("Next Order ID:", nextOrderIdData.toString())
    }
  }, [nextOrderIdData])

  useEffect(() => {
    if (contractZetaBalanceData) {
      console.log("Contract ZETA Balance:", contractZetaBalanceData.toString())
    }
  }, [contractZetaBalanceData])

  useEffect(() => {
    if (contractUsdcBalanceData) {
      console.log("Contract USDC Balance:", contractUsdcBalanceData.toString())
    }
  }, [contractUsdcBalanceData])

  useEffect(() => {
    if (orderDetailsData) {
      console.log("Order Details (from cancel input):", orderDetailsData)
    }
  }, [orderDetailsData])

  useEffect(() => {
    if (userUsdcBalanceData) {
      console.log("User USDC Balance:", userUsdcBalanceData.toString())
    }
  }, [userUsdcBalanceData])

  useEffect(() => {
    if (userZetaBalanceData) {
      console.log("User ZETA Balance:", userZetaBalanceData.toString())
    }
  }, [userZetaBalanceData])

  useEffect(() => {
    if (userActiveOrderIdData) {
      console.log("User Active Order ID:", userActiveOrderIdData.toString())
    }
  }, [userActiveOrderIdData])

  useEffect(() => {
    if (currentOrderData) {
      console.log("Current Active Order Details:", currentOrderData)
    }
  }, [currentOrderData])

  // Deposit functions
  const handleDepositUsdc = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeDepositUsdc({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "depositUsdc",
      args: [depositUsdcAmount ? parseInt(depositUsdcAmount) : 0],
    })
  }

  const handleDepositZeta = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeDepositZeta({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "depositZeta",
      value: depositZetaAmount
        ? BigInt(Math.floor(parseFloat(depositZetaAmount) * 1e18))
        : BigInt(0),
    })
  }

  // Order functions
  // Updated: For the new contract we now pass targetPriceLow and targetPriceHigh along with slippage.
  const handleCreateSellOrder = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeCreateSellOrder({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "createSellOrder",
      args: [
        orderTargetPriceLow ? parseInt(orderTargetPriceLow) : 0,
        orderTargetPriceHigh ? parseInt(orderTargetPriceHigh) : 0,
        orderSlippage ? parseInt(orderSlippage) : 0,
      ],
    })
  }

  const handleCreateBuyOrder = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeCreateBuyOrder({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "createBuyOrder",
      args: [
        orderTargetPriceLow ? parseInt(orderTargetPriceLow) : 0,
        orderTargetPriceHigh ? parseInt(orderTargetPriceHigh) : 0,
        orderSlippage ? parseInt(orderSlippage) : 0,
      ],
    })
  }

  // Withdrawal functions
  // Note: The new contract functions withdraw the entire unlocked balance (no amount argument required)
  const handleWithdrawUsdc = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeWithdrawUsdc({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "withdrawUsdc",
      args: [],
    })
  }

  const handleWithdrawZeta = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeWithdrawZeta({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "withdrawZeta",
      args: [],
    })
  }

  // Cancel order function
  const handleCancelOrder = () => {
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    writeCancelOrder({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "cancelOrder",
      args: [cancelOrderId ? parseInt(cancelOrderId) : 0],
    })
  }

  // Manual refresh for market price
  const refreshPrice = () => {
    refetchPrice()
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-base-100">
      <div className="container px-4 md:px-6">
        {/* Header */}
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content">
              ZetaHopper Trading
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl text-base-content">
              Start Trading Now
            </h1>
            <p className="max-w-[900px] text-base-content/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Set your parameters and let ZetaHopper&apos;s advanced algorithms maximize your returns on Zetachain.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Actions Card */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">Smart Contract Actions</CardTitle>
                <CardDescription className="text-base-content/70">
                  Interact with ZetaOrderBook contract
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="trade">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="trade">Trade</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    <TabsTrigger value="cancel">Cancel Order</TabsTrigger>
                  </TabsList>

                  {/* Trade Tab: Deposit & Orders Combined */}
                  <TabsContent value="trade" className="space-y-6">
                    {/* Deposit Section */}
                    <div className="space-y-4">
                      <Label htmlFor="deposit-type" className="text-base-content">
                        Select Deposit Token
                      </Label>
                      <Select
                        value={depositType}
                        onValueChange={(val) => setDepositType(val as "usdc" | "zeta")}
                      >
                        <SelectTrigger className="w-full bg-base-100 border-base-300 text-base-content">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent className="bg-base-200 border-base-300 text-base-content">
                          <SelectItem value="usdc">USDC</SelectItem>
                          <SelectItem value="zeta">ZETA</SelectItem>
                        </SelectContent>
                      </Select>
                      {depositType === "usdc" ? (
                        <div className="space-y-2">
                          <Label htmlFor="deposit-usdc" className="text-base-content">
                            Deposit USDC (in smallest unit)
                          </Label>
                          <Input
                            id="deposit-usdc"
                            placeholder="e.g., 1000"
                            value={depositUsdcAmount}
                            onChange={(e) => setDepositUsdcAmount(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                          <Button
                            onClick={handleDepositUsdc}
                            className="bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Deposit USDC
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="deposit-zeta" className="text-base-content">
                            Deposit ZETA (in ETH)
                          </Label>
                          <Input
                            id="deposit-zeta"
                            placeholder="e.g., 0.5"
                            value={depositZetaAmount}
                            onChange={(e) => setDepositZetaAmount(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                          <Button
                            onClick={handleDepositZeta}
                            className="bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Deposit ZETA
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Order Section */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="order-target-price-low" className="text-base-content">
                            Target Price Low (USDC, 6 decimals)
                          </Label>
                          <Input
                            id="order-target-price-low"
                            placeholder="e.g., 246500 for $0.2465"
                            value={orderTargetPriceLow}
                            onChange={(e) => setOrderTargetPriceLow(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="order-target-price-high" className="text-base-content">
                            Target Price High (USDC, 6 decimals)
                          </Label>
                          <Input
                            id="order-target-price-high"
                            placeholder="e.g., 250000 for $0.2500"
                            value={orderTargetPriceHigh}
                            onChange={(e) => setOrderTargetPriceHigh(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="order-slippage" className="text-base-content">
                            Slippage (bps)
                          </Label>
                          <Input
                            id="order-slippage"
                            placeholder="e.g., 50 for 0.5%"
                            value={orderSlippage}
                            onChange={(e) => setOrderSlippage(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={handleCreateSellOrder}
                          className="bg-primary text-primary-content hover:bg-primary/90"
                        >
                          Create Sell Order
                        </Button>
                        <Button
                          onClick={handleCreateBuyOrder}
                          className="bg-primary text-primary-content hover:bg-primary/90"
                        >
                          Create Buy Order
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Withdraw Tab */}
                  <TabsContent value="withdraw" className="space-y-6">
                    <div className="space-y-4">
                      <Label htmlFor="withdraw-type" className="text-base-content">
                        Select Withdrawal Token
                      </Label>
                      <Select
                        value={withdrawType}
                        onValueChange={(val) => setWithdrawType(val as "usdc" | "zeta")}
                      >
                        <SelectTrigger className="w-full bg-base-100 border-base-300 text-base-content">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent className="bg-base-200 border-base-300 text-base-content">
                          <SelectItem value="usdc">USDC</SelectItem>
                          <SelectItem value="zeta">ZETA</SelectItem>
                        </SelectContent>
                      </Select>
                      {withdrawType === "usdc" ? (
                        <div className="space-y-2">                   
                          <Button
                            onClick={handleWithdrawUsdc}
                            className="bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Withdraw USDC
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">               
                          <Button
                            onClick={handleWithdrawZeta}
                            className="bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Withdraw ZETA
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Cancel Order Tab */}
                  <TabsContent value="cancel" className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="cancel-order" className="text-base-content">
                        Cancel Order (Enter Order ID)
                      </Label>
                      <Input
                        id="cancel-order"
                        placeholder="e.g., 123"
                        value={cancelOrderId}
                        onChange={(e) => setCancelOrderId(e.target.value)}
                        className="bg-base-100 border-base-300 text-base-content"
                      />
                      <Button
                        onClick={handleCancelOrder}
                        className="bg-primary text-primary-content hover:bg-primary/90"
                      >
                        Cancel Order
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats, Info, and Active Order */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Market Stats */}
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">Market Stats</CardTitle>
                <CardDescription className="text-base-content/70">Current market conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="text-base-content">ZETA Price</span>
                    </div>
                    <div className="text-base-content font-medium">
                      {zetaPrice ? `$${(Number(zetaPrice) / 1e6).toFixed(6)}` : "$--.--"}
                      {priceTimestamp && (
                        <span className="ml-2 text-xs text-base-content/70">
                          (Updated: {new Date(Number(priceTimestamp) * 1000).toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Next Order ID</span>
                    <span className="text-base-content font-medium">
                      {nextOrderIdData ? nextOrderIdData.toString() : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Contract ZETA Balance</span>
                    <span className="text-base-content font-medium">
                      {contractZetaBalanceData ? `${(Number(contractZetaBalanceData) / 1e18).toFixed(6)} ZETA` : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Contract USDC Balance</span>
                    <span className="text-base-content font-medium">
                      {contractUsdcBalanceData ? `${(Number(contractUsdcBalanceData) / 1e6).toFixed(2)} USDC` : "--"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Balances */}
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">User Balances</CardTitle>
                <CardDescription className="text-base-content/70">Your current token balances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">USDC Balance</span>
                    <span className="text-base-content font-medium">
                      {userUsdcBalanceData ? `${(Number(userUsdcBalanceData) / 1e6).toFixed(2)} USDC` : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">ZETA Balance</span>
                    <span className="text-base-content font-medium">
                      {userZetaBalanceData ? `${(Number(userZetaBalanceData) / 1e18).toFixed(6)} ZETA` : "--"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Order Section */}
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">Your Active Order</CardTitle>
                <CardDescription className="text-base-content/70">
                  Details of the order currently active for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userActiveOrderIdData && userActiveOrderIdData.toString() !== "0" && currentOrderData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Order ID</span>
                      <span className="text-base-content font-medium">
                        {currentOrderData[0]?.toString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Maker</span>
                      <span className="text-base-content font-medium text-xs truncate max-w-[180px]">
                        {currentOrderData[1]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Amount</span>
                      <span className="text-base-content font-medium">
                        {currentOrderData[2]?.toString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Target Price Low</span>
                      <span className="text-base-content font-medium">
                        ${(Number(currentOrderData[3] || 0) / 1e6).toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Target Price High</span>
                      <span className="text-base-content font-medium">
                        ${(Number(currentOrderData[4] || 0) / 1e6).toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Slippage</span>
                      <span className="text-base-content font-medium">
                        {(Number(currentOrderData[5] || 0) / 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Type</span>
                      <span className="text-base-content font-medium">
                        {Number(currentOrderData[6]) === 0 ? "Buy" : "Sell"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">Status</span>
                      <span className={`font-medium ${currentOrderData[7] ? "text-green-500" : "text-red-500"}`}>
                        {currentOrderData[7] ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-base-content/70">No active order found.</span>
                )}
              </CardContent>
            </Card>

            {/* Order Details (via cancel input) */}
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">Order Details (Lookup)</CardTitle>
                <CardDescription className="text-base-content/70">
                  Details of the selected order (via order ID lookup)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderDetailsData ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Order ID</span>
                        <span className="text-base-content font-medium">{cancelOrderId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Maker</span>
                        <span className="text-base-content font-medium text-xs truncate max-w-[180px]">
                          {orderDetailsData[1]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Amount</span>
                        <span className="text-base-content font-medium">
                          {orderDetailsData[2]?.toString() || "0"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Target Price Low</span>
                        <span className="text-base-content font-medium">
                          ${(Number(orderDetailsData[3] || 0) / 1e6).toFixed(6)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Target Price High</span>
                        <span className="text-base-content font-medium">
                          ${(Number(orderDetailsData[4] || 0) / 1e6).toFixed(6)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Slippage</span>
                        <span className="text-base-content font-medium">
                          {(Number(orderDetailsData[5] || 0) / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Type</span>
                        <span className="text-base-content font-medium">
                          {Number(orderDetailsData[6]) === 0 ? "Buy" : "Sell"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Status</span>
                        <span className={`font-medium ${orderDetailsData[7] ? "text-green-500" : "text-red-500"}`}>
                          {orderDetailsData[7] ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-base-content/70">No order details available</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
