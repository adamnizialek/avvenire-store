export default function Shipping() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Shipping</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Delivery Times</h2>
          <p>
            Orders are processed within 1-2 business days. Standard delivery takes 3-5 business
            days within the EU, and 7-14 business days for international orders.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Shipping Costs</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Poland: Free shipping on orders over 500 PLN, otherwise 19.99 PLN</li>
            <li>EU countries: Free shipping on orders over 200 EUR, otherwise 14.99 EUR</li>
            <li>Rest of the world: Calculated at checkout</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Tracking</h2>
          <p>
            Once your order has shipped, you will receive an email with a tracking number.
            You can use this to track your package in real-time through our courier partner's
            website.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">International Shipping</h2>
          <p>
            Please note that international orders may be subject to customs duties and import
            taxes, which are the responsibility of the buyer. These charges are determined by
            your country's customs office.
          </p>
        </section>
      </div>
    </div>
  );
}
