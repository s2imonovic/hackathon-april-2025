"use client"
import { motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TradingForm } from "@/components/trading-form"
import { useState } from "react"

export function HeroSection() {
  const [depositAmount, setDepositAmount] = useState("")
  const [targetPriceLow, setTargetPriceLow] = useState("")
  const [targetPriceHigh, setTargetPriceHigh] = useState("")
  const [slippage, setSlippage] = useState("100")
  const [selectedLowAdjustment, setSelectedLowAdjustment] = useState("1%")
  const [selectedHighAdjustment, setSelectedHighAdjustment] = useState("5%")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDepositAndOrder = () => {
    // This will be handled by the TradingForm component
  }

  return (
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
  )
}

