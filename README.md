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

Při změně parseru ověřit aktuální HTML zdroje a znovu nasadit `obcane-api`. Cloudflare automaticky nasazuje statický web z GitHubu; Edge Function se nasazuje samostatně přes Supabase. Administrace ukazuje poslední úspěch a případné chyby zdrojů. Veřejné stránky zachovávají zdroj a datum načtení u jednotlivých informací.

## Redakční pravidla

Zachovat původní logo a barvy #39118b, #008d9a, #ec1763. Převzaté informace odlišovat od vlastních textů. Činnost finančního výboru nezaměňovat za stanovisko sdružení. Číselné přehledy a grafy zveřejňovat teprve s ověřenými daty a zdrojem. Termíny odstávek nejsou potvrzením aktuálně probíhající havárie.

## Rozšířený místní přehled

23 evidovaných zdrojů v `sources`, specializované parsery v `extra-sources.ts`. Kalendář používá veřejné datové API města na 120 dní dopředu a pozvánky knihovny. Datum konání se neodvozuje z data publikace. Zrušená událost knihovny označí i odpovídající původní pozvánku; tyto položky se nenabízejí jako platné termíny. Po úspěšném obnovení kalendáře, knihovny a adresáře se chybějící položky označí `in_latest: false`.

Spolkový přehled odděluje adresář organizací z webu města od automatických aktualit skautů, Orla a Koletovky. Samostatné profily obsahují původní web. Zprávy dostupné pouze na uzavřených sociálních sítích se nevydávají za automaticky importované.

Praktické služby obsahují odpady a svozový kalendář, sběrný dvůr, městský úřad, lékařské služby, dopravu seniorů, místní poplatky, pečovatelskou službu, městský zpravodaj a muzeum. U každého přehledu je poslední čas načtení. PDF přílohy města lze zobrazit přímo v detailu. Zpravodaj načítá šest nejnovějších vydání z první stránky městského archivu a odkazuje na celý archiv. Údaje o elektřině a dopravě pocházejí z oznámení města; nejde o přímý dispečink dodavatelů.

Audit 10. 11. 2026: spolkové RSS zachovává i prostý text a obrázkové pozvánky mimo hlavní text článku (WordPress a Divi). Ověřené prázdné archivní stránky Webnode se nezobrazují mezi aktuálními zprávami. Smluvní pojišťovny a kontakty obou ordinací Hartmanových se přebírají z webu ordinací; při nedostupnosti se nevrací zastaralý seznam města. U lékárny Clara detail upozorňuje na rozpor otevíracích hodin, místo aby uváděl jednu variantu jako potvrzenou. Podrobný rozsah a omezení kontroly: `docs/audit-2026-11-10.md`.

Městské PDF se pro náhled otevírá přes `GET obcane-api?document=ID`, protože přímé vložení původního serveru je blokováno. Endpoint dovolí jen číselné ID veřejného souboru již odkazovaného v importovaných datech, nepřijímá vlastní URL, kontroluje PDF signaturu a omezuje velikost na 20 MB. Původní odkaz ke stažení se nemění.

## Sloučení odstávek a omezení

`assets/notices.js` slučuje oznámení podle druhu omezení, skutečného termínu a společné lokality (ulice, silnice nebo dotčená čísla domů). Samotný obecný nadpis a datum ke sloučení nestačí. U vody má přednost přímý zdroj VAK; u etap asfaltování souhrnné oznámení s celým rozsahem termínu. Původní odkazy zůstávají v detailu. Aktuální omezení se zobrazují v jedné vlastní sekci; v běžném přehledu zpráv se neopakují. Výslovné hledání a filtr Voda používají stejný sloučený přehled. Původní ID článků zůstávají funkční. Testy `scripts/test_notices.mjs` ověřují sloučení vody a asfaltování, vyřazení skončených omezení a zachování různých dat a ulic.


## Profily spolků a denní přehled

`club-profiles.ts` obsahuje redakčně ověřené profily organizací, kontakty, zveřejněné ceny a konkrétní zdrojové odkazy. Datum `profile_checked` aktualizovat až po kontrole těchto stránek. Import městského adresáře propojuje profily s trvalými ID; alias jednoty Orla se v seznamu neopakuje. Chybějící ceny se nevymýšlejí. Ceník florbalu obsahuje rozpor ve slevách pro sourozence, na který profil upozorňuje.

Spolkové RSS pozvánky s jednoznačným datem konání vstupují do kalendáře. Datum publikace zůstává oddělené. Rozsahy více dnů mají samostatné termíny; Koletovka doplňuje i vlastní tabulku akcí. Skautská pozvánka načte související stránku s podrobnostmi na stejném webu. Po úspěšném importu se i odstraněné spolkové pozvánky skryjí z aktuálního přehledu.

`GET obcane-api?daily=1` vrací počasí Open-Meteo pro Rtyni a jmeniny ze Svátky API. Datum se určuje podle Europe/Prague, odpovědi poskytovatelů se ověřují proti tomuto dni. Cache je nejvýše 15 minut, při výpadku 1 minuta; neúspěch jedné služby neblokuje druhou ani zprávy. Veřejný přehled zobrazuje poskytovatele a čas počasí. Profily a denní přehled nepoužívají žádné nové klíče ani přihlašování.

`assets/events.js` slučuje shodné pozvánky napříč zdroji, zachovává různé časy a místa i jednotlivé dny vícedenních akcí. Pokud se knihovna a městský kalendář liší o jeden den u stejného jednoznačného tématu, kalendář zobrazí termín pořadatele a upozorní na rozpor včetně obou odkazů. U Špicberk obsahuje městská stránka datum 11. 11. v záhlaví a 12. 11. v textu; knihovna uvádí 12. 11. Datum tedy nelze bez upozornění přebírat pouze ze záhlaví. Regrese ověřuje `scripts/test_events.mjs`.

## Zprávy všech místních spolků

`community-sources.ts` eviduje 13 organizací a jejich veřejné zdroje. U zprávy se ukládá `club_key` a `club_name`; veřejný přehled nabízí filtr podle spolku a zobrazuje jeho název i v detailu. RSS se čistí od sledovacích parametrů, Ballare importuje pouze kategorii Novinky (nikoli seznamy členů skupin). Florbal používá vlastní parser seznamu a detailů; relativní data „dnes/včera“ se převádějí podle Europe/Prague. Volejbal zachovává skutečné datum a označení archivu.

Kontroly zahrnují i veřejné profily Contemporary, ČZS a Sokola; nepřepisují se na nové zprávy bez skutečně datované místní aktuality. Zprávy z pražských kurzů se nezaměňují za dění ve Rtyni. Nefunkční RSS hasičů se hlásí jako nedostupné. V těchto případech se nic nevymýšlí a veřejný filtr uvádí stav zdroje. Nové zdroje sdílejí existující import 4× denně.

## Domény

Hlavní adresa je připravena jako `prortyni.cz` v Pages projektu `obcane-pro-rtyni`. Cloudflare zóny: prortyni.cz `ddcb7bccd6c0264be3e4a3ec873e8d9b`, pro-rtyni.cz `e18de1f257c8125d59d6251b2622ac79`. Oběma byly přiděleny nameservery `june.ns.cloudflare.com` a `zac.ns.cloudflare.com`. Do jejich nastavení u registrátora jsou zóny pending. Doména pro-rtyni.cz a její www varianta mají 301 na https://prortyni.cz se zachováním cesty a dotazu; www.prortyni.cz se také sjednocuje na hlavní adresu. Po aktivaci ověřit HTTPS a přesměrování včetně odkazu `?zprava=…`.


## Hlavní zprávy

Samostatná rubrika `/zpravy/` kombinuje zveřejněné `public.obcane_posts` a uložený redakční přehled `data/editorial-news.json`. Položky se slučují podle slugu. Kategorie `original` znamená vlastní článek, `media` vlastní shrnutí cizí zprávy. Média mají původní datum, jméno zdroje a odkazy; fotografie ani plné cizí texty se nepřebírají. Pole `author`, `source_name`, `source_date`, `source_refs` jsou doplněna migrací `schema-news.sql`. Nová oprávnění editorů nebyla udělena. Hasičské zprávy zůstávají v městském přehledu pod filtrem Hasiči.


Detaily Hlavních zpráv podporují mezititulky `## ` v samostatných odstavcích a `summary_points` (pole textů) pro závěrečný box Naše shrnutí. Zdroje jsou drobnou kurzívou pod boxem. SDH Rtyně má jako veřejný kanál Facebook; `feed: external` se záměrně neimportuje bez napojení a veřejné API jej označuje `mode: external`. Neúspěšný starý RSS web se již nekontroluje.

## Odjezdy vlaků a autobusů

Veřejný GET `?transport=1` načítá tabule IREDO (`iredo.online/crws/departures/{id}`), stejné veřejné čtení jako mapa IREDO. Parametry `train` a `bus` přijímají pouze lokální zastávky z pevného seznamu. Výchozí jsou Rtyně v Podkrkonoší a autobusové stanoviště. Uživatelská volba se ukládá pouze v prohlížeči. Souhrn u počasí i sekce `#doprava` používají stejné vybrané zastávky.

Odjezdy se obnovují každých 60 sekund při otevřené stránce a při návratu na ni. Server sdílí souběžné požadavky a drží úspěšnou tabuli 25 sekund. Po 120 sekundách se číselné odjezdy skryjí; při chybě se nevydává starý přehled za živý. Rozsah zdroje je následujících 120 minut. Žádné odjezdy se nedopočítávají z pevných časů, intervalů ani ze starších snapshotů.

`delay=-1` nebo chybějící hodnota znamená neznámé zpoždění, nikoli jízdu včas. Známé zpoždění v minutách se přičte k plánovanému času. Řazení a nejbližší spoj vycházejí z očekávaného odjezdu. Příjezdy končící ve vybrané zastávce se odstraní. Časy bez offsetu se interpretují v Europe/Prague; neexistující a nejednoznačné časy při změně letního času se neodhadují. Hlášené zpoždění nemá samostatnou časovou značku měření od dopravce a není zárukou skutečného odjezdu. Odkaz na originální tabuli a IDOS zůstává dostupný i při chybě. Jde o veřejné rozhraní webové aplikace IREDO bez garantované dostupnosti; změna jeho formátu může vyžadovat úpravu adaptéru.

Testy `scripts/test_transport.mjs` ověřují časová pásma a DST, terminalní příjezdy, zpožděné odjezdy po plánovaném čase, neznámé zpoždění, deduplikaci, chyby zdroje, whitelist zastávek, cache a souběh požadavků. Nasazení Edge Function je nutné provést spolu s publikací statické části.

## Oznámení ordinací a hledání na portálu

Samostatná Edge Function `obcane-doctor-news` načítá pouze oddíl Aktuality ze dvou veřejných webů Hartmanových. Je nezávislá na `obcane-api`, nemá přístup do databáze, zachovává platformní kontrolu JWT a klient používá veřejný anonymní klíč. Úspěšná odpověď se sdílí deset minut; chyba zdroje se zobrazuje jako nedostupný zdroj, nikoli potvrzení běžného provozu. Ověření zdroje není datem publikace. Jednoznačně skončená datovaná provozní oznámení se odfiltrují. Dlouhodobé nebo nejednoznačně datované změny se zachovají s odkazem na původní sdělení. Výběr oznámení je omezený; úplné informace jsou na webu ordinace. Provozní sdělení se opakují v Odstávkách a omezeních. Oznámení města o uzavření ordinací a lékárny rozlišuje modul `notices.js`; vlastní ověřený průběžný feed lékárny není dostupný.

Vyhledávání v hlavičce funguje bez diakritiky a prohledává veřejný feed, vnořené popisy služeb a kontaktů, spolky, akce, finance, text hlavních zpráv a sdělení ordinací. Stránky mají stejný hledací formulář a bezpečně textové výsledky. Při nedostupnosti části zdrojů se zobrazí informace o neúplných výsledcích. Neindexuje text uvnitř externích PDF dokumentů. Před zveřejněním frontendu nasadit samostatnou funkci; hlavní `obcane-api` se kvůli této funkci nemění.

### Školy, jídelny, družina, prázdniny a VAK

`node scripts/update_practical_info.mjs` obnovuje sedm samostatných služeb v `data/practical-info.json` z pevných oficiálních zdrojů. Obsah školních jídelen zahrnuje i podstránky s platbami a přihláškami. Dokumenty se stahují do `documents/` (identita podle URL zdroje), PDF lze číst a stáhnout na portálu; textový přepis je doplňkem originálu. Novější řád jídelny MŠ má přednost před starými cenami na hlavní stránce. Nezahrnují se veřejné seznamy dětí. Při výpadku zdroje zůstane poslední uložená verze a označení neúspěšné kontroly; kontrola neznamená datum vydání dokumentu. Stahování používá `linkedom`, `word-extractor` a již používaný PyMuPDF.

Obnova je součástí existujícího workflow `refresh-public-info.yml` čtyřikrát denně. Kalendář se čte ze školní stránky pro příslušný školní rok a okres Trutnov. Nejbližší prázdniny se vybírají podle data v Praze; během prázdnin se zobrazí probíhající termín, po skončení přejde na další. Za poslední ověřený termín se nic neodhaduje. Oznámení ordinací mají samostatnou sekci `#aktuality-lekaru`. Nové služby a texty dokumentů jsou dostupné i v celkovém vyhledávání.

### Pruh počasí

`assets/weather.js` načítá bez klíče Open-Meteo pro souřadnice 50.505, 16.073, časové pásmo Praha, teploty v °C a vítr v km/h. Pruh ukazuje aktuální modelový stav (teplota, pocitová teplota, vítr, nárazy, vlhkost a srážky za interval poskytovatele) a výhled na tři následující dny. Ikony rozlišují den a noc i druh srážek. Aktualizace běží každých deset minut a při návratu do stránky. Při výpadku lze zobrazit označený uložený přehled nejvýše 90 minut starý, jinak se místo hodnot ukáže nedostupnost. Data a zdroj zůstávají oddělené od svátku, školních prázdnin a svozu odpadu.

### Denní přehled a svátky

`assets/topbar.js` zobrazuje jméno oslavence vedle data v horním pruhu na úvodu i stránce zpráv. Jméno se přijímá jen pro aktuální pražské datum. `assets/public-holidays.js` vybírá nejbližší český svátek včetně dneška, rozlišuje státní a ostatní svátky a počítá Velký pátek a Velikonoční pondělí podle gregoriánských Velikonoc. Podklady byly ověřeny v zákoně 245/2000 Sb. a přehledu ČNB dne 9. 11. 2026. Výběr zahrnuje i Vánoce; označení karty se řídí druhem příštího svátku. Ověření pokrývá velikonoční data, přechod roku i stáří údajů o jmeninách.

Počasí, termíny a odjezdy sdílejí `.daily-overview`: na větších obrazovkách všechny poloviny začínají na téže středové ose; odjezdy nemají bílé pozadí ani rámeček. Na mobilu jsou prázdniny a příští svátek vedle sebe, svoz a odjezdy pod nimi. Dělicí čáry se na mobilu přizpůsobují pořadí informací.

### Městský rozhlas

Zdroj `radio` načítá datovaná hlášení z první stránky městského archivu `/mestsky-rozhlas` a úplné přepisy z jednotlivých detailů při pravidelném importu. Jedno hlášení zůstává jednou kartou, i když obsahuje několik oznámení. Sekce `#rozhlas` řadí podle data hlášení a přidává karty po šesti. Přepisy jsou zahrnuté do celkového vyhledávání. Při chybě zdroje zůstává poslední uložená verze a upozornění; odkaz na úplný archiv města je vždy dostupný.

### Baník – nový fotbalový web

Od 11. 11. 2026 zdroj `banik` používá `https://banikrtyne.cz/clanky/vse`. Modul `banik.mjs` importuje devět datovaných novinek a galerií, odděluje vlastní obsah od partnerů a zachovává odkaz na originál i autora. Fotogalerie mají nejvýše osm náhledů; delší články mají ukázku do 175 slov. Termíny mládežnických turnajů a pozvánku na další Rtyně CUP čte samostatně, aby historická reportáž nevyrobila chybnou budoucí akci. Nevymýšlí časy ani místo; při rozporu data a dne v týdnu upozorní v detailu. Po úspěšném importu starý fotbalový zdroj zmizí z aktuálního přehledu. Profil oddílu obsahuje ověřené kontakty, historii a odkazy na tým a turnaje; volejbal zůstává samostatný.

### Řazení městských zpráv

`assets/feed-order.js` kombinuje datum zveřejnění a konání v časovém pásmu Praha. První skupinu tvoří zprávy nejvýše 14 dní staré a akce na příštích 14 dní. Následují vzdálenější akce a zprávy do 30 dní; proběhlé pozvánky, zrušené akce a starší obsah jsou až za nimi. Čerstvé výsledky a reportáže zůstávají novinkami, ale nově načtený záznam několik měsíců staré události se nevrátí na začátek. Čas importu není datem zveřejnění. Data bez roku u jednoznačných pozvánek se vztahují k nejbližšímu roku data zveřejnění (nejvýše půl roku), jinak se termín neodhaduje.

Všechna zobrazení kromě výběru jednoho zdroje střídají zdroje v rámci stejné skupiny aktuálnosti, cílově nejvýše dva příspěvky jedné organizace v každé šestici. Pokud další stejně aktuální zdroje nejsou, omezení se uvolní; archiv se kvůli pestrosti neposouvá dopředu. Město a jeho kalendář sdílejí jeden limit. Stejné pozvánky se slučují včetně původních zdrojů a případného rozporu termínů. Pořadí je deterministické a přidávání dalších šesti karet neposouvá již zobrazené zprávy. Barevná tlačítka kategorií ukazují počty, aktivní stav a mají výrazné ovládání klávesnicí.
