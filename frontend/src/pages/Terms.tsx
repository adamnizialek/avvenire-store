import { Link } from 'react-router';

/*
 * Regulamin sklepu (store terms) for a Polish consumer webshop, written to
 * match how AVVENIRE actually operates: Stripe-only payment in USD, free
 * shipping as the only delivery option, dropshipping fulfillment with the
 * 5-10 business day estimate shown at checkout, and the country list allowed
 * in the Stripe session.
 *
 * TODO before go-live: fill in the bracketed seller-registration fields below
 * (legal name, registered address, NIP) once the CEIDG registration exists —
 * they are legally required identification for a trader selling to consumers.
 */
export default function Terms() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Terms &amp; Conditions</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        (Regulamin sklepu) — last updated September 1, 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            1. Seller and Contact Details
          </h2>
          <p>
            The AVVENIRE online store at avvenire.vision (the &quot;Store&quot;)
            is operated by [full legal name of the trader], conducting business
            under the name AVVENIRE, registered in the Polish Central Register
            of Business Activity (CEIDG), registered address: [street, postal
            code] Warsaw, Poland, NIP: [tax identification number] (the
            &quot;Seller&quot;).
          </p>
          <p className="mt-2">
            Contact: contact@avvenire.com. We respond to messages Monday to
            Friday, 9:00 AM – 5:00 PM (CET), normally within 24 hours. This
            email address serves for all matters, including withdrawal
            statements and complaints.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            2. General Provisions
          </h2>
          <p>
            These terms define the rules for using the Store and for sales
            contracts concluded through it between the Seller and consumers.
            Using the Store requires a device with a modern web browser,
            internet access, and an active email address. Placing an order
            requires a free customer account. Nothing in these terms excludes
            or limits any rights consumers hold under mandatory law; in case of
            conflict, the law prevails.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            3. Products and Prices
          </h2>
          <p>
            All prices are stated in US dollars (USD) and are total prices:
            they include all applicable taxes, and delivery within our shipping
            area is free of charge, so the price shown is everything you pay.
            Amounts displayed in other currencies via the currency selector are
            estimates based on current exchange rates; you are always charged
            in USD. Product photos aim to present the goods faithfully; slight
            color variations may result from screen settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            4. Placing an Order and Conclusion of the Contract
          </h2>
          <ol className="mt-1 list-inside list-decimal space-y-1">
            <li>Add products to the cart and proceed to checkout.</li>
            <li>
              Review the order summary. Confirming the order and clicking
              through to payment constitutes an order with an obligation to pay
              (zamówienie z obowiązkiem zapłaty).
            </li>
            <li>
              Provide your shipping address and complete payment on the secure
              Stripe payment page.
            </li>
            <li>
              The sales contract is concluded when we send the order
              confirmation email after successful payment.
            </li>
          </ol>
          <p className="mt-2">
            An order that is not paid within the time allotted on the payment
            page is cancelled automatically and the reserved stock is released;
            no contract is concluded in that case.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            5. Payment
          </h2>
          <p>
            Payment is processed by Stripe. The payment methods currently
            available (e.g. payment cards, Apple Pay, Google Pay) are shown on
            the Stripe payment page. The Seller never receives or stores your
            card details.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            6. Delivery
          </h2>
          <p>
            Delivery is free of charge. Orders are dispatched directly from the
            warehouse of our fulfillment partner, which may be located outside
            Poland. Total delivery time is normally 5–10 business days from
            payment, and the current estimate is always shown at checkout
            before you pay. In every case we deliver within 30 days of the
            contract, as required by law.
          </p>
          <p className="mt-2">
            We currently ship to: Poland, Germany, France, Italy, Spain, the
            Netherlands, Czechia, Slovakia, Austria, Sweden, the United Kingdom
            and the United States. You will receive a tracking number by email
            once your order ships. Deliveries to countries outside the EU may
            be subject to customs duties and import taxes payable by you. The
            risk of loss or damage to the goods passes to you when you (or a
            person you designated) take physical possession of them.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            7. Right of Withdrawal (14 Days)
          </h2>
          <p>
            As a consumer, you may withdraw from the contract within 14 days of
            receiving the goods, without giving any reason and at no cost other
            than the direct cost of returning the goods. It is enough to send
            an unequivocal statement (an email to contact@avvenire.com
            suffices) before the deadline expires; you may, but do not have to,
            use our{' '}
            <a
              href="/withdrawal-form.txt"
              download
              className="underline hover:text-foreground"
            >
              model withdrawal form
            </a>
            . Full details, including the effects of withdrawal and its
            statutory exceptions, are on the{' '}
            <Link to="/returns" className="underline hover:text-foreground">
              Returns page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            8. Complaints — Non-Conformity of Goods
          </h2>
          <p>
            The Seller is liable under the Polish Consumer Rights Act if the
            goods are not in conformity with the contract (niezgodność towaru z
            umową), for non-conformity revealed within two years of delivery.
            If the goods are non-conforming, you may request repair or
            replacement; if that is impossible or disproportionate, or if we
            fail to bring the goods into conformity, you may demand a price
            reduction or withdraw from the contract. The complaint procedure is
            described on the{' '}
            <Link to="/returns" className="underline hover:text-foreground">
              Returns page
            </Link>
            . We respond to every complaint within 14 days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            9. Out-of-Court Dispute Resolution
          </h2>
          <p>
            A consumer may use out-of-court complaint and redress mechanisms,
            including mediation by the regional Trade Inspection authority
            (Wojewódzki Inspektorat Inspekcji Handlowej) and the assistance of
            municipal or district consumer ombudsmen (rzecznik konsumentów).
            Details are available at uokik.gov.pl. Using these mechanisms is
            voluntary for both parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            10. Personal Data
          </h2>
          <p>
            The Seller is the controller of personal data processed in
            connection with the Store. The rules of processing, your rights
            (including self-service data export and account deletion), and the
            list of recipients are described in the{' '}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            11. Intellectual Property
          </h2>
          <p>
            All content of the Store — images, text, logos and designs — is
            protected by copyright and may not be used without the Seller&apos;s
            consent, except as permitted by law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            12. Final Provisions
          </h2>
          <p>
            These terms are governed by Polish law, without prejudice to the
            mandatory consumer protection provisions of the country of your
            habitual residence. Amendments to these terms do not affect
            contracts concluded before the amendment took effect; the version
            in force at the time of your order applies to that order. If any
            provision is found invalid, the remaining provisions remain in
            force.
          </p>
        </section>
      </div>
    </div>
  );
}
