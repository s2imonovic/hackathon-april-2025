import Link from "next/link"
import { Github, Twitter, DiscIcon as Discord } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full py-6 bg-base-100 border-t border-base-300">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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
          {/* <div className="space-y-4">
            <h3 className="text-lg font-bold text-base-content">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="#" className="text-base-content/70 hover:text-primary">
                  Documentation
                </Link>
              </li>
            </ul>
          </div> */}
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
        </div>
        <div className="mt-8 border-t border-base-300 pt-6 text-center text-sm text-base-content/70">
          <p>Made with ☕️ for Zetachain © {new Date().getFullYear()} ZetaHopper. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

