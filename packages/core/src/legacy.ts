// ─────────────────────────────────────────────────────────────
// Inhoud van de oude Squarespace-site (gescand op 16-11-2026).
// De startsite gebruikt deze teksten; de server kan de beelden
// van het Squarespace-CDN downloaden en als eigen media opslaan.
// ─────────────────────────────────────────────────────────────

const CDN = 'https://images.squarespace-cdn.com/content/v1/64119c39b8b1d0685a847f32/';
const STATIC = 'https://static1.squarespace.com/static/64119c39b8b1d0685a847f32/';

export interface LegacyProject {
  slug: string;
  title: string;
  /** Eén of meer disciplines, gescheiden door " · " (bv. "Branding · Animatie"). */
  category: string;
  /** Secties met eigen beelden en video's uit data/import/<map>/ (sleutel "local:<map>/<bestand>"). */
  sections?: LocalSection[];
  /** Tekstblokken op de projectpagina (bv. het verhaal achter Vystara). */
  story?: { title: string; text: string }[];
  /** Extra video's onder de hoofdvideo. */
  extraVideos?: { title: string; text: string; url: string }[];
  /** Hoofdstukken op de projectpagina (bv. de zes LOUERS-thema's). */
  chapters?: { title: string; text: string; images: string[] }[];
  client?: string;
  summary: string;
  video?: string;
  /** Cover (volledige URL). Leeg = eerste beeld. */
  cover?: string;
  /** Beelden in volgorde (volledige URL's). */
  images: string[];
  featured?: boolean;
}

const c = (...paths: string[]) => paths.map((p) => CDN + p);

export interface LocalItem {
  /** Sleutel "local:<map>/<bestand>". */
  file: string;
  alt: string;
  /** Beeldverhouding voor video's, bv. "16 / 9". */
  ratio?: string;
  caption?: string;
}
export interface LocalSection {
  label: string;
  title: string;
  text: string;
  items: LocalItem[];
  cols: number;
  /** Elk beeld op een eigen tegel (voor transparante emotes, badges en alerts). */
  tiles?: boolean;
  /** Metselwerk in plaats van een strak raster (beelden van verschillende hoogte). */
  masonry?: boolean;
}
const J = (f: string) => `local:judox/${f}`;
const item = (f: string, alt: string, extra: Partial<LocalItem> = {}): LocalItem => ({ file: J(f), alt, ...extra });

export const LEGACY_PROJECTS: LegacyProject[] = [
  {
    slug: 'judox',
    title: 'Judox',
    category: 'Branding · Animatie · Illustratie',
    client: 'Judox — social media revamp',
    featured: true,
    cover: J('banner-judox.jpg'),
    summary:
      'Een complete revamp van de socials van content creator Judox. De hoofdrol is voor Nyla, zijn kat: zij duikt op in alerts, emotes, badges en panelen. Het thema leunt op Stranger Things: retro synthwave, neon in het donker, cassettebandjes en walkietalkies. Van stream-schermen tot de kleinste sub-badge spreekt alles dezelfde taal.',
    images: [],
    story: [
      { title: 'Nyla in de hoofdrol', text: 'Geen anoniem logo, maar een personage. Nyla reageert op elke follow, sub en raid, en heeft haar eigen set emotes: blij, boos, cool of in tranen.' },
      { title: 'Stranger Things-sfeer', text: 'Rood neon op zwart, een upside-down-gevoel en spullen uit de jaren tachtig. Een cassettebandje wordt een paneel, een walkietalkie een badge.' },
      { title: 'Eén systeem', text: 'Dezelfde kleuren, lijnen en arceringen in elk onderdeel. Daardoor voelt een kanaal op Twitch, YouTube en TikTok als één geheel.' },
    ],
    sections: [
      { label: 'stream-schermen', title: 'Begin, pauze en einde', text: 'Animaties voor elk moment van de stream: van aftellen tot afsluiten.', cols: 2, items: [
        item('scherm-starting-soon.mp4', 'Starting Soon-scherm met neon Judox-logo', { ratio: '16 / 9' }),
        item('scherm-be-right-back.webm', 'Be Right Back-scherm', { ratio: '16 / 9' }),
        item('scherm-intermission.mp4', 'Intermission-scherm', { ratio: '16 / 9' }),
        item('scherm-stream-ending.mp4', 'Stream Ending-scherm', { ratio: '16 / 9' }),
      ] },
      { label: 'alerts', title: 'Alerts die je niet mist', text: 'Een eigen animatie voor elke follow, sub, raid en donatie. Transparant, dus ze vallen netjes over het spel heen.', cols: 2, tiles: true, items: [
        item('alert-new-follower.webm', 'Alert voor een nieuwe volger', { ratio: '16 / 9' }),
        item('alert-sub-tier-1.webm', 'Alert voor een tier 1-sub', { ratio: '16 / 9' }),
        item('alert-raid.webm', 'Alert voor een raid', { ratio: '16 / 9' }),
        item('alert-donations-bits.webm', 'Alert voor donaties en bits', { ratio: '16 / 9' }),
      ] },
      { label: 'live alerts', title: 'Alerts die op de stream zelf draaien', text: 'Een tweede set alerts, live opgebouwd in 3D in de eigen alerts-editor van de streambot. Elke gebeurtenis heeft een eigen scène, van een flikkerend kerstlampje bij een follow tot een baasgevecht tegen Nyla zelf.', cols: 3, masonry: true, items: [
        item('live-follow-kerstlampje.jpg', 'Follow-alert: een flikkerend kerstlampje'),
        item('live-sub-hawkins-lab.jpg', 'Sub-alert: een toegangspas voor het Nyla National Lab'),
        item('live-sub-tier-3-code-red.jpg', 'Tier 3-alert: Code Red met Nyla'),
        item('live-resub-labdeur.jpg', 'Resub-alert: de labdeur gaat open'),
        item('live-cadeau-subs-nyla.jpg', 'Cadeau-sub-alert: Nyla brengt een cadeautje'),
        item('live-cadeau-subs-demodogs.jpg', 'Alert voor vijf cadeau-subs: een roedel Nyla’s'),
        item('live-bits-slinger-lampjes.jpg', 'Bits-alert: een slinger lampjes'),
        item('live-bits-de-poort.jpg', 'Bits-alert vanaf 1000: de poort scheurt open'),
        item('live-bits-mind-flayer.jpg', 'Bits-alert vanaf 10.000: de Mind Flayer'),
        item('live-raid-hellfire-d20.jpg', 'Raid-alert: Hellfire Club met een D20'),
        item('live-baasgevecht-demogorgon.jpg', 'Baasgevecht: chatters vechten samen tegen Nyla'),
      ] },
      { label: 'nyla in beweging', title: 'Nyla, frame voor frame', text: 'Geanimeerde Nyla-momenten voor follows, subs per mijlpaal en raids.', cols: 3, tiles: true, items: [
        item('nyla-illustratie.webm', 'Geanimeerde illustratie van Nyla', { ratio: '16 / 9' }),
        item('nyla-follow.webm', 'Nyla-animatie bij een follow', { ratio: '16 / 9' }),
        item('nyla-sub-1-maand.webm', 'Nyla-animatie bij een sub van 1 maand', { ratio: '16 / 9' }),
        item('nyla-sub-3-maanden.webm', 'Nyla-animatie bij een sub van 3 maanden', { ratio: '16 / 9' }),
        item('nyla-sub-6-maanden.webm', 'Nyla-animatie bij een sub van 6 maanden', { ratio: '16 / 9' }),
        item('nyla-sub-9-maanden.webm', 'Nyla-animatie bij een sub van 9 maanden', { ratio: '16 / 9' }),
      ] },
      { label: 'raid', title: 'Raid!', text: 'Een staande animatie voor als er een raid binnenkomt.', cols: 1, tiles: true, items: [
        item('nyla-raid.webm', 'Staande Nyla-animatie bij een raid', { ratio: '1080 / 4000' }),
      ] },
      { label: 'banners en schermen', title: 'Overal herkenbaar', text: 'Banners voor Twitch en YouTube en de schermen voor live en offline.', cols: 2, masonry: true, items: [
        item('banner-judox.jpg', 'Judox-banner met rood neonlogo'),
        item('banner-youtube.jpg', 'YouTube-banner van Judox'),
        item('scherm-streaming-now.jpg', 'Streaming Now-scherm'),
        item('scherm-stream-offline.jpg', 'Stream Offline-scherm'),
        item('banner-twitch.jpg', 'Twitch-banner van Judox'),
      ] },
      { label: 'twitch-panelen', title: 'Panelen als cassettebandjes', text: 'Over mij, socials, Discord, specs en uitleg over commando’s en Nyla-punten, allemaal in dezelfde stijl.', cols: 3, masonry: true, items: [
        item('panel-over-mij.png', 'Paneel Over mij als cassettebandje'),
        item('panel-support.png', 'Paneel Support met een omgevallen fles'),
        item('panel-discord.png', 'Paneel Discord met een walkietalkie'),
        item('panel-socials.png', 'Paneel Socials met een gasmasker'),
        item('panel-subs.png', 'Paneel Subs met een hartvormig slot'),
        item('panel-specs.png', 'Paneel Specs met de stream-pc'),
        item('panel-commands-tijdens-stream.png', 'Paneel met commando’s tijdens de stream'),
        item('panel-commands-chat.png', 'Paneel met chatcommando’s'),
        item('panel-nyla-punten.png', 'Paneel met Nyla-punten en de winkel'),
      ] },
      { label: 'badges', title: 'Sub-badges en bits', text: 'Hoe langer je sub bent, hoe gekker het voorwerp: van cassette tot klok.', cols: 5, tiles: true, items: [
        item('badge-sub-1-maand.png', 'Sub-badge 1 maand: cassettebandje'),
        item('badge-sub-3-maanden.png', 'Sub-badge 3 maanden: walkietalkie'),
        item('badge-sub-6-maanden.png', 'Sub-badge 6 maanden: gasmasker'),
        item('badge-sub-9-maanden.png', 'Sub-badge 9 maanden: klok'),
        item('badge-bits.png', 'Bits-badge: potje'),
      ] },
      { label: 'emotes', title: 'Emotes voor de chat', text: 'Letter-emotes voor de hype en Nyla in elke stemming.', cols: 6, tiles: true, items: [
        item('emote-hype.png', 'Emote HYPE'),
        item('emote-raid.png', 'Emote RAID'),
        item('emote-w.png', 'Emote W'),
        item('emote-gg.png', 'Emote GG'),
        item('emote-kei.png', 'Emote KEI'),
        item('emote-ohh.webm', 'Geanimeerde emote OHH', { ratio: '1 / 1' }),
        item('emote-nyla-hart.png', 'Nyla-emote met een hartje'),
        item('emote-nyla-cool.png', 'Nyla-emote met zonnebril'),
        item('emote-nyla-huilen.png', 'Nyla-emote in tranen'),
        item('emote-nyla-lachen.png', 'Nyla-emote die lacht'),
        item('emote-nyla-boos.png', 'Nyla-emote die boos is'),
        item('emote-nyla-tos.webm', 'Geanimeerde Nyla-emote TOS', { ratio: '1 / 1' }),
      ] },
    ],
  },
  {
    slug: 'waardeer-het-repareer-het',
    title: 'Waardeer Het Repareer Het',
    cover: 'https://i.ytimg.com/vi/CYqV0XH5faY/maxresdefault.jpg',
    category: 'Animatie',
    client: 'Afstudeerproject',
    featured: true,
    video: 'https://youtu.be/CYqV0XH5faY',
    summary:
      'Mijn afstudeerproject, en ja: een 9. Een korte animatie met één simpele boodschap: gooi je spullen niet weg, laat ze repareren. Een cowboy laat in de woestijn van Amerika zijn telefoon vallen bij een tankstation. In plaats van een nieuwe te kopen, laat hij hem maken door een lokale reparateur en rijdt hij de zonsondergang in. Felle kleuren, alles zelf geanimeerd en het verhaal voorop. Nog steeds een van mijn favorieten.',
    images: c(
      'a6a539e8-9b89-4be0-8d41-c27ed503b4f5/Storyboard+-+Animatie+Examen+-+1.png',
      '970f7a36-6449-4628-a6cc-979b779a0bb5/Storyboard+-+Animatie+Examen+-+2.png',
      '3a996c7b-2d91-4cdb-8f87-8910d41b768d/Storyboard+-+Animatie+Examen+-+3.png',
      '1f6817b4-5a1e-4574-8962-cf6d8379e26a/Storyboard+-+Animatie+Examen+-+4.png',
      '9506e5d9-af01-4d8d-a254-78b2fe0fce00/Storyboard+-+Animatie+Examen+-+5.png',
      'd70f6b56-9b4e-46f9-a935-18196a352098/Storyboard+-+Animatie+Examen+-+6.png',
      'b4ed46ef-0737-4d34-9639-1fcaee55608d/Storyboard+-+Animatie+Examen+-+7.png',
      '5ee715d8-4449-4bf3-9982-549fd03ffb0d/Storyboard+-+Animatie+Examen+-+8.png',
      'd667a3f8-1b9b-40b5-a299-26e607d68a92/Storyboard+-+Animatie+Examen+-+9.png',
      '0ea08269-48eb-4c23-b184-7754dd85240f/Storyboard+-+Animatie+Examen+-+10.png',
      '43ac5279-b717-458c-a833-27da3ebdcce6/1.+Conceptblad+-+v2+-+Repareren+Brengt+Muziek+in+Leven.png',
    ),
  },
  {
    slug: 'louers-vodka',
    title: 'LOUERS Vodka',
    category: 'Fotomanipulatie',
    client: 'LOUERS Vodka (stage)',
    featured: true,
    cover: CDN + '6c089bff-7b5d-4f30-8108-c7866969a1c1/1.+LOUERS+-+Amsterdam+-+v6.jpg',
    summary:
      'Tijdens mijn stage bij LOUERS Vodka maakte ik opvallende content voor hun socials. Van fotobewerking tot complete campagnebeelden: samen bouwden we een verhaal waarin de fles de reisgenoot is, op de mooiste plekken ter wereld. Premium, maar met karakter. Zes thema’s, van Amsterdam tot de ruimte.',
    images: [],
    chapters: [
      { title: 'The Capitol', text: 'Thema “The Capitol – Amsterdam” laat de mooiste kanten van de bekendste stad van Nederland zien. De beelden nemen je mee door Amsterdam en houden tegelijk de merkidentiteit van LOUERS scherp in beeld.', images: c(
          'af58ddca-a6ef-497a-8c4f-752d56eccb99/LOUERS+-+Story+1+-+Departure+-v3.png',
          'b74adff6-bcb9-46e7-a3d5-6771a9d969c0/LOUERS+-+Story+6+-+Coordinates+-+v2.png',
          '3f6d70c8-25e1-4f75-9721-8e09535cf258/LOUERS+-+Story+2+-+Street+-+v2.png',
          '462b188e-38a2-454a-9b77-3ed76d5b8262/LOUERS+-+Story+2+-+Bottles+in+Water+-+v2.jpg',
          '3d6e94b7-8be0-4793-a046-4edbc4415354/LOUERS+Martini+Scene+-+V6.jpg',
          '6c089bff-7b5d-4f30-8108-c7866969a1c1/1.+LOUERS+-+Amsterdam+-+v6.jpg',
          '68067e82-9074-4f24-a20d-d82edcbca7f3/LOUERS+-+Post+10+-+Tram+-+v2.png',
          '5fbdeffd-16f5-4816-a805-2d969668b501/LOUERS+-+Post+10+-+Tram+-+v1.png',
          'ef47f439-0366-4ada-a850-b58250d4c1eb/LOUERS+-+Post+10+-+Tram+-+v3.png',
        ) },
      { title: 'Art Gallery', text: 'Thema “Art Gallery” laat zien hoe een modern merk zijn product in kunst kan verwerken. De fles en accessoires verschijnen in beroemde schilderijen, zo dicht mogelijk bij het origineel gehouden. Zorgvuldig gemaakt met moderne technieken, met een verrassend resultaat.', images: c(
          'e15a54b6-e305-48ef-b569-b56fedc19d7d/LOUERS+-+Post+2+-+Sculpture+Bottle+-+v4.jpg',
          '0c88bd49-0e0d-4cd2-b1b6-2c445d56a7ba/LOUERS+-+Post+7+-+Meisje+met+de+Parel+-+v4.png',
          '20fcadf3-e60c-4296-8bdb-b10c7619ecec/LOUERS+-+Post+8+-+Napoleon+-+v5.jpg',
          '8cab0ea7-eadf-4c52-b88e-f68c0ed30915/LOUERS+-+Post+6++-+Milkmaid+-+v1.png',
          'fc323b38-3936-49a8-8846-158dc0898707/LOUERS+-+Guide+Map+-+v1.jpg',
          '2133b063-6fbc-496f-ae9c-e73dfc620169/LOUERS+-+Post+9+-+Mona+Lisa+-+v3.jpg',
          '63a0a161-feb5-47a2-8116-c1dd730f04ea/LOUERS+-+Post+9+-+Renaissance+Ceiling+-+v5.jpg',
          'c9da3e1a-cdb2-4dea-893e-c66429e4b552/a9b680671188475845ffcf5c5c889688.jpg',
          'd4af4234-5206-49f2-a3cb-5f09d63d133d/LOUERS+-+Museum+Info+-+v1.png',
          'beffb267-1ac1-4511-8914-6e067166266e/1.+LOUERS+-+Museum+Tickets+-+v5.jpg',
          'd519e447-f41e-443f-8b35-9ea7243fb58b/LOUERS+-+Post+1+-+Flying+Louers+Bottle+-+v3.jpg',
        ) },
      { title: 'Aviation', text: 'Thema “Aviation” neemt je mee in de wereld van luxe privévliegtuigen. Luxe, uniek en vooral de reis zelf staan centraal. Koffers pakken en vliegen met LOUERS.', images: c(
          'd17f6a84-6609-47eb-a9b1-1cdc125f1f1f/LOUERS+-+Post+1+-+Passport+-+v9.jpg',
          '5c59aa96-c785-4037-bf7f-4287385448ba/LOUERS+-+Post+12+-+Welcome+to+Cannes+-+v4.jpg',
          'e32ea94f-28a6-403b-954b-ac58446ff3e4/LOUERS+-+Post+16+-+Mat+-+v3.jpg',
          'f006ee46-9a17-4e00-a954-386a4b7be957/LOUERS+-+Post+7+-+Marshal+-+v3.jpg',
        ) },
      { title: 'Côte d’Azur', text: 'Thema “Côte d’Azur” neemt je mee naar een van de mooiste regio’s ter wereld: stranden, drankjes, clubs en de beroemde Formule 1-race, allemaal in één thema.', images: c(
          '42ac2a20-e446-4fcf-950c-0e82bcca3526/LOUERS+-+Post+2+-+Bottle+Boat+-+v3.jpg',
          'd4f125ea-aa88-4d3d-8cbf-4a1f6aecbb66/LOUERS+-+Post+8+-+Ocean+with+Sailers+-+v1.jpg',
          'dc43373d-7a56-4178-816a-1dd0aed9d71f/LOUERS+-+Post+14.1+-+Bottle+Rack+-+v4.jpg',
          'a8e3069a-cba3-4a5f-8a4b-ccb15534e9a2/LOUERS+-+Post+2+-+Bottle+Boat+-+v5.jpg',
          '3f3125d4-d66e-4b1c-a6f1-9f5a988d0b16/LOUERS+-+Post+14.3+-+Fancy+Bar-+v2.jpg',
          '30660917-ce23-4527-bd87-a0d805870b9f/LOUERS+-+Post+9+-+Riva+Boat+-+v4.jpg',
          'ab5a861a-a70b-45e5-a218-130e66dccb86/LOUERS+-+Post+5+-+Navigation+Board+-+v4.jpg',
          '6f96bf55-08ed-48a8-a1e1-d6295c0f106b/LOUERS+-+Post+11+-+Sunglasses+Box+-+v3.jpg',
          '6a20b1f9-26be-4093-8ad3-46bcbf27da1b/LOUERS+-+Post+1+-+Beach+-+v7.jpg',
          'd6b4853a-82b0-4bd0-b70b-645225551290/LOUERS+-+Post+6.3+-+Formula+1+Race+-+Left+-+v1.jpg',
          '2dabf75d-1521-49ec-9cfd-29a49be53206/LOUERS+-+Post+6.3+-+Formula+1+Race+-+Right+-+v1.jpg',
          '71448157-fe0f-45c5-aa40-752a880192d1/LOUERS+-+Post+15+-+Beach+Bed+-+v1.jpg',
          '31b3f6ba-1858-4202-8d55-40eff7915047/LOUERS+-+Post+10+-+Woman+on+Beach+-+v3.jpg',
          '3a4beff2-b6a4-44f6-b708-ee3e2a35f886/LOUERS+-+Post+16+-+Carlton+Hotel+Cannes+-+v4.jpg',
          '06d88737-8a67-4613-a3a3-16ef5c75517e/LOUERS+-+Post+6.2+-+Formula+1+Racing+Outfit+-+v1.jpg',
          '0577232b-4808-4c7b-af2b-209e95640be5/LOUERS+-+Post+13+-+Swing+-+v1.jpg',
          'a8aa7e2b-91e3-49e9-97ef-91907ae697cc/LOUERS+-+Post+12+-+Martini+Tower+-+v8.jpg',
          '08b95935-55a3-46d7-b955-3d2e87365844/LOUERS+-+Post+18+-+Beach+Club+-+v4.jpg',
        ) },
      { title: 'Life on Water', text: 'Thema “Life on Water” is een zeiltocht langs de mooiste zeeën, bezienswaardigheden en uitzichten. Genieten van de reis, en zeilen met LOUERS.', images: c(
          'fe015d30-2b34-4d54-b620-09240f2931bb/LOUERS+-+Post+2+-+Anchor+-+v5.jpg',
          '7df816f6-cfcf-42ce-a0c3-e37f8854d6c5/LOUERS+-+Post+9+-+Lighthouse+-+v1.jpg',
          'fb4646d4-2f5e-4938-a2bf-dc98e971587f/LOUERS+-+Post+13+-+Balloons+-+v1.jpg',
          'b0cb07d8-6840-4cf4-8761-6ce18210f7ec/LOUERS+-+Post+3+-+Captain+-+v2.jpg',
          '5d6b8183-dae3-4e70-b81b-b862a0f421b2/LOUERS+-+Post+10+-+Private+Yacht+-+v3.jpg',
          '7a7dbad7-8826-4980-a861-baa40c6ef218/LOUERS+-+Post+18+-+Sailing+Bottle+-+v4.jpg',
          'e7762c3a-5752-4155-9546-4becb6479b4a/LOUERS+-+Post+5+-+Jetski+-+v1.jpg',
          '5701c9e8-ff2d-4c32-99e5-f08e5fcb22ff/LOUERS+-+Post+11-+Giftbox+-+v2.jpg',
          '3f1af6ac-cf9f-438b-89af-329faa4c02f3/LOUERS+-+Post+20+-+Island+Bottle+-+v2.jpg',
          'a4dbd8f9-0367-4924-9313-580b48242151/LOUERS+-+Post+7+-+Floating+Bottle+-+v3.jpg',
          '29597937-a339-4aea-9c94-bb5f001da9d6/LOUERS+-+Post+17+-+Yacht+with+Pool+-+v4.jpg',
          '5438df33-9bbe-444e-9b05-78e7f025eeb5/LOUERS+-+Post+12+-+Buoys+-+v4.jpg',
        ) },
      { title: 'Space Program', text: 'Thema “Space Program” brengt LOUERS Vodka naar de ruimte. Zwevende flessen, vallende sterren en meer: de meest bijzondere reis die je ooit maakt.', images: c('25efae6e-f226-45fa-8aee-f7d1f30f77f0/LOUERS+-+Post+9+-+Shooting+Stars+-+v1.jpg') },
    ],
  },
  {
    slug: 'festival-zomerbries',
    title: 'Festival Zomerbries',
    category: 'Branding',
    client: 'Afstudeerproject',
    featured: true,
    summary:
      'Een van de tofste projecten tot nu toe: een compleet festivalmerk, helemaal vanaf nul, als onderdeel van mijn eindexamen. Festival Zomerbries brengt bekende Nederlandse artiesten uit allerlei genres samen. Ik ontwierp alles: het logo, het brandbook, de website en mock-ups voor producten en merch. Fris, kleurrijk en gemaakt om op te dansen.',
    images: c(
      '86282a8c-6720-499f-bcf5-ace3f66df518/Logo+Concept+Design+v7+Final+with+background.png',
      '92cd1521-53f7-47ca-857a-368b57921f22/Business+Card+Mock-up.png',
      '2e2b0f57-aee8-4f18-bf73-f2770d05eb89/Map+Mock-up.png',
      '15df62e8-c17b-4778-bf2a-f9700c166a66/Briefpapier+Mock-up.png',
      '99bf2227-ae86-459a-97df-710206bb9531/Business+Extra+Mock-up+JPEG.jpg',
      '7016b4b9-0bfa-4ea2-867e-40f0aa8a327f/Card+Holder+Mock-up+JPEG.jpg',
      '2c387360-4c13-44fc-9b42-7fa77d3b744b/T-Shirt+Mock-up+JPEG.jpg',
      '7ce2e28b-47b8-419b-83a6-ded6bfedfe00/Business+Mock-up.png',
      '2e7f9a49-7698-447c-92ee-e257c314c68c/Poster+Mock-up+JPEG.jpg',
      '9c270263-61d7-4f5d-ad1d-fd16ae947b14/Bucket+Hat+Mock-up.png',
      'c4269f3e-cf20-4adf-a7cd-4cecee0a17ab/Bottle+Mock-up.png',
    ),
  },
  {
    slug: 'boblo-island',
    title: 'Boblo Island',
    category: 'Illustratie',
    client: 'Geïllustreerd verhaal',
    featured: true,
    cover: CDN + '184432da-b86d-454e-be0d-3415ae3bb598/Illustratie+6+Final.png',
    summary:
      'Stap in… en verdwijn voorgoed. Boblo Island is een geïllustreerd verhaal met een twist. Geïnspireerd op het echte pretpark schreef ik een eigen verhaal over een mysterieus eiland, een enge achtbaan en vreemden die één voor één verdwijnen. De illustraties brengen de spanning tot leven, met precies genoeg nostalgie en onbehagen. Een beetje Goosebumps, maar dan vreemder.',
    images: c(
      '68f7f711-3fb1-4c65-a4e5-ef3d65f2c2f7/Cover+Final.png',
      'edf1a65a-c9ec-4efa-a372-9c21c715e1fa/Illustratie+1+Final.png',
      '5cb8cc16-48c9-4cd6-883c-30c31fc0883d/Illustratie+2+Final.png',
      '4c46f34d-4b26-4de7-b598-b7164ec1e6b7/Illustratie+3+Final.png',
      'b5f46122-94c0-48bb-a38f-2dda34fdc1cb/Illustratie+4+Final.png',
      'edb570b3-a26e-4362-9ecc-79e0f6a177d9/Illustratie+5+Final.png',
      '184432da-b86d-454e-be0d-3415ae3bb598/Illustratie+6+Final.png',
      '34b7646c-1324-4aa3-aee2-c307548092bc/Cover+Back+Final.png',
    ),
  },
  {
    slug: 'revenge-on-the-villagers',
    title: 'Revenge on the Villagers',
    category: 'Animatie',
    client: 'Eigen project',
    featured: true,
    video: 'https://youtu.be/4cZO-mN7ty8',
    cover: STATIC + '6516959f49540200987b79b2/65342a178b41b94fac529301/1751068550513/Thumbnail+.png',
    summary:
      'Een ode aan de beste game ooit: Minecraft. Een kort verhaal vanaf nul, met een flinke knipoog. Een villager ontsnapt van zijn vaste plek (slecht idee) en daarna loopt alles uit de hand. Elke pixel is met de hand geschilderd voor die typische blokkerige look, en elke animatie is speciaal voor deze film gemaakt. Een beetje dramatisch, vooral grappig, en een eerbetoon aan games die creativiteit aanwakkeren.',
    images: c('52f901cb-4239-4c04-ad3d-39c13b5fdeb1/Foto+1.png', '8e3fea15-748e-4da1-a2ad-9b8a86828f2a/Foto+2.png', '883f93e7-d25b-48c7-948d-5fd1922663ae/Foto+3.png'),
  },
  {
    slug: 'time-machine',
    title: 'Time Machine',
    category: 'Fotomanipulatie',
    client: 'Fotomanipulatie',
    featured: true,
    summary:
      'Een letterlijke reis door de tijd. Met oude foto’s van Costică Acsinte en een berg gevonden beeldmateriaal bouwde ik in Photoshop een visuele tijdmachine. Geen regels, geen grenzen: één dromerige collage waarin tijdperken door elkaar lopen. Een beetje rommelig, maar op de goede manier. Alsof je door een doos herinneringen bladert die niet van jou zijn, maar wel zo voelen.',
    images: c(
      '2d00dde6-01ae-4abc-b517-2a4def58282f/1.+Tijdmachine+-+V3.png',
      'e9403300-5106-45a6-91e8-cc68d460920a/1.+Tijdmachine+-+No+Effects.png',
      'e26cc5ed-b132-428d-8440-5a38f774ae04/1.+Tijdmachine+-+Photos+Used-01.png',
    ),
  },
  {
    slug: 'koala-crew',
    title: 'Koala Crew',
    category: 'Animatie',
    client: 'Discord-community',
    summary:
      'Een oud idee nieuw leven ingeblazen, en het werd een van de leukste communities die ik heb gebouwd. Koala Crew is een eigen Discord-server waar mensen hun eigen digitale koala redden, voeren en verzorgen. Met een zelfgebouwde bot en volgestopt met illustraties en animaties. Gezellig, een tikje gek en vol koala-karakter.',
    images: c(
      'f996b679-8acb-414a-b9e4-2b1dfd18a609/Koala+Animation+v2.gif',
      'd30a11f9-b8e3-464b-b048-c15dcf53e90a/Shop+Animation+v1.gif',
      'c5596d63-309d-4b38-a0ad-6e5ef03cd416/ding.gif',
      'e0f2da40-61ad-42ea-95fc-f768b90982c1/ezgif.com-resize.gif',
    ),
  },
  {
    slug: 'moonwave',
    title: 'Moonwave',
    category: 'Branding',
    client: 'Kledingmerk (concept)',
    summary:
      'Kosmisch, maar met beide benen op de grond. Moonwave was mijn passieproject: een gedurfd kledingmerk dat dromerige beelden combineert met streetwear. Van logo tot lookbook, alles moest fris, stijlvol en een tikje buitenaards voelen. Het merk is nooit gelanceerd, maar de branding maken was een feest.',
    images: c(
      'c81c7f70-8d96-4145-87f8-aebba2aaf0cb/2.+Moonwave+-+Word+Mark+-+White.png',
      'eb7964cd-ed70-4965-b96f-e7280713ea03/2.+Moonwave+-+Logo+Mark+-+White.png',
      '3c9baa1d-9085-4fa1-b73e-f133d9aeeb48/4.+Moonwave+-+Word+Mark+-+Blue.png',
      'd5f4fdfb-1903-4c88-9f6a-eb6e320684a3/4.+Moonwave+-+Logo+Mark+-+Blue.png',
      '00084d2a-fcdb-4ba9-b628-7b912040721e/5.+Moonwave+-+Word+Mark+-+Pink.png',
      'eb7270f6-302e-412f-81c4-7b94687e1523/5.+Moonwave+-+Logo+Mark+-+Pink.png',
      'c5ca17f9-7191-457f-bbbb-bb617f3c70e1/3.+Moonwave+-+Word+Mark+-+Purple.png',
      'a13a93d1-f2c5-442b-8a90-6c440926c212/3.+Moonwave+-+Logo+Mark+-+Purple.png',
      '018d7069-7ccf-4f2e-9436-0c574a691900/16.+Moonwave+-+Word+Mark+-+Square+-+Black.png',
      '7d1c2397-f3ca-42fb-a4ce-c8b5306e97cb/Reference+Image.jpg',
    ),
  },
  {
    slug: 'masked-world',
    title: 'Masked World',
    category: 'Fotomanipulatie',
    client: 'Posterontwerp',
    summary:
      'Geschiedenis en design komen samen in deze poster voor de maskertentoonstelling van het Tropenmuseum. Geïnspireerd door culturen en tradities van over de hele wereld koos ik voor een Vikingmasker: helm, mythologie en een flinke dosis ‘niet mee sollen’. Wat begon als schets werd een gedetailleerde poster waarin verhaal en stijl samenkomen. Stoer, historisch, en hij hangt goed aan de muur.',
    images: c(
      '8b15f987-d7ca-4004-bf5e-5792fc756fc6/Masked+World+Odin+Viking+Mask+Poster+Website+Joost+2Ma.jpg',
      'c9fcf7f5-00d7-4860-bf4c-65ea60e6d459/Masked+World+Odin+Viking+Mask+No+Effects+vs+Effects+Joost+2Ma.png',
      '92ae894b-3d64-4f7c-8447-3a4283a1ecf9/Masked+World+Odin+Viking+Mask+Illustrator+Sketch+Joost+2Ma.png',
    ),
  },
  {
    slug: 'halloween',
    title: 'Halloween',
    category: 'Fotomanipulatie',
    client: 'Ontwerpchallenge',
    summary:
      'Voor een Halloween-designchallenge van Benny Productions maakte ik een spookhuis op wielen. Met alleen een set aangeleverde beelden en veel fantasie bouwde ik een surrealistische wereld vol griezelige charme. Photoshop-magie meets spookachtige roadtrip. Het resultaat: donker, speels en precies genoeg eng.',
    images: c('3ee58565-b41f-45fa-96e9-401f75c087ae/Halloween+Edit+v6.png', 'e2b48d34-1096-41e6-a0ee-fc39cb4a8ec9/Halloween+No+Edits.jpg'),
  },
  {
    slug: 'hackie',
    title: 'Hackie',
    category: 'Branding',
    client: 'Eigen merk',
    cover: STATIC + '6516959f49540200987b79b2/6516959f49540200987b7a46/1696873930040/ezgif.com-video-to-gif.gif',
    summary:
      'Hackie begon als passieproject: een manier om weer actief te worden op social media, met beelden die echt opvallen. Na stapels schetsen, concepten en animatie-ideeën stond er een eigen identiteit met gedurfde, eigenzinnige visuals, gebruikt op YouTube en Twitch. Branding en motion design in één.',
    images: [STATIC + '6516959f49540200987b79b2/6516959f49540200987b7a46/1696873930040/ezgif.com-video-to-gif.gif'],
  },
  {
    slug: 'showreel',
    title: 'Showreel',
    category: 'Videomontage',
    client: 'Vystara Studios',
    featured: true,
    video: 'https://youtu.be/0ycl_c_l91k',
    cover: 'https://i.ytimg.com/vi/0ycl_c_l91k/maxresdefault.jpg',
    summary:
      'Mijn werk in één video: animatie, illustratie, fotomanipulatie en montage, gesneden op het ritme van de muziek. Vystara Studios in een notendop.',
    images: [],
    story: [
      { title: 'Waar de naam vandaan komt', text: 'Vystara is een variatie op ‘Vistara’, wat ‘weidsheid’ of ‘grenzeloos’ betekent. Zo kijk ik naar design: open, vol mogelijkheden en een beetje eigenwijs.' },
      { title: 'Het logo', text: 'Een ster met een vlammetje en een staart als van een komeet: een idee dat inslaat en blijft branden. De letters zijn eigenwijs gevormd, net als het werk zelf.' },
      { title: 'Waar ik voor sta', text: 'Speels waar het kan, strak waar het moet. Geen standaardtemplates, wel ontwerp dat bij je past en dat mensen laat stoppen met scrollen.' },
    ],
    extraVideos: [{ title: 'Waar het begon', text: 'De allereerste showreel van Vystara Studios.', url: 'https://youtu.be/AwS6FmGw43Y' }],
  },
];

/** Teksten van de site, in het Nederlands. */
export const LEGACY_COPY = {
  tagline: 'Design zonder grenzen.',
  intro:
    'Vystara Studios is een ontwerpstudio voor merken die niet op de rest willen lijken. Ik maak animaties, illustraties, merkidentiteiten en video’s die opvallen, kloppen en bij je passen.',
  about: [
    'Ik ben eigenaar van Vystara Studios: een frisse ontwerpstudio, gebouwd op nieuwsgierigheid, kleur en af en toe een brainstorm op een flinke dosis koffie.',
    'Na mijn opleiding wist ik één ding zeker: ik ging niet wachten op ‘de perfecte baan’. Ik wilde iets van mezelf bouwen. Dus dat deed ik.',
    'Vystara draait om creatieve vrijheid. De naam is een variatie op ‘Vistara’, wat ‘weidsheid’ of ‘grenzeloos’ betekent. Zo kijk ik naar design: open, vol mogelijkheden en een beetje eigenwijs.',
    'Hier komen speels en doelgericht samen. Merken mogen plezier hebben, hun karakter laten zien en er tegelijk strak uitzien. Of je nu een identiteit vanaf nul nodig hebt of je huidige merk een flinke upgrade verdient: ik denk graag mee.',
  ],
  why: [
    'Design moet leuk zijn, doordacht, en helemaal passen bij de mensen erachter. Daarom bestaat Vystara.',
    'Ik maak identiteiten die als thuis voelen: niet alleen verzorgd en professioneel, maar herkenbaar jij. Eerst luister ik naar je verhaal, je sfeer en je doelen. Daarna vertaal ik dat naar beeld dat klikt.',
    'Geen standaardtemplates, geen one-size-fits-all. Gewoon doordacht ontwerp waarmee je je publiek bereikt en met trots naar buiten treedt.',
  ],
  whatWeDo:
    'Van animatie en illustratie tot branding en videomontage: ik breng ideeën tot leven met kleur, beweging en een vleugje magie. Iets geks in gedachten? Graag.',
  social:
    'Meer dan 15.000 volgers, 2,15 miljoen views en ruim 100.000 likes. Ik weet hoe je opvalt in een tijdlijn, en hoe je zorgt dat mensen terugkomen.',
  connect:
    'Een project in gedachten, een idee dat tot leven moet komen of gewoon even hallo zeggen? Groot of klein, ik hoor het graag. Stuur een berichtje, dan kijken we samen wat we kunnen maken.',
  email: 'vystara.studios@gmail.com',
  socials: {
    tiktok: 'https://www.tiktok.com/@vystara.studios',
    youtube: 'https://www.youtube.com/@VystaraStudios',
    instagram: 'https://www.instagram.com/vystara.studios',
  },
};
