/**
 * ILLUSTRATIVE SAMPLE DATA, used only by the /dev/components gallery and tests.
 * Ported from the design system's built-in defaults (bundle.js). Vessel names, prices, ratings and guest counts here are
 * NOT facts and must never reach a public page (CLAUDE.md §6). Everything rendered from this file carries "Sample data".
 */
import type { Cabin } from "../CabinPicker/CabinPicker";
import type { GalleryItem } from "../Gallery/Gallery";
import type { ItineraryStop } from "../ItineraryTimeline/ItineraryTimeline";
import type { Amenity } from "../AmenityGrid/AmenityGrid";
import type { PriceFactor } from "../PriceAnatomy/PriceAnatomy";
import type { SearchRoute, SearchVessel } from "../CruiseSearch/CruiseSearch";
import type { VesselProfile } from "../lib/vessel-profile";

const usd = (dollars: number) => ({ amount: dollars * 100, currency: "USD" });

export const sampleProfiles: VesselProfile[] = [
  {
    type: "sail",
    name: "Sailing dahabiya",
    short: "The private sailing house",
    line: "A low two-masted boat moved by the wind, carrying 8 to 24 guests. It moors at islands and villages the big ships cannot reach.",
    facts: [
      ["users", "8–24 guests"],
      ["clock", "5–7 nights"],
      ["quiet", "No engine noise"],
    ],
    rows: {
      guests: "8–24",
      cabins: "4–12",
      power: "Two lateen sails; a tug helps on windless days",
      pace: "Sails by day, 5–7 nights between Esna and Aswan",
      mooring: "Private riverbank and island moorings, El Kab, Gebel Silsila",
      sound: "Wind, water and birdsong",
      days: "Unhurried mornings, lunch under sail, sites before the coaches",
      price: "US$2,000–9,000 pp",
    },
    meters: { intimacy: 5, quiet: 5, freeItinerary: 5, facilities: 2, heritage: 4 },
    sample: true,
  },
  {
    type: "motor",
    name: "Motor cruise ship",
    short: "The floating hotel",
    line: "Four or five decks, a pool on the roof and a full programme. Engines cover the classic route fast, often sailing by night.",
    facts: [
      ["users", "60–160 guests"],
      ["clock", "3–4 nights"],
      ["pool", "Pool, spa, gym"],
    ],
    rows: {
      guests: "60–160",
      cabins: "30–80",
      power: "Twin diesel engines",
      pace: "Covers Luxor–Aswan in 3–4 nights, part of it after dark",
      mooring: "Often rafted up to six ships abreast at Esna, Edfu and Kom Ombo",
      sound: "Engine hum, busy decks, evening entertainment",
      days: "Early temple starts with large groups, afternoons by the pool",
      price: "US$600–3,500 pp",
    },
    meters: { intimacy: 1, quiet: 2, freeItinerary: 1, facilities: 5, heritage: 1 },
    sample: true,
  },
  {
    type: "steam",
    name: "Paddle steamer",
    short: "The period piece",
    line: "A restored vessel from the age of Cook's tours, with a turning paddle wheel, brass fittings and cabins that feel like the 1920s.",
    facts: [
      ["users", "40–60 guests"],
      ["clock", "4–5 nights"],
      ["library", "Period interiors"],
    ],
    rows: {
      guests: "40–60",
      cabins: "20–30",
      power: "Paddle wheel (steam heritage; most now run on diesel)",
      pace: "4–5 nights at an old-fashioned speed",
      mooring: "Own berths, with few ships alongside",
      sound: "A steady paddle beat, wood and brass",
      days: "Lectures, afternoon tea and a sense of history",
      price: "US$3,000–7,500 pp",
    },
    meters: { intimacy: 3, quiet: 3, freeItinerary: 3, facilities: 3, heritage: 5 },
    sample: true,
  },
];

const f = (dollars: number) => dollars * 100;
export const sampleFactors: PriceFactor[] = [
  {
    id: "vessel",
    label: "Who shares the boat",
    icon: "users",
    options: [
      { label: "140-guest motor ship", amount: f(640), why: "Fuel, crew and hull are split 140 ways, so each share is small." },
      {
        label: "60-guest boutique ship",
        amount: f(1500),
        why: "Fewer guests carry the same running costs, and there are more crew per guest.",
      },
      { label: "12-guest dahabiya", amount: f(2900), why: "Twelve guests carry a whole boat and around twenty crew." },
    ],
  },
  {
    id: "cabin",
    label: "Cabin size",
    icon: "ruler",
    options: [
      { label: "Standard, 18 m²", amount: 0, why: "A window onto the river, twin beds and a shower." },
      { label: "Suite, 32 m²", amount: f(900), why: "A sitting area, a bathtub and often a French balcony." },
      { label: "Royal suite, 60 m²", amount: f(2400), why: "A private terrace on the water and a butler." },
    ],
  },
  {
    id: "guide",
    label: "Sightseeing",
    icon: "egyptologist",
    options: [
      { label: "Shared guide, groups of 40", amount: f(160), why: "Temples at peak hour, following a paddle above the crowd." },
      { label: "Egyptologist, groups of 12", amount: f(480), why: "A qualified Egyptologist, and time to ask questions." },
      {
        label: "Private Egyptologist",
        amount: f(1100),
        why: "Your own scholar, timed slots and sites before the coaches arrive.",
      },
    ],
  },
  {
    id: "dining",
    label: "Dining & drinks",
    icon: "restaurant",
    options: [
      { label: "Buffet, drinks extra", amount: 0, why: "Hotel-style buffets, and the bar bill adds up." },
      { label: "À la carte, soft drinks", amount: f(300), why: "Plated dinners, with tea, coffee and soft drinks included." },
      {
        label: "Chef's menus & paired wine",
        amount: f(750),
        why: "Market menus cooked for a dozen guests, with Egyptian and imported wines.",
      },
    ],
  },
  {
    id: "mooring",
    label: "Where you moor",
    icon: "anchor",
    options: [
      { label: "Rafted six abreast", amount: 0, why: "Your balcony looks into the next ship's cabin." },
      { label: "Private riverbank", amount: f(450), why: "Nothing on the river around you but palms and fishing boats." },
    ],
  },
  {
    id: "logistics",
    label: "Transfers",
    icon: "plane",
    options: [
      { label: "Make your own way", amount: 0, why: "You arrange the transfer to the boat yourself." },
      { label: "Private transfers", amount: f(400), why: "Meet-and-assist and private cars, booked separately as an extra." },
    ],
  },
];
export const samplePresets = {
  low: [0, 0, 0, 0, 0, 0],
  high: [2, 2, 2, 2, 1, 1],
  lowLabel: "The US$800 five-star",
  highLabel: "The US$8,000 five-star",
};

export const sampleStops: ItineraryStop[] = [
  {
    day: 1,
    place: "Luxor",
    title: "Karnak by late light",
    body: "Board at noon, then walk the hypostyle hall as the coaches leave.",
    tags: ["Karnak", "Luxor Temple"],
  },
  {
    day: 2,
    place: "Esna",
    title: "Through the Esna lock",
    body: "Khnum's temple, its ceiling colours recently restored, then the lock at dusk.",
    tags: ["Temple of Khnum"],
  },
  {
    day: 3,
    place: "El Kab",
    title: "Tombs few people see",
    body: "Rock-cut tombs of the early New Kingdom, reached only from small boats.",
    tags: ["Tomb of Ahmose", "Private mooring"],
  },
  {
    day: 4,
    place: "Edfu",
    title: "Horus, complete",
    body: "The best-preserved temple in Egypt, visited at opening time.",
    tags: ["Temple of Horus"],
  },
  {
    day: 5,
    place: "Kom Ombo",
    title: "Two gods, one temple",
    body: "Sobek and Haroeris share a double sanctuary above the river bend.",
    tags: ["Crocodile Museum"],
  },
  {
    day: 6,
    place: "Aswan",
    title: "Granite and sailing boats",
    body: "Philae by boat, tea at the Old Cataract, a last look around Elephantine.",
    tags: ["Philae", "Elephantine"],
  },
];

export const sampleCabins: Cabin[] = [
  { id: "nile-view", name: "Nile-view cabin", sizeM2: 18, deck: "Lower deck", bed: "Twin or king", price: usd(1240) },
  { id: "junior", name: "Junior suite", sizeM2: 32, deck: "Upper deck", bed: "King, bathtub", price: usd(1890), left: 2 },
  { id: "royal", name: "Royal suite", sizeM2: 60, deck: "Sun deck", bed: "Private terrace", price: usd(3400), soldOut: true },
];

export const sampleAmenities: Amenity[] = [
  { icon: "egyptologist", label: "Private Egyptologist", note: "A qualified guide sails with you and plans the site timings." },
  { icon: "sundeck", label: "Shaded sun deck", note: "Day beds and lunch under sail." },
  { icon: "quiet", label: "No engine noise", note: "Moved by the wind; a tug only on calm days." },
  { icon: "anchor", label: "Private moorings", note: "Islands and riverbanks, never rafted to other ships." },
  { icon: "bath", label: "Bathtub", status: "request", note: "In the two master suites only." },
  { icon: "wine", label: "Paired wines", status: "request", note: "Egyptian and imported, charged by the bottle." },
  { icon: "ac", label: "Air conditioning", note: "Individually controlled in every cabin." },
  { icon: "wifi", label: "Wi-Fi", status: "request", note: "4G router in the salon; patchy between towns." },
  { icon: "pool", label: "Pool", status: "none", note: "Dahabiyas are too small for a pool. Swim stops instead." },
  { icon: "spa", label: "Spa", status: "none", note: "Massage can be arranged ashore in Aswan." },
  { icon: "gym", label: "Gym", status: "none" },
  { icon: "accessible", label: "Step-free access", status: "request", note: "One main-deck cabin; the gangway has steps." },
];

export const sampleGallery: GalleryItem[] = [
  { time: "dawn", vessel: "sail", caption: "Leaving Esna", meta: "Day 2" },
  { time: "day", vessel: null, temple: false, caption: "Off Elephantine", meta: "Day 6" },
  { time: "dusk", vessel: "sail", caption: "Moored at El Kab", meta: "Day 3" },
  { time: "night", vessel: null, caption: "Kom Ombo lit up", meta: "Day 5" },
  { time: "dusk", vessel: "steam", caption: "The steamer at Edfu", meta: "Day 4" },
  { time: "dawn", vessel: null, caption: "Philae by boat", meta: "Day 6" },
];

/** Departure dates on the given weekdays (0 = Sunday) for the next ~5 months, from a fixed start so screenshots are stable. */
function sailings(weekdays: number[], from = "2027-01-04", weeks = 22): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    if (weekdays.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
export const sampleRoutes: SearchRoute[] = [
  { id: "luxor-to-aswan", label: "Luxor to Aswan", sub: "4 nights · Esna, Edfu, Kom Ombo", dates: sailings([1, 5]) },
  { id: "aswan-to-luxor", label: "Aswan to Luxor", sub: "3 nights · the classic downstream", dates: sailings([5]) },
  { id: "luxor-round-trip", label: "Luxor & back", sub: "7 nights · the full round trip", dates: sailings([6]) },
  { id: "lake-nasser", label: "Lake Nasser", sub: "4 nights · Abu Simbel by water", dates: sailings([1]) },
];
export const sampleVessels: SearchVessel[] = [
  { id: "any", label: "Any vessel", sub: "Show everything that sails", icon: "compass" },
  { id: "dahabiya", label: "Sailing dahabiya", sub: "8–24 guests · moved by the wind", icon: "sail" },
  { id: "motor", label: "Motor cruise ship", sub: "60–160 guests · pools and spas", icon: "engine" },
  { id: "steamer", label: "Paddle steamer", sub: "Restored period vessels", icon: "steam" },
];

export const sampleCards = [
  {
    name: "Dahabiya Meroe",
    href: "/cruises/",
    vessel: "sail" as const,
    time: "dusk" as const,
    route: ["Esna", "El Kab", "Edfu", "Kom Ombo", "Aswan"],
    nights: 5,
    guests: 16,
    evaluation: 91,
    price: usd(2650),
    amenities: ["quiet", "egyptologist", "anchor", "sundeck", "wine"] as const,
    badges: [{ label: "Only 2 suites left" }],
  },
  {
    name: "Steamer Khedive",
    href: "/cruises/",
    vessel: "steam" as const,
    time: "dawn" as const,
    route: ["Luxor", "Esna", "Edfu", "Kom Ombo", "Aswan"],
    nights: 4,
    guests: 46,
    evaluation: 84,
    rating: { value: 4.7, count: 96 },
    price: usd(3100),
    amenities: ["library", "bar", "balcony", "egyptologist"] as const,
    saved: true,
  },
  {
    name: "Nile Aurora",
    href: "/cruises/",
    vessel: "motor" as const,
    time: "night" as const,
    route: ["Luxor", "Edfu", "Kom Ombo", "Aswan"],
    nights: 3,
    guests: 140,
    amenities: ["pool", "spa", "gym", "wifi", "music"] as const,
  },
];
