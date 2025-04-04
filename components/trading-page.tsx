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

// Import the ABI from your JSON file
import contractAbis from "@/deployments/abis/contract-abis-testnet.json"
const zetaOrderBookABI = contractAbis.testnet.ZetaOrderBook.abi

// Replace with your deployed contract address
const zetaOrderBookAddress = "0xYourContractAddress"

export function TradingPage() {
  // Existing states
  const [amount, setAmount] = useState("1000")

  // States for deposit and order creation
  const [depositUsdcAmount, setDepositUsdcAmount] = useState("")
  const [depositZetaAmount, setDepositZetaAmount] = useState("")
  const [orderTargetPrice, setOrderTargetPrice] = useState("")
  const [orderSlippage, setOrderSlippage] = useState("")

  // New states for withdrawal actions
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

  const { data: zetaPriceData, refetch: refetchPrice } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "getZetaPrice",
    chainId,
  })

  useEffect(() => {
    if (zetaPriceData) {
      const [price, timestamp] = zetaPriceData as [bigint, bigint]
      setZetaPrice(price)
      setPriceTimestamp(timestamp)
    }
  }, [zetaPriceData])

  // Deposit functions
  const handleDepositUsdc = () => {
    writeDepositUsdc({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "depositUsdc",
      args: [depositUsdcAmount ? parseInt(depositUsdcAmount) : 0],
    })
  }

  const handleDepositZeta = () => {
    writeDepositZeta({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "depositZeta",
      value: depositZetaAmount ? BigInt(depositZetaAmount) : BigInt(0),
    })
  }

  // Order functions
  const handleCreateSellOrder = () => {
    writeCreateSellOrder({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "createSellOrder",
      args: [
        orderTargetPrice ? parseInt(orderTargetPrice) : 0,
        orderSlippage ? parseInt(orderSlippage) : 0,
      ],
    })
  }

  const handleCreateBuyOrder = () => {
    writeCreateBuyOrder({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "createBuyOrder",
      args: [
        amount ? parseInt(amount) : 0,
        orderTargetPrice ? parseInt(orderTargetPrice) : 0,
        orderSlippage ? parseInt(orderSlippage) : 0,
      ],
    })
  }

  // Withdrawal functions
  const handleWithdrawUsdc = () => {
    writeWithdrawUsdc({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "withdrawUsdc",
      args: [withdrawUsdcAmount ? parseInt(withdrawUsdcAmount) : 0],
    })
  }

  const handleWithdrawZeta = () => {
    writeWithdrawZeta({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "withdrawZeta",
      args: [withdrawZetaAmount ? parseInt(withdrawZetaAmount) : 0],
    })
  }

  // Cancel order function
  const handleCancelOrder = () => {
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
                          <Label htmlFor="order-target-price" className="text-base-content">
                            Target Price (USDC, 6 decimals)
                          </Label>
                          <Input
                            id="order-target-price"
                            placeholder="e.g., 1240000 for $1.24"
                            value={orderTargetPrice}
                            onChange={(e) => setOrderTargetPrice(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                        </div>
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
                          <Label htmlFor="withdraw-usdc" className="text-base-content">
                            Withdraw USDC (in smallest unit)
                          </Label>
                          <Input
                            id="withdraw-usdc"
                            placeholder="e.g., 1000"
                            value={withdrawUsdcAmount}
                            onChange={(e) => setWithdrawUsdcAmount(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
                          <Button
                            onClick={handleWithdrawUsdc}
                            className="bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Withdraw USDC
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="withdraw-zeta" className="text-base-content">
                            Withdraw ZETA (in smallest unit)
                          </Label>
                          <Input
                            id="withdraw-zeta"
                            placeholder="e.g., 500"
                            value={withdrawZetaAmount}
                            onChange={(e) => setWithdrawZetaAmount(e.target.value)}
                            className="bg-base-100 border-base-300 text-base-content"
                          />
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

          {/* Stats and Info */}
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
                  <Button size="sm" variant="outline" onClick={refreshPrice}>
                    Refresh Price
                  </Button>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base-content">Market Trend</span>
                    </div>
                    <div className="text-success font-medium">Bullish</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bot Performance */}
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">Bot Performance</CardTitle>
                <CardDescription className="text-base-content/70">Historical trading results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Last 7 Days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Last 30 Days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Win Rate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
