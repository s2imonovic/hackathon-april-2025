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
  const [depositType, setDepositType] = useState<"usdc" | "zeta">("zeta")
  const [withdrawType, setWithdrawType] = useState<"usdc" | "zeta">("zeta")

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

  const { data: userUsdcLockedBalanceData, refetch: refetchUserUsdcLockedBalance } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "userUsdcBalanceLocked",
    args: [address],
    chainId,
  })

  const { data: userZetaLockedBalanceData, refetch: refetchUserZetaLockedBalance } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "userZetaBalanceLocked",
    args: [address],
    chainId,
  })

  const { data: userOrderIdData, refetch: refetchUserOrderId } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "getUserOrderId",
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

  // Add state for active tab
  const [activeTab, setActiveTab] = useState("trade")

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
    if (userOrderIdData) {
      setCancelOrderId(userOrderIdData.toString())
      refetchOrderDetails()
      console.log("User Active Order ID:", userOrderIdData.toString())
    }
  }, [userOrderIdData, refetchOrderDetails])

  useEffect(() => {
    if (address) {
      refetchUserOrderId()
    }
  }, [address, refetchUserOrderId])

  useEffect(() => {
    if (currentOrderData) {
      console.log("Current Active Order Details:", currentOrderData)
    }
  }, [currentOrderData])

  // Helper functions for price conversion
  const convertDollarsToContractValue = (dollarAmount: string): number => {
    const num = parseFloat(dollarAmount)
    if (isNaN(num)) return 0
    return Math.floor(num * 1000000) // Convert to contract value (multiply by 1e6)
  }

  const convertContractValueToDollars = (contractValue: bigint): string => {
    return (Number(contractValue) / 1000000).toFixed(6) // Convert to dollars (divide by 1e6)
  }

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
        convertDollarsToContractValue(orderTargetPriceLow),
        convertDollarsToContractValue(orderTargetPriceHigh),
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
        convertDollarsToContractValue(orderTargetPriceLow),
        convertDollarsToContractValue(orderTargetPriceHigh),
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

  // Add slippage presets
  const SLIPPAGE_PRESETS = {
    "1%": 100,    // 1% = 100 in contract value
    "5%": 500,    // 5% = 500 in contract value
    "10%": 1000,  // 10% = 1000 in contract value
  }

  // Add state for showing custom input
  const [showCustomSlippage, setShowCustomSlippage] = useState(false)

  // Helper to set slippage from preset
  const handleSlippagePreset = (value: number) => {
    setOrderSlippage(value.toString())
    setShowCustomSlippage(false)
  }

  // Replace the existing slippage input with this new UI
  const SlippageSelector = () => (
    <div className="space-y-2">
      <Label htmlFor="slippage-selector" className="text-base-content">
        Slippage Tolerance
      </Label>
      <div className="flex gap-2 items-center">
        {Object.entries(SLIPPAGE_PRESETS).map(([label, value]) => (
          <Button
            key={label}
            variant={orderSlippage === value.toString() ? "default" : "outline"}
            onClick={() => handleSlippagePreset(value)}
            className="flex-1"
          >
            {label}
          </Button>
        ))}
        <Button
          variant={showCustomSlippage ? "default" : "outline"}
          onClick={() => setShowCustomSlippage(true)}
          className="flex-1"
        >
          Custom
        </Button>
      </div>
      {showCustomSlippage && (
        <div className="mt-2">
          <Input
            id="order-slippage"
            placeholder="Enter custom slippage (e.g., 200 for 2%)"
            value={orderSlippage}
            onChange={(e) => setOrderSlippage(e.target.value)}
            className="bg-base-100 border-base-300 text-base-content"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Enter value in basis points (100 = 1%)
          </p>
        </div>
      )}
    </div>
  )

  // Add price adjustment presets
  const PRICE_ADJUSTMENTS = {
    "1%": 0.01,
    "5%": 0.05,
    "20%": 0.20,
  }

  // Helper to adjust price by percentage
  const adjustPrice = (basePrice: string, percentage: number): string => {
    const price = parseFloat(basePrice)
    if (isNaN(price)) return basePrice
    return (price * (1 + percentage)).toFixed(6)
  }

  // Create a reusable price input component with adjustment buttons
  const PriceInput = ({ 
    label, 
    value, 
    onChange,
    placeholder 
  }: { 
    label: string
    value: string
    onChange: (value: string) => void
    placeholder: string
  }) => {
    const inputId = `order-${label.toLowerCase().replace(/\s+/g, '-')}`
    const basePrice = zetaPrice ? (Number(zetaPrice) / 1e6).toString() : "0"
    const isLowPrice = label === "Target Price Low"
    
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-base-content">
          {label}
        </Label>
        <Input
          id={inputId}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-base-100 border-base-300 text-base-content mb-2"
        />
        <div className="flex gap-2">
          {Object.entries(PRICE_ADJUSTMENTS).map(([label, percentage]) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              onClick={() => onChange(adjustPrice(basePrice, isLowPrice ? -percentage : percentage))}
              className="flex-1"
            >
              {isLowPrice ? "-" : "+"}{label}
            </Button>
          ))}
        </div>
      </div>
    )
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
                <Tabs defaultValue="trade" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="trade">Trade</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    <TabsTrigger value="cancel">Cancel Order</TabsTrigger>
                  </TabsList>

                  {/* Trade Tab: Deposit & Orders Combined */}
                  <TabsContent value="trade" className="space-y-6">
                    {/* Balance Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            {(() => {
                              const usdcTotal = ((Number(userUsdcBalanceData || 0)) + (Number(userUsdcLockedBalanceData || 0))) / 1e6
                              const usdcLocked = (Number(userUsdcLockedBalanceData || 0)) / 1e6
                              return (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-base-content">USDC Balance</span>
                                    <span className="text-base-content font-medium">
                                      {userUsdcBalanceData || userUsdcLockedBalanceData
                                        ? `${usdcTotal.toFixed(6)} USDC` 
                                        : "--"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm text-base-content/70">
                                    <span>Locked</span>
                                    <span>
                                      {userUsdcLockedBalanceData ? `${usdcLocked.toFixed(6)} USDC` : "--"}
                                    </span>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/5 border-secondary/20">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            {(() => {
                              const zetaTotal = ((Number(userZetaBalanceData || 0)) + (Number(userZetaLockedBalanceData || 0))) / 1e18
                              const zetaLocked = (Number(userZetaLockedBalanceData || 0)) / 1e18
                              return (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-base-content">ZETA Balance</span>
                                    <span className="text-base-content font-medium" title={`${zetaTotal.toFixed(18)} ZETA`}>
                                      {userZetaBalanceData || userZetaLockedBalanceData
                                        ? `${zetaTotal.toFixed(2)} ZETA` 
                                        : "--"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm text-base-content/70">
                                    <span>Locked</span>
                                    <span title={`${zetaLocked.toFixed(18)} ZETA`}>
                                      {userZetaLockedBalanceData ? `${zetaLocked.toFixed(2)} ZETA` : "--"}
                                    </span>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

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
                        <PriceInput
                          label="Target Price Low"
                          value={orderTargetPriceLow}
                          onChange={setOrderTargetPriceLow}
                          placeholder="e.g., 0.246500"
                        />
                        <PriceInput
                          label="Target Price High"
                          value={orderTargetPriceHigh}
                          onChange={setOrderTargetPriceHigh}
                          placeholder="e.g., 0.250000"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SlippageSelector />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {(() => {
                            const usdcTotal = ((Number(userUsdcBalanceData || 0)) + (Number(userUsdcLockedBalanceData || 0))) / 1e6
                            const usdcLocked = (Number(userUsdcLockedBalanceData || 0)) / 1e6
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-base-content">USDC Balance</span>
                                  <span className="text-base-content font-medium">
                                    {userUsdcBalanceData || userUsdcLockedBalanceData
                                      ? `${usdcTotal.toFixed(6)} USDC` 
                                      : "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-base-content/70">
                                  <span>Locked</span>
                                  <span>
                                    {userUsdcLockedBalanceData ? `${usdcLocked.toFixed(6)} USDC` : "--"}
                                  </span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                        <div className="space-y-2">
                          {(() => {
                            const zetaTotal = ((Number(userZetaBalanceData || 0)) + (Number(userZetaLockedBalanceData || 0))) / 1e18
                            const zetaLocked = (Number(userZetaLockedBalanceData || 0)) / 1e18
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-base-content">ZETA Balance</span>
                                  <span className="text-base-content font-medium" title={`${zetaTotal.toFixed(18)} ZETA`}>
                                    {userZetaBalanceData || userZetaLockedBalanceData
                                      ? `${zetaTotal.toFixed(2)} ZETA` 
                                      : "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-base-content/70">
                                  <span>Locked</span>
                                  <span title={`${zetaLocked.toFixed(18)} ZETA`}>
                                    {userZetaLockedBalanceData ? `${zetaLocked.toFixed(2)} ZETA` : "--"}
                                  </span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
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
                          <Button
                            onClick={handleWithdrawUsdc}
                            className="w-full bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Withdraw USDC
                          </Button>
                        ) : (
                          <Button
                            onClick={handleWithdrawZeta}
                            className="w-full bg-primary text-primary-content hover:bg-primary/90"
                          >
                            Withdraw ZETA
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Cancel Order Tab */}
                  <TabsContent value="cancel" className="space-y-6">
                    {userActiveOrderIdData && userActiveOrderIdData.toString() !== "0" && currentOrderData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {(Number(currentOrderData[2] || 0) / 1e18).toString()} ZETA
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
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
                            <div className="flex items-center justify-between">
                              <span className="text-base-content">Slippage</span>
                              <span className="text-base-content font-medium">
                                {(Number(currentOrderData[5] || 0) / 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-base-content">Target Price Low</span>
                              <span className="text-base-content font-medium">
                                ${(Number(currentOrderData[3] || 0) / 1e6).toString()}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-base-content">Target Price High</span>
                              <span className="text-base-content font-medium">
                                ${(Number(currentOrderData[4] || 0) / 1e6).toString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={handleCancelOrder}
                          className="w-full bg-primary text-primary-content hover:bg-primary/90"
                        >
                          Cancel Order
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-base-content/70">
                        No active order found.
                      </div>
                    )}
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
            {activeTab !== "withdraw" && (
              <Card className="bg-base-200 border-base-300">
                <CardHeader>
                  <CardTitle className="text-base-content">User Balances</CardTitle>
                  <CardDescription className="text-base-content/70">Your current token balances</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {(() => {
                        const usdcTotal = ((Number(userUsdcBalanceData || 0)) + (Number(userUsdcLockedBalanceData || 0))) / 1e6
                        const usdcLocked = (Number(userUsdcLockedBalanceData || 0)) / 1e6
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-base-content">USDC Balance</span>
                              <span className="text-base-content font-medium">
                                {userUsdcBalanceData || userUsdcLockedBalanceData
                                  ? `${usdcTotal.toFixed(6)} USDC` 
                                  : "--"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-base-content/70">
                              <span>Locked</span>
                              <span>
                                {userUsdcLockedBalanceData ? `${usdcLocked.toFixed(6)} USDC` : "--"}
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        const zetaTotal = ((Number(userZetaBalanceData || 0)) + (Number(userZetaLockedBalanceData || 0))) / 1e18
                        const zetaLocked = (Number(userZetaLockedBalanceData || 0)) / 1e18
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-base-content">ZETA Balance</span>
                              <span className="text-base-content font-medium" title={`${zetaTotal.toFixed(18)} ZETA`}>
                                {userZetaBalanceData || userZetaLockedBalanceData
                                  ? `${zetaTotal.toFixed(2)} ZETA` 
                                  : "--"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-base-content/70">
                              <span>Locked</span>
                              <span title={`${zetaLocked.toFixed(18)} ZETA`}>
                                {userZetaLockedBalanceData ? `${zetaLocked.toFixed(2)} ZETA` : "--"}
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Order Section */}
            {activeTab !== "cancel" && (
              <Card className="bg-base-200 border-base-300">
                <CardHeader className="relative">
                  <CardTitle className="text-base-content">Your Active Order</CardTitle>
                  <CardDescription className="text-base-content/70">
                    Details of the order currently active for your account
                  </CardDescription>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 text-red-500 hover:text-red-600 hover:h-8 hover:w-8 transition-all"
                    onClick={() => setActiveTab("cancel")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </Button>
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
                          {(Number(currentOrderData[2] || 0) / 1e18).toString()} ZETA
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Target Price Low</span>
                        <span className="text-base-content font-medium">
                          ${(Number(currentOrderData[3] || 0) / 1e6).toString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content">Target Price High</span>
                        <span className="text-base-content font-medium">
                          ${(Number(currentOrderData[4] || 0) / 1e6).toString()}
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
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
