const BASE = 'http://localhost:3000/api';

async function seed() {
  // 1. Register admin user
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@avvenire.com', password: 'Admin123!' }),
  });
  const auth = await regRes.json();
  const token = auth.access_token;
  console.log('Registered:', auth.user?.email || 'already exists');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Create luxury fashion products
  const products = [
    {
      name: 'Cashmere Overcoat',
      description: 'Luxuriously soft double-breasted cashmere overcoat. Crafted from premium Italian cashmere with a relaxed silhouette, this timeless piece features horn buttons and a half-canvas construction for a refined drape.',
      price: 1290,
      category: 'clothing',
      inventory: [{ size: 'S', quantity: 10 }, { size: 'M', quantity: 15 }, { size: 'L', quantity: 12 }, { size: 'XL', quantity: 8 }, { size: 'XXL', quantity: 5 }],
      images: [
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80',
        'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&q=80',
      ],
    },
    {
      name: 'Silk Evening Dress',
      description: 'Elegant floor-length silk evening dress with a draped neckline. Made from 100% mulberry silk charmeuse, this stunning gown flows gracefully with every movement. Perfect for galas, black-tie events, and special occasions.',
      price: 890,
      category: 'clothing',
      inventory: [{ size: 'XS', quantity: 6 }, { size: 'S', quantity: 10 }, { size: 'M', quantity: 12 }, { size: 'L', quantity: 8 }, { size: 'XL', quantity: 4 }],
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
      ],
    },
    {
      name: 'Tailored Wool Suit',
      description: 'Impeccably tailored two-piece suit in fine merino wool. Features a notch-lapel single-breasted jacket with a slim-fit trouser. Hand-finished details and premium Bemberg lining ensure all-day comfort and a sharp silhouette.',
      price: 1650,
      category: 'clothing',
      inventory: [{ size: 'S', quantity: 8 }, { size: 'M', quantity: 14 }, { size: 'L', quantity: 10 }, { size: 'XL', quantity: 6 }, { size: 'XXL', quantity: 3 }],
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      ],
    },
    {
      name: 'Italian Leather Loafers',
      description: 'Handcrafted penny loafers made from full-grain Italian calfskin leather. Blake-stitched construction with a leather sole and memory-foam insole. A versatile classic that transitions effortlessly from office to evening.',
      price: 520,
      category: 'shoes',
      inventory: [{ size: '39', quantity: 5 }, { size: '40', quantity: 8 }, { size: '41', quantity: 10 }, { size: '42', quantity: 12 }, { size: '43', quantity: 10 }, { size: '44', quantity: 7 }, { size: '45', quantity: 4 }],
      images: [
        'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80',
        'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80',
      ],
    },
    {
      name: 'Suede Chelsea Boots',
      description: 'Premium suede Chelsea boots with a sleek, minimalist profile. Goodyear-welted construction with a natural rubber sole provides durability and a resoleable design. Elastic side panels for easy on-off wear.',
      price: 680,
      category: 'shoes',
      inventory: [{ size: '38', quantity: 4 }, { size: '39', quantity: 6 }, { size: '40', quantity: 8 }, { size: '41', quantity: 10 }, { size: '42', quantity: 12 }, { size: '43', quantity: 10 }, { size: '44', quantity: 7 }, { size: '45', quantity: 5 }, { size: '46', quantity: 3 }],
      images: [
        'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80',
        'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80',
      ],
    },
    {
      name: 'Leather Crossbody Bag',
      description: 'Minimalist crossbody bag in pebbled calfskin leather. Features an adjustable strap, magnetic flap closure, and interior zip pocket. The perfect everyday accessory that combines form and function.',
      price: 450,
      category: 'accessories',
      inventory: [{ size: 'One Size', quantity: 20 }],
      images: [
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80',
      ],
    },
    {
      name: 'Cashmere Scarf',
      description: 'Ultra-fine cashmere scarf woven in Scotland from Grade-A Mongolian cashmere. Lightweight yet incredibly warm, this generously sized scarf can be styled as a wrap or draped elegantly over the shoulders.',
      price: 195,
      category: 'accessories',
      inventory: [{ size: 'One Size', quantity: 25 }],
      images: [
        'https://images.unsplash.com/photo-1601924921557-45e8e0800575?w=800&q=80',
        'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80',
      ],
    },
    {
      name: 'Slim Fit Cotton Shirt',
      description: 'Crisp slim-fit shirt in premium Egyptian cotton with a subtle sateen finish. Mother-of-pearl buttons, single-needle stitching, and a split yoke ensure refined details. Ideal for both business and smart-casual settings.',
      price: 320,
      category: 'clothing',
      inventory: [{ size: 'S', quantity: 12 }, { size: 'M', quantity: 18 }, { size: 'L', quantity: 15 }, { size: 'XL', quantity: 9 }, { size: 'XXL', quantity: 4 }],
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=800&q=80',
      ],
    },
  ];

  for (const product of products) {
    const res = await fetch(`${BASE}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(product),
    });
    const data = await res.json();
    console.log(`Created: ${data.name || data.message}`);
  }

  console.log('\nDone! Created', products.length, 'luxury fashion products.');
}

seed().catch(console.error);
