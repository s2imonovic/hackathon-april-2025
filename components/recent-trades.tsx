"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpDown, ChevronDown, CheckCircle2, Clock, TrendingDown, TrendingUp, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

// Mock data for recent trades
const mockTrades = [
  {
    id: "#ZH-7834",
    pair: "ZETA/USDC",
    type: "BUY",
    amount: "1,245.00",
    price: "1.24",
    value: "1,543.80",
    profit: "+123.45",
    profitPercentage: "+8.7%",
    timestamp: "2 mins ago",
    status: "COMPLETED",
    profitable: true,
  },
  {
    id: "#ZH-7833",
    pair: "ETH/USDC",
    type: "SELL",
    amount: "0.42",
    price: "3,456.78",
    value: "1,451.85",
    profit: "+87.21",
    profitPercentage: "+6.4%",
    timestamp: "15 mins ago",
    status: "COMPLETED",
    profitable: true,
  },
  {
    id: "#ZH-7832",
    pair: "BTC/USDC",
    type: "BUY",
    amount: "0.032",
    price: "63,245.92",
    value: "2,023.87",
    profit: "-42.67",
    profitPercentage: "-2.1%",
    timestamp: "37 mins ago",
    status: "COMPLETED",
    profitable: false,
  },
  {
    id: "#ZH-7831",
    pair: "ZETA/USDC",
    type: "SELL",
    amount: "876.50",
    price: "1.22",
    value: "1,069.33",
    profit: "+54.32",
    profitPercentage: "+5.3%",
    timestamp: "1 hour ago",
    status: "COMPLETED",
    profitable: true,
  },
  {
    id: "#ZH-7830",
    pair: "ETH/USDC",
    type: "BUY",
    amount: "0.18",
    price: "3,421.45",
    value: "615.86",
    profit: "+32.42",
    profitPercentage: "+5.5%",
    timestamp: "2 hours ago",
    status: "COMPLETED",
    profitable: true,
  },
  {
    id: "#ZH-7829",
    pair: "BTC/USDC",
    type: "SELL",
    amount: "0.011",
    price: "62,985.36",
    value: "692.84",
    profit: "-18.34",
    profitPercentage: "-2.6%",
    timestamp: "3 hours ago",
    status: "COMPLETED",
    profitable: false,
  },
  {
    id: "#ZH-7828",
    pair: "ZETA/ETH",
    type: "BUY",
    amount: "542.75",
    price: "0.00036",
    value: "0.195",
    profit: "+0.012",
    profitPercentage: "+6.2%",
    timestamp: "5 hours ago",
    status: "COMPLETED",
    profitable: true,
  },
  {
    id: "#ZH-7827",
    pair: "ZETA/USDC",
    type: "BUY",
    amount: "978.00",
    price: "1.20",
    value: "1,173.60",
    profit: "",
    profitPercentage: "",
    timestamp: "Just now",
    status: "PENDING",
    profitable: null,
  },
]

// Mock data for active positions
const mockPositions = [
  {
    id: "#ZH-P2245",
    pair: "ZETA/USDC",
    type: "LONG",
    entryPrice: "1.21",
    currentPrice: "1.24",
    amount: "2,500.00",
    value: "3,100.00",
    profit: "+75.00",
    profitPercentage: "+2.5%",
    duration: "2 days",
    profitable: true,
  },
  {
    id: "#ZH-P2244",
    pair: "ETH/USDC",
    type: "SHORT",
    entryPrice: "3,520.45",
    currentPrice: "3,456.78",
    amount: "0.85",
    value: "2,938.26",
    profit: "+54.23",
    profitPercentage: "+1.8%",
    duration: "1 day",
    profitable: true,
  },
  {
    id: "#ZH-P2243",
    pair: "BTC/USDC",
    type: "LONG",
    entryPrice: "64,231.87",
    currentPrice: "63,245.92",
    amount: "0.075",
    value: "4,743.44",
    profit: "-73.95",
    profitPercentage: "-1.5%",
    duration: "12 hours",
    profitable: false,
  },
]

export function RecentTrades() {
  const [filter, setFilter] = useState("all")

  const filteredTrades =
    filter === "all"
      ? mockTrades
      : filter === "profitable"
        ? mockTrades.filter((trade) => trade.profitable === true)
        : mockTrades.filter((trade) => trade.profitable === false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-base-200 border-base-300">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base-content">Trading Activity</CardTitle>
              <CardDescription className="text-base-content/70">Monitor your bot&apos;s trading performance</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 border-base-300 text-black">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-base-200 border-base-300 text-base-content">
                  <DropdownMenuItem
                    onClick={() => setFilter("all")}
                    className={filter === "all" ? "bg-primary/10 text-primary" : ""}
                  >
                    All Trades
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("profitable")}
                    className={filter === "profitable" ? "bg-primary/10 text-primary" : ""}
                  >
                    Profitable Only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("unprofitable")}
                    className={filter === "unprofitable" ? "bg-primary/10 text-primary" : ""}
                  >
                    Unprofitable Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-base-300 mb-4">
              <TabsTrigger
                value="recent"
                className="text-base-content data-[state=active]:bg-primary data-[state=active]:text-primary-content"
              >
                Recent Trades
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="text-base-content data-[state=active]:bg-primary data-[state=active]:text-primary-content"
              >
                Active Positions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              <div className="rounded-md border border-base-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-base-300 text-base-content/70 border-b border-base-300">
                        <th className="px-4 py-3 text-left font-medium">
                          <div className="flex items-center">
                            ID
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          <div className="flex items-center">
                            Pair
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Price</th>
                        <th className="px-4 py-3 text-right font-medium">Value</th>
                        <th className="px-4 py-3 text-right font-medium">
                          <div className="flex items-center justify-end">
                            Profit/Loss
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map((trade, index) => (
                        <tr
                          key={trade.id}
                          className={`border-b border-base-300 text-base-content ${index === filteredTrades.length - 1 ? "border-b-0" : ""
                            }`}
                        >
                          <td className="px-4 py-3 font-medium">{trade.id}</td>
                          <td className="px-4 py-3">{trade.pair}</td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`${trade.type === "BUY"
                                  ? "bg-success/20 text-success hover:bg-success/30"
                                  : "bg-error/20 text-error hover:bg-error/30"
                                }`}
                            >
                              {trade.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">{trade.amount}</td>
                          <td className="px-4 py-3 text-right">{trade.price}</td>
                          <td className="px-4 py-3 text-right">{trade.value}</td>
                          <td className="px-4 py-3 text-right">
                            {trade.profit && (
                              <div
                                className={`flex items-center justify-end font-medium ${trade.profitable ? "text-success" : "text-error"
                                  }`}
                              >
                                {trade.profitable ? (
                                  <TrendingUp className="mr-1 h-4 w-4" />
                                ) : (
                                  <TrendingDown className="mr-1 h-4 w-4" />
                                )}
                                {trade.profit} ({trade.profitPercentage})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              {trade.status === "COMPLETED" ? (
                                <Badge className="bg-success/20 text-success hover:bg-success/30 flex items-center">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-warning/20 text-warning hover:bg-warning/30 flex items-center">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-base-content/70">{trade.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-base-content/70">
                  Showing <strong>{filteredTrades.length}</strong> out of <strong>{mockTrades.length}</strong> trades
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 border-base-300 text-black">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 border-base-300 text-black">
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              <div className="rounded-md border border-base-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-base-300 text-base-content/70 border-b border-base-300">
                        <th className="px-4 py-3 text-left font-medium">ID</th>
                        <th className="px-4 py-3 text-left font-medium">Pair</th>
                        <th className="px-4 py-3 text-left font-medium">Position</th>
                        <th className="px-4 py-3 text-right font-medium">Entry Price</th>
                        <th className="px-4 py-3 text-right font-medium">Current Price</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Value</th>
                        <th className="px-4 py-3 text-right font-medium">Profit/Loss</th>
                        <th className="px-4 py-3 text-right font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPositions.map((position, index) => (
                        <tr
                          key={position.id}
                          className={`border-b border-base-300 text-base-content ${index === mockPositions.length - 1 ? "border-b-0" : ""
                            }`}
                        >
                          <td className="px-4 py-3 font-medium">{position.id}</td>
                          <td className="px-4 py-3">{position.pair}</td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`${position.type === "LONG"
                                  ? "bg-success/20 text-success hover:bg-success/30"
                                  : "bg-error/20 text-error hover:bg-error/30"
                                }`}
                            >
                              {position.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">{position.entryPrice}</td>
                          <td className="px-4 py-3 text-right">
                            <div className={position.profitable ? "text-success" : "text-error"}>
                              {position.currentPrice}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">{position.amount}</td>
                          <td className="px-4 py-3 text-right">{position.value}</td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={`flex items-center justify-end font-medium ${position.profitable ? "text-success" : "text-error"
                                }`}
                            >
                              {position.profitable ? (
                                <TrendingUp className="mr-1 h-4 w-4" />
                              ) : (
                                <TrendingDown className="mr-1 h-4 w-4" />
                              )}
                              {position.profit} ({position.profitPercentage})
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-base-content/70">{position.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}

