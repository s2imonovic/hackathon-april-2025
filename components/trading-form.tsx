"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wallet, Info } from "lucide-react"
import { useEffect, useState, useRef } from "react"

// Price adjustment presets
const getPriceAdjustments = (isMediumScreen: boolean) => ({
  "1%": 0.01,
  "5%": 0.05,
  ...(isMediumScreen ? {} : { "20%": 0.20 }),
})

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
  placeholder,
  selectedAdjustment,
  setSelectedAdjustment
}: { 
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  selectedAdjustment: string
  setSelectedAdjustment: (value: string) => void
}) => {
  const [showAllButtons, setShowAllButtons] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        // Hide 20% button if container width is less than 350px
        setShowAllButtons(containerRef.current.offsetWidth >= 350)
      }
    }
    
    checkWidth()
    window.addEventListener('resize', checkWidth)
    
    return () => window.removeEventListener('resize', checkWidth)
  }, [])
  
  const inputId = `order-${label.toLowerCase().replace(/\s+/g, '-')}`
  const basePrice = "0.25" // Example base price, in a real app this would come from an API
  const isLowPrice = label === "Target Price Low"
  
  const handleAdjustmentClick = (label: string, percentage: number) => {
    setSelectedAdjustment(label)
    onChange(adjustPrice(basePrice, isLowPrice ? -percentage : percentage))
  }
  
  return (
    <div className="space-y-2" ref={containerRef}>
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
        {Object.entries({
          "1%": 0.01,
          "5%": 0.05,
          ...(showAllButtons ? { "20%": 0.20 } : {})
        }).map(([label, percentage]) => (
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

interface TradingFormProps {
  depositAmount: string
  setDepositAmount: (value: string) => void
  targetPriceLow: string
  setTargetPriceLow: (value: string) => void
  targetPriceHigh: string
  setTargetPriceHigh: (value: string) => void
  slippage: string
  setSlippage: (value: string) => void
  selectedLowAdjustment: string
  setSelectedLowAdjustment: (value: string) => void
  selectedHighAdjustment: string
  setSelectedHighAdjustment: (value: string) => void
  handleDepositAndOrder: () => void
  isProcessing: boolean
  fullWidth?: boolean
}

export function TradingForm({
  depositAmount,
  setDepositAmount,
  targetPriceLow,
  setTargetPriceLow,
  targetPriceHigh,
  setTargetPriceHigh,
  slippage,
  setSlippage,
  selectedLowAdjustment,
  setSelectedLowAdjustment,
  selectedHighAdjustment,
  setSelectedHighAdjustment,
  handleDepositAndOrder,
  isProcessing,
  fullWidth = false
}: TradingFormProps) {
  return (
    <div className={`w-full ${fullWidth ? '' : 'max-w-md'} space-y-6 rounded-xl bg-base-100 p-6 shadow-lg border border-base-300`}>
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold text-base-content">Start Trading Now</h3>
        <p className="text-base-content/70">Enter your trading parameters below</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deposit-amount" className="text-base-content">
            Deposit Amount (ZETA)
          </Label>
          <div className="flex gap-2">
            <div className="relative w-1/2">
              <Input
                id="deposit-amount"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-base-200 border-base-300 text-base-content pr-16"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/70">
                ZETA
              </div>
            </div>
            <div className="w-1/2 flex items-center justify-center bg-base-200 border border-base-300 rounded-md px-3 text-base-content">
              ZETA/USD: $0.25
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PriceInput
            label="Target Price Low"
            value={targetPriceLow}
            onChange={setTargetPriceLow}
            placeholder="e.g., 0.246500"
            selectedAdjustment={selectedLowAdjustment}
            setSelectedAdjustment={setSelectedLowAdjustment}
          />
          <PriceInput
            label="Target Price High"
            value={targetPriceHigh}
            onChange={setTargetPriceHigh}
            placeholder="e.g., 0.250000"
            selectedAdjustment={selectedHighAdjustment}
            setSelectedAdjustment={setSelectedHighAdjustment}
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
        <div className="rounded-lg bg-info/10 p-3 text-sm text-info flex items-start">
          <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>
            You will deposit ZETA and create a sell order at your specified price range.
          </span>
        </div>
        <Button
          className="w-full bg-primary text-primary-content hover:bg-primary/90"
          onClick={handleDepositAndOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" /> 
              Deposit ZETA & Create Sell Order
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 