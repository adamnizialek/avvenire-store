export default function Contact() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Contact</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Customer Support</h2>
          <p>
            Our customer service team is available Monday to Friday, 9:00 AM - 5:00 PM (CET).
            We aim to respond to all inquiries within 24 hours.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Email</h2>
          <p>
            <a href="mailto:contact@avvenire.com" className="text-foreground underline underline-offset-4">
              contact@avvenire.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Business Address</h2>
          <p>
            AVVENIRE<br />
            Warsaw, Poland
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Social Media</h2>
          <p>
            Follow us for the latest collections and updates. You can also reach us through
            direct messages on our social media channels.
          </p>
          <a
            href="https://www.instagram.com/avvenire.vision/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-foreground underline underline-offset-4"
          >
            Instagram
          </a>
        </section>
      </div>
    </div>
  );
}
