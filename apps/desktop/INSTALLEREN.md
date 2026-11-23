# Folio installeren

Folio is een programma waarmee je zonder programmeren je eigen website bouwt en online zet.

## Downloaden

Ga naar **https://github.com/JudoxYT/folio/releases/latest** en kies:

| Computer | Bestand |
|---|---|
| Windows | `Folio-Setup-…exe` |
| Mac met Apple-chip (M1, M2, M3, M4…) | `Folio-…-arm64.dmg` |
| Mac met Intel-chip (ouder dan 2021) | `Folio-…-x64.dmg` |

Weet je niet welke Mac je hebt? Klik linksboven op  → **Over deze Mac**. Staat er "Chip Apple M…", kies dan arm64. Staat er "Processor Intel", kies dan x64.

## Windows

1. Dubbelklik op `Folio-Setup-…exe`.
2. Zie je een blauw venster *"Windows heeft uw pc beschermd"*? Klik op **Meer info** → **Toch uitvoeren**. Dat komt doordat Folio (nog) geen betaald certificaat heeft; het programma is veilig.
3. Volg de stappen. Folio staat daarna in je Startmenu.

Nieuwe versies installeert Folio vanzelf: je ziet een melding in *Mijn websites*.

## Mac

1. Open het `.dmg`-bestand en sleep **Folio** naar de map **Apps**.
2. Open Folio vanuit Apps. De eerste keer zegt de Mac dat hij de app niet kan controleren. Klik op **Gereed** (niet op Verplaats naar prullenmand).
3. Ga naar **Systeeminstellingen → Privacy en beveiliging**, scrol omlaag en klik bij *"Folio is geblokkeerd"* op **Toch openen**. Bevestig met je wachtwoord of Touch ID.
4. Daarna opent Folio voortaan gewoon.

**Zegt je Mac dat Folio "beschadigd" is en naar de prullenmand moet?** Dat kwam voor bij versies tot en met 0.1.3; vanaf 0.1.4 zou het niet meer moeten gebeuren. Zie je het toch: sleep Folio eerst naar **Apps**, open **Terminal** (via Spotlight: ⌘ + spatie, typ *Terminal*) en plak deze regel:

```
xattr -cr /Applications/Folio.app
```

Druk op Enter en open Folio opnieuw. Er is niets mis met het bestand: de Mac zet alleen een blokkade op apps zonder betaald Apple-certificaat, en dit commando haalt die weg.

Nieuwe versies downloadt Folio vanaf 0.1.5 zelf, ook op een Mac. Je ziet een melding in *Mijn websites*; klik op **Herstarten en bijwerken** en Folio opent vanzelf in de nieuwe versie, zonder waarschuwing van de Mac. Je websites blijven bewaard.

## Waar staan mijn websites?

In je map **Documenten → Folio**. Elke website is een eigen map. Wil je een website op een andere computer verder bewerken, kopieer dan die map en kies in Folio **Website openen uit map…**.

## Online zetten

In Folio: **Publiceren ▾ → Online zetten**. Maak één keer een gratis account bij Netlify, plak daar een toegangssleutel en klik op **Online zetten**. Folio maakt zelf een site voor je aan, met een adres als `jouw-naam-1a2b.netlify.app`. Daarna is elke nieuwe versie één klik, en het adres blijft hetzelfde. Een eigen domein koppel je in Netlify bij *Domain management*.

Liever zonder account? Onder *Liever zonder account?* maakt Folio de map van je site klaar voor Netlify Drop, of download je hem als zip.

## Contactformulier

Vul bij **⚙ Site-instellingen → Formulieren** je e-mailadres in. Berichten uit je formulieren komen dan in je mail binnen, waar je site ook staat. Na het eerste bericht krijg je één keer een mail om het te activeren.

## Vorige versie terugzetten

Folio bewaart elke dag een kopie van je website (de laatste 7 dagen). In *Mijn websites*: klik met rechts op een website → **Vorige versie terugzetten…** en kies een dag. Je huidige versie wordt eerst bewaard, dus terugzetten kun je ook weer ongedaan maken.
