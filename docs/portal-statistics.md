# Statistiky portálu

Soukromá záložka administrace **Statistiky portálu**, pouze pro účty v `public.obcane_editors`. Stejná kontrola na serveru jako pro správu obsahu; přihlášení do jiného webu ve sdíleném Supabase projektu neopravňuje k reportu.

## Měření

- `assets/navigation.js` načítá malý první-stranový modul na osmi veřejných stránkách. Hlavička, slider a rychlé informace nemění vzhled.
- Stránka se započte po první viditelné sekundě. Nové otevření / reload je nové zobrazení, nikoli důkaz nového člověka. Žádné přetrvávající ID návštěvníka, cookies nebo obsah polí.
- Sekce se započte po dvou sekundách, během nichž zabírá aspoň polovinu své výšky nebo polovinu výšky obrazovky (podle toho, co je menší). Nepočítá se odložené načtení mimo obrazovku.
- Kliknutí / sekce / konkrétní filtr jsou jednou na cíl v jednom dokumentu. Pro viditelné časové prahy 15/30/60/120/300 sekund samostatná událost. Nejde o skutečně přečtené texty.
- Formulářové výsledky pocházejí z databáze: přijaté soukromé inzeráty, podněty a potvrzení odběrů ve vybraném období. Nejde o stejnou kohortu jako měřené začátky formulářů, proto se z nich nepočítá dokončení v procentech.
- Žádné obsahy formulářů, hledané fráze, úplné referrery, kontaktní údaje, autentizační a správcovské tokeny. U odkazů se uchovávají pouze schválené cesty a identifikátory veřejných detailů. Zdroj příchodu je omezená kategorie; zařízení vychází ze šířky obrazovky.
- Automatizované prohlížeče a známé boty, DNT/GPC, účet redakce s lokálním přihlášením, administrace a správcovské fragmenty se vylučují. Měření lze blokovat a jako každé veřejné měření může být neúplné nebo zneužité. Nejde o finanční evidenci ani přesné počty unikátních lidí.

## Server a uchování

`obcane-analytics` přijímá jen POST z povoleného originu, maximálně 8 kB / 20 povolených událostí. Nemá endpoint pro čtení. Validace a denní agregace probíhá v transakci, s deduplikací a krátkodobým limitem podle hodinového HMAC síťové adresy. Surová IP se do těchto tabulek neukládá. Platformní provozní logy poskytovatele mají jeho vlastní uchování.

- `obcane.analytics_daily`: agregované denní počty; uchování 400 dní.
- `obcane.analytics_pages`, `analytics_seen`: náhodné ID jednoho dokumentu pro deduplikaci, úklid po dvou dnech.
- `obcane.analytics_rate`: hodinový HMAC pro limit provozu, úklid po dvou hodinách.
- Cron `obcane-analytics-retention`: každou hodinu v minutě 23. RLS zapnuté, žádný přístup `anon` / `authenticated`. Záměrný default-deny bez klientských policies; přístup pouze serverovým kódem.
- `obcane-admin?action=statistics&from=YYYY-MM-DD&to=YYYY-MM-DD`: autentizovaný agregovaný přehled, Europe/Prague, nejvýše 93 dní. Předchozí stejně dlouhé období; chybějící historie není vydávaná za nulovou návštěvnost. Dnešek je neúplný.

Schema: `scripts/analytics-schema.sql`. Skript je opakovatelný, nemění jiné aplikace sdíleného projektu. Funkce nasadit s vlastní autorizací (`obcane-admin` zachovává dosavadní `verify_jwt=false` kvůli veřejným opravám/recovery a ověřuje uživatele sám; collector je veřejný zápis s validací).

## Historie a Cloudflare

Cloudflare Web Analytics je jednorázově importován do soukromého `analytics_settings.history` (JSON agregace, bez osobních údajů). Původní snapshot se neukládá do veřejného repozitáře. Backend připojí historické page_view řádky s origin=cloudflare ke stávajícím řádkům origin=portal. Stávající KPI, graf, stránky, zdroje a zařízení používají dohromady jednu časovou řadu; denní tabulka a CSV rozlišují oba zdroje.

Historie je od 9. 11. 2026 do přesného času nasazení 2026-11-12T23:40:43.840703Z (13. 11. 00:40:43 Europe/Prague), exclusive. Nové záznamy vznikaly až po nasazení; žádné existující kladné záznamy před importem nebyly. Historické query mají Prague denní hranice, filtr konkrétního siteTag a hostů prortyni.cz/www. Administrace, testovací cesty a neznámé cesty jsou vyloučeny. Zdroj i zařízení jsou převedeny do stejných kategorií. Import je náhrada jednoho snapshotu, nikdy přírůstkové přičítání při obnovení administrace. Žádný API klíč Cloudflare se neukládá a živá synchronizace neběží.

Cloudflare neuchovává v importovaných requestPath detailové parametry, proto staré zobrazení detailu nelze rozlišit. Typ zařízení Cloudflare se liší od viewportové klasifikace nového měření. Podíl 15 s se počítá jen z nových page_view, ne z historie. Procentní srovnání období překračující dvě metodiky se nezobrazuje. Před nejstarším dostupným dnem je v denní tabulce a CSV Neměřeno, nikoli nula. Detaily sekcí a kliknutí začínají nasazením. Databázové výsledky formulářů mají původní časové údaje a nejsou předmětem importu.

## Návrat před změnu

Výchozí commit před touto funkcí: `a2f2ac246ac4d215acf798a6b937df70e4bea406`. Vrátit jen soubory funkcionality v novém commitu; neměnit ostatní úpravy ani občanské záznamy. Původní `obcane-admin` byl ve verzi 5 a odpovídal tomuto repozitáři. Před návratem jeho starého entrypointu obnovit i jeho původní relativní soubory. Pro vypnutí sběru stačí odstranit import `statistics.js` z navigace a nasadit, existující agregace nemusí být smazány. Dočasné deduplikační údaje dál uklízí cron.
