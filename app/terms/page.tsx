import { ExperimentalDisclaimer } from "@/components/experimental-disclaimer"

export default function TermsPage() {
  return (
    <ExperimentalDisclaimer
      title="Terms of Use"
      content={
        <>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using this application, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
          </p>

          <h2>2. Experimental Nature</h2>
          <p>
            This application is an experimental product developed during a hackathon. It is not intended for production use and may contain bugs, security vulnerabilities, or other issues.
          </p>

          <h2>3. No Warranties</h2>
          <p>
            The application is provided "as is" without any warranties of any kind, either express or implied, including but not limited to:
          </p>
          <ul>
            <li>Fitness for a particular purpose</li>
            <li>Non-infringement of third-party rights</li>
            <li>Security or reliability</li>
            <li>Accuracy of data or calculations</li>
          </ul>

          <h2>4. Limitation of Liability</h2>
          <p>
            In no event shall the developers be liable for any damages arising out of the use or inability to use this application, including but not limited to:
          </p>
          <ul>
            <li>Loss of funds or assets</li>
            <li>Business interruption</li>
            <li>Data loss or corruption</li>
            <li>Any other financial or non-financial losses</li>
          </ul>

          <h2>5. Modifications</h2>
          <p>
            We reserve the right to modify or discontinue the application at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
          </p>
        </>
      }
    />
  )
} 