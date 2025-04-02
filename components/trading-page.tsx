"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Info, BarChart3, Clock, TrendingUp, AlertTriangle } from "lucide-react"
import { RecentTrades } from "@/components/recent-trades"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export function TradingPage() {
  const [amount, setAmount] = useState("1000")
  const [riskLevel, setRiskLevel] = useState(50)

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-base-100">
      <div className="container px-4 md:px-6">
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
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl text-base-content">Start Trading Now</h1>
            <p className="max-w-[900px] text-base-content/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Set your parameters and let ZetaHopper&apos;s advanced algorithms maximize your returns on Zetachain.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Trading Form */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-base-200 border-base-300">
              <CardHeader>
                <CardTitle className="text-base-content">Trading Parameters</CardTitle>
                <CardDescription className="text-base-content/70">
                  Configure your trading settings below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-base-300">
                    <TabsTrigger
                      value="basic"
                      className="text-base-content data-[state=active]:bg-primary data-[state=active]:text-primary-content"
                    >
                      Basic
                    </TabsTrigger>
                    <TabsTrigger
                      value="advanced"
                      className="text-base-content data-[state=active]:bg-primary data-[state=active]:text-primary-content"
                    >
                      Advanced
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-6 pt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="token" className="text-base-content">
                          Select Token
                        </Label>
                        <Select defaultValue="zeta">
                          <SelectTrigger className="w-full bg-base-100 border-base-300 text-base-content">
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
                            className="w-full bg-base-100 border-base-300 text-base-content pr-16"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/70">
                            USDC
                          </div>
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
                          ZetaHopper will automatically optimize your trading strategy based on market conditions and
                          your risk preference.
                        </span>
                      </div>
                    </div>
                    <ConnectButton.Custom>
                      {({ account, openConnectModal }) => (
                        <Button
                          className="w-full bg-primary text-primary-content hover:bg-primary/90"
                          onClick={!account ? openConnectModal : undefined}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          {account ? "Start" : "Connect Wallet to Start"}
                        </Button>
                      )}
                    </ConnectButton.Custom>
                  </TabsContent>
                  <TabsContent value="advanced" className="space-y-6 pt-6">
                    <div className="space-y-4">
                      {/* <div className="space-y-2">
                        <Label htmlFor="strategy" className="text-base-content">
                          Trading Strategy
                        </Label>
                        <Select defaultValue="momentum">
                          <SelectTrigger className="w-full bg-base-100 border-base-300 text-base-content">
                            <SelectValue placeholder="Select strategy" />
                          </SelectTrigger>
                          <SelectContent className="bg-base-200 border-base-300 text-base-content">
                            <SelectItem value="momentum">Momentum</SelectItem>
                            <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
                            <SelectItem value="breakout">Breakout</SelectItem>
                            <SelectItem value="grid">Grid Trading</SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}
                      <div className="space-y-2">
                        <Label htmlFor="timeframe" className="text-base-content">
                          Timeframe
                        </Label>
                        <Select defaultValue="1h">
                          <SelectTrigger className="w-full bg-base-100 border-base-300 text-base-content">
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                          <SelectContent className="bg-base-200 border-base-300 text-base-content">
                            <SelectItem value="5m">5 minutes</SelectItem>
                            <SelectItem value="15m">15 minutes</SelectItem>
                            <SelectItem value="1h">1 hour</SelectItem>
                            <SelectItem value="4h">4 hours</SelectItem>
                            <SelectItem value="1d">1 day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* <div className="space-y-2">
                        <Label htmlFor="leverage" className="text-base-content">
                          Leverage
                        </Label>
                        <Select defaultValue="1">
                          <SelectTrigger className="w-full bg-base-100 border-base-300 text-base-content">
                            <SelectValue placeholder="Select leverage" />
                          </SelectTrigger>
                          <SelectContent className="bg-base-200 border-base-300 text-base-content">
                            <SelectItem value="1">1x (No Leverage)</SelectItem>
                            <SelectItem value="2">2x</SelectItem>
                            <SelectItem value="5">5x</SelectItem>
                            <SelectItem value="10">10x</SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}
                      <div className="space-y-2">
                        <Label htmlFor="stop-loss" className="text-base-content">
                          Stop Loss (%)
                        </Label>
                        <Input
                          id="stop-loss"
                          placeholder="Enter stop loss percentage"
                          defaultValue="5"
                          className="w-full bg-base-100 border-base-300 text-base-content"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="take-profit" className="text-base-content">
                          Take Profit (%)
                        </Label>
                        <Input
                          id="take-profit"
                          placeholder="Enter take profit percentage"
                          defaultValue="15"
                          className="w-full bg-base-100 border-base-300 text-base-content"
                        />
                      </div>
                      <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span>
                          Advanced settings are recommended for experienced traders. Higher leverage increases both
                          potential returns and risks.
                        </span>
                      </div>
                    </div>
                    <Button className="w-full bg-primary text-primary-content hover:bg-primary/90">
                      <Wallet className="mr-2 h-4 w-4" /> Connect Wallet to Start
                    </Button>
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
                      $1.24 <span className="text-success text-xs">+2.4%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-base-content">24h Volume</span>
                    </div>
                    <div className="text-base-content font-medium">$4.2M</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
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
                    <div className="text-success font-medium">+12.4%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Last 30 Days</span>
                    <div className="text-success font-medium">+32.7%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content">Win Rate</span>
                    <div className="text-base-content font-medium">78%</div>
                  </div>
                  <div className="h-24 w-full bg-base-300 rounded-md overflow-hidden">
                    <svg viewBox="0 0 100 20" className="w-full h-full">
                      <path
                        d="M0,10 Q10,8 20,12 T40,9 T60,11 T80,8 T100,6"
                        fill="none"
                        stroke="#34EEB6"
                        strokeWidth="0.5"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>         
          </motion.div>
        </div>

        {/* Recent Trades Section */}
        <div className="mt-8">
          <RecentTrades />
        </div>
      </div>
    </section>
  )
}

