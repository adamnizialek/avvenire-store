/*
 * Kept consistent with the Stripe checkout session: free shipping is the only
 * option, the delivery estimate is 5-10 business days, and the country list
 * mirrors shipping_address_collection.allowed_countries. If checkout config
 * changes, update this page in the same commit.
 */
export default function Shipping() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Shipping</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Delivery Times
          </h2>
          <p>
            We work with a fulfillment partner: after you place an order, we
            hand it over for processing within 1–2 business days and it is
            dispatched directly from our partner&apos;s warehouse, which may be
            located outside your country. Total delivery time is normally{' '}
            <strong className="font-semibold text-foreground">
              5–10 business days
            </strong>{' '}
            from payment — the current estimate is always shown at checkout
            before you pay. If your order has not arrived within the estimate,
            email us at contact@avvenire.com and we will chase it with the
            carrier; in every case you are entitled to delivery within 30 days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Shipping Costs
          </h2>
          <p>
            Shipping is currently free on every order — the price you see on
            the product page is the total you pay (plus any customs charges for
            non-EU destinations, see below).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Where We Ship
          </h2>
          <p>
            We currently deliver to: Poland, Germany, France, Italy, Spain, the
            Netherlands, Czechia, Slovakia, Austria, Sweden, the United Kingdom
            and the United States. If your country is not on the list, follow
            us on Instagram — we announce new destinations there.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Tracking
          </h2>
          <p>
            Once your order ships, you will receive an email with a tracking
            number and a link to follow your package. Tracking may take 1–2
            days to become active after dispatch.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Customs &amp; Import Charges (Non-EU)
          </h2>
          <p>
            Orders delivered outside the European Union (currently the United
            Kingdom and the United States) may be subject to customs duties and
            import taxes determined by your country&apos;s customs authority.
            These charges are your responsibility and are not included in our
            prices.
          </p>
        </section>
      </div>
    </div>
  );
}
