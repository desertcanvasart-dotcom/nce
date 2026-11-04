import type { VesselProfile } from "@/components/ds/lib/vessel-profile";
import type { VesselType } from "@/components/ds/lib/types";
import type { Locale } from "@/i18n/routing";

/**
 * What each vessel type is like (DATA-009, ADR-096, ADR-106): editorial text, loaded into Sanity as `vesselTypeProfile`
 * documents. Cabins and guests are the type's general range (Islam's vessels brief, 3 Nov 2026), not the catalogue's
 * figures, so every page that shows a type card or the comparison says the same. Each vessel's page shows its own.
 * `priceRange` stays null until there are verified ranges; until then the price row says what the price depends on.
 * Spanish and Japanese are drafted for review (I18N-005).
 */
type TypeText = Omit<VesselProfile, "type" | "facts" | "sample"> & {
  /** The card's four facts: cabins, guests, nights, moorings. */
  facts: [string, string, string, string];
  priceRange: string | null;
};

const EN: Record<VesselType, TypeText> = {
  sail: {
    name: "Sailing dahabiya",
    short: "The private sailing house",
    line: "A two-masted sailing houseboat with just 4 to 10 cabins. It moors mostly at riverbanks and islands, away from the town quays.",
    facts: ["4–10 cabins", "About 8–24 guests", "Ideally 5 nights, Esna to Aswan", "Mostly riverbanks and islands"],
    rows: {
      cabins: "4–10",
      guests: "About 8–24",
      power: "Two sails, with a motor boat travelling alongside that can tow it when there’s no wind",
      pace: "Sails by day, with time to stop at quiet moorings between Esna and Aswan",
      mooring: "Mostly riverbanks and islands",
      sound: "Wind and water under sail, and the motor boat when towed",
      days: "Slow mornings, lunch under sail, smaller sites the ships pass by",
      price: "Varies by vessel, cabin and season",
    },
    meters: { intimacy: 5, quiet: 5, freeItinerary: 4, facilities: 2, heritage: 4 },
    priceRange: null,
  },
  motor: {
    name: "Motor cruise ship",
    short: "The floating hotel",
    line: "A river ship of three to five decks and up to 72 cabins, with a restaurant, a lounge and usually a pool. It keeps a set timetable and moors at town quays.",
    facts: ["Up to 72 cabins", "Up to about 140 guests", "3–4 nights", "Town quays"],
    rows: {
      cabins: "Up to 72",
      guests: "Up to about 140",
      power: "Diesel engines",
      pace: "Fixed timetable: 4 nights Luxor to Aswan, 3 nights back",
      mooring: "Town quays, often several ships side by side",
      sound: "Engines when sailing; neighbours at the quay",
      days: "Early guided visits, afternoons sailing, evenings on board",
      price: "Varies by vessel, cabin and season",
    },
    meters: { intimacy: 2, quiet: 2, freeItinerary: 1, facilities: 5, heritage: 2 },
    priceRange: null,
  },
  steam: {
    name: "Paddle steamer",
    short: "The period piece",
    line: "One of a few historic steamers on the river, with 14 to 24 cabins and period interiors of wood and brass. Names to know: SS Sudan, SS Misr and SS Karim.",
    facts: ["14–24 cabins and suites", "Guest numbers vary by vessel", "Luxor–Aswan route", "Town quays and some quieter stops"],
    rows: {
      cabins: "14–24, including suites",
      guests: "Varies by vessel",
      power: "Paddle wheels",
      pace: "Unhurried; the classic Luxor–Aswan route",
      mooring: "Town quays and some quieter stops",
      sound: "Paddles and water",
      days: "Guided visits with a strong sense of period",
      price: "Varies by vessel, cabin and season",
    },
    meters: { intimacy: 3, quiet: 3, freeItinerary: 2, facilities: 3, heritage: 5 },
    priceRange: null,
  },
};

const ES: Record<VesselType, TypeText> = {
  sail: {
    ...EN.sail,
    name: "Dahabiya de vela",
    short: "La casa flotante a vela",
    line: "Una casa flotante de dos mástiles con solo 4 a 10 camarotes. Amarra sobre todo en orillas e islas, lejos de los muelles de las ciudades.",
    facts: ["4–10 camarotes", "Unos 8–24 pasajeros", "Lo ideal: 5 noches, de Esna a Asuán", "Sobre todo orillas e islas"],
    rows: {
      cabins: "4–10",
      guests: "Unos 8–24",
      power: "Dos velas, con una lancha a motor al lado que puede remolcarla cuando no hay viento",
      pace: "Navega de día, con tiempo para parar en amarres tranquilos entre Esna y Asuán",
      mooring: "Sobre todo orillas e islas",
      sound: "Viento y agua a vela, y la lancha a motor cuando la remolca",
      days: "Mañanas tranquilas, almuerzo a vela y lugares pequeños que los barcos grandes pasan de largo",
      price: "Varía según el barco, el camarote y la temporada",
    },
  },
  motor: {
    ...EN.motor,
    name: "Crucero a motor",
    short: "El hotel flotante",
    line: "Un barco fluvial de tres a cinco cubiertas y hasta 72 camarotes, con restaurante, salón y, por lo general, piscina. Sigue un horario fijo y amarra en los muelles de las ciudades.",
    facts: ["Hasta 72 camarotes", "Hasta unos 140 pasajeros", "3–4 noches", "Muelles de las ciudades"],
    rows: {
      cabins: "Hasta 72",
      guests: "Hasta unos 140",
      power: "Motores diésel",
      pace: "Horario fijo: 4 noches de Luxor a Asuán, 3 de vuelta",
      mooring: "Muelles de las ciudades, a menudo con varios barcos uno junto a otro",
      sound: "Motores en navegación; vecinos en el muelle",
      days: "Visitas guiadas temprano, tardes navegando y noches a bordo",
      price: "Varía según el barco, el camarote y la temporada",
    },
  },
  steam: {
    ...EN.steam,
    name: "Vapor de ruedas",
    short: "La pieza de época",
    line: "Uno de los pocos vapores históricos del río, con 14 a 24 camarotes e interiores de época en madera y latón. Nombres que conviene conocer: SS Sudan, SS Misr y SS Karim.",
    facts: [
      "14–24 camarotes y suites",
      "El número de pasajeros varía según el barco",
      "Ruta Luxor–Asuán",
      "Muelles de las ciudades y algunas paradas más tranquilas",
    ],
    rows: {
      cabins: "14–24, suites incluidas",
      guests: "Varía según el barco",
      power: "Ruedas de paletas",
      pace: "Sin prisas; la ruta clásica Luxor–Asuán",
      mooring: "Muelles de las ciudades y algunas paradas más tranquilas",
      sound: "Las paletas y el agua",
      days: "Visitas guiadas con un fuerte sabor de época",
      price: "Varía según el barco, el camarote y la temporada",
    },
  },
};

const JA: Record<VesselType, TypeText> = {
  sail: {
    ...EN.sail,
    name: "帆走ダハビヤ",
    short: "帆で進む水上の家",
    line: "2本マストの帆走ハウスボートで、客室はわずか4〜10室。町の船着き場を離れ、主に川岸や島に停泊します。",
    facts: ["客室4〜10室", "乗客約8〜24名", "おすすめは5泊、エスナからアスワン", "主に川岸や島"],
    rows: {
      cabins: "4〜10室",
      guests: "約8〜24名",
      power: "2枚の帆。風がないときは並走するモーターボートが曳航します",
      pace: "日中に帆走し、エスナとアスワンの間の静かな停泊地に立ち寄る時間があります",
      mooring: "主に川岸や島",
      sound: "帆走中は風と水の音、曳航時はモーターボートの音",
      days: "ゆったりした朝、帆走中の昼食、大型船が素通りする小さな遺跡",
      price: "船、客室、季節により異なります",
    },
  },
  motor: {
    ...EN.motor,
    name: "モータークルーズ船",
    short: "水上のホテル",
    line: "3〜5層のデッキと最大72室の客室を備えた川船で、レストラン、ラウンジ、たいていはプールもあります。決まった時刻表で運航し、町の船着き場に停泊します。",
    facts: ["最大72室", "乗客最大約140名", "3〜4泊", "町の船着き場"],
    rows: {
      cabins: "最大72室",
      guests: "最大約140名",
      power: "ディーゼルエンジン",
      pace: "決まった時刻表：ルクソールからアスワンまで4泊、帰りは3泊",
      mooring: "町の船着き場。複数の船が横に並ぶことも多い",
      sound: "航行中はエンジン音、船着き場では隣の船の音",
      days: "早朝のガイド付き見学、午後は航行、夜は船上で",
      price: "船、客室、季節により異なります",
    },
  },
  steam: {
    ...EN.steam,
    name: "外輪蒸気船",
    short: "時代を映す船",
    line: "川に残る数少ない歴史的な蒸気船のひとつで、客室は14〜24室、木と真鍮を使った時代の内装です。代表的な船はSS Sudan、SS Misr、SS Karimです。",
    facts: [
      "客室・スイート14〜24室",
      "乗客数は船により異なります",
      "ルクソール〜アスワン航路",
      "町の船着き場と一部の静かな停泊地",
    ],
    rows: {
      cabins: "14〜24室（スイートを含む）",
      guests: "船により異なります",
      power: "外輪",
      pace: "ゆったり。定番のルクソール〜アスワン航路",
      mooring: "町の船着き場と一部の静かな停泊地",
      sound: "外輪と水の音",
      days: "時代の雰囲気を色濃く感じるガイド付き見学",
      price: "船、客室、季節により異なります",
    },
  },
};

const TEXT: Record<Locale, Record<VesselType, TypeText>> = { en: EN, es: ES, ja: JA };

/** The English names and each type's hub, for links and labels that aren't translated. */
export const VESSEL_TYPE_TEXT: Record<VesselType, { name: string; hub: string }> = {
  sail: { name: EN.sail.name, hub: "/vessels/dahabiya/" },
  motor: { name: EN.motor.name, hub: "/vessels/motor-cruise-ships/" },
  steam: { name: EN.steam.name, hub: "/vessels/paddle-steamers/" },
};

/** A vessel type's profile for the cards and the comparison, in a language the page is translated into. */
export function vesselProfile(type: VesselType, locale: Locale = "en"): VesselProfile {
  const t = TEXT[locale][type];
  const [cabins, guests, nights, mooring] = t.facts;
  return {
    type,
    name: t.name,
    short: t.short,
    line: t.line,
    meters: t.meters,
    facts: [
      ["bed", cabins],
      ["users", guests],
      ["clock", nights],
      ["anchor", mooring],
    ],
    rows: { ...t.rows, price: t.priceRange ?? t.rows.price },
    sample: false,
  };
}

/**
 * The sample vessels on /vessels/, one of each type in this order (Islam's brief): Malouka, MS Hamees, SS Misr. They are
 * catalogue records (showcase, not bookable), so their facts come from the catalogue; one that isn't published isn't
 * shown.
 */
export const SAMPLE_VESSELS = ["nour-el-nil-malouka", "movenpick-hamees", "movenpick-ss-misr"];
