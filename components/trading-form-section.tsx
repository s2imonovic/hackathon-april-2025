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
import { ZetaHopperBotCard } from "@/components/zeta-hopper-bot-card"

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
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

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
        value: BigInt(0), // Placeholder value
        args: [
          BigInt(0), // Placeholder for targetPriceLow
          BigInt(0), // Placeholder for targetPriceHigh
          BigInt(100), // Default slippage
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
        className="flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative h-[350px] w-[350px] sm:h-[400px] sm:w-[400px] lg:h-[500px] lg:w-[500px]">
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
          <div className="absolute inset-0 flex items-center justify-center">
            <ZetaHopperBotCard />
          </div>
        </div>
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

