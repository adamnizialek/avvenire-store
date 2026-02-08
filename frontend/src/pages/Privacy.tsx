export default function Privacy() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Data Controller</h2>
          <p>
            The data controller is AVVENIRE, based in Warsaw, Poland. For any questions
            regarding your personal data, contact us at contact@avvenire.com.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. Data We Collect</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Account information: email address and password (encrypted)</li>
            <li>Order information: shipping address, order history, payment details (processed by Stripe)</li>
            <li>Technical data: IP address, browser type, and cookies for website functionality</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Purpose of Processing</h2>
          <p>We process your personal data for the following purposes:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Processing and fulfilling your orders</li>
            <li>Managing your user account</li>
            <li>Communicating about your orders and customer support</li>
            <li>Improving our website and services</li>
            <li>Complying with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Legal Basis</h2>
          <p>
            We process your data based on: (a) performance of a contract when you place an
            order, (b) your consent where applicable, and (c) our legitimate interests in
            operating and improving our store, in accordance with GDPR Article 6.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Data Sharing</h2>
          <p>
            We do not sell your personal data. We share data only with trusted service
            providers necessary to operate our business:
          </p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Stripe — payment processing</li>
            <li>Courier services — order delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed
            to provide services. Order data is retained for the period required by tax and
            accounting regulations (typically 5 years).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Your Rights</h2>
          <p>Under GDPR, you have the right to:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Restrict or object to processing</li>
            <li>Data portability</li>
            <li>Lodge a complaint with a supervisory authority (UODO in Poland)</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email us at contact@avvenire.com.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Cookies</h2>
          <p>
            Our website uses essential cookies to ensure proper functionality (authentication,
            cart). We do not use third-party tracking cookies. By using our website, you
            consent to the use of essential cookies.
          </p>
        </section>
      </div>
    </div>
  );
}
