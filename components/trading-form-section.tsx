"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Wallet, Info } from "lucide-react"

export function TradingFormSection() {
  const [amount, setAmount] = useState("1000")
  const [riskLevel, setRiskLevel] = useState(50)

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
                  <Label htmlFor="token" className="text-base-content">
                    Select Token
                  </Label>
                  <Select defaultValue="zeta">
                    <SelectTrigger className="w-full bg-base-200 border-base-300 text-base-content">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent className="bg-base-200 border-base-300 text-base-content">
                      <SelectItem value="zeta">ZETA</SelectItem>
                      <SelectItem value="eth">ETH</SelectItem>
                      <SelectItem value="btc">BTC</SelectItem>
                      <SelectItem value="usdc">USDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-base-content">
                    Trading Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-base-200 border-base-300 text-base-content pr-16"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/70">USDC</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="risk" className="text-base-content">
                      Risk Level
                    </Label>
                    <span className="text-sm text-base-content/70">{riskLevel}%</span>
                  </div>
                  <Slider
                    id="risk"
                    defaultValue={[50]}
                    max={100}
                    step={1}
                    onValueChange={(value) => setRiskLevel(value[0])}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-base-content/70">
                    <span>Conservative</span>
                    <span>Balanced</span>
                    <span>Aggressive</span>
                  </div>
                </div>
                <div className="rounded-lg bg-info/10 p-3 text-sm text-info flex items-start">
                  <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    ZetaHopper will automatically optimize your trading strategy based on market conditions and your
                    risk preference.
                  </span>
                </div>
                <Button
                  className="w-full bg-primary text-primary-content hover:bg-primary/90"
                  onClick={() => window.location.href = "/trade"}
                >
                  <Wallet className="mr-2 h-4 w-4" /> Connect Wallet to Start
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

