export default function Returns() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Returns &amp; Exchanges</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Right of Withdrawal</h2>
          <p>
            In accordance with EU consumer rights, you have 14 days from the date of delivery
            to withdraw from your purchase without giving any reason. To exercise this right,
            contact us at contact@avvenire.com with your order number.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Return Conditions</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Items must be unworn, unwashed, and in their original condition</li>
            <li>All original tags must be attached</li>
            <li>Items must be returned in their original packaging</li>
            <li>Sale items are eligible for return under the same conditions</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">How to Return</h2>
          <ol className="list-inside list-decimal space-y-1">
            <li>Email us at contact@avvenire.com with your order number</li>
            <li>You will receive a return authorization and shipping instructions</li>
            <li>Pack the item(s) securely and ship them back</li>
            <li>Once received and inspected, your refund will be processed within 14 days</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Return Shipping Costs</h2>
          <p>
            Return shipping costs are the responsibility of the buyer, unless the item is
            defective or incorrect. In such cases, we will provide a prepaid return label.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Refunds</h2>
          <p>
            Refunds are issued to the original payment method within 14 business days after
            we receive and inspect the returned item. You will receive an email confirmation
            once the refund has been processed.
          </p>
        </section>
      </div>
    </div>
  );
}
