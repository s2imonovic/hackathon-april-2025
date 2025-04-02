import { TradingPage } from "@/components/trading-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Trade - ZetaHopper",
  description: "Configure your trading parameters and monitor bot performance",
}

export default function Trade() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <TradingPage />
      </main>
      <Footer />
    </div>
  )
}

