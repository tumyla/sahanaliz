// openings-info.js — short strategic notes for common opening families (5 languages).
import { getLang } from './i18n.js';

const FAMILIES = [
  { m: ['sicilian'], d: {
    tr: 'Siyahın 1.e4\u2019e en keskin yanıtı. Siyah merkezde simetriyi bozar, vezir kanadında karşı oyun ve kazanma şansı arar.',
    en: 'Black\u2019s sharpest reply to 1.e4. Black breaks symmetry and seeks queenside counterplay and winning chances.',
    de: 'Schwarzes schärfste Antwort auf 1.e4. Schwarz bricht die Symmetrie und sucht Gegenspiel am Damenflügel.',
    fr: 'La réponse la plus tranchante à 1.e4. Les Noirs brisent la symétrie et cherchent du contre-jeu à l\u2019aile dame.',
    es: 'La respuesta más aguda a 1.e4. Las negras rompen la simetría y buscan contrajuego en el flanco de dama.' } },
  { m: ['ruy lopez', 'spanish'], d: {
    tr: 'Klasik bir açılış: beyaz fili b5\u2019e koyar, siyahın at savunmasını baskılayıp uzun vadeli konumsal baskı kurar.',
    en: 'A classic: White\u2019s bishop on b5 pressures Black\u2019s knight and builds long-term positional pressure.',
    de: 'Ein Klassiker: Der Läufer auf b5 setzt den Springer unter Druck und baut langfristigen Stellungsdruck auf.',
    fr: 'Un classique : le fou en b5 met la pression sur le cavalier et installe une pression positionnelle durable.',
    es: 'Un clásico: el alfil en b5 presiona el caballo y crea presión posicional a largo plazo.' } },
  { m: ['italian', 'giuoco', 'two knights'], d: {
    tr: 'Fil c4\u2019te f7\u2019yi hedefler. Hızlı gelişim ve merkez kontrolüne dayanan, hem sakin hem keskin oynanabilen klasik açılış.',
    en: 'The bishop on c4 eyes f7. A classic based on fast development and the center, playable calmly or sharply.',
    de: 'Der Läufer auf c4 zielt auf f7. Ein Klassiker mit schneller Entwicklung und Zentrumskontrolle.',
    fr: 'Le fou en c4 vise f7. Un classique fondé sur le développement rapide et le centre.',
    es: 'El alfil en c4 apunta a f7. Un clásico basado en el desarrollo rápido y el centro.' } },
  { m: ['french'], d: {
    tr: 'Siyah sağlam ama biraz kapalı bir yapı seçer; c5 ile merkeze vurup vezir kanadında oyun arar. Açık fil zayıf kalabilir.',
    en: 'Black chooses a solid but slightly cramped structure, striking with c5 and seeking queenside play; the light bishop can be passive.',
    de: 'Schwarz wählt eine solide, etwas beengte Struktur, schlägt mit c5 und sucht Damenflügelspiel.',
    fr: 'Les Noirs adoptent une structure solide mais un peu à l\u2019étroit, frappent par c5 ; le fou de cases claires peut rester passif.',
    es: 'Las negras eligen una estructura sólida pero algo apretada, golpean con c5; el alfil de casillas claras puede quedar pasivo.' } },
  { m: ['caro-kann', 'caro kann'], d: {
    tr: 'Sağlam ve güvenilir bir savunma: siyah merkeze c6-d5 ile karşı çıkar, sağlam piyon yapısı ve aktif fil korur.',
    en: 'Solid and reliable: Black challenges the center with c6-d5 while keeping a sound pawn structure and an active bishop.',
    de: 'Solide und zuverlässig: Schwarz fordert das Zentrum mit c6-d5 und behält eine gesunde Bauernstruktur.',
    fr: 'Solide et fiable : les Noirs contestent le centre par c6-d5 tout en gardant une bonne structure.',
    es: 'Sólida y fiable: las negras desafían el centro con c6-d5 manteniendo una buena estructura.' } },
  { m: ['scandinavian', 'center counter'], d: {
    tr: 'Siyah 1...d5 ile hemen merkeze vurur. Erken vezir çıkışı tempo kaybettirebilir ama yapı sağlam ve plan nettir.',
    en: 'Black hits the center at once with 1...d5. The early queen sortie can cost tempo, but the structure is sound and clear.',
    de: 'Schwarz schlägt sofort mit 1...d5 im Zentrum. Der frühe Damenausfall kann Tempo kosten, die Struktur ist solide.',
    fr: 'Les Noirs frappent le centre d\u2019emblée par 1...d5. La sortie précoce de la dame peut coûter du temps, mais la structure est saine.',
    es: 'Las negras golpean el centro de inmediato con 1...d5. La salida temprana de la dama puede costar tiempo, pero la estructura es sólida.' } },
  { m: ["queen's gambit", 'queens gambit', 'slav', 'semi-slav'], d: {
    tr: 'Beyaz c4 ile siyahın d5 merkezine baskı yapar. Konumsal, merkez ve gelişim üzerine kurulu en klasik 1.d4 açılışı.',
    en: 'White pressures Black\u2019s d5 with c4. The most classical 1.d4 opening, built on the center and development.',
    de: 'Weiß setzt mit c4 das schwarze d5 unter Druck. Die klassischste 1.d4-Eröffnung, auf Zentrum und Entwicklung gebaut.',
    fr: 'Les Blancs pressent le d5 noir par c4. L\u2019ouverture 1.d4 la plus classique, fondée sur le centre et le développement.',
    es: 'Las blancas presionan el d5 negro con c4. La apertura 1.d4 más clásica, basada en el centro y el desarrollo.' } },
  { m: ['london'], d: {
    tr: 'Beyaz fili f4\u2019e koyup sağlam, ezbere yakın bir kurulum yapar. Güvenli, sistematik ve her şeye karşı oynanabilir.',
    en: 'White sets up solidly with the bishop on f4 — a safe, systematic setup playable against almost anything.',
    de: 'Weiß stellt solide mit dem Läufer auf f4 auf — ein sicheres, systematisches Aufbauschema.',
    fr: 'Les Blancs s\u2019installent solidement avec le fou en f4 — un schéma sûr et systématique.',
    es: 'Las blancas se arman sólidamente con el alfil en f4: un esquema seguro y sistemático.' } },
  { m: ['zukertort', "queen's pawn", 'queens pawn', 'réti', 'reti'], d: {
    tr: 'Esnek bir 1.d4/Af3 kurulumu: beyaz erken taahhütten kaçınır, gelişimini tamamlayıp merkezi sonra belirler.',
    en: 'A flexible 1.d4/Nf3 setup: White avoids early commitment, completes development and defines the center later.',
    de: 'Ein flexibles 1.d4/Sf3-System: Weiß vermeidet frühe Festlegung und bestimmt das Zentrum später.',
    fr: 'Un système souple 1.d4/Cf3 : les Blancs évitent de s\u2019engager tôt et définissent le centre plus tard.',
    es: 'Un sistema flexible 1.d4/Cf3: las blancas evitan comprometerse pronto y definen el centro después.' } },
  { m: ["king's indian", 'kings indian'], d: {
    tr: 'Siyah merkezi beyaza bırakıp fianketto fili ve ...e5/...f5 ile şah kanadında karşı saldırı hazırlar. Keskin ve iddialı.',
    en: 'Black cedes the center, fianchettoes and prepares a kingside attack with ...e5/...f5. Sharp and ambitious.',
    de: 'Schwarz überlässt das Zentrum, fianchettiert und bereitet mit ...e5/...f5 einen Königsangriff vor.',
    fr: 'Les Noirs cèdent le centre, font le fianchetto et préparent une attaque à l\u2019aile roi par ...e5/...f5.',
    es: 'Las negras ceden el centro, hacen fianchetto y preparan un ataque en el flanco de rey con ...e5/...f5.' } },
  { m: ['nimzo-indian', 'nimzo indian'], d: {
    tr: 'Siyah fb4 ile atı çivileyip beyazın piyon yapısını bozmayı hedefler. Konumsal derinliği yüksek, saygın bir savunma.',
    en: 'Black pins the knight with ...Bb4, aiming to damage White\u2019s pawn structure. A deeply positional, respected defense.',
    de: 'Schwarz fesselt mit ...Lb4 den Springer und will die Bauernstruktur beschädigen. Eine tiefe, angesehene Verteidigung.',
    fr: 'Les Noirs clouent le cavalier par ...Fb4 pour abîmer la structure blanche. Une défense positionnelle réputée.',
    es: 'Las negras clavan el caballo con ...Ab4 para dañar la estructura blanca. Una defensa posicional muy respetada.' } },
  { m: ['grünfeld', 'grunfeld', 'gruenfeld'], d: {
    tr: 'Siyah beyazın büyük merkezine izin verip onu uzaktan (fianketto + ...d5) hedef alır. Dinamik ve teorik.',
    en: 'Black allows a big White center, then attacks it from afar (fianchetto + ...d5). Dynamic and theory-heavy.',
    de: 'Schwarz lässt ein großes Zentrum zu und greift es aus der Ferne an (Fianchetto + ...d5). Dynamisch und theorielastig.',
    fr: 'Les Noirs laissent un grand centre puis l\u2019attaquent de loin (fianchetto + ...d5). Dynamique et théorique.',
    es: 'Las negras permiten un gran centro y lo atacan desde lejos (fianchetto + ...d5). Dinámica y teórica.' } },
  { m: ['english'], d: {
    tr: 'Beyaz 1.c4 ile kanat açılışı oynar; esnek, çoğu zaman fianketto ve yavaş konumsal kuşatmaya dayanır.',
    en: 'White plays a flank opening with 1.c4; flexible, often with a fianchetto and slow positional squeezing.',
    de: 'Weiß spielt mit 1.c4 eine Flankeneröffnung; flexibel, oft mit Fianchetto und langsamem Positionsdruck.',
    fr: 'Les Blancs jouent une ouverture de flanc par 1.c4 ; souple, souvent avec fianchetto et pression lente.',
    es: 'Las blancas juegan una apertura de flanco con 1.c4; flexible, a menudo con fianchetto y presión lenta.' } },
  { m: ['pirc', 'modern defense'], d: {
    tr: 'Siyah fianketto fili ardına gizlenip merkezi sonra hedef alır. Esnek ama beyaza erken alan bırakır.',
    en: 'Black hides behind a fianchetto and counters the center later. Flexible, but cedes early space to White.',
    de: 'Schwarz versteckt sich hinter einem Fianchetto und greift das Zentrum später an. Flexibel, gibt aber früh Raum.',
    fr: 'Les Noirs se cachent derrière un fianchetto et contrent le centre plus tard. Souple, mais cèdent de l\u2019espace tôt.',
    es: 'Las negras se esconden tras un fianchetto y contraatacan el centro después. Flexible, pero ceden espacio pronto.' } },
  { m: ['scotch'], d: {
    tr: 'Beyaz erken d4 ile merkezi açar, hızlı gelişim ve açık oyun arar. Net planlı, saldırgan bir 1.e4 açılışı.',
    en: 'White opens the center early with d4 for fast development and open play. A clear-plan, aggressive 1.e4 opening.',
    de: 'Weiß öffnet früh mit d4 das Zentrum für schnelle Entwicklung und offenes Spiel.',
    fr: 'Les Blancs ouvrent tôt le centre par d4 pour un développement rapide et un jeu ouvert.',
    es: 'Las blancas abren pronto el centro con d4 para un desarrollo rápido y juego abierto.' } },
  { m: ['vienna'], d: {
    tr: 'Beyaz Ac3 ile esnek bir kurulum yapar; çoğu zaman f4 ile şah kanadında saldırı hazırlar.',
    en: 'White develops flexibly with Nc3, often preparing a kingside attack with f4.',
    de: 'Weiß entwickelt flexibel mit Sc3 und bereitet oft mit f4 einen Königsangriff vor.',
    fr: 'Les Blancs développent souplement par Cc3, préparant souvent une attaque à l\u2019aile roi par f4.',
    es: 'Las blancas desarrollan con Cc3, preparando a menudo un ataque en el flanco de rey con f4.' } },
  { m: ['petrov', 'russian game', 'petroff'], d: {
    tr: 'Siyah simetriyle eşitliği hedefler (...Af6). Sağlam ve dengeli; beraberliğe yatkın ama güvenli.',
    en: 'Black seeks equality through symmetry (...Nf6). Solid and balanced; drawish but safe.',
    de: 'Schwarz strebt durch Symmetrie Ausgleich an (...Sf6). Solide und ausgeglichen.',
    fr: 'Les Noirs cherchent l\u2019égalité par la symétrie (...Cf6). Solide et équilibré.',
    es: 'Las negras buscan la igualdad por simetría (...Cf6). Sólida y equilibrada.' } },
  { m: ['philidor'], d: {
    tr: 'Siyah ...d6 ile sağlam ama pasif bir kurulum seçer. Güvenli fakat beyaza alan ve inisiyatif bırakır.',
    en: 'Black chooses a solid but passive setup with ...d6. Safe, but gives White space and initiative.',
    de: 'Schwarz wählt mit ...d6 ein solides, aber passives Schema. Sicher, überlässt Weiß jedoch Raum.',
    fr: 'Les Noirs choisissent un schéma solide mais passif avec ...d6. Sûr, mais laisse de l\u2019espace aux Blancs.',
    es: 'Las negras eligen un esquema sólido pero pasivo con ...d6. Seguro, pero cede espacio a las blancas.' } },
  { m: ['dutch'], d: {
    tr: 'Siyah ...f5 ile şah kanadında alan ve saldırı hedefler. İddialı ama şahın etrafı hassas kalabilir.',
    en: 'Black grabs kingside space and attacking chances with ...f5. Ambitious, but can leave the king sensitive.',
    de: 'Schwarz nimmt mit ...f5 Königsflügelraum und Angriffschancen. Ehrgeizig, aber der König kann empfindlich bleiben.',
    fr: 'Les Noirs prennent de l\u2019espace et des chances d\u2019attaque à l\u2019aile roi par ...f5. Ambitieux, mais le roi peut rester fragile.',
    es: 'Las negras toman espacio y opciones de ataque en el flanco de rey con ...f5. Ambiciosa, pero el rey puede quedar débil.' } },
  { m: ['catalan'], d: {
    tr: 'Beyaz fianketto fili ve c4 ile uzun vadeli konumsal baskı kurar; sağlam ve modern bir 1.d4 silahı.',
    en: 'White combines a fianchetto with c4 for long-term positional pressure; a solid, modern 1.d4 weapon.',
    de: 'Weiß verbindet Fianchetto mit c4 für langfristigen Positionsdruck; eine solide, moderne 1.d4-Waffe.',
    fr: 'Les Blancs combinent fianchetto et c4 pour une pression durable ; une arme 1.d4 solide et moderne.',
    es: 'Las blancas combinan fianchetto con c4 para presión a largo plazo; un arma 1.d4 sólida y moderna.' } },
  { m: ["king's gambit", 'kings gambit'], d: {
    tr: 'Beyaz f-piyonunu feda ederek merkez ve hızlı saldırı arar. Romantik, çok keskin ve riskli bir açılış.',
    en: 'White sacrifices the f-pawn for the center and a fast attack. A romantic, very sharp and risky opening.',
    de: 'Weiß opfert den f-Bauern für Zentrum und schnellen Angriff. Eine romantische, sehr scharfe Eröffnung.',
    fr: 'Les Blancs sacrifient le pion f pour le centre et une attaque rapide. Une ouverture romantique très tranchante.',
    es: 'Las blancas sacrifican el peón f por el centro y un ataque rápido. Una apertura romántica muy aguda.' } },
];

const GENERIC = {
  e4: {
    tr: 'Açık oyun: beyaz merkezi alır ve hızlı gelişim ile inisiyatif arar.',
    en: 'Open game: White takes the center and seeks fast development and initiative.',
    de: 'Offenes Spiel: Weiß nimmt das Zentrum und sucht schnelle Entwicklung.',
    fr: 'Jeu ouvert : les Blancs prennent le centre et cherchent un développement rapide.',
    es: 'Juego abierto: las blancas toman el centro y buscan desarrollo rápido.' },
  d4: {
    tr: 'Kapalı oyun: beyaz sağlam bir merkez ve konumsal, manevra ağırlıklı bir oyun kurar.',
    en: 'Closed game: White builds a solid center and a positional, maneuvering game.',
    de: 'Geschlossenes Spiel: Weiß baut ein solides Zentrum und ein positionelles Spiel.',
    fr: 'Jeu fermé : les Blancs bâtissent un centre solide et un jeu positionnel.',
    es: 'Juego cerrado: las blancas construyen un centro sólido y un juego posicional.' },
  other: {
    tr: 'Kanat / hipermodern açılış: merkez doğrudan değil, taşlarla uzaktan kontrol edilir.',
    en: 'Flank / hypermodern opening: the center is controlled from afar with pieces rather than occupied.',
    de: 'Flanken- / hypermoderne Eröffnung: das Zentrum wird mit Figuren aus der Ferne kontrolliert.',
    fr: 'Ouverture de flanc / hypermoderne : le centre est contrôlé de loin par les pièces.',
    es: 'Apertura de flanco / hipermoderna: el centro se controla desde lejos con las piezas.' },
};

export function describeOpening(name, eco, firstSan) {
  const lang = getLang();
  const pick = (obj) => obj[lang] || obj.en;
  const n = (name || '').toLowerCase();
  for (const fam of FAMILIES) {
    if (fam.m.some((k) => n.includes(k))) return pick(fam.d);
  }
  const f = firstSan || '';
  if (f === 'e4') return pick(GENERIC.e4);
  if (f === 'd4') return pick(GENERIC.d4);
  if (f) return pick(GENERIC.other);
  return null;
}
