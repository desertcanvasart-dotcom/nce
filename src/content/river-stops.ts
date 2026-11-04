import type { Locale } from "@/i18n/routing";

/**
 * The stops along the Nile from Luxor to Aswan, and Abu Simbel beyond (Islam's destinations brief, 4 Nov 2026). One
 * source for the destinations hub (/destinations/) and each destination's page. Spanish and Japanese were drafted by
 * Claude and need a native speaker's review. Empty fields (null) are never shown: visit lengths and our team's notes
 * are filled in as they are confirmed, and photos only once licensed (CONTENT-NEEDED #59).
 */
type Words = Record<Locale, string>;

export type RouteKey = "classic" | "dahabiya";
/** "Who stops where": what each route does at a stop. */
export type StopStatus = "yes" | "check" | "noLargeShips" | "notOnItinerary" | "optionalFromAswan" | "optionalSeparate";

export type RiverStop = {
  key: string;
  name: Words;
  /** Its destination page, when one is built; null for a stop shown only on the hub. */
  path: string | null;
  /** 1 to 7 along the river, sailing upstream; Abu Simbel (8) lies beyond, on Lake Nasser. */
  orderOnRiver: number;
  beyond: boolean;
  summary: Words;
  description: Words;
  mainSights: Record<Locale, string[]>;
  /** How long a visit usually takes; null until confirmed. */
  visitLength: Words | null;
  /** Best time of day, crowds, what to skip; null until our evaluation team writes it. */
  insiderNote: Words | null;
  /** A licensed photo of the place itself (never a boat), through the asset pipeline; null until there is one. */
  image: { src: string; width: number; height: number; alt: Words } | null;
  /** The link to its page, in words. */
  linkText: Words | null;
  /** The table's row label when it differs from the name ("Luxor sights"). */
  tableLabel: Words | null;
  routes: Record<RouteKey, StopStatus>;
  /** Highlighted on the map for each route; "end" marks where a route finishes without visiting the sights. */
  onMap: Record<RouteKey, "stop" | "end" | null>;
  /** Words that name it in an itinerary's day titles (older spellings included), to find the cruises that call here. */
  aliases: string[];
};

export const RIVER_STOPS: RiverStop[] = [
  {
    key: "luxor",
    name: { en: "Luxor", es: "Luxor", ja: "ルクソール" },
    path: "/destinations/luxor/",
    orderOnRiver: 1,
    beyond: false,
    summary: {
      en: "Ancient Thebes, with more monuments than anywhere else on the river.",
      es: "La antigua Tebas, con más monumentos que ningún otro lugar del río.",
      ja: "古代テーベ。ナイル川沿いで最も多くの遺跡が集まる場所です。",
    },
    description: {
      en: "Most classic cruises start or finish here. The east bank has the temples of Karnak and Luxor, while the west bank holds the Valley of the Kings and the Temple of Hatshepsut.",
      es: "La mayoría de los cruceros clásicos empiezan o terminan aquí. En la orilla este están los templos de Karnak y Luxor; en la oeste, el Valle de los Reyes y el templo de Hatshepsut.",
      ja: "クラシッククルーズの多くはここで発着します。東岸にはカルナック神殿とルクソール神殿、西岸には王家の谷とハトシェプスト女王葬祭殿があります。",
    },
    mainSights: {
      en: ["Karnak Temple", "Luxor Temple", "Valley of the Kings", "Temple of Hatshepsut", "Colossi of Memnon"],
      es: ["Templo de Karnak", "Templo de Luxor", "Valle de los Reyes", "Templo de Hatshepsut", "Colosos de Memnón"],
      ja: ["カルナック神殿", "ルクソール神殿", "王家の谷", "ハトシェプスト女王葬祭殿", "メムノンの巨像"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: { en: "Explore Luxor’s temples", es: "Descubre los templos de Luxor", ja: "ルクソールの神殿を見る" },
    tableLabel: { en: "Luxor sights", es: "Lugares de Luxor", ja: "ルクソールの見どころ" },
    routes: { classic: "yes", dahabiya: "notOnItinerary" },
    onMap: { classic: "stop", dahabiya: null },
    aliases: ["luxor", "karnak", "valley of the kings", "west bank"],
  },
  {
    key: "esna",
    name: { en: "Esna", es: "Esna", ja: "エスナ" },
    path: null,
    orderOnRiver: 2,
    beyond: false,
    summary: {
      en: "A market town with a temple set below street level, and the start of the dahabiya route.",
      es: "Un pueblo de mercado con un templo por debajo del nivel de la calle, y el inicio de la ruta en dahabiya.",
      ja: "通りより低い位置に神殿が眠る市場町。ダハビヤの航路の起点でもあります。",
    },
    description: {
      en: "The Temple of Khnum sits about nine metres below the modern town, a short walk through its streets. Esna is also where most dahabiya cruises begin, south of the river’s lock.",
      es: "El templo de Jnum está unos nueve metros por debajo de la ciudad actual, a un corto paseo por sus calles. En Esna empiezan también la mayoría de los cruceros en dahabiya, al sur de la esclusa del río.",
      ja: "クヌム神殿は現在の町より約9メートル低い場所にあり、町の通りを少し歩けば着きます。エスナは、川の閘門の南側から出航するダハビヤ・クルーズの多くの起点でもあります。",
    },
    mainSights: {
      en: ["Temple of Khnum", "Esna town"],
      es: ["Templo de Jnum", "El pueblo de Esna"],
      ja: ["クヌム神殿", "エスナの町"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: null,
    tableLabel: null,
    routes: { classic: "check", dahabiya: "yes" },
    onMap: { classic: null, dahabiya: "stop" },
    aliases: ["esna", "khnum"],
  },
  {
    key: "el-kab",
    name: { en: "El Kab", es: "El Kab", ja: "エル・カブ" },
    path: null,
    orderOnRiver: 3,
    beyond: false,
    summary: {
      en: "Once a capital of Upper Egypt, and now a quiet stop for small boats.",
      es: "Antigua capital del Alto Egipto y hoy una parada tranquila para barcos pequeños.",
      ja: "かつての上エジプトの都。今は小型船が立ち寄る静かな場所です。",
    },
    description: {
      en: "El Kab has a temple to the vulture goddess Nekhbet and decorated tombs cut into the hillside, reached on foot through a small fishing village.",
      es: "El Kab tiene un templo dedicado a la diosa buitre Nejbet y tumbas decoradas excavadas en la ladera, a las que se llega a pie atravesando un pequeño pueblo de pescadores.",
      ja: "エル・カブには、ハゲワシの女神ネクベトの神殿と、丘の斜面に掘られた装飾墓があります。小さな漁村を抜けて歩いて向かいます。",
    },
    mainSights: {
      en: ["Temple of Nekhbet", "El Kab tombs"],
      es: ["Templo de Nejbet", "Tumbas de El Kab"],
      ja: ["ネクベト神殿", "エル・カブの墓"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: null,
    tableLabel: null,
    routes: { classic: "check", dahabiya: "yes" },
    onMap: { classic: null, dahabiya: "stop" },
    aliases: ["el kab", "elkab", "nekhbet"],
  },
  {
    key: "edfu",
    name: { en: "Edfu", es: "Edfu", ja: "エドフ" },
    path: "/destinations/edfu/",
    orderOnRiver: 4,
    beyond: false,
    summary: {
      en: "Home to the Temple of Horus, one of the best-preserved temples in Egypt.",
      es: "Aquí está el templo de Horus, uno de los mejor conservados de Egipto.",
      ja: "エジプトで最も保存状態の良い神殿のひとつ、ホルス神殿がある町です。",
    },
    description: {
      en: "Boats moor in town, and the temple is a short ride away, often by horse-drawn carriage. Its pylon, courtyards and dark inner halls show you how a complete Egyptian temple worked.",
      es: "Los barcos amarran en la ciudad y el templo queda a un corto trayecto, a menudo en coche de caballos. Su pilono, sus patios y sus oscuras salas interiores muestran cómo funcionaba un templo egipcio completo.",
      ja: "船は町に停泊し、神殿までは馬車で行くことが多い短い道のりです。塔門、中庭、薄暗い内部の広間から、完全な形のエジプト神殿の仕組みがよくわかります。",
    },
    mainSights: { en: ["Temple of Horus"], es: ["Templo de Horus"], ja: ["ホルス神殿"] },
    visitLength: { en: "About two hours", es: "Unas dos horas", ja: "約2時間" },
    insiderNote: null,
    image: null,
    linkText: {
      en: "Explore Edfu and the Temple of Horus",
      es: "Descubre Edfu y el templo de Horus",
      ja: "エドフとホルス神殿を見る",
    },
    tableLabel: null,
    routes: { classic: "yes", dahabiya: "yes" },
    onMap: { classic: "stop", dahabiya: "stop" },
    aliases: ["edfu", "temple of horus"],
  },
  {
    key: "gebel-silsila",
    name: { en: "Gebel Silsila", es: "Gebel Silsila", ja: "ゲベル・シルシラ" },
    path: null,
    orderOnRiver: 5,
    beyond: false,
    summary: {
      en: "A narrow stretch of river with ancient quarries, where large cruise ships don’t stop.",
      es: "Un tramo estrecho del río con canteras antiguas, donde los grandes cruceros no paran.",
      ja: "古代の石切り場が残る川幅の狭い一帯。大型クルーズ船は停泊しません。",
    },
    description: {
      en: "The Nile runs at its narrowest here, between sandstone cliffs. Ancient Egyptians cut stone here for many of their most famous temples, and you can often have the site almost to yourself.",
      es: "Aquí el Nilo alcanza su punto más estrecho, entre acantilados de arenisca. Los antiguos egipcios extrajeron de aquí la piedra de muchos de sus templos más famosos, y a menudo se puede recorrer el lugar casi en solitario.",
      ja: "ナイル川は砂岩の崖に挟まれ、ここで最も狭くなります。古代エジプト人はここで、名高い神殿の多くに使われた石を切り出しました。遺跡をほぼ独り占めできることもよくあります。",
    },
    mainSights: {
      en: ["Temple of Horemheb", "Sandstone quarries"],
      es: ["Templo de Horemheb", "Canteras de arenisca"],
      ja: ["ホルエムヘブの神殿", "砂岩の石切り場"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: null,
    tableLabel: null,
    routes: { classic: "noLargeShips", dahabiya: "yes" },
    onMap: { classic: null, dahabiya: "stop" },
    // The older spelling still finds itineraries written before the site settled on "Gebel Silsila".
    aliases: ["gebel silsila", "gebel silsileh", "silsila", "silsileh"],
  },
  {
    key: "kom-ombo",
    name: { en: "Kom Ombo", es: "Kom Ombo", ja: "コム・オンボ" },
    path: "/destinations/kom-ombo/",
    orderOnRiver: 6,
    beyond: false,
    summary: {
      en: "A rare double temple, right on a bend in the river.",
      es: "Un templo doble poco común, justo en un meandro del río.",
      ja: "川の湾曲部に建つ、珍しい二重神殿。",
    },
    description: {
      en: "The temple is dedicated to two gods, Sobek and Horus the Elder, with a matching set of halls and sanctuaries for each. The nearby Crocodile Museum displays mummified crocodiles found in the region.",
      es: "El templo está dedicado a dos dioses, Sobek y Horus el Viejo, con salas y santuarios gemelos para cada uno. El cercano Museo del Cocodrilo expone cocodrilos momificados hallados en la zona.",
      ja: "神殿はセベク神と大ホルス神の二柱に捧げられ、それぞれに対になった広間と至聖所があります。近くのワニ博物館では、この地域で見つかったワニのミイラを展示しています。",
    },
    mainSights: {
      en: ["Temple of Kom Ombo", "Crocodile Museum"],
      es: ["Templo de Kom Ombo", "Museo del Cocodrilo"],
      ja: ["コム・オンボ神殿", "ワニ博物館"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: { en: "Explore Kom Ombo", es: "Descubre Kom Ombo", ja: "コム・オンボを見る" },
    tableLabel: null,
    routes: { classic: "yes", dahabiya: "yes" },
    onMap: { classic: "stop", dahabiya: "stop" },
    aliases: ["kom ombo", "crocodile museum"],
  },
  {
    key: "aswan",
    name: { en: "Aswan", es: "Asuán", ja: "アスワン" },
    path: "/destinations/aswan/",
    orderOnRiver: 7,
    beyond: false,
    summary: {
      en: "Granite islands, Nubian culture and the end of the classic route.",
      es: "Islas de granito, cultura nubia y el final de la ruta clásica.",
      ja: "花崗岩の島々とヌビア文化。クラシックな航路の終点です。",
    },
    description: {
      en: "The river runs between granite islands and desert here, and it’s the best place for a felucca sail. Philae Temple and the High Dam are the usual visits.",
      es: "Aquí el río corre entre islas de granito y desierto, y es el mejor lugar para navegar en faluca. Las visitas habituales son el templo de Filae y la Presa Alta.",
      ja: "川は花崗岩の島々と砂漠の間を流れ、ファルーカでの帆走に最適な場所です。定番の見学先はフィラエ神殿とアスワン・ハイ・ダムです。",
    },
    mainSights: {
      en: ["Philae Temple", "High Dam", "Felucca sail on the Nile"],
      es: ["Templo de Filae", "Presa Alta", "Paseo en faluca por el Nilo"],
      ja: ["フィラエ神殿", "アスワン・ハイ・ダム", "ナイル川のファルーカ帆走"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: { en: "Things to do in Aswan", es: "Qué hacer en Asuán", ja: "アスワンの見どころ" },
    tableLabel: { en: "Aswan sights", es: "Lugares de Asuán", ja: "アスワンの見どころ" },
    routes: { classic: "yes", dahabiya: "notOnItinerary" },
    onMap: { classic: "stop", dahabiya: "end" },
    aliases: ["aswan", "philae", "high dam"],
  },
  {
    key: "abu-simbel",
    name: { en: "Abu Simbel", es: "Abu Simbel", ja: "アブ・シンベル" },
    path: "/destinations/abu-simbel/",
    orderOnRiver: 8,
    beyond: true,
    summary: {
      en: "Ramesses II’s great rock-cut temples, on the shore of Lake Nasser.",
      es: "Los grandes templos excavados en la roca de Ramsés II, a orillas del lago Nasser.",
      ja: "ナセル湖のほとりに建つ、ラムセス2世の巨大な岩窟神殿。",
    },
    description: {
      en: "Abu Simbel lies far south of Aswan and isn’t on a Luxor–Aswan cruise. Most people visit on a day trip from Aswan, while some ships cruise Lake Nasser and moor beside the temples.",
      es: "Abu Simbel está mucho más al sur de Asuán y no forma parte de un crucero Luxor–Asuán. La mayoría lo visita en una excursión de un día desde Asuán, y algunos barcos navegan por el lago Nasser y amarran junto a los templos.",
      ja: "アブ・シンベルはアスワンのはるか南にあり、ルクソール〜アスワンのクルーズには含まれません。多くの人はアスワンからの日帰りで訪れ、ナセル湖を巡る船で神殿のそばに停泊することもできます。",
    },
    mainSights: {
      en: ["Great Temple of Ramesses II", "Temple of Nefertari"],
      es: ["Gran Templo de Ramsés II", "Templo de Nefertari"],
      ja: ["ラムセス2世大神殿", "ネフェルタリ神殿"],
    },
    visitLength: null,
    insiderNote: null,
    image: null,
    linkText: { en: "Explore Abu Simbel", es: "Descubre Abu Simbel", ja: "アブ・シンベルを見る" },
    tableLabel: null,
    routes: { classic: "optionalFromAswan", dahabiya: "optionalSeparate" },
    onMap: { classic: null, dahabiya: null },
    aliases: ["abu simbel"],
  },
];

export const stopByPath = (path: string) => RIVER_STOPS.find((s) => s.path === path);

/** The stops before and after one along the river (Abu Simbel included), each nearest with a page of its own. */
export function riverNeighbours(stop: RiverStop): { previous: RiverStop | null; next: RiverStop | null } {
  const i = RIVER_STOPS.indexOf(stop);
  const withPage = (xs: RiverStop[]) => xs.find((s) => s.path) ?? null;
  return { previous: withPage(RIVER_STOPS.slice(0, i).reverse()), next: withPage(RIVER_STOPS.slice(i + 1)) };
}

/** Every page a destination page may link to as a neighbour on the river (for the silo link check). */
export const RIVER_NEIGHBOUR_LINKS: Record<string, string[]> = Object.fromEntries(
  RIVER_STOPS.filter((s) => s.path).map((s) => {
    const { previous, next } = riverNeighbours(s);
    return [s.path!, [previous?.path, next?.path].filter((p): p is string => !!p)];
  }),
);

/** Each vessel's active itineraries (by vessel id) with their English day titles, as the catalogue gives them. */
export type ItineraryPlaces = Record<string, { origin: string; destination: string; places: string[] }[]>;

/** Lake Nasser routes don't count as Luxor–Aswan examples. */
const LAKE = /abu simbel|lake nasser/i;
export const onLakeNasser = (it: { origin: string; destination: string }) => LAKE.test(it.origin) || LAKE.test(it.destination);

/**
 * Whether an itinerary calls at a stop: its day titles name it, or it starts or ends there. An itinerary whose days
 * aren't written yet only counts at its two ends, so nothing is claimed that its programme doesn't show.
 */
export function callsAt(it: { origin: string; destination: string; places?: string[] }, stop: RiverStop): boolean {
  const named = (text: string) => stop.aliases.some((a) => text.toLowerCase().includes(a));
  return named(it.origin) || named(it.destination) || (it.places ?? []).some(named);
}

/** A vessel's itineraries with their day titles when the catalogue has them, else as listed (ends only). */
export const itinerariesOf = (
  v: { id: string; itineraries: { origin: string; destination: string }[] },
  places: ItineraryPlaces,
) => places[v.id] ?? v.itineraries;
