import { Link } from 'react-router';

/*
 * RODO/GDPR privacy policy matched to the actual data flows of this codebase:
 * Neon Postgres via the NestJS backend on Render, frontend on Vercel, Stripe
 * for payment + shipping address, Resend for transactional email, and the
 * dropshipping fulfillment partner who receives the delivery address.
 *
 * TODO before go-live: fill in the bracketed controller-registration fields
 * in section 1 (same data as the Terms page) once CEIDG registration exists.
 */
export default function Privacy() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        (Polityka prywatności — RODO) — last updated September 1, 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            1. Data Controller
          </h2>
          <p>
            The controller of your personal data is [full legal name of the
            trader], conducting business under the name AVVENIRE, registered
            address: [street, postal code] Warsaw, Poland, NIP: [tax
            identification number]. For any questions regarding your personal
            data, contact us at contact@avvenire.com.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            2. Data We Collect
          </h2>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Account data: email address and password (stored only as a
              cryptographic hash — we cannot read it)
            </li>
            <li>
              Order data: order history, and the name and shipping address you
              provide on the payment page
            </li>
            <li>
              Payment data: handled entirely by Stripe — we never receive or
              store your card details
            </li>
            <li>
              Correspondence: emails you send to our support address
            </li>
            <li>
              Technical data: IP address and browser information in server
              logs, and essential cookies for login and cart functionality
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            3. Purposes, Legal Bases and Retention
          </h2>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <span className="text-foreground">
                Running your account and fulfilling your orders
              </span>{' '}
              — performance of a contract (Art. 6(1)(b) GDPR). Kept for as long
              as your account exists.
            </li>
            <li>
              <span className="text-foreground">
                Accounting and tax records
              </span>{' '}
              — legal obligation (Art. 6(1)(c) GDPR). Order records are kept
              for the period required by tax and accounting regulations
              (typically 5 years from the end of the tax year).
            </li>
            <li>
              <span className="text-foreground">
                Handling complaints, withdrawals and legal claims
              </span>{' '}
              — legal obligation and our legitimate interest (Art. 6(1)(c) and
              (f) GDPR). Kept until the relevant limitation periods expire.
            </li>
            <li>
              <span className="text-foreground">
                Security and abuse prevention
              </span>{' '}
              (server logs, rate limiting) — our legitimate interest (Art.
              6(1)(f) GDPR). Logs are kept for a short rolling period.
            </li>
          </ul>
          <p className="mt-2">
            Providing your data is voluntary, but without it we cannot create
            your account or deliver your order.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            4. Who Receives Your Data
          </h2>
          <p>
            We do not sell your personal data. We share it only with service
            providers who need it to operate the store, under data-processing
            agreements:
          </p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              Stripe — payment processing and collection of your shipping
              address at checkout
            </li>
            <li>
              Our fulfillment partner and courier services — your name and
              shipping address, passed on solely to pack and deliver your order
              (orders ship directly from the partner&apos;s warehouse)
            </li>
            <li>Resend — sending transactional emails (e.g. password resets)</li>
            <li>
              Hosting providers — Render and Neon (application and database)
              and Vercel (website)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            5. Transfers Outside the EEA
          </h2>
          <p>
            Some of our providers (e.g. Stripe, our hosting providers) are
            based in or use infrastructure in the United States. Where data
            leaves the European Economic Area, the transfer is protected by an
            adequacy decision (the EU–US Data Privacy Framework, for certified
            providers) or by the European Commission&apos;s Standard
            Contractual Clauses.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            6. Data Retention Summary
          </h2>
          <p>
            Account data lives until you delete your account. Order records are
            retained for the tax-retention period even after account deletion,
            but in anonymized form — with no link to any identifiable person
            (see section 7). Support correspondence is kept as long as needed
            to handle the matter and any related claims.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            7. Your Rights
          </h2>
          <p>Under GDPR, you have the right to:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Restrict or object to processing</li>
            <li>Data portability</li>
            <li>Lodge a complaint with a supervisory authority (see section 9)</li>
          </ul>
          <p className="mt-2">
            You can exercise the two most common rights yourself, instantly:
            under{' '}
            <Link to="/orders" className="underline hover:text-foreground">
              My Orders → Privacy &amp; data
            </Link>{' '}
            you can download a copy of your personal data and order history
            (data access/portability) or delete your account (erasure).
            Deleting your account anonymizes it immediately; order records are
            retained without any link to you for the period described in
            section 3.
          </p>
          <p className="mt-2">
            For any other request — or if you can no longer log in — email us
            at contact@avvenire.com. We respond to data-subject requests within
            30 days, as required by GDPR.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            8. No Profiling or Automated Decisions
          </h2>
          <p>
            We do not use your data for profiling or automated decision-making,
            and we do not run analytics or marketing trackers on this website.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            9. Complaints to the Supervisory Authority
          </h2>
          <p>
            If you believe your data is processed unlawfully, you may lodge a
            complaint with the President of the Personal Data Protection Office
            (Prezes Urzędu Ochrony Danych Osobowych, UODO), ul. Stawki 2,
            00-193 Warsaw, uodo.gov.pl.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            10. Cookies
          </h2>
          <p>
            Our website uses only essential cookies, strictly necessary for
            authentication and the shopping cart. We do not use third-party
            tracking or marketing cookies, which is why no cookie consent
            banner is shown. Essential cookies are exempt from the consent
            requirement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            11. Changes to This Policy
          </h2>
          <p>
            We will update this policy when our processing changes (for
            example, a new provider). The current version is always available
            on this page with its last-updated date above.
          </p>
        </section>
      </div>
    </div>
  );
}
