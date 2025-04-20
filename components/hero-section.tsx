"use client"
import { motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TradingForm } from "@/components/trading-form"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWriteContract } from "wagmi"
import contractAbis from "@/deployments/abis/contract-abis-mainnet.json"
import contractProxies from "@/deployments/addresses/contract-proxies.json"
import { Confetti } from "@/components/confetti"
import { useWindowSize } from "@/hooks/use-window-size"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// Helper to adjust price by percentage
const adjustPrice = (basePrice: string, percentage: number): string => {
  const price = parseFloat(basePrice)
  if (isNaN(price)) return basePrice
  return (price * (1 + percentage)).toFixed(6)
}

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

// Check if deposits are enabled
const DEPOSITS_ENABLED = process.env.NEXT_PUBLIC_DEPOSITS_ENABLED === "true"

// Define the specific function ABI for depositZetaAndCreateSellOrder
const depositZetaAndCreateSellOrderABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "targetPriceLow",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "targetPriceHigh",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "slippageBps",
        "type": "uint256"
      }
    ],
    "name": "depositZetaAndCreateSellOrder",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]

export function HeroSection() {
  const router = useRouter()
  const [depositAmount, setDepositAmount] = useState("")
  const [targetPriceLow, setTargetPriceLow] = useState("")
  const [targetPriceHigh, setTargetPriceHigh] = useState("")
  const [slippage, setSlippage] = useState("100")
  const [selectedLowAdjustment, setSelectedLowAdjustment] = useState("1%")
  const [selectedHighAdjustment, setSelectedHighAdjustment] = useState("5%")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [pendingDeposit, setPendingDeposit] = useState<"usdc" | "zeta" | null>(null)
  
  // Add state for confetti
  const [showConfetti, setShowConfetti] = useState(false)
  const { width, height } = useWindowSize()
  
  // Add flag to track if transaction has been initiated
  const [transactionInitiated, setTransactionInitiated] = useState(false)
  
  // Base price for calculations
  const basePrice = "0.25"
  
  // Prepopulate form values on component mount
  useEffect(() => {
    // Set default deposit amount
    setDepositAmount("100")
    
    // Calculate and set price low (-1%)
    const priceLow = adjustPrice(basePrice, -0.01)
    setTargetPriceLow(priceLow)
    
    // Calculate and set price high (+5%)
    const priceHigh = adjustPrice(basePrice, 0.05)
    setTargetPriceHigh(priceHigh)
    
    // Set default slippage
    setSlippage("100")
    
    // Set selected adjustments
    setSelectedLowAdjustment("1%")
    setSelectedHighAdjustment("5%")
  }, [])

  // Write contract hooks
  const { writeContract: writeDepositZetaAndCreateSellOrder } = useWriteContract()

  // Helper functions for price conversion
  const convertDollarsToContractValue = (dollarAmount: string): number => {
    const num = parseFloat(dollarAmount)
    if (isNaN(num)) return 0
    return Math.floor(num * 1000000) // Convert to contract value (multiply by 1e6)
  }

  const handleDepositZeta = () => {
    if (!DEPOSITS_ENABLED) {
      alert("Deposits are coming soon!")
      return
    }
    
    // Prevent duplicate transactions
    if (transactionInitiated) {
      console.log("Transaction already initiated, ignoring duplicate click")
      return
    }
    
    console.log("Opening disclaimer dialog")
    setPendingDeposit("zeta")
    setShowDisclaimer(true)
  }

  const handleConfirmDeposit = () => {
    console.log("Disclaimer accepted, proceeding with deposit")
    
    if (!pendingDeposit) {
      console.log("No pending deposit, returning")
      return
    }
    
    // Prevent duplicate transactions
    if (transactionInitiated) {
      console.log("Transaction already initiated, ignoring duplicate click")
      return
    }
    
    console.log("Setting transaction initiated flag")
    setTransactionInitiated(true)
    
    // Close the disclaimer dialog immediately to prevent multiple clicks
    console.log("Closing disclaimer dialog")
    setShowDisclaimer(false)
    setPendingDeposit(null)

    // Show confetti animation
    console.log("Showing confetti animation")
    setShowConfetti(true)
    
    // Execute the combined deposit and create sell order transaction
    console.log("Executing depositZetaAndCreateSellOrder transaction")
    writeDepositZetaAndCreateSellOrder({
      address: zetaOrderBookAddress,
      abi: depositZetaAndCreateSellOrderABI,
      functionName: "depositZetaAndCreateSellOrder",
      value: depositAmount
        ? BigInt(Math.floor(parseFloat(depositAmount) * 1e18))
        : BigInt(0),
      args: [
        convertDollarsToContractValue(targetPriceLow),
        convertDollarsToContractValue(targetPriceHigh),
        slippage ? parseInt(slippage) : 0,
      ],
    })
    
    // Hide confetti and redirect after a delay
    setTimeout(() => {
      console.log("Hiding confetti animation")
      setShowConfetti(false)
      
      // Redirect to trading page after confetti finishes
      console.log("Redirecting to trading page")
      router.push('/trade?fromHero=true')
    }, 5000)
  }

  const handleDepositAndOrder = () => {
    console.log("Deposit and order button clicked")
    setIsProcessing(true)
    
    // Validate inputs
    if (!depositAmount || !targetPriceLow || !targetPriceHigh) {
      console.log("Missing required fields")
      alert("Please fill in all required fields")
      setIsProcessing(false)
      return
    }
    
    // Start the deposit process
    console.log("Starting deposit process")
    handleDepositZeta()
    
    // Reset processing state after a short delay
    setTimeout(() => {
      setIsProcessing(false)
    }, 1000)
  }

  return (
    <>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          colors={['#10B981', '#C0C0C0']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
        />
      )}
      <section id="home" className="pt-2 w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-base-100">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <motion.div
              className="flex flex-col justify-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <motion.div
                  className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  Introducing ZetaHopper
                </motion.div>
                <motion.h1
                  className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-base-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Automated On-Chain Trading <span className="text-accent">Made Simple</span>
                </motion.h1>
                <motion.p
                  className="max-w-[600px] text-base-content/80 md:text-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  We harnessed the power of ZetaChain's crosschain architecture to create a truly autonomous range trading system.
                </motion.p>
              </div>
              <motion.div
                className="flex flex-col gap-2 min-[400px]:flex-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link href="/trade">
                  <Button
                    size="lg"
                    className="bg-primary text-primary-content hover:bg-primary/90 px-8 py-4 text-lg"
                  >
                    Start Trading <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            <motion.div
              className="flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="relative w-full">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-secondary opacity-20 blur-3xl"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.3, 0.2],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                />
                <div className="relative z-10">
                  <TradingForm 
                    depositAmount={depositAmount}
                    setDepositAmount={setDepositAmount}
                    targetPriceLow={targetPriceLow}
                    setTargetPriceLow={setTargetPriceLow}
                    targetPriceHigh={targetPriceHigh}
                    setTargetPriceHigh={setTargetPriceHigh}
                    slippage={slippage}
                    setSlippage={setSlippage}
                    selectedLowAdjustment={selectedLowAdjustment}
                    setSelectedLowAdjustment={setSelectedLowAdjustment}
                    selectedHighAdjustment={selectedHighAdjustment}
                    setSelectedHighAdjustment={setSelectedHighAdjustment}
                    handleDepositAndOrder={handleDepositAndOrder}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Important Disclaimer</DialogTitle>
            <DialogDescription>
              This application was created as part of a hackathon project. By proceeding with the deposit, you acknowledge that you are interacting with this application at your own risk. The developers make no guarantees about the security, functionality, or reliability of this application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisclaimer(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDeposit}>
              I Understand, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

