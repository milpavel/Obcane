# Pro Rtyni — pravidla vzhledu

Pro další samostatné veřejné stránky kategorií používejte společné záhlaví `.page-masthead` a styly `assets/page-layout.css`. Jde o výslovně zvolený vzhled portálu a platí také pro budoucí stránky.

- Záhlaví je světlý šedý pruh s jemným fialovo-tyrkysovým přechodem přes celou šířku stránky, přímo pod navigací.
- Obsah záhlaví je ve společné `.wrap`: odkaz `.page-breadcrumb` s přesným textem „← Zpět na portál“ a cílem `/`, malý tyrkysový nadpis `.eyebrow`, jedno `h1` s růžovou tečkou a stručný úvod.
- Samotný obsah, tabulky, formuláře a seznamy následují pod záhlavím na světlém podkladu. Akce specifické pro sekci patří do záhlaví vedle úvodu nebo do `.page-content-heading` nad obsahem.
- Nevytvářejte nad záhlavím samostatný bílý blok s velkým tlačítkem „Zpět na portál“. Pro kategorie nepoužívejte jinou barevnou hero sekci.
- Výjimkou jsou propagační pruhy na domovské stránce, například barevný komunitní pruh přes celou šířku. Jejich vzhled není šablonou záhlaví kategorií.
- Zachovejte provozní ID prvků a ovládání kategorií. Společné rozměry záhlaví upravujte v `page-layout.css`, nikoliv odděleně v jednotlivých sekcích.
- Hlavní navigace má pořadí Akce, Odjezdy, Zprávy, Komunita, Více. Komunita sdružuje komunitní síť a inzerci.

Příklady i seznam zahrnutých stránek jsou v `docs/design-standard.md`.

- Při změně veřejného JavaScriptu aktualizujte také verzi `?v=` u vstupního skriptu v HTML a u změněných importů. Starší otevřené mobilní prohlížeče jinak mohou zachovat předchozí funkce.
