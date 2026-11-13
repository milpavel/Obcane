# Pro Rtyni: SEO a sdílení

Veřejná identita webu je **Pro Rtyni, informační portál pro Rtyni v Podkrkonoší**. Odpovědnost a skutečná jména v obsahu zůstávají zachovány. Titulky metadat se nevydávají za oficiální web města.

`assets/seo.js` je zdroj jedinečných titulků, popisů a náhledů osmi veřejných podstránek. `scripts/build-seo.mjs` přepíše jejich hlavičky a JSON-LD WebSite, WebPage a skutečnou navigaci BreadcrumbList. Spouští se i při nasazení; ruční změny metadat provádět v konfiguraci.

- Hlavní náhled je dodaný obrázek uživatele, zachovaný návrh a rozměry 1731 × 909, pouze uložený jako optimalizovaný JPEG.
- Ostatní sekce mají typografické JPEG náhledy 1200 × 630 v jednoduchém fialovo-tyrkysovém stylu. Jejich obnovitelný zdroj je `scripts/build-social-covers.py` (Pillow, DejaVu Sans). Skript nepřepisuje hlavní dodaný obrázek.
- Události, praktické informace, spolky a rozhlas mají vlastní rubrikové fallback náhledy. Pokud má převzatý příspěvek bezpečný HTTPS obrázek, použije se jeho vlastní obrázek; neodhadují se jeho rozměry.
- `scripts/build-home-feed.mjs` vytváří oddělený plný veřejný `data/seo-feed.json` pro serverové detaily. Kompaktní klientský feed zůstává malý. Soukromá data ani přihlašovací údaje nejsou zdrojem.
- Pages middleware přidá metadata a čitelný počáteční text veřejných zpráv a článků přímo do HTML pro všechny návštěvníky. JavaScript poté doplní plně interaktivní detail. Nejde o cloaking nebo obsah jen pro boty.
- U jednotlivých inzerátů middleware čte pouze existující veřejnou projekci API (3s limit) pro název, popis a rubrikový obrázek; žádné správcovské tokeny. Při výpadku zůstává funkční standardní stránka, bez vymyšlených údajů.
- Kanonické adresy detailů zachovávají identifikátor a odstraňují sledovací parametry. Sitemap obsahuje pouze veřejné stránky, neskryté příspěvky a publikované články. Nevymýšlí se lastmod z času každého buildu.
- Administrace má `X-Robots-Tag: noindex, nofollow`, zůstává chráněna přihlášením a robots.txt. Neveřejné preview domény Pages jsou noindex. Robots není ochrana dat.

Kontroly: `node scripts/build-home-feed.mjs`, `node scripts/build-seo.mjs`, `node scripts/test_seo.mjs`, související testy detailů, zpráv a progresivního načítání. Po nasazení ověřit HTML bez JavaScriptu, canonical, OG, JSON-LD a dostupnost všech dvanácti JPEGů. Sociální služby mohou mít uložený starší náhled; náhled má novou URL verzi. Změny v indexu vyhledávače vyžadují nové procházení. Search Console ani Bing Webmaster Tools nejsou tímto automaticky ověřeny nebo nakonfigurovány.
