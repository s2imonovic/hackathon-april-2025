"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wallet, Info, ArrowRight } from "lucide-react"
import { useAccount, useWriteContract, useReadContract } from "wagmi"
import contractAbis from "@/deployments/abis/contract-abis-mainnet.json"
import contractProxies from "@/deployments/addresses/contract-proxies.json"

// Define types for the contract proxies
type NetworkType = 'testnet' | 'mainnet' | 'base_sepolia' | 'base';
type ContractProxiesType = {
  [key in NetworkType]?: {
    ProxyAdmin?: string;
    ZetaOrderBook?: string;
    CallbackConnector?: string;
  };
};

// Determine which network to use based on environment
const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true'
const network = isTestnet ? 'testnet' : 'mainnet'

// Get the contract address from the proxy addresses
const typedProxies = contractProxies as ContractProxiesType;
const zetaOrderBookAddress = typedProxies[network]?.ZetaOrderBook as `0x${string}` || '0x0000000000000000000000000000000000000000'

// Use the ABI from the mainnet contract (should be the same for both networks)
const zetaOrderBookABI = contractAbis.mainnet.ZetaOrderBook.abi

// USDC ABI - minimal ERC20 interface
const usdcABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Check if deposits are enabled
const DEPOSITS_ENABLED = process.env.NEXT_PUBLIC_DEPOSITS_ENABLED === "true"

export function TradingFormSection() {
  const [depositType, setDepositType] = useState<"zeta" | "usdc">("zeta")
  const [depositAmount, setDepositAmount] = useState("")
  const [targetPriceLow, setTargetPriceLow] = useState("")
  const [targetPriceHigh, setTargetPriceHigh] = useState("")
  const [slippage, setSlippage] = useState("100") // Default 1%
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedLowAdjustment, setSelectedLowAdjustment] = useState("1%")
  const [selectedHighAdjustment, setSelectedHighAdjustment] = useState("5%")
  const [approvalStatus, setApprovalStatus] = useState<"none" | "pending" | "approved" | "failed">("none")
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [usdcTokenAddress, setUsdcTokenAddress] = useState<`0x${string}` | null>(null)

  // Wallet connection details
  const { address, chainId } = useAccount()

  // Write contract hooks
  const { writeContract: writeDepositZetaAndCreateSellOrder } = useWriteContract()
  const { writeContract: writeDepositUsdcAndCreateBuyOrder } = useWriteContract()
  const { writeContract: writeApproveUsdc } = useWriteContract()
  
  // Read contract hooks for checking USDC allowance and getting USDC token address
  const { data: usdcTokenAddressFromContract } = useReadContract({
    address: zetaOrderBookAddress,
    abi: zetaOrderBookABI,
    functionName: "usdcToken",
  })

  // Set the USDC token address from the contract
  useEffect(() => {
    if (usdcTokenAddressFromContract) {
      setUsdcTokenAddress(usdcTokenAddressFromContract as `0x${string}`)
    }
  }, [usdcTokenAddressFromContract])

  // Read contract hooks for checking USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: usdcTokenAddress || '0x0000000000000000000000000000000000000000',
    abi: usdcABI,
    functionName: "allowance",
    args: [address as `0x${string}`, zetaOrderBookAddress],
    query: {
      enabled: !!address && !!usdcTokenAddress && depositType === "usdc" && approvalStatus === "none",
    }
  })

  // Helper functions for price conversion
  const convertDollarsToContractValue = (dollarAmount: string): number => {
    const num = parseFloat(dollarAmount)
    if (isNaN(num)) return 0
    return Math.floor(num * 1000000) // Convert to contract value (multiply by 1e6)
  }

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

  // Pre-populate price fields on component mount
  useEffect(() => {
    const basePrice = "0.25" // Example base price, in a real app this would come from an API
    setTargetPriceLow(adjustPrice(basePrice, -0.01)) // -1%
    setTargetPriceHigh(adjustPrice(basePrice, 0.05))  // +5%
  }, [])

  // Check if we need approval
  useEffect(() => {
    if (depositType === "usdc" && address && usdcAllowance !== undefined && usdcTokenAddress) {
      const depositAmountValue = depositAmount ? parseInt(depositAmount) : 0
      if (depositAmountValue > 0 && usdcAllowance < BigInt(depositAmountValue)) {
        setApprovalStatus("none")
      } else {
        setApprovalStatus("approved")
      }
    }
  }, [depositType, address, usdcAllowance, depositAmount, usdcTokenAddress])

  // Reset approval status when deposit type or amount changes
  useEffect(() => {
    if (depositType === "zeta") {
      setApprovalStatus("none")
      setApprovalError(null)
    }
  }, [depositType])

  // Handle deposit and order creation based on token type
  const handleDepositAndOrder = () => {
    if (!DEPOSITS_ENABLED) {
      alert("Deposits are coming soon!")
      return
    }
    if (!address) {
      alert("Please connect your wallet to perform this action.")
      return
    }
    setShowDisclaimer(true)
  }

  const handleConfirmDepositAndOrder = async () => {
    if (!address) return
    setIsProcessing(true)
    setApprovalError(null)

    try {
      if (depositType === "zeta") {
        // Use the combined function to deposit ZETA and create sell order in a single transaction
        writeDepositZetaAndCreateSellOrder({
          chainId,
          address: zetaOrderBookAddress,
          abi: zetaOrderBookABI,
          functionName: "depositZetaAndCreateSellOrder",
          value: depositAmount ? BigInt(Math.floor(parseFloat(depositAmount) * 1e18)) : BigInt(0),
          args: [
            convertDollarsToContractValue(targetPriceLow),
            convertDollarsToContractValue(targetPriceHigh),
            slippage ? parseInt(slippage) : 100,
          ],
        })
      } else {
        // For USDC, we need to handle the two-step process
        const depositAmountValue = depositAmount ? parseInt(depositAmount) : 0
        
        if (!usdcTokenAddress) {
          setApprovalError("USDC token address not available. Please try again later.")
          setIsProcessing(false)
          setShowDisclaimer(false)
          return
        }
        
        // Check if we need approval
        if (approvalStatus !== "approved") {
          setApprovalStatus("pending")
          
          // Request USDC approval
          writeApproveUsdc({
            chainId,
            address: usdcTokenAddress,
            abi: usdcABI,
            functionName: "approve",
            args: [zetaOrderBookAddress, BigInt(depositAmountValue)],
          })
          
          // We'll handle the success/error in a separate useEffect
        } else {
          // Approval already granted, proceed with deposit and order creation
          executeUsdcDepositAndOrder(depositAmountValue)
        }
      }
    } catch (error) {
      console.error("Error processing transaction:", error)
      alert("An error occurred while processing your transaction. Please try again.")
      setIsProcessing(false)
      setShowDisclaimer(false)
    }
  }

  // Handle USDC approval success/failure
  useEffect(() => {
    if (approvalStatus === "pending") {
      const handleApprovalSuccess = () => {
        setApprovalStatus("approved")
        // Now that approval is granted, proceed with deposit and order creation
        const depositAmountValue = depositAmount ? parseInt(depositAmount) : 0
        executeUsdcDepositAndOrder(depositAmountValue)
      }
      
      const handleApprovalError = (error: Error) => {
        console.error("USDC approval failed:", error)
        setApprovalStatus("failed")
        setApprovalError("Failed to approve USDC spending. Please try again.")
        setIsProcessing(false)
        setShowDisclaimer(false)
      }
      
      // Set up event listeners for the approval transaction
      // This is a simplified approach - in a real app, you'd use a more robust event handling system
      const timeoutId = setTimeout(() => {
        // Simulate checking if approval was successful
        // In a real app, you'd check the transaction status
        if (approvalStatus === "pending") {
          handleApprovalSuccess()
        }
      }, 5000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [approvalStatus, depositAmount])

  // Helper function to execute USDC deposit and order creation
  const executeUsdcDepositAndOrder = (amount: number) => {
    writeDepositUsdcAndCreateBuyOrder({
      chainId,
      address: zetaOrderBookAddress,
      abi: zetaOrderBookABI,
      functionName: "depositUsdcAndCreateBuyOrder",
      args: [
        amount,
        convertDollarsToContractValue(targetPriceLow),
        convertDollarsToContractValue(targetPriceHigh),
        slippage ? parseInt(slippage) : 100,
      ],
    })
    
    // We'll handle success/failure in a separate useEffect
  }

  // Handle deposit and order creation success/failure
  useEffect(() => {
    if (isProcessing) {
      const handleDepositSuccess = () => {
        setIsProcessing(false)
        setShowDisclaimer(false)
      }
      
      const handleDepositError = (error: Error) => {
        console.error("USDC deposit and order creation failed:", error)
        setApprovalStatus("none")
        setApprovalError("Failed to deposit USDC and create order. Please try again.")
        setIsProcessing(false)
        setShowDisclaimer(false)
      }
      
      // Set up event listeners for the deposit transaction
      // This is a simplified approach - in a real app, you'd use a more robust event handling system
      const timeoutId = setTimeout(() => {
        // Simulate checking if deposit was successful
        // In a real app, you'd check the transaction status
        if (isProcessing) {
          handleDepositSuccess()
        }
      }, 5000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isProcessing])

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
    const basePrice = "0.25" // Example base price, in a real app this would come from an API
    const isLowPrice = label === "Target Price Low"
    const selectedAdjustment = isLowPrice ? selectedLowAdjustment : selectedHighAdjustment
    const setSelectedAdjustment = isLowPrice ? setSelectedLowAdjustment : setSelectedHighAdjustment
    
    const handleAdjustmentClick = (label: string, percentage: number) => {
      setSelectedAdjustment(label)
      onChange(adjustPrice(basePrice, isLowPrice ? -percentage : percentage))
    }
    
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
              variant={selectedAdjustment === label ? "default" : "outline"}
              size="sm"
              onClick={() => handleAdjustmentClick(label, percentage)}
              className={`flex-1 ${selectedAdjustment === label ? "text-white" : ""}`}
            >
              {isLowPrice ? "-" : "+"}{label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-base-200">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          <motion.div
            className="flex flex-col justify-center space-y-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content">
                Start Trading
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-base-content">
                Ready to Hop In?
              </h2>
              <p className="max-w-[600px] text-base-content/80 md:text-xl">
                Set your trading parameters and let ZetaHopper work its magic. Our advanced algorithms will optimize
                your trades on Zetachain.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded-full bg-success" />
                <span className="text-base-content">Fully automated trading</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded-full bg-success" />
                <span className="text-base-content">No technical knowledge required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded-full bg-success" />
                <span className="text-base-content">Transparent on-chain transactions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded-full bg-success" />
                <span className="text-base-content">Withdraw your funds anytime</span>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-md space-y-6 rounded-xl bg-base-100 p-6 shadow-lg border border-base-300">
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-bold text-base-content">Start Trading Now</h3>
                <p className="text-base-content/70">Enter your trading parameters below</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit-type" className="text-base-content">
                    Select Deposit Token
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={depositType}
                      onValueChange={(val) => setDepositType(val as "zeta" | "usdc")}
                    >
                      <SelectTrigger className="w-1/2 bg-base-200 border-base-300 text-base-content">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent className="bg-base-200 border-base-300 text-base-content">
                        <SelectItem value="zeta">ZETA</SelectItem>
                        <SelectItem value="usdc">USDC</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="w-1/2 flex items-center justify-center bg-base-200 border border-base-300 rounded-md px-3 text-base-content">
                      ZETA/USD: $0.25
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount" className="text-base-content">
                    Deposit Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="deposit-amount"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-base-200 border-base-300 text-base-content pr-16"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/70">
                      {depositType === "zeta" ? "ZETA" : "USDC"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PriceInput
                    label="Target Price Low"
                    value={targetPriceLow}
                    onChange={setTargetPriceLow}
                    placeholder="e.g., 0.246500"
                  />
                  <PriceInput
                    label="Target Price High"
                    value={targetPriceHigh}
                    onChange={setTargetPriceHigh}
                    placeholder="e.g., 0.250000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slippage" className="text-base-content">
                    Slippage Tolerance
                  </Label>
                  <Select
                    value={slippage}
                    onValueChange={setSlippage}
                  >
                    <SelectTrigger className="w-full bg-base-200 border-base-300 text-base-content">
                      <SelectValue placeholder="Select slippage" />
                    </SelectTrigger>
                    <SelectContent className="bg-base-200 border-base-300 text-base-content">
                      <SelectItem value="100">1%</SelectItem>
                      <SelectItem value="500">5%</SelectItem>
                      <SelectItem value="1000">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {depositType === "usdc" && !usdcTokenAddress && (
                  <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning flex items-start">
                    <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Loading USDC token information...</span>
                  </div>
                )}
                {depositType === "usdc" && approvalStatus === "failed" && (
                  <div className="rounded-lg bg-error/10 p-3 text-sm text-error flex items-start">
                    <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{approvalError}</span>
                  </div>
                )}
                {depositType === "usdc" && approvalStatus === "pending" && (
                  <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning flex items-start">
                    <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Please approve USDC spending in your wallet...</span>
                  </div>
                )}
                <div className="rounded-lg bg-info/10 p-3 text-sm text-info flex items-start">
                  <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    {depositType === "zeta" 
                      ? "You will deposit ZETA and create a sell order at your specified price range."
                      : "You will first approve the contract to spend your USDC, then deposit USDC and create a buy order at your specified price range."}
                  </span>
                </div>
                <Button
                  className="w-full bg-primary text-primary-content hover:bg-primary/90"
                  onClick={handleDepositAndOrder}
                  disabled={isProcessing || (depositType === "usdc" && approvalStatus === "pending") || (depositType === "usdc" && !usdcTokenAddress)}
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : depositType === "usdc" && approvalStatus === "pending" ? (
                    "Approving USDC..."
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" /> 
                      {depositType === "zeta" ? "Deposit ZETA & Create Sell Order" : "Deposit USDC & Create Buy Order"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-base-content">Important Disclaimer</h3>
            <p className="mb-6 text-base-content/80">
              This application was created as part of a hackathon project. By proceeding with the deposit, you acknowledge that you are interacting with this application at your own risk. The developers make no guarantees about the security, functionality, or reliability of this application.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDisclaimer(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmDepositAndOrder}>
                I Understand, Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

