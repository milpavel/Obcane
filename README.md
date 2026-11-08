# Občané pro Rtyni

Responzivní občanský portál. Produkce: https://obcane-pro-rtyni.pages.dev

## Provoz

- GitHub: `milpavel/Obcane`, produkční větev `main`.
- Cloudflare Pages: `obcane-pro-rtyni`, build `exit 0`, výstup `.`.
- Supabase: existující projekt `prvni-klik` (`dvbaihwplzwljxrtkymi`).
- Import: Edge Function `obcane-api`, zdrojový kód v `supabase/functions/obcane-api/index.ts`.
- Data importu: privátní schéma `obcane`, tabulky `sources`, `items`, `import_control`.
- Vlastní články, akce, finance a editoři: stávající `public.obcane_*`; veřejné čtení jen publikovaných záznamů, zápisy podle oprávnění editora.

## Jak tečou data

Supabase Cron `obcane-public-info-refresh` spouští import v 05:17, 10:17, 15:17 a 20:17 UTC. Import získá seznamy a detaily přímo z webů města, ZŠ, MŠ a VAK. ZŠ má samostatně parsované dny jídelníčku. Zprávy se aktualizují podle unikátní dvojice zdroj + původní URL. Chyba zdroje nepřepisuje poslední úspěšná data; stav a čas se evidují zvlášť. Částečné chyby detailů jsou viditelné ve stavu zdroje. Dříve načtené detaily se používají až 12 hodin a požadavky na město se dávkují postupně.

Web čte veřejné GET API bez tajného klíče. Detaily zpráv se otevírají na `/?zprava=ID`, vlastní články na `/?prispevek=ID`. Zdroj, původní odkaz a čas načtení jsou u každého detailu. Databáze není pro návštěvníky otevřena k zápisu. POST import vyžaduje náhodný token uložený v Supabase Vault nebo ověřený účet z `obcane_editors`; funkce sama ověřuje autorizaci. Import má časově omezený zámek proti souběhu.

GitHub Actions ověřuje veřejné API a ukládá záložní veřejný snapshot, 30 minut po každém plánovaném importu. Neprovádí druhý souběžný scraper. Snapshot se použije při nedostupnosti API a zachovává původní čas načtení.

## Správa

`/admin/`: existující editor se přihlašuje účtem Supabase Auth. Lze psát články včetně textu, plánovat akce, ukládat finanční informace a ručně spustit import. Přístup se uděluje v `public.obcane_editors`; veřejná registrace nepřiděluje práva editora.

## Ověření

```sh
node --check assets/app.js
python scripts/check_api.py
python scripts/export_snapshot.py
```

Při změně parseru ověřit aktuální HTML zdroje a znovu nasadit `obcane-api`. Cloudflare automaticky nasazuje statický web z GitHubu; Edge Function se nasazuje samostatně přes Supabase. Přehled zdrojů na webu i v administraci ukazuje poslední úspěch a případné chyby.

## Redakční pravidla

Zachovat původní logo a barvy #39118b, #008d9a, #ec1763. Převzaté informace odlišovat od vlastních textů. Činnost finančního výboru nezaměňovat za stanovisko sdružení. Číselné přehledy a grafy zveřejňovat teprve s ověřenými daty a zdrojem. Termíny odstávek nejsou potvrzením aktuálně probíhající havárie.
