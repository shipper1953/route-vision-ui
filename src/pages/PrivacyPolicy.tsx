import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const lastUpdated = "January 22, 2025";
  const contactEmail = "privacy@shiptornado.com";

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Welcome to Ship Tornado ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our shipping management application (the "App"), including when integrated with Shopify stores.
              </p>
              <p>
                Ship Tornado is a shipping management platform that helps merchants streamline their order fulfillment, generate shipping labels, and manage inventory. We are committed to protecting your privacy and complying with applicable data protection laws, including GDPR and CCPA.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-4">
              <div>
                <h4 className="font-semibold">1. Merchant Information</h4>
                <ul>
                  <li>Company name, address, email, and phone number</li>
                  <li>User account details (name, email, password hash)</li>
                  <li>Warehouse locations and contact information</li>
                  <li>Payment information (processed securely via Stripe)</li>
                  <li>Shipping preferences and business rules</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">2. Customer Information (via Shopify Orders)</h4>
                <ul>
                  <li>Customer names, email addresses, and phone numbers</li>
                  <li>Shipping and billing addresses</li>
                  <li>Order details (products, quantities, SKUs, order numbers)</li>
                  <li>Order values and shipping preferences</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">3. Shipment Data</h4>
                <ul>
                  <li>Package dimensions, weights, and contents</li>
                  <li>Carrier information and tracking numbers</li>
                  <li>Shipping labels and delivery confirmations</li>
                  <li>Shipping rates and costs</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">4. Technical Information</h4>
                <ul>
                  <li>IP addresses and browser information</li>
                  <li>Session data and authentication tokens</li>
                  <li>Usage analytics and error logs</li>
                  <li>API request logs for troubleshooting</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>We use the collected information for the following purposes:</p>
              <ul>
                <li><strong>Order Fulfillment:</strong> Process and ship orders from your Shopify store</li>
                <li><strong>Label Generation:</strong> Create shipping labels via EasyPost and Shippo carrier APIs</li>
                <li><strong>Rate Shopping:</strong> Compare shipping rates across multiple carriers to find the best options</li>
                <li><strong>Inventory Management:</strong> Track packaging materials and product inventory</li>
                <li><strong>Analytics:</strong> Generate reports on shipping costs, box usage, and fulfillment metrics</li>
                <li><strong>Customer Support:</strong> Respond to inquiries and troubleshoot issues</li>
                <li><strong>Service Improvement:</strong> Enhance app functionality and user experience</li>
                <li><strong>Compliance:</strong> Meet legal and regulatory requirements</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing and Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-4">
              <p>We share your information with the following trusted third-party services:</p>

              <div>
                <h4 className="font-semibold">1. Shopify</h4>
                <p>We integrate with your Shopify store to sync orders, update fulfillment status, and manage inventory. Data shared includes order information, customer details, and tracking numbers.</p>
              </div>

              <div>
                <h4 className="font-semibold">2. Shipping Carriers (via EasyPost and Shippo)</h4>
                <p>We transmit shipment data to EasyPost and Shippo APIs to purchase shipping labels from carriers like USPS, UPS, FedEx, and DHL. This includes recipient addresses, package details, and sender information.</p>
              </div>

              <div>
                <h4 className="font-semibold">3. Supabase (Database & Authentication)</h4>
                <p>All data is stored securely on Supabase infrastructure (hosted on AWS). Supabase handles authentication, database operations, and file storage with encryption at rest and in transit.</p>
              </div>

              <div>
                <h4 className="font-semibold">4. Stripe (Payment Processing)</h4>
                <p>Payment information for wallet credits is processed securely by Stripe. We do not store credit card details on our servers.</p>
              </div>

              <div>
                <h4 className="font-semibold">5. PrintNode (Label Printing - Optional)</h4>
                <p>If enabled, shipping labels are sent to PrintNode for direct printing. This includes label images and printer configurations.</p>
              </div>

              <p className="text-sm text-muted-foreground">
                We do not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Storage and Security</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ul>
                <li><strong>Hosting:</strong> Data is stored on Supabase infrastructure, which uses AWS data centers with industry-standard security measures</li>
                <li><strong>Encryption:</strong> All data is encrypted at rest using AES-256 and in transit using TLS 1.2+</li>
                <li><strong>Access Controls:</strong> Role-based access controls ensure only authorized users can access data</li>
                <li><strong>Authentication:</strong> Secure password hashing and JWT-based session management</li>
                <li><strong>Backups:</strong> Regular automated backups to prevent data loss</li>
                <li><strong>Monitoring:</strong> Continuous security monitoring and logging</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                While we implement strong security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>We retain your data for the following periods:</p>
              <ul>
                <li><strong>Order and Shipment Data:</strong> Retained for 7 years for accounting and tax purposes</li>
                <li><strong>Customer Information:</strong> Retained as long as necessary for order fulfillment and legal compliance</li>
                <li><strong>Analytics Data:</strong> Retained for 2 years for business intelligence</li>
                <li><strong>Account Data:</strong> Retained until account deletion is requested</li>
                <li><strong>Logs and Technical Data:</strong> Retained for 90 days for troubleshooting</li>
              </ul>
              <p className="mt-4">
                When data is no longer needed, it is securely deleted or anonymized. You can request deletion of your data at any time (see "Your Rights" below).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights (GDPR & CCPA Compliance)</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>You have the following rights regarding your personal data:</p>
              <ul>
                <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you</li>
                <li><strong>Right to Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Right to Deletion:</strong> Request deletion of your personal data (subject to legal obligations)</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to Restriction:</strong> Request limitation of data processing in certain circumstances</li>
                <li><strong>Right to Object:</strong> Object to processing of your data for specific purposes</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
                <li><strong>Right to Opt-Out:</strong> Opt-out of sale of personal information (we do not sell data)</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please contact us at <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a>. We will respond within 30 days.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shopify GDPR Webhooks</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                As a Shopify app, we comply with Shopify's mandatory GDPR webhooks:
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">customers/data_request</h4>
                  <p>When a customer requests their data from Shopify, we will provide all information we have collected within 30 days.</p>
                </div>

                <div>
                  <h4 className="font-semibold">customers/redact</h4>
                  <p>When a customer requests data deletion, we will delete or anonymize all personal information within 30 days, except where retention is required by law (e.g., for tax records).</p>
                </div>

                <div>
                  <h4 className="font-semibold">shop/redact</h4>
                  <p>When you uninstall our app, we will delete all shop data within 48 hours, except for financial records required for accounting purposes (retained for 7 years).</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                These processes are automated through secure webhooks. You do not need to take any action—Shopify handles these requests on your behalf.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>We use the following types of cookies and tracking technologies:</p>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for authentication and session management (cannot be disabled)</li>
                <li><strong>Functional Cookies:</strong> Store user preferences and settings</li>
                <li><strong>Analytics Cookies:</strong> Track usage patterns to improve the app (anonymized)</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Disabling essential cookies may prevent the app from functioning properly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Ship Tornado is a business application not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we discover that we have inadvertently collected data from a child, we will delete it immediately.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Your data may be transferred to and processed in countries other than your own. Our hosting provider (Supabase/AWS) uses data centers globally. We ensure that adequate safeguards are in place, including:
              </p>
              <ul>
                <li>Standard contractual clauses approved by the European Commission</li>
                <li>Data Processing Agreements with all third-party processors</li>
                <li>Compliance with GDPR, CCPA, and other applicable privacy laws</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. When we make material changes, we will:
              </p>
              <ul>
                <li>Update the "Last Updated" date at the top of this page</li>
                <li>Notify you via email (for significant changes)</li>
                <li>Display a prominent notice in the app</li>
              </ul>
              <p className="mt-4">
                Continued use of Ship Tornado after changes become effective constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
              <div className="mt-4 space-y-2">
                <p><strong>Email:</strong> <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a></p>
                <p><strong>Data Protection Officer:</strong> <a href="mailto:dpo@shiptornado.com" className="text-primary hover:underline">dpo@shiptornado.com</a></p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                For GDPR-related inquiries from EU residents, you also have the right to lodge a complaint with your local data protection authority.
              </p>
            </CardContent>
          </Card>

          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>This privacy policy is effective as of {lastUpdated} and applies to all users of Ship Tornado.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
