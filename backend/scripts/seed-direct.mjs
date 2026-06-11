// Seeds straight into the database, no running API needed: creates the schema
// (TypeORM synchronize), ensures an admin account, and inserts the demo
// products from seed.mjs if the products table is empty.
//
// Connects through Neon's WebSocket driver (port 443), so it works even on
// networks where outbound port 5432 is blocked. Requires `npm run build` first
// (imports compiled entities from dist/) and @neondatabase/serverless
// (npm install --no-save @neondatabase/serverless).
//
// Usage:
//   DATABASE_URL='postgresql://...' node scripts/seed-direct.mjs <adminEmail> <adminPassword>

import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import * as neonServerless from '@neondatabase/serverless';
import { products } from '../seed.mjs';
import { User } from '../dist/modules/users/entities/user.entity.js';
import { Product } from '../dist/modules/products/entities/product.entity.js';
import { Order } from '../dist/modules/orders/entities/order.entity.js';
import { OrderItem } from '../dist/modules/orders/entities/order-item.entity.js';

const url = process.env.DATABASE_URL;
const [adminEmail, adminPassword] = process.argv.slice(2);

if (!url || !adminEmail || !adminPassword) {
  console.error(
    "Usage: DATABASE_URL='postgresql://...' node scripts/seed-direct.mjs <adminEmail> <adminPassword>",
  );
  process.exit(1);
}

const dataSource = new DataSource({
  type: 'postgres',
  url,
  driver: neonServerless,
  entities: [User, Product, Order, OrderItem],
  synchronize: true,
});

await dataSource.initialize();
console.log('Connected; schema synchronized.');

const users = dataSource.getRepository(User);
let admin = await users.findOne({ where: { email: adminEmail } });
if (!admin) {
  admin = users.create({
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 10),
    role: 'admin',
  });
  await users.save(admin);
  console.log(`Created admin account: ${adminEmail}`);
} else if (admin.role !== 'admin') {
  admin.role = 'admin';
  await users.save(admin);
  console.log(`Promoted existing account to admin: ${adminEmail}`);
} else {
  console.log(`Admin account already exists: ${adminEmail}`);
}

const productsRepo = dataSource.getRepository(Product);
const existing = await productsRepo.count();
if (existing === 0) {
  await productsRepo.save(productsRepo.create(products));
  console.log(`Inserted ${products.length} products.`);
} else {
  console.log(`Products table already has ${existing} rows; skipping inserts.`);
}

await dataSource.destroy();
console.log('Done.');
