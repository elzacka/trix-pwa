---
modul: oppslag
valg: [søk, emneknagger, a–å]
---
# {navn}

<!--
Dette er innholdet i fanen. Endre det som du vil.

Øverst, mellom linjene med ---:
- modul: hurtigtaster, oppslag, kort eller steg
- valg, skilt med komma: søk, emneknagger, a–å. Uten valg får fanen alle tre.
  - emneknagger: Trykk på en #emneknagg for å se alt med samme emne
  - a–å: Sorterer gruppene og oppslagene alfabetisk. Uten valget står de i samme rekkefølge som i fila.
- søketekst: Teksten i søkefeltet før du skriver

Under:
- # Navn: Navnet på fanen
- ## Navn: Gruppe
- ### Navn: Oppslag
- Linjene under oppslaget: Forklaringen. Den første linjen vises i lista. Tom linje: Nytt avsnitt.
- #### Overskrift, - punktliste, 1. nummerert liste, | tabell |
- ::: Tittel: Lukket boks. Innholdet under står i boksen frem til en linje med bare :::.
- Også: Andre navn, skilt med komma
- Engelsk: Det engelske navnet
- #emneknagg #flere
- **fet**, *kursiv*, [lenke](https://…)
- [tekst](Kort.md#sted): Lenke til en annen fane eller et sted i den. Etter # står navnet på stedet
  med små bokstaver og bindestrek for mellomrom.
-->

## Gruppe A

### Første oppslag
Den første linjen under tittelen står i lista. Trykk på oppslaget for å lese resten.

Resten av forklaringen kan ha flere avsnitt, **fet** og *kursiv* tekst og [lenker til nettsider](https://trix.tazk.no/).
Også: Oppslag, Begrep
Engelsk: Entry
#eksempel

### Oppslag med liste og tabell
Et oppslag kan ha lister og tabeller.

- Punkt én
- Punkt to

| Kolonne 1 | Kolonne 2 |
|---|---|
| Verdi A | Verdi B |
| Verdi C | Verdi D |
#eksempel #tabell

## Gruppe B

### Oppslag med lukket boks
Det ikke alle trenger, kan stå i en lukket boks.

::: Mer om dette
Teksten i boksen vises når du åpner den.
:::
#boks

### Oppslag med deler
Underoverskrifter deler et langt oppslag. En lenke kan gå rett til en del.

#### Del 1
Tekst i den første delen.

#### Del 2
Tekst i den andre delen. [Gå til del 1](#del-1)
#eksempel
