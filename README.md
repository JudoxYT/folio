# Vystara — eigen portfolio-platform

Een eigen vervanger voor Squarespace. De **Studio** is een editor in Figma-stijl waarin je pagina's visueel bouwt. De **publieke site** wordt bij publiceren als snelle statische HTML gemaakt. Het geheel combineert de sterke punten van Framer, Webflow, Wix, Squarespace en Figma Sites.

```
packages/core   Datamodel, thema's, secties, SVG-bibliotheek, SEO-check, renderer en effecten-runtime
apps/server     API (Hono + SQLite), inloggen, media-verwerking, publiceren, GitHub-push, vergrendelen, live voorbeeld
apps/studio     De editor (React + Vite + Zustand)
data/           Wordt automatisch aangemaakt: database, uploads (media/) en de gepubliceerde site (site/)
```

## Snel starten

Nodig: **Node.js 22.13 of nieuwer** (Node 24 of 26 is ook goed). ffmpeg komt automatisch mee.

**Windows:** dubbelklik op **`Vystara Studio.cmd`**. De eerste keer installeert hij alles; daarna opent de Studio vanzelf. Zie ook "Overal bewerken" hieronder.

Voor ontwikkelaars (met automatisch herladen):

```bash
npm install
npm run dev
```

Daarna open je http://localhost:5173/studio/. Met `node app.mjs` start je in één keer de gebouwde versie op http://localhost:8787/studio/.

Bij de eerste start maak je je account aan en staat de complete Vystara-site al klaar.

## Wat zit erin

### Editor
- Linkerpaneel: **Invoegen** (secties, elementen, iconen & vormen, opgeslagen secties), Pagina's, Lagen, Assets, Componenten en Projecten.
- Canvas: klik selecteert, Shift+klik selecteert meer lagen, slepen herschikt binnen auto layout, handvatten passen het formaat aan, dubbelklik bewerkt tekst, rechtsklik opent een menu. Onderaan staat een kruimelpad.
- Rechterpaneel: tabbladen **Ontwerp** en **Effecten** per laag. Zonder selectie: **Pagina** en **SEO**.
- **Ctrl+K** opent een zoekbalk voor alle acties: secties invoegen, pagina's openen, vensters, schermformaten.
- Desktop, tablet en mobiel: wijzigingen op kleinere formaten gelden alleen daar (paarse labels), net als in Figma Sites.

### Thema's (🎨 Thema)
- **Zes kant-en-klare thema's**: Studio Donker, Licht Minimal, Editorial, Neon Creator, Brutalist en Warm Film. Eigen thema's kun je opslaan en hergebruiken.
- **Kleurschema's per sectie** (zoals Squarespace): basis, contrast, accent en zacht. Kies per sectie een schema; tekst, koppen, knoppen en iconen erin passen zich automatisch aan.
- **Tekststijlen**: display, kop 1–4, grote tekst, platte tekst, klein en label. Per stijl stel je lettertype, grootte per schermformaat, gewicht, regelhoogte, letterafstand, hoofdletters en kleur in.
- **Knopstijlen**: primair, secundair, ghost en link, elk met vulling, tekst, rand, hoeken, ruimte, lettertype en hover.
- **Lettertypes**: systeemfonts, eigen uploads (WOFF2, WOFF, TTF, OTF) of Google Fonts. Google Fonts worden door je server gedownload en zelf gehost, dus zonder verbinding met Google (beter voor de AVG).
- **Vloeiend schalen**: tekst groeit geleidelijk mee tussen mobiel en desktop, en op grote schermen nog iets verder.

### Secties
Ruim 20 kant-en-klare secties met live voorbeelden in je eigen thema: vier hero's, werk-grids, showreel, tekst + beeld, diensten, cijfers, citaat, logo-band, galerij met lightbox, FAQ, oproep, contact met formulier, over mij en scheidingen. Je kunt ook een eigen sectie opslaan (rechtsklik → *Opslaan als sectie*, of Ctrl+Alt+S) en die daarna op elke pagina invoegen.

### Iconen, vormen en SVG's met bewerkbare kleuren
De bibliotheek bevat iconen, socials (Instagram, YouTube, Twitch, TikTok, Discord, LinkedIn, X, Vimeo, Behance), vormen, decoratie en sectiescheidingen. Elke kleur in een SVG is een los veld, en kan een schemakleur zijn, zodat hij zich aanpast per sectie en per thema. Je eigen SVG upload je bij Assets en kies je rechts bij *Uit bestand*: alle kleuren erin worden dan losse velden. Geüploade SVG's worden eerst veilig gemaakt (scripts en event-handlers gaan eruit).

### Media in elk formaat
- **Foto's**: JPG, PNG, WebP, AVIF, GIF, SVG, HEIC/HEIF (iPhone), TIFF, BMP, ICO, JXL. Ze worden omgezet naar WebP in vier formaten (480–2400 px).
- **Video's**: MP4, MOV, WebM, MKV, AVI, WMV, FLV, MPEG, MTS/M2TS, 3GP, OGV, MXF en meer. Je krijgt een web-MP4 (H.264, max 1920 breed) en een poster. Video met transparantie (bijvoorbeeld ProRes 4444) krijgt ook een WebM met alfakanaal. Met `VIDEO_WEBM=1` maakt de server voor elke video ook een kleinere WebM.
- **GIF's** krijgen automatisch een video-versie, tot zo'n tien keer kleiner.
- Bestanden zonder extensie worden met ffprobe herkend. Uploads gaan in stukken van 32 MB, dus ook grote showreels komen door Cloudflare.

### Interacties en effecten
Verschijnen bij scrollen (ook één voor één), scroll transform, scroll- en muis-parallax, hover en klikken, lopende band, typemachine en scramble, ronddraaien en lightbox. Bezoekers met "beperkte beweging" zien alles direct. Per laag kun je effecten op telefoons uitzetten.

### SEO
- **Per pagina**: een score met concrete verbeterpunten (titel, omschrijving, één h1, kopvolgorde, alt-teksten, interne links, hoeveelheid tekst, zoekterm), een Google-voorbeeld en een voorbeeld van een gedeelde link.
- **Automatisch**: JSON-LD structured data (website, organisatie of persoon met je socialprofielen, paginatypes, projecten als VideoObject met broodkruimels), `sitemap.xml` met datums, `robots.txt`, canonical, Open Graph, Twitter cards, en preload van de hero en fonts.
- **Site-instellingen → SEO**: taal, titelopbouw, Google- en Bing-verificatie, eigen head-code, en de hele site verbergen.
- **Redirects** (301/302) voor je oude Squarespace-adressen. Wijzig je een paginaadres, dan komt er automatisch een redirect bij. Ze werken op je eigen server, op Vercel (`vercel.json`) en op Cloudflare Pages (`_redirects`).

### Vergrendelen en live voorbeeld (🔒)
- **Onderhoud** of **wachtwoord**: bezoekers zien een nette pagina in je thema; jij ziet ingelogd gewoon alles. Op je eigen server werkt dit direct. Op Vercel of Cloudflare Pages wordt automatisch de onderhoudspagina gepusht, omdat een losse site daar geen wachtwoord kan controleren.
- **Live voorbeeld** (`/preview/`, knop *Live*): altijd je huidige werkversie, ververst vanzelf bij elke wijziging. Met een geheime deellink, die je kunt intrekken, kan ook iemand anders meekijken.

### Formulieren (📬)
Inzendingen komen in de Studio binnen. Met `FORM_WEBHOOK_URL` gaan ze ook direct naar een Discord-kanaal. Spam wordt geremd met een verborgen honeypot-veld en een limiet van 5 berichten per 10 minuten per IP.

## Vystara-startsite (je oude site, opnieuw opgebouwd)

Ga naar **⚙ Site-instellingen → ✦ Vystara-startsite** en klik op *Vystara-startsite installeren*. Dit doet in één keer:

- **Merkthema "Vystara Studios"**: nachtblauw `#061826`, mint `#E8F7EE`, roze `#DB5375`, blauw `#0471A6` en pruim `#42213D`, als vijf sectieschema's. Lettertypes: Bricolage Grotesque (koppen), DM Sans (tekst) en Unbounded (labels en knoppen), zelf gehost.
- **Logo, ster, app-icoon en sterrenpatroon als SVG**, met kleuren die je per laag aanpast (Invoegen → Iconen & vormen → Merk).
- **Pagina's Home, Werk, Over, Contact en Project starten**: een projectplanner met budget, planning en veelgestelde vragen. Verder een projectsjabloon met vorige/volgende-navigatie en een 404-pagina. Alle teksten zijn Nederlands en verschillen per pagina.
- **Werkpagina met filters** per discipline en een wissel tussen **lijst** (grote titels met een zwevend voorbeeldbeeld) en **raster**.
- **Animaties in de huisstijl**: vallende en zwevende sterren, koppen die woord voor woord verschijnen, cijfers die optellen, magnetische knoppen en een merk-cursor.
- **13 projecten** in vijf disciplines: Animatie, Illustratie, Fotomanipulatie, Branding en Videomontage. LOUERS Vodka is één case met zes thema's. Videoprojecten krijgen de YouTube-thumbnail als cover.
- Als je dat aanvinkt: **± 150 beelden** van je oude Squarespace-site, gedownload en als eigen media opgeslagen.
- **Redirects** van alle oude adressen, zoals `/animation`, `/connect` en `/branding/moonwave`, naar de nieuwe pagina's.
- Je mockups (notitieboek en koffiebeker), de favicon en een deelafbeelding voor socials.

Er komt eerst een back-up in `data/backups`. Bij een nieuwe installatie gebeurt dit vanzelf: de Studio laat rechtsboven zien hoe ver het downloaden is.

Video's: ffmpeg wordt met `npm install` meegeleverd, dus GIF's en video's werken ook zonder losse installatie. YouTube- en Vimeo-embeds hebben opties voor automatisch afspelen (gedempt), herhalen en bedieningsknoppen.

**Over het lettertype van de oude site:** daar stond "MUSER DRINK **trial**", een proefversie die je niet zonder licentie op een site mag gebruiken. Heb je een licentie gekocht? Upload het bestand dan bij 🎨 Thema → Lettertypes en kies het als display-font.

## Live site los van de Studio (GitHub + Vercel)

De Studio is alleen je **bewerkplek**. Bezoekers van vystarastudios.com komen nooit bij de Studio: ze krijgen de statische bestanden die Vercel uit je GitHub-repo bouwt. Je kunt de Studio dus gewoon dichtdoen.

1. **Hosting → GitHub**: repo en token invullen. "Automatisch na publiceren" staat standaard aan.
2. Klik **Publiceren**. De Studio duwt de site naar GitHub, Vercel zet hem binnen ongeveer een minuut live.
3. **Formulieren** (Contact en Project starten) lopen via een Vercel-functie die bij elke publicatie meekomt (`api/forms/submit.js`). Zet in Vercel → *Settings → Environment Variables*:
   - `FORM_WEBHOOK_URL`: een Discord-webhook (Kanaal → Integraties → Webhooks → Nieuwe webhook → URL kopiëren). Elke inzending komt als bericht binnen.
   - optioneel `STUDIO_URL`: het adres van je Studio (bv. op PebbleHost), als je inzendingen óók in de Studio-inbox wilt.
   Daarna in Vercel één keer *Redeploy*.

Zie je op je live site nog een oude versie? Dan is er sinds die tijd niets naar GitHub gestuurd. Na stap 2 klopt het weer.

## Overal bewerken: als app, zonder PowerShell

### Op je eigen pc (Windows)
- **Dubbelklik op `Vystara Studio.cmd`** in de projectmap. De eerste keer installeert hij alles zelf; daarna opent de Studio vanzelf in je browser. Sluit je het venster, dan stopt de Studio.
- Liever geen zwart venster? Gebruik **`Vystara Studio (achtergrond).vbs`**. Stoppen doe je met **`Vystara Studio stoppen.cmd`**.
- **Als app installeren:** open de Studio in Chrome of Edge en klik op het installeer-icoon (⊕) rechts in de adresbalk. Daarna staat "Vystara Studio" als app in je Startmenu en taakbalk, met eigen venster en icoon.
- Op een Mac of in Linux werkt hetzelfde met `node app.mjs`.

### Altijd online op PebbleHost (of een andere Node-host)
Zo bewerk je je site vanaf elke pc, laptop of telefoon, en komen formulieren altijd binnen, ook als je pc uit staat.

1. **Maak een Cloudflare Tunnel.** Ga in Cloudflare naar *Zero Trust → Networks → Tunnels → Create a tunnel* (type *Cloudflared*) en geef hem een naam, bijvoorbeeld `vystara-studio`. Kopieer de **token**; dat is de lange tekst na `--token` in het voorbeeldcommando.
2. Voeg bij **Public Hostname** toe: subdomein `studio`, domein `vystarastudios.com`, type `HTTP`, URL `localhost:8787`.
3. **Zet de projectmap op PebbleHost**: in het paneel via *File Manager* of SFTP, zonder `node_modules`. Neem je map `data` mee als je je huidige site wilt houden.
4. Maak in de hoofdmap een bestand **`.env`** met:
   ```
   TUNNEL_TOKEN=plak-hier-je-token
   PORT=8787
   ```
5. Kies onder **Startup** een Node.js-versie van **22.13 of nieuwer** en zet het startbestand (*Main file*) op **`app.mjs`**. Start de server.
6. De eerste start installeert en bouwt alles; dat duurt een paar minuten. Zie je in de console *"Tunnel verbonden"*, dan open je **https://studio.vystarastudios.com/studio/**.
7. Zet in de Studio bij ⚙ Site-instellingen → *Formulieren* het adres `https://studio.vystarastudios.com`.

Tips:
- 1 GB geheugen is genoeg voor de Studio. Het omzetten van hele grote video's kan wel even duren.
- Zonder tunnel kan het ook: open via *Additional Ports* een poort en zet die als `PORT` in `.env`. Dan is de Studio bereikbaar via het IP-adres en de poort, maar zonder HTTPS. De tunnel is veiliger.
- ffmpeg en cloudflared komen automatisch mee met `npm install`; je hoeft niets los te installeren.

## Online zetten

### Optie 1: GitHub + Vercel (aanbevolen voor snelheid)
In de Studio: **Publiceren ▾ → Publiceren & hosting → GitHub + Vercel**. Daar staat het volledige stappenplan met links. Kort samengevat:

1. Maak een private repository op GitHub.
2. Maak een *fine-grained token* met alleen *Contents: Read and write* op die repository en plak hem in de Studio. De token blijft op je server en wordt nooit meer getoond.
3. Test de verbinding en push een eerste keer.
4. Importeer de repository op vercel.com/new: Framework *Other*, geen build command.
5. Koppel je domein in Vercel.
6. Zet *Automatisch na publiceren* aan.

De server pusht via de GitHub-API alleen gewijzigde bestanden; git hoeft niet geïnstalleerd te zijn. Formulieren en de Studio blijven op je eigen server: vul bij Site-instellingen → *Formulieren* het adres van je server in. Bestanden boven 100 MB slaat GitHub over; zet dan een *Media-domein* in.

### Optie 2: Eigen server
```bash
cp .env.example .env
docker compose up -d --build
docker compose --profile tunnel up -d   # met Cloudflare Tunnel (TUNNEL_TOKEN in .env)
```
Zet `SECURE_COOKIES=1` zodra alles via HTTPS loopt.

### Optie 3: Cloudflare Pages
Gebruik `PUBLISH_COMMAND` met wrangler (zie `.env.example`).

## Sneltoetsen

| Toets | Actie |
| --- | --- |
| Ctrl + K | Alle acties zoeken |
| F / T | Frame / tekst invoegen |
| Dubbelklik / Enter | Tekst bewerken (Esc of Ctrl+Enter om te stoppen) |
| Esc | Ouder selecteren |
| Shift + klik | Meer lagen selecteren |
| Ctrl + A | Alle lagen naast de huidige selecteren |
| Ctrl + C / X / V | Kopiëren / knippen / plakken (ook tussen pagina's) |
| Ctrl + D | Dupliceren |
| Shift + A | Auto layout aan / in een frame zetten |
| Ctrl + Alt + G / Ctrl + Shift + G | In frame zetten / frame opheffen |
| Ctrl + Alt + K | Component maken |
| Ctrl + Alt + S | Opslaan als sectie |
| Alt + ↑ / ↓ | Laag omhoog / omlaag |
| Ctrl + Shift + H | Verbergen / tonen |
| Delete | Verwijderen |
| Ctrl + Z / Ctrl + Shift + Z | Ongedaan maken / opnieuw |
| Ctrl + S | Direct opslaan (gebeurt ook automatisch) |
| Shift + 1, Ctrl + 0, Ctrl + +/- | Passend zoomen, 100%, in- en uitzoomen |

## Nog niet gebouwd
- Varianten van componenten en de interactie "Change to"
- Variabelen en conditionele interacties
- Eigen cursor en versleepbare lagen op de site
- Eigen CMS-collecties naast Projecten, en import uit CSV
- Een cookiebanner. Die is nu niet nodig: de site plaatst geen cookies. Alleen YouTube-embeds laden via youtube-nocookie.com, en YouTube-thumbnails komen van i.ytimg.com zolang een project geen eigen cover heeft.

## Beveiliging in het kort
- **Inloggen**: wachtwoorden met scrypt, een httpOnly-sessiecookie, maximaal 10 mislukte inlogpogingen per 15 minuten, en een CSRF-header op schrijvende verzoeken.
- **Bestanden**: padcontrole tegen `../`-trucs, SVG's worden opgeschoond en met een strikte CSP geserveerd, en `nosniff` staat aan.
- **Geheimen**: de GitHub-token en het sitewachtwoord gaan nooit terug naar de browser.
