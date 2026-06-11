// Usage: node seed.mjs [apiUrl] [adminEmail] [adminPassword]
//   e.g., node seed.mjs https://your-app.onrender.com/api admin@avvenire.com 'S3cret!'
// Credentials can also be passed via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
// The account must have the 'admin' role. If it doesn't exist yet, the script
// registers it and prints the SQL needed to promote it — then re-run the script.
const BASE = process.argv[2] || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.argv[3] || process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.argv[4] || process.env.SEED_ADMIN_PASSWORD;

const PROMOTE_HINT = (email) =>
  `Run this SQL on the database, then re-run the script:\n  UPDATE users SET role='admin' WHERE email='${email}';`;

async function authenticate() {
  const post = (path) =>
    fetch(`${BASE}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    }).then((r) => r.json());

  let auth = await post('login');
  if (!auth.access_token) {
    auth = await post('register');
    if (!auth.access_token) {
      console.error('Login and registration both failed:', auth);
      process.exit(1);
    }
    console.log('Registered new account:', ADMIN_EMAIL);
  }

  if (auth.user?.role !== 'admin') {
    console.error(`Account ${ADMIN_EMAIL} has role '${auth.user?.role}', not 'admin'.`);
    console.error(PROMOTE_HINT(ADMIN_EMAIL));
    process.exit(1);
  }
  return auth.access_token;
}

// Luxury fashion products (also imported by one-off migration scripts)
export const products = [
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

async function seed() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing admin credentials.');
    console.error('Usage: node seed.mjs [apiUrl] <adminEmail> <adminPassword>');
    console.error('   or: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node seed.mjs [apiUrl]');
    process.exit(1);
  }
  console.log('Seeding to:', BASE);
  console.log('Using admin email:', ADMIN_EMAIL);

  const token = await authenticate();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  for (const product of products) {
    const res = await fetch(`${BASE}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(product),
    });
    const data = await res.json();
    console.log(`Product: ${product.name} -> Status: ${res.status} ${data.name ? 'Created' : data.message}`);
  }

  console.log('\nDone!');
}

// Only run when executed directly (the products array is importable as a module)
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch(console.error);
}
