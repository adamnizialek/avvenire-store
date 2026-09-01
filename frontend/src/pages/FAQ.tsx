export default function FAQ() {
  const faqs = [
    {
      question: 'How long does delivery take?',
      answer:
        'Orders are dispatched directly from our fulfillment partner’s warehouse and typically arrive within 5-10 business days of payment. The current estimate is always shown at checkout before you pay, and shipping is free on every order.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'All payments are securely processed through Stripe. The methods currently available — payment cards and wallets such as Apple Pay and Google Pay — are shown on the payment page. You are charged in USD.',
    },
    {
      question: 'Can I return or exchange an item?',
      answer:
        'Yes — as an EU consumer you have 14 days from delivery to withdraw from your purchase without giving a reason, and separately a two-year protection if the item is faulty. See our Returns page for both procedures and the withdrawal form.',
    },
    {
      question: 'How do I track my order?',
      answer:
        'Once your order has been dispatched, you will receive an email with a tracking number and a link to track your package.',
    },
    {
      question: 'Do you ship internationally?',
      answer:
        'We currently ship to Poland, Germany, France, Italy, Spain, the Netherlands, Czechia, Slovakia, Austria, Sweden, the United Kingdom and the United States — free of charge. For non-EU destinations, customs duties and import taxes may apply and are your responsibility.',
    },
    {
      question: 'How do I choose the right size?',
      answer:
        'Each product page includes available sizes. If you are unsure, please contact our customer service team at contact@avvenire.com and we will help you find the perfect fit.',
    },
    {
      question: 'Are the colors accurate in the photos?',
      answer:
        'We do our best to display colors as accurately as possible. However, slight variations may occur due to screen settings and lighting conditions during photography.',
    },
  ];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Frequently Asked Questions</h1>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b pb-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{faq.question}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
