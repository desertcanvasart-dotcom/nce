import type { ItineraryStop } from "@/components/ds/ItineraryTimeline/ItineraryTimeline";
import type { VesselType } from "@/components/ds/lib/types";

/**
 * The typical days of each route guide (PAGE-004, 005, 007), drafted for review (ADR-096). A route guide shows stops,
 * never a price grid (SEO-023). Each cruise's own page shows its exact programme.
 */
export const ROUTE_STOPS: Record<string, { vessel: VesselType; stops: ItineraryStop[] }> = {
  "/nile-cruise-guide/routes/luxor-to-aswan/": {
    vessel: "motor",
    stops: [
      { day: 1, place: "Luxor", title: "Board and the East Bank", body: "Board around midday, then Karnak and Luxor Temple." },
      {
        day: 2,
        place: "Luxor",
        title: "The West Bank, then sail",
        body: "The Valley of the Kings and Hatshepsut’s temple; sail through the lock at Esna.",
      },
      {
        day: 3,
        place: "Edfu",
        title: "Edfu and Kom Ombo",
        body: "The Temple of Horus at Edfu, then the double temple at Kom Ombo.",
      },
      { day: 4, place: "Aswan", title: "Aswan", body: "The High Dam, the Unfinished Obelisk and Philae; a felucca sail." },
      { day: 5, place: "Aswan", title: "Check out", body: "Breakfast and check-out on board." },
    ],
  },
  "/nile-cruise-guide/routes/aswan-to-luxor/": {
    vessel: "motor",
    stops: [
      {
        day: 1,
        place: "Aswan",
        title: "Board in Aswan",
        body: "Board, then a felucca sail; some cruises sail in the morning, so arrive the day before.",
      },
      {
        day: 2,
        place: "Kom Ombo",
        title: "Aswan sites and Kom Ombo",
        body: "Philae, the High Dam and the Unfinished Obelisk, then Kom Ombo.",
      },
      {
        day: 3,
        place: "Edfu",
        title: "Edfu, then Luxor",
        body: "The Temple of Horus at Edfu; sail to Luxor for Karnak and Luxor Temple.",
      },
      {
        day: 4,
        place: "Luxor",
        title: "The West Bank, check out",
        body: "The Valley of the Kings and Hatshepsut’s temple; check out in Luxor.",
      },
    ],
  },
  "/nile-cruise-guide/routes/esna-to-aswan/": {
    vessel: "sail",
    stops: [
      { day: 1, place: "Esna", title: "Board at Esna", body: "Board the dahabiya south of the Esna lock." },
      { day: 2, place: "El Kab", title: "El Kab", body: "Rock-cut tombs and a quiet mooring." },
      { day: 3, place: "Edfu", title: "Edfu", body: "The Temple of Horus at Edfu." },
      {
        day: 4,
        place: "Gebel Silsila",
        title: "Gebel Silsila and Kom Ombo",
        body: "The ancient sandstone quarries, then Kom Ombo.",
      },
      { day: 5, place: "Aswan", title: "Aswan", body: "Arrive in Aswan and check out." },
    ],
  },
};
