"use client"

import React, { useEffect, useRef } from 'react'

interface TradingViewWidgetProps {
  symbol: string
  theme?: 'light' | 'dark'
  autosize?: boolean
  height?: number | string
  width?: number | string
}

// Define the TradingView widget configuration interface
interface TradingViewWidgetConfig {
  container_id: string
  symbol: string
  interval: string
  timezone: string
  theme: string
  style: string
  locale: string
  toolbar_bg: string
  enable_publishing: boolean
  allow_symbol_change: boolean
  save_image: boolean
  height: number | string
  width: number | string
  hide_side_toolbar: boolean
  studies: string[]
  show_popup_button: boolean
  popup_width: string
  popup_height: string
  hide_volume: boolean
  support_host: string
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  theme = 'dark',
  autosize = true,
  height = 400,
  width = '100%'
}) => {
  const container = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (window.TradingView && container.current) {
        // Ensure height is a number if it's a string
        const numericHeight = typeof height === 'string' ? parseInt(height, 10) : height
        
        const config: TradingViewWidgetConfig = {
          container_id: container.current.id,
          symbol: symbol,
          interval: '1H',
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          save_image: false,
          height: numericHeight,
          width: width,
          hide_side_toolbar: false,
          studies: ['RSI@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          hide_volume: false,
          support_host: 'https://www.tradingview.com'
        }
        
        widgetRef.current = new window.TradingView.widget(config)
      }
    }
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [symbol, theme, height, width])

  return (
    <div 
      id={`tradingview_${symbol}`} 
      ref={container} 
      style={{ 
        height: autosize ? '100%' : height, 
        width: width,
        minHeight: typeof height === 'number' ? `${height}px` : undefined
      }}
    />
  )
}

// Add TypeScript declaration for TradingView
declare global {
  interface Window {
    TradingView: {
      widget: new (config: TradingViewWidgetConfig) => any
    }
  }
} 