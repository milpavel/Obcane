# Občané pro Rtyni

Občanský portál 2026–2030. Statický responzivní web, připravený pro Cloudflare Pages.

## Nasazení
Cloudflare Pages → Connect to Git → milpavel/Obcane. Framework: None; build command prázdný; output directory: /.

## Obsah
Supabase projekt **prvni-klik**, oddělené tabulky s prefixem `obcane_`: posts, events, finances, sources. RLS umožňuje veřejnosti číst pouze publikované záznamy. Žádné veřejné zápisy. Nový obsah zatím spravujte v Supabase Table Editor a nastavte status na published. Automatické importy a administrační rozhraní jsou další etapa.

## Připojení Supabase
Před publikací vložte do index.html před poslední modulový script: `<script>window.OBCANE_SUPABASE_URL='https://dvbaihwplzwljxrtkymi.supabase.co';window.OBCANE_SUPABASE_KEY='VEREJNY_PUBLISHABLE_KEY';</script>`. Použijte výhradně publishable key, nikdy service_role. V současném stavu web funguje i bez připojení, jen se nezobrazí dynamické články.

## Branding
Barvy: fialová #39118b, tyrkysová #008d9a, růžová #ec1763. Původní logo je nutné dodat v kvalitním PNG/SVG, pak nahradit textovou značku v hlavičce. Původní fotografie osob nejsou nahrazovány generovanými portréty.

## Redakční pravidla
Oficiální činnost finančního výboru nezaměňovat za stanoviska sdružení. U finančních údajů vždy přidat ověřitelný zdroj, datum a kontext.

## Cloudflare Pages
Projekt: `obcane-pro-rtyni`; GitHub deployment z `main`; preview URL: https://obcane-pro-rtyni.pages.dev.
