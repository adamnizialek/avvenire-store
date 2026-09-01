#!/usr/bin/env bash
set -euo pipefail

# Shared steps for the two backup workflows:
#   .github/workflows/db-backup.yml      - nightly, against the real database
#   .github/workflows/db-restore-drill.yml - on demand, against a throwaway DB
# Both call these exact functions, so a green drill is a genuine rehearsal of
# the nightly procedure (dump -> encrypt -> decrypt -> restore -> verify).
#
# encrypt/decrypt read the passphrase from $BACKUP_PASSPHRASE. The dump is
# encrypted because this repository is PUBLIC and GitHub Actions artifacts on
# public repos are downloadable by anyone with a GitHub account - a plaintext
# pg_dump of customer data must never be uploaded.

cmd="${1:?usage: db-backup.sh <dump|encrypt|decrypt|restore|verify> ...}"
shift

case "$cmd" in
  dump) # dump <db-url> <outfile>
    pg_dump "$1" --format=custom --compress=9 --file="$2"
    ls -lh "$2"
    ;;
  encrypt) # encrypt <file>  -> <file>.gpg, plaintext removed
    gpg --batch --yes --symmetric --cipher-algo AES256 \
      --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" \
      --output "$1.gpg" "$1"
    rm "$1" # never leave (or upload) the plaintext dump
    ls -lh "$1.gpg"
    ;;
  decrypt) # decrypt <file.gpg> <outfile>
    gpg --batch --yes --decrypt --pinentry-mode loopback \
      --passphrase "$BACKUP_PASSPHRASE" --output "$2" "$1"
    ;;
  restore) # restore <db-url> <dumpfile>
    pg_restore --dbname="$1" --clean --if-exists --no-owner --no-privileges "$2"
    ;;
  verify) # verify <db-url> - every application table restored and queryable
    for table in users products orders order_items processed_stripe_events migrations; do
      count=$(psql "$1" -Atc "SELECT count(*) FROM \"$table\"")
      echo "  $table: $count rows"
    done
    echo "restore verified: all application tables present and queryable"
    ;;
  *)
    echo "unknown command: $cmd" >&2
    exit 2
    ;;
esac
