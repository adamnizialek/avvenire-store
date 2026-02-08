export default function FAQ() {
  const faqs = [
    {
      question: 'How long does delivery take?',
      answer:
        'Standard delivery within Poland takes 3-5 business days. EU orders take 5-7 business days. International orders may take up to 14 business days.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept Visa, Mastercard, Apple Pay, Google Pay, PayPal, and Klarna. All payments are securely processed through Stripe.',
    },
    {
      question: 'Can I return or exchange an item?',
      answer:
        'Yes, you have 14 days from the date of delivery to return any item in its original condition. Please see our Returns page for more details.',
    },
    {
      question: 'How do I track my order?',
      answer:
        'Once your order has been dispatched, you will receive an email with a tracking number and a link to track your package.',
    },
    {
      question: 'Do you ship internationally?',
      answer:
        'Yes, we ship worldwide. Shipping costs for international orders are calculated at checkout. Please note that customs duties may apply.',
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
