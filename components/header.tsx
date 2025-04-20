"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Menu, X, Zap, Rocket } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-mobile"
import { usePathname, useRouter } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Link as ScrollLink } from "react-scroll"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const pathname = usePathname()
  const router = useRouter()
  const isTradeRoute = pathname === "/trade"
  const isHomePage = pathname === "/"

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleNavigation = (href: string) => {
    setIsMenuOpen(false) // Close mobile menu if open

    if (!isHomePage) {
      // If we're not on the home page, first navigate to home
      router.push('/')
      // Wait for navigation to complete then scroll
      setTimeout(() => {
        const element = document.getElementById(href)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const navItems = [
    { name: "Home", href: "home" },
    { name: "How It Works", href: "how-it-works" },
  ]

  const isActive = (href: string) => {
    return pathname === "/" && isMobile ? false : pathname.startsWith(href)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-base-100/95 backdrop-blur-sm shadow-md" : "bg-base-100"
        }`}
    >
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
            <img src="/logo_3.webp" alt="ZetaHopper Logo" className="h-12 w-12" />
              <span className="text-xl font-bold text-base-content">ZetaHopper</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              isHomePage ? (
                <ScrollLink
                  key={item.name}
                  to={item.href}
                  smooth={true}
                  duration={500}
                  offset={-70}
                  className={`transition-colors cursor-pointer ${isActive(item.href) ? "text-primary font-medium" : "text-base-content/80 hover:text-primary"
                    }`}
                >
                  {item.name}
                </ScrollLink>
              ) : (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`transition-colors cursor-pointer ${isActive(item.href) ? "text-primary font-medium" : "text-base-content/80 hover:text-primary"
                    }`}
                >
                  {item.name}
                </button>
              )
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {!isTradeRoute && (
              <Link href="/trade">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <Rocket className="mr-2 h-4 w-4" /> Launch App
                </Button>
              </Link>
            )}
            <ConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMenu} className="text-base-content">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobile && isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-base-100 border-t border-base-300"
        >
          <div className="container px-4 py-4 flex flex-col space-y-4">
            {navItems.map((item) => (
              isHomePage ? (
                <ScrollLink
                  key={item.name}
                  to={item.href}
                  smooth={true}
                  duration={500}
                  offset={-70}
                  className={`transition-colors py-2 cursor-pointer ${isActive(item.href) ? "text-primary font-medium" : "text-base-content/80 hover:text-primary"
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </ScrollLink>
              ) : (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`transition-colors py-2 cursor-pointer ${isActive(item.href) ? "text-primary font-medium" : "text-base-content/80 hover:text-primary"
                    }`}
                >
                  {item.name}
                </button>
              )
            ))}
            {!isTradeRoute && (
              <Link href="/trade" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                  <Rocket className="mr-2 h-4 w-4" /> Launch App
                </Button>
              </Link>
            )}
            <div className="w-full">
              <ConnectButton />
            </div>
          </div>
        </motion.div>
      )}
    </header>
  )
}

