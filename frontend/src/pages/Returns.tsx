/*
 * Withdrawal (odstąpienie od umowy) and complaint (reklamacja) rules under
 * the Polish Consumer Rights Act. Deliberate corrections vs the old
 * placeholder: withdrawal cannot be conditioned on tags/original packaging
 * (only diminished-value liability applies), and the refund deadline runs
 * from the withdrawal statement — not from our inspection of the return.
 */
export default function Returns() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Returns &amp; Complaints</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Your two separate rights: a 14-day change-of-mind return (withdrawal)
        for any reason, and a complaint (reklamacja) if the goods are faulty.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Right of Withdrawal — 14 Days, No Reason Needed
          </h2>
          <p>
            As a consumer, you may withdraw from your purchase within 14 days
            from the day you (or a person you designated other than the
            carrier) received the goods. You do not have to give any reason. To
            meet the deadline it is enough to send your statement before the 14
            days expire.
          </p>
          <p className="mt-2">
            To withdraw, send an unequivocal statement to contact@avvenire.com
            — a plain email with your order number and the words &quot;I hereby
            withdraw from my purchase&quot; is enough. You may also use the{' '}
            <a
              href="/withdrawal-form.txt"
              download
              className="underline hover:text-foreground"
            >
              model withdrawal form
            </a>{' '}
            (download, fill in, and send it back by email), but using it is not
            mandatory. We will confirm receipt of your withdrawal by email
            without delay.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Returning the Goods
          </h2>
          <p>
            Send the goods back to the return address we confirm in reply to
            your withdrawal, no later than 14 days from the day you informed us
            of the withdrawal. You bear the direct cost of returning the goods;
            we recommend a tracked shipment. You may inspect the goods the way
            you would in a physical shop — trying a garment on is fine — but
            you are liable for any diminished value resulting from handling
            beyond what is necessary to establish the nature, characteristics
            and functioning of the goods (e.g. wearing, washing, or removing
            security seals).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Your Refund
          </h2>
          <p>
            We refund all payments received from you, including standard
            delivery costs (delivery is currently free), no later than 14 days
            from the day we received your withdrawal statement — using the same
            payment method you used, at no cost to you. We may withhold the
            refund until we have received the goods back or you have supplied
            proof of sending them, whichever comes first. You will receive an
            email confirmation once the refund is issued.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Exceptions to the Right of Withdrawal
          </h2>
          <p>
            The right of withdrawal does not apply in the cases listed in Art.
            38 of the Polish Consumer Rights Act, in particular to goods made
            to your specification or clearly personalized, and to sealed goods
            not suitable for return for health or hygiene reasons once
            unsealed. Regular clothing from our catalogue is not covered by
            these exceptions — you can return it. Sale items carry the same
            withdrawal right as full-price items.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Complaints (Reklamacja) — Faulty or Non-Conforming Goods
          </h2>
          <p>
            Independently of the withdrawal right, we are liable under the
            Polish Consumer Rights Act if the goods are not in conformity with
            the contract — e.g. damaged, defective, mislabelled, or not as
            described — for non-conformity revealed within two years of
            delivery.
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>
              Email contact@avvenire.com with your order number, a description
              of the problem, and photos if possible.
            </li>
            <li>
              We respond to every complaint within 14 days. If we do not, the
              complaint is deemed accepted.
            </li>
            <li>
              If the complaint is justified, you may first request repair or
              replacement. If that is impossible or would involve excessive
              cost for us, or if we fail to bring the goods into conformity in
              reasonable time, you may demand a price reduction or withdraw
              from the contract and receive a refund.
            </li>
            <li>
              For justified complaints, the cost of returning the goods is on
              us — we will provide instructions or a prepaid label.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Which One Applies to Me?
          </h2>
          <p>
            Changed your mind, wrong size, or just don&apos;t like it? Use the
            14-day withdrawal — you pay return shipping. Received something
            damaged, defective, or different from what you ordered? File a
            complaint — return shipping is on us and the two-year protection
            applies. If in doubt, just email us and we will point you to the
            right procedure.
          </p>
        </section>
      </div>
    </div>
  );
}
