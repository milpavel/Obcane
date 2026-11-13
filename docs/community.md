# Sousedská komunita Pro Rtyni

## Účel a použití

Komunita doplňuje informační portál o konkrétní vztahy mezi sousedy. Čtenář může reagovat tam, kde informaci našel; společný přehled `/komunita/` sdružuje tytéž konverzace. Nevznikají dvě nesouvisející diskuze k jednomu článku.

| Potřeba člověka | Funkce | Důvod k návratu |
| --- | --- | --- |
| Vyjádřit se k místnímu dění | Diskuze pod hlavními zprávami a místními zprávami | Odpovědi lidí, kterých se stejné téma týká |
| Domluvit se kolem akce nebo spolku | Diskuze přímo u detailu akce a spolku | Další praktické zkušenosti a domluva |
| Na něco se zeptat, poradit nebo pomoci | Vlastní témata Dotaz, Pomoc, Tip, Nápad | Konkrétní sousedská odpověď |
| Neztratit svou konverzaci | Sledování témat, Moje sledované a upozornění na portálu | Nová odpověď, viditelný počet upozornění v navigaci |
| Dát najevo podporu bez psaní | Lajk a srdíčko k tématu i jednotlivému komentáři, obojí lze odebrat | Nenucená účast |
| Dát ostatním vědět, že už pomoc není potřeba | Vyřešeno, spravuje autor tématu a redakce | Přehled, kde má další pomoc smysl |
| Udržet přehled bez procházení webu | Redakční schránka nových komentářů a nahlášení | Přímá odpověď a zásah z administrace |

Jde o návrh použití, nikoliv o slib zvýšení návštěvnosti. Ověřit jej lze porovnáním skutečných návštěv komunity, počtu věcných odpovědí, vyřešených dotazů a zátěže moderace. Zpočátku je užitečnější krátká užitečná reakce redakce než uměle plněná diskuze. Nejsou vloženy žádné falešné účty, reakce ani sousedské příspěvky.

## Hranice a klidné prostředí

Diskuze jsou zapnuté u článků, importovaných místních zpráv, akcí a spolků. Nezapojují jídelníčky, ordinační hodiny a kontaktní katalog, hlášení rozhlasu ani záznamy zásahů hasičů. Inzerce používá vlastní kontaktní tok. Čtení je veřejné; psaní, reakce a nahlášení vyžadují účet a potvrzený e-mail podle Supabase Auth. Jméno účastníka je přezdívka, nikoliv ověřená totožnost občana.

Příspěvky i nová témata všech přihlášených uživatelů s potvrzeným e-mailem se zveřejňují ihned. Nové příspěvky se objeví v redakční frontě do označení za vyřízené. Moderace probíhá dodatečně. Redakce může příspěvek skrýt s důvodem, obnovit, pozastavit přispívání autora, uzavřít vlákno a připnout užitečné téma. Moderace má soukromou historii. Nahlášení je soukromé a samo příspěvek automaticky neschová.

## Technická struktura

- `assets/community.js`: veřejná komunita, přihlášení a sdílený widget diskuze.
- `assets/community-api.js`: požadavky a stabilní klíče `post:<id>`, `event:<id>`, `item:<id>`, `neighbor:<uuid>`.
- `assets/admin-community.js`: redakční fronta, reakce z redakce, moderace.
- `supabase/functions/obcane-community/`: veřejné čtení a ověřované zápisy; vlastní ověření JWT přes Auth `/user`; redakční oprávnění výhradně z `obcane_editors`.
- `supabase/schema-community.sql`: schéma soukromých tabulek, indexy a RLS; přímé přístupy `anon` a `authenticated` jsou odebrané.
- Účty komunity mají oddělené úložiště relace od redakce. Supabase klient se veřejným návštěvníkům načítá až při přihlášení nebo existující relaci.
- Veřejné odpovědi neobsahují e-mail ani interní ID účtu; zakázaný obsah je text, nikdy HTML. Reporty a důvody moderace vidí pouze redakce.
- Limity: 3000 znaků, 5 komentářů/minutu, 80/den, 3 nová témata/den, 10 nahlášení/den a 30 zápisů/minutu. Idempotentní odesílání a unikátní reakce brání dvojím zápisům při opakování požadavku.
- Nejvýše 30 komentářů na stránku, 20 témat na stránku; odpovědi mají omezené odsazení a odkazují na rodiče. Přímé odkazy fungují i za první stránkou komentářů.
- Upozornění se zobrazují na portálu, neodesílají e-maily. Uživatel může přestat sledovat téma nebo vypnout upozornění. Schválení upozorní autora; čekající komentář nevytváří veřejné upozornění.
- Stažený článek, neveřejný koncept a naplánovaná zpráva jsou odmítnuty i přes komunitní API. Změna názvu nepřeruší diskuzi, protože klíč používá ID, nikoli slug.
- Nejnovější skutečné veřejné články jsou nabídnuté k diskuzi i před prvním komentářem.

## Ověření a provoz

`node scripts/test_community.mjs` spouští skutečný handler na místním PostgreSQL v paměti (PGlite). Nezakládá žádné účty v produkci. Ověřuje oprávnění, dodatečnou moderaci, reakce, odpovědi, soukromá upozornění, moderaci, blokování, zamykání, vlastnictví, odstranění a stažení zdroje. Čtení živého API a zamítnutí nepřihlášeného zápisu lze ověřit bez testovacích účtů.

Před spuštěním je nutné mít aktivní e-mailové přihlášení Supabase Auth. Samotné odeslání a doručení registračního e-mailu nebylo bez skutečného příjemce testováno. Veřejné nastavení projektu při implementaci: e-mailové přihlášení povolené, registrace povolená, potvrzování e-mailu zapnuté. Přihlášení, založení profilu, anonymní zobrazení a chybové stavy byly prověřeny v rozhraní a lokálních testech v rozsahu zaznamenaném v závěru práce.
