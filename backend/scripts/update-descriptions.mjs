// One-off: rewrites existing product descriptions into Markdown so they render
// as structured copy (headings, benefit bullets, spec list) on the storefront
// instead of one flat paragraph.
//
// Connects through Neon's WebSocket driver (port 443), so it works even on
// networks where outbound 5432 is blocked. Uses synchronize:false and a raw
// parameterized UPDATE — it only rewrites the `description` text of matched
// rows and never touches the schema. Safe to re-run (idempotent).
//
// Requires @neondatabase/serverless:
//   npm install --no-save @neondatabase/serverless
//
// Usage:
//   DATABASE_URL='postgresql://...' node scripts/update-descriptions.mjs

import { DataSource } from 'typeorm';
import * as neonServerless from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    "Usage: DATABASE_URL='postgresql://...' node scripts/update-descriptions.mjs",
  );
  process.exit(1);
}

// Match by exact product name; each entry rewrites that product's description.
const updates = [
  {
    name: 'Kardigan z Industrialnymi Zapięciami',
    description: `Zdefiniuj swój styl na nowo z naszym najnowszym swetrem, który łączy w sobie bezkompromisowy komfort z odwagą i nowoczesnym designem. To nie jest zwykły element garderoby – to *statement piece*, który przyciąga wzrok i nadaje charakteru nawet najprostszej stylizacji.

## Dlaczego pokochasz ten model?

- **Unikalny detal, który robi różnicę** — zamiast klasycznych guzików postawiliśmy na siedem metalowych klamer typu lobster, rozmieszczonych asymetrycznie. Nadają one całości surowego, industrialnego sznytu, dzięki czemu nie potrzebujesz dodatkowej biżuterii, by lśnić.
- **Komfort w rozmiarze oversize** — luźny, pudełkowy krój zapewnia pełną swobodę ruchów i pozwala na zabawę warstwami. Idealnie układa się na sylwetce, maskując ewentualne niedoskonałości i gwarantując Ci pewność siebie w każdej sytuacji.
- **Termiczna perfekcja** — dzięki zastosowaniu gęstego splotu sweter staje się Twoją osobistą barierą przed chłodem. Jest mięsisty, ciężki w pozytywnym tego słowa znaczeniu i niezwykle przytulny – idealny towarzysz na mroźne poranki i wieczorne spacery.
- **Wszechstronność stylizacji** — głęboki, grafitowy odcień to baza, która nigdy nie wychodzi z mody. Zestaw go z ulubionymi jeansami dla uzyskania looku *effortless chic* lub narzuć na satynową sukienkę, by przełamać elegancję nutką buntu.

## Szczegóły techniczne i skład

Dbamy o to, aby nasze produkty służyły Ci przez lata, dlatego wybraliśmy mieszankę włókien najwyższej jakości:

- **Skład:** 60% wełna merino (ciepło i oddychalność), 30% alpaka (miękkość i puszystość), 10% poliamid z recyklingu (trwałość, zapobiega deformacji fasonu)
- **Kolor:** Charcoal Grey (ciemny grafit)
- **Wykończenie:** prążkowane ściągacze przy rękawach i na dole swetra, które zapobiegają ucieczce ciepła
- **Okucia:** stal nierdzewna o wysokim połysku – odporna na matowienie`,
  },
];

const dataSource = new DataSource({
  type: 'postgres',
  url,
  driver: neonServerless,
  synchronize: false,
  entities: [],
});

await dataSource.initialize();
console.log('Connected (schema untouched).');

let updated = 0;
let missing = 0;
for (const { name, description } of updates) {
  const rows = await dataSource.query(
    'UPDATE products SET description = $1 WHERE name = $2 RETURNING id',
    [description, name],
  );
  if (rows.length === 0) {
    console.warn(`✗ No product named "${name}" — skipped.`);
    missing += 1;
  } else {
    console.log(`✓ Updated "${name}" (${rows.length} row(s)).`);
    updated += rows.length;
  }
}

await dataSource.destroy();
console.log(`Done. Updated ${updated} row(s); ${missing} name(s) not found.`);
