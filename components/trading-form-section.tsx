"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wallet, Info } from "lucide-react"
import { useAccount, useWriteContract, useReadContract } from "wagmi"
import contractAbis from "@/deployments/abis/contract-abis-mainnet.json"
import contractProxies from "@/deployments/addresses/contract-proxies.json"
import confetti from 'canvas-confetti'
import { TradingForm } from "@/components/trading-form"

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
] as const;

// Check if deposits are enabled
const DEPOSITS_ENABLED = process.env.NEXT_PUBLIC_DEPOSITS_ENABLED === "true"

export function TradingFormSection({ 
  showFullContent = true,
  useContainer = true
}: { 
  showFullContent?: boolean
  useContainer?: boolean
}) {
  const [depositAmount, setDepositAmount] = useState("")
  const [targetPriceLow, setTargetPriceLow] = useState("")
  const [targetPriceHigh, setTargetPriceHigh] = useState("")
  const [slippage, setSlippage] = useState("100") // Default 1%
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedLowAdjustment, setSelectedLowAdjustment] = useState("1%")
  const [selectedHighAdjustment, setSelectedHighAdjustment] = useState("5%")

  // Wallet connection details
  const { address, chainId } = useAccount()

  // Write contract hooks
  const { writeContractAsync: writeDepositZetaAndCreateSellOrderAsync } = useWriteContract()
  
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

  // Function to trigger confetti animation
  const triggerConfetti = () => {
    // Green confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
      ticks: 200
    });
    
    // Silver confetti
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280'],
        ticks: 200
      });
    }, 250);
  };

  // Handle deposit and order creation
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
    setShowDisclaimer(false)
    
    // Trigger confetti animation
    triggerConfetti();

    try {
      // Use the combined function to deposit ZETA and create sell order in a single transaction
      await writeDepositZetaAndCreateSellOrderAsync({
        chainId,
        address: zetaOrderBookAddress,
        abi: depositZetaAndCreateSellOrderABI,
        functionName: "depositZetaAndCreateSellOrder",
        value: depositAmount ? BigInt(Math.floor(parseFloat(depositAmount) * 1e18)) : BigInt(0),
        args: [
          BigInt(convertDollarsToContractValue(targetPriceLow)),
          BigInt(convertDollarsToContractValue(targetPriceHigh)),
          BigInt(slippage ? parseInt(slippage) : 100),
        ],
      })
      // Transaction submitted successfully
      console.log("ZETA deposit transaction submitted")
    } catch (error) {
      console.error("Error processing transaction:", error)
      alert("An error occurred while processing your transaction. Please try again.")
    } finally {
      setIsProcessing(false)
    }
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

  const content = (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
      {showFullContent && (
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
      )}
      <motion.div
        className={`flex items-center justify-center ${!showFullContent ? 'lg:col-span-2' : ''}`}
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
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
      </motion.div>
    </div>
  )

  return (
    <>
      {useContainer ? (
        <section className="w-full py-12 md:py-24 lg:py-32 bg-base-200">
          <div className="container px-4 md:px-6">
            {content}
          </div>
        </section>
      ) : (
        content
      )}
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
    </>
  )
}

