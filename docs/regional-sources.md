# Regionální informace pro Pro Rtyni

Automaticky zpracováváme pouze kalendářová fakta: název, obec, uvedený termín a odkaz na pozvánku. Fotografie ani celé regionální články nepřebíráme.

- VAK: kromě odkazovaných zpráv načítáme také oznámení vložená přímo na stránku. U nedatovaných upozornění stáří zveřejnění samo nedokazuje pokračující platnost. Nové upozornění zařazujeme na sedm dnů; starší ukládáme s příznakem `notice_needs_review`, bez tvrzení, že omezení stále trvá. Výslovně uvedený budoucí termín má přednost. Při ověřování dlouhotrvajícího omezení je nutná redakční kontrola.
- KJH: kalendář načítáme s aktuálním pražským datem ve filtru. Archivní doporučení v mapě nejsou aktuálními akcemi.
- Kladské pomezí: z aktuálního výpisu vybíráme pouze blízké obce. Nejde o úplný regionální kalendář; záměrně nezpracováváme vzdálené akce ani všechny stránky regionu.
- Okolí: Úpice, Batňovice, Havlovice, Malé a Velké Svatoňovice, Libňatov, Červený Kostelec, Hronov, Suchovršice, Radvanice a Markoušovice. Rtyňské akce ponecháváme místním zdrojům, abychom nepřidávali přejmenované duplicity.
- Rozmezí: akce končící dnes nebo později, začínající do 120 dnů; nejvýše 14denní jednotlivá akce. Vícedenní akce zůstává viditelná do uvedeného konce. Roční výstavy a souhrnné měsíční programy nevydáváme za jednu běžící událost.
- Označení: „Tip z okolí · obec“. Obsah patří do kalendáře, nikoli do proudu místních zpráv nebo hlavního redakčního slideru. Duplicity mezi regionálními kalendáři slučujeme pouze při shodném místě a termínu.
- Známý rozpor: Kladské pomezí uvádí Staročeské Vánoce na Dřevěnce 20. 11. 2026, zatímco program Úpického adventu uvádí 19. 12. Výpis s původním chybným datem vynecháváme; při změně data se opět posoudí běžnými pravidly.
- Zprávy svazku Jestřebí hory a MAS vybírá redakce jednotlivě podle přínosu pro Rtyni. Interní organizační zprávy nepřebíráme plošně. KJH už pokrývá sdílené regionální pozvánky, proto další totožný kalendář Jestřebích hor nepřidáváme.

Oba kalendáře používají stávající pravidelný import portálu. Chyba struktury zachová poslední úspěšná data a zapíše chybu zdroje; úspěšný prázdný místní výběr vyřadí dřívější pozvánky z aktuálních.

Ověření: `node scripts/test_regional_sources.mjs`, celý `npm test`; živé výpisy a stav zdrojů po nasazení.
