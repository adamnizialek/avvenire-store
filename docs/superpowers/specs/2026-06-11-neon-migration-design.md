# Migracja bazy danych: Vercel Postgres → Neon (free plan)

**Data:** 2026-06-11
**Status:** zatwierdzony (użytkownik wybrał Neon i dostarczył connection string)

## Cel

Przeniesienie produkcyjnej bazy Postgres z Vercela (płatny po pierwszym miesiącu)
na darmowy plan Neon (free-forever, bez karty). Bez transferu danych — świeża
baza + ponowny seed. Po weryfikacji baza na Vercelu zostaje usunięta.

## Dlaczego Neon

Zweryfikowane w czerwcu 2026 (oficjalne źródła):

- Free plan jest permanentny: 0,5 GB storage, 100 CU-h/mies., bez karty.
- Compute usypia po 5 min bezczynności i **budzi się automatycznie** przy
  pierwszym połączeniu (~kilkaset ms). Dane nigdy nie są kasowane za
  bezczynność — kluczowe dla portfolio z rzadkim ruchem.
- Vercel Postgres jest oparty na Neonie, więc to ten sam silnik — migracja
  sprowadza się do podmiany env varów (`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`,
  `DB_NAME`, `DB_SSL=true`), zero zmian w `database.module.ts`.
- Odrzucone: Supabase (pauza po 7 dniach bezczynności wymaga ręcznego
  przywrócenia; po 90 dniach pauzy projekt jest kasowany), Aiven (brak backupów,
  polityka wyłączania nieużywanych usług), Railway/Render/Fly (trial-only),
  CockroachDB (wymaga `type: 'cockroachdb'` w TypeORM).

## Zakres zmian w kodzie

Jedyna zmiana: `backend/seed.mjs`, żeby seedowanie nie wymagało tymczasowych
zmian w kodzie backendu (jak w commitach f4290d7/57a6284):

- Skrypt przyjmuje email i hasło admina (zmienne środowiskowe
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` lub argumenty).
- Najpierw próbuje **logowania**; jeśli konto nie istnieje — rejestruje je
  i kończy działanie z instrukcją: podnieś rolę SQL-em
  (`UPDATE users SET role='admin' WHERE email='...'`) i odpal ponownie.
- Po zalogowaniu kontem z rolą `admin` tworzy produkty przez API.

Backend, frontend i lokalny dev (docker-compose) — bez zmian.

## Przebieg migracji (faktyczny)

1. Projekt w Neon utworzony przez użytkownika (region eu-central-1).
   Połączenie przez **direct endpoint** (nie `-pooler` — to PgBouncer
   w trybie transaction, niewskazany dla długożyjącego serwera z TypeORM).
2. **Odkrycie w trakcie:** lokalna sieć użytkownika blokuje protokół Postgres
   na porcie 5432 (TCP wstaje, reset po SSLRequest — DPI). Dlatego schemat
   i seed wykonano driverem `@neondatabase/serverless` (WebSocket/HTTP,
   port 443) zamiast lokalnie uruchomionego backendu.
3. Nowy skrypt `backend/scripts/seed-direct.mjs`: TypeORM DataSource
   z driverem Neon + skompilowane encje z `dist/` → `synchronize` tworzy
   schemat, upsert admina (bcrypt), insert produktów z `seed.mjs`
   (tablica `products` jest teraz eksportowana z modułu).
4. Render: podmiana env varów `DB_*` na wartości z Neon → redeploy →
   weryfikacja w logach (`Connecting to database host:`).
5. Weryfikacja end-to-end: produkty na froncie, rejestracja/login.
6. Sprzątanie: usunięcie bazy Postgres w panelu Vercela.

## Ryzyka i obsługa błędów

- **Cold start Neon** (~0,5 s po 5 min ciszy) — pomijalny; darmowy Render
  i tak budzi się dziesiątki sekund.
- **Limit 100 CU-h/mies.** — bezpieczny: `pg` zamyka bezczynne połączenia
  (domyślnie po 10 s), a Render free usypia po 15 min, więc compute nie jest
  podtrzymywany 24/7.
- **`NODE_ENV=production` na Render** wyłączyłby `synchronize` — bez znaczenia,
  bo schemat powstaje lokalnie przed przełączeniem Rendera (krok 2).

## Testowanie

Po kroku 3: zapytanie SQL o liczbę produktów i użytkowników na Neonie.
Po kroku 4: smoke test API (lista produktów, login) + frontend.
