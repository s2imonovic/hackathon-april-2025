"use client"

import Link from "next/link"
import { Github, Twitter, DiscIcon as Discord, Copy } from "lucide-react"
import { Button } from "./ui/button"
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

export function Footer() {
  const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true'
  const network = isTestnet ? 'testnet' : 'mainnet'
  const baseNetwork = isTestnet ? 'base_sepolia' : 'base'
  
  const typedProxies = contractProxies as ContractProxiesType;
  
  const contracts = {
    orderBook: typedProxies[network]?.ZetaOrderBook || 'Not deployed',
    callbackConnector: typedProxies[baseNetwork]?.CallbackConnector || 'Not deployed',
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const getNetworkPrefix = (name: string) => {
    switch (name) {
      case 'orderBook':
        return isTestnet ? 'zetachain-testnet:' : 'zetachain:'
      case 'callbackConnector':
        return isTestnet ? 'base-sepolia:' : 'base:'
      default:
        return ''
    }
  }

  const formatAddress = (address: string) => {
    if (address === 'Not deployed') return 'Not deployed';
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <footer className="w-full py-6 bg-base-100 border-t border-base-300">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-base-content">ZetaHopper</h3>
            <p className="text-sm text-base-content/70">
              We harnessed the power of ZetaChain's crosschain architecture to create a truly autonomous range trading system.
            </p>
            {/* <div className="flex space-x-4">
              <Link href="#" className="text-base-content/70 hover:text-primary">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-base-content/70 hover:text-primary">
                <Discord className="h-5 w-5" />
                <span className="sr-only">Discord</span>
              </Link>
              <Link href="#" className="text-base-content/70 hover:text-primary">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </div> */}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-base-content">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-base-content/70 hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-base-content/70 hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/risk" className="text-base-content/70 hover:text-primary">
                  Risk Disclosure
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-base-content">Contracts</h3>
            <ul className="space-y-2 text-sm">
              {Object.entries(contracts).map(([name, address]) => (
                <li key={name} className="flex items-center gap-2">
                  <span className="text-base-content/70 capitalize">{name}:</span>
                  <code className="text-xs bg-base-200 text-base-content px-2 py-0.5 rounded-full">{getNetworkPrefix(name)}{formatAddress(address)}</code>
                  {address !== 'Not deployed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-7 text-base-content/70 hover:text-black p-0"
                      onClick={() => copyAddress(address)}
                    >
                      <Copy className="h-2 w-2" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 pt-2 border-t border-base-300">
                <h4 className="text-sm font-bold text-base-content/70 mb-2">Environment</h4>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <span className="text-base-content/70">Testnet:</span>
                    <code className="bg-base-200 text-base-content px-2 py-0.5 rounded-full">
                      {isTestnet ? 'Enabled' : 'Disabled'}
                    </code>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-base-content/70">Deposits:</span>
                    <code className="bg-base-200 text-base-content px-2 py-0.5 rounded-full">
                      {process.env.NEXT_PUBLIC_DEPOSITS_ENABLED === 'true' ? 'Enabled' : 'Disabled'}
                    </code>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-base-300">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
            <p className="text-sm text-base-content/70">
              © {new Date().getFullYear()} ZetaHopper. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-sm text-base-content/70 hover:text-primary">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-base-content/70 hover:text-primary">
                Terms
              </Link>
              <Link href="/risk" className="text-sm text-base-content/70 hover:text-primary">
                Risk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

