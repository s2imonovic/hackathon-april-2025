import { ExperimentalDisclaimer } from "@/components/experimental-disclaimer"

export default function PrivacyPage() {
  return (
    <ExperimentalDisclaimer
      title="Privacy Policy"
      content={
        <>
          <h2>1. Information Collection</h2>
          <p>
            This experimental application may collect and store certain information, including:
          </p>
          <ul>
            <li>Wallet addresses and transaction data</li>
            <li>Usage patterns and interaction data</li>
            <li>Technical information about your device and connection</li>
          </ul>

          <h2>2. Data Usage</h2>
          <p>
            Any collected data is used solely for:
          </p>
          <ul>
            <li>Improving the application's functionality</li>
            <li>Debugging and error tracking</li>
            <li>Analytics and performance monitoring</li>
          </ul>

          <h2>3. Data Security</h2>
          <p>
            While we implement reasonable security measures, as an experimental product, we cannot guarantee the security of your data. Use at your own risk.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>
            This application may interact with third-party services and APIs. We are not responsible for their privacy practices or data handling.
          </p>

          <h2>5. Changes to Policy</h2>
          <p>
            We reserve the right to modify this privacy policy at any time. Continued use of the application constitutes acceptance of any changes.
          </p>
        </>
      }
    />
  )
} 