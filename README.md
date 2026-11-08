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

Supabase Cron `obcane-public-info-refresh` spouští import v 05:17, 10:17, 15:17 a 20:17 UTC. Import získá seznamy a detaily přímo z webů města, ZŠ, MŠ a VAK, datového kalendáře města, knihovny, skautů, Orla, Koletovky a muzea. Další zdroje doplňují katalog místních spolků a praktické služby města. ZŠ má samostatně parsované dny jídelníčku. MŠ se načítá z aktuálního souboru DOC/DOCX nalezeného na jejím webu; obsahuje celý týden, přesnídávky, obědy, svačiny a původní značení alergenů. Oba jídelníčky jsou vedle sebe, na telefonu pod sebou, s nezávislým přepínáním dnů. Zprávy se aktualizují podle unikátní dvojice zdroj + původní URL. Chyba zdroje nepřepisuje poslední úspěšná data; stav a čas se evidují zvlášť. Částečné chyby detailů jsou viditelné ve stavu zdroje. Dříve načtené detaily se používají až 12 hodin a požadavky na město se dávkují postupně.

Web čte veřejné GET API bez tajného klíče. Detaily zpráv se otevírají na `/?zprava=ID`, vlastní články na `/?prispevek=ID`. Zdroj, původní odkaz a čas načtení jsou u každého detailu. Databáze není pro návštěvníky otevřena k zápisu. POST import vyžaduje náhodný token uložený v Supabase Vault nebo ověřený účet z `obcane_editors`; funkce sama ověřuje autorizaci. Import má časově omezený zámek proti souběhu.

GitHub Actions ověřuje veřejné API a ukládá záložní veřejný snapshot, 30 minut po každém plánovaném importu. Neprovádí druhý souběžný scraper. Snapshot se použije při nedostupnosti API a zachovává původní čas načtení.

## Správa

`/admin/`: existující editor se přihlašuje účtem Supabase Auth. Lze psát články včetně textu, plánovat akce, ukládat finanční informace a ručně spustit import. Přístup se uděluje v `public.obcane_editors`; veřejná registrace nepřiděluje práva editora.

## Ověření

```sh
npm ci --ignore-scripts
npm test
node --check assets/app.js
python scripts/check_api.py
python scripts/export_snapshot.py
```

Při změně parseru ověřit aktuální HTML zdroje a znovu nasadit `obcane-api`. Cloudflare automaticky nasazuje statický web z GitHubu; Edge Function se nasazuje samostatně přes Supabase. Přehled zdrojů na webu i v administraci ukazuje poslední úspěch a případné chyby.

## Redakční pravidla

Zachovat původní logo a barvy #39118b, #008d9a, #ec1763. Převzaté informace odlišovat od vlastních textů. Činnost finančního výboru nezaměňovat za stanovisko sdružení. Číselné přehledy a grafy zveřejňovat teprve s ověřenými daty a zdrojem. Termíny odstávek nejsou potvrzením aktuálně probíhající havárie.

## Rozšířený místní přehled

13 evidovaných zdrojů v `sources`, specializované parsery v `extra-sources.ts`. Kalendář používá veřejné datové API města na 120 dní dopředu a pozvánky knihovny. Datum konání se neodvozuje z data publikace. Zrušená událost knihovny označí i odpovídající původní pozvánku; tyto položky se nenabízejí jako platné termíny. Po úspěšném obnovení kalendáře, knihovny a adresáře se chybějící položky označí `in_latest: false`.

Spolkový přehled odděluje adresář organizací z webu města od automatických aktualit skautů, Orla a Koletovky. Samostatné profily obsahují původní web. Zprávy dostupné pouze na uzavřených sociálních sítích se nevydávají za automaticky importované.

Praktické služby obsahují odpady a svozový kalendář, sběrný dvůr, městský úřad, lékařské služby, dopravu seniorů, místní poplatky, pečovatelskou službu a muzeum. U každého přehledu je poslední čas načtení. PDF přílohy města lze zobrazit přímo v detailu. Údaje o elektřině a dopravě pocházejí z oznámení města; nejde o přímý dispečink dodavatelů.

## Sloučení odstávek a omezení

`assets/notices.js` slučuje oznámení podle druhu omezení, skutečného termínu a společné lokality (ulice, silnice nebo dotčená čísla domů). Samotný obecný nadpis a datum ke sloučení nestačí. U vody má přednost přímý zdroj VAK; u etap asfaltování souhrnné oznámení s celým rozsahem termínu. Původní odkazy zůstávají v detailu. Aktuální omezení se zobrazují v jedné vlastní sekci; v běžném přehledu zpráv se neopakují. Výslovné hledání a filtr Voda používají stejný sloučený přehled. Původní ID článků zůstávají funkční. Testy `scripts/test_notices.mjs` ověřují sloučení vody a asfaltování, vyřazení skončených omezení a zachování různých dat a ulic.
