# Společný vzhled samostatných kategorií

Zvolený standard: světlé šedé záhlaví s jemným fialovo-tyrkysovým přechodem přes celou šířku, úvodní odkaz, tyrkysová rubrika, velký tmavý nadpis s růžovou tečkou a krátký popis. Pod ním následuje samotný obsah. Tento vzhled se používá i pro budoucí samostatné kategorie.

Sdílený styl je v `assets/page-layout.css`, který se načítá po stylech konkrétní sekce. Všechna společná pravidla rozměrů, barev a mobilního rozložení patří sem.

```html
<section class="page-masthead">
  <div class="wrap">
    <a class="page-breadcrumb" href="/">← Zpět na portál</a>
    <span class="eyebrow">RUBRIKA</span>
    <h1>Název kategorie<span class="pink">.</span></h1>
    <p>Stručný popis obsahu stránky.</p>
  </div>
</section>
<section class="wrap page-content">
  <!-- Seznam, formulář nebo jiný obsah sekce. -->
</section>
```

Standard se používá na stránkách Odjezdy, Jídelníčky, Finance, Hlavní zprávy, Sousedská komunita, Inzerce, Bydlení a Novinky e-mailem. Specifická tlačítka a ovládání zůstávají zachovaná. Nevkládá se samostatný bílý pás s velkým tlačítkem Zpět nad úvod stránky.

Na menších displejích se zmenší nadpis a okraje, akce se poskládají pod text a obsah zůstane v jedné čitelné šířce. Barevné propagační pásy na domovské stránce jsou samostatný prvek a této šabloně nepodléhají.
