"use client"

import Link from "next/link"
import { Github, Twitter, DiscIcon as Discord, Copy } from "lucide-react"
import { Button } from "./ui/button"
import contractAddresses from "@/deployments/addresses/contract-addresses.json"

export function Footer() {
  const contracts = {
    orderBook: contractAddresses.mainnet.ZetaOrderBook,
    callbackConnector: contractAddresses.base.CallbackConnector,
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const getNetworkPrefix = (name: string) => {
    switch (name) {
      case 'orderBook':
        return 'zetachain:'
      case 'callbackConnector':
        return 'base:'
      default:
        return ''
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <footer className="w-full py-6 bg-base-100 border-t border-base-300">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-base-content">ZetaHopper</h3>
            <p className="text-sm text-base-content/70">
              Automated on-chain trading bot for Zetachain. Maximize your returns with advanced algorithms.
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
            <h3 className="text-lg font-bold text-base-content">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  About
                </Link>
              </li>
              {/* <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Careers
                </Link>
              </li> */}
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-base-content">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-base-content/70 hover:text-primary">
                  Privacy Policy
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-7 text-base-content/70 hover:text-black p-0"
                    onClick={() => copyAddress(address)}
                  >
                    <Copy className="h-2 w-2" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-base-300 pt-6 text-center text-sm text-base-content/70">
          <p>Made with ☕️ for Zetachain © {new Date().getFullYear()} ZetaHopper. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

