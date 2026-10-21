/**
 * PAGE-107 (Faris, 21 Oct 2026): "How operators connect to Nilecruz", /operators/connect/. Every way an operator can put
 * cabins on Nilecruz, explained step by step for someone who isn't technical. Draft copy for Faris's review. Every fact
 * here matches what the system does (ADR-099 the reservable rule, ADR-100 allotments, the inventory format v1).
 * Commission and commercial terms are never on this page: they are agreed with each operator.
 */
export type Shot = { file: string; alt: string; width: number; height: number; caption: string };

export type Way = {
  id: string;
  title: string;
  /** One line: what it is, in plain words. */
  summary: string;
  effort: string;
  freshness: string;
  booking: string;
  bestFor: string;
  steps: string[];
  /** What Nilecruz does with it. */
  weDo: string[];
  update: string;
  notes?: string[];
  shots: Shot[];
};

const shot = (file: string, alt: string, caption: string, width = 1440, height = 900): Shot => ({
  file: `/images/operators/${file}.webp`,
  alt,
  width,
  height,
  caption,
});

export const INTRO = {
  title: "How operators connect to Nilecruz",
  lead:
    "Nilecruz is a marketplace and booking agent for Nile cruises. Travellers and travel agents find your ship on our site and book it; " +
    "you keep running your ship and selling as you do today. To sell your cabins we need to know which ones are free and at what price. " +
    "There are six ways to tell us, from a sheet you already send agents to a direct connection with your booking system. " +
    "You can start with the simplest, use two at once, and change whenever you like.",
  seoTitle: "How Nile cruise operators connect to Nilecruz",
  seoDescription:
    "Six ways for Nile cruise operators to share cabins and prices with Nilecruz: a weekly sheet, one-tap answers, your dashboard, a feed, an API or allotments.",
};

/** Words used on the page, explained once. */
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Availability", meaning: "How many cabins of each type are still free on a sailing." },
  { term: "Sailing", meaning: "One departure of your ship on one date, for example Luxor to Aswan on 12 February." },
  { term: "Instant booking", meaning: "The guest books and pays at once, because we know the cabin is free right now." },
  {
    term: "Booking request",
    meaning: "The guest asks for a cabin and you confirm it first. The guest pays only after you confirm.",
  },
  { term: "Dashboard", meaning: "Your company’s private area on Nilecruz, opened with your email and password." },
];

export const WAYS: Way[] = [
  {
    id: "sheet",
    title: "1. Send your weekly vacancy sheet",
    summary: "Keep sending the vacancy sheet you already send to agents. We read it for you.",
    effort: "Lowest: nothing new to learn",
    freshness: "Counts for 7 days after the date on the sheet",
    booking: "Booking requests you confirm",
    bestFor: "Operators without a booking system, or who prefer to keep their routine.",
    steps: [
      "Once you are approved, we add the email addresses and phone numbers your team sends sheets from as your contacts. That is how we know a sheet is yours.",
      "Each week (or whenever your free cabins change), send the sheet to the email address we give you. Excel, CSV, PDF and a clear photo of a printed sheet all work, up to 15 MB.",
      "You don’t need to change your sheet’s layout. We match your names for ships, routes and cabins to the ones on Nilecruz, and remember them for next time.",
    ],
    weDo: [
      "We read the sheet into our format. Plain tables are read directly; other layouts are read with the help of AI and always checked.",
      "A Nilecruz admin sees a preview: the original sheet beside what will change, which cabins became free or full, and anything that couldn’t be read. Nothing changes until it is confirmed.",
      "After four sheets in a row come through without a single problem, later sheets can be confirmed automatically, and only when every check passes. Anything unusual still waits for a person.",
      "If you like, we send a short note back saying the sheet was received and applied.",
    ],
    update:
      "At least once a week. A sheet counts as up to date for 7 days; after that the sailings show “to be confirmed” until the next sheet.",
    notes: [
      "Sending sheets by WhatsApp works the same way and is coming soon, once WhatsApp approves our business messages.",
      "A newer sheet never overwrites something more recent, for example a cabin you confirmed by one tap yesterday.",
    ],
    shots: [
      shot(
        "sheet-preview",
        "The sheet preview a Nilecruz admin checks: the original file beside the rows that will change, with sailings, cabin types and free cabins.",
        "What we check before your sheet changes anything.",
        1200,
        1500,
      ),
    ],
  },
  {
    id: "one-tap",
    title: "2. Answer booking requests with one tap",
    summary: "When a guest asks for a cabin, you get an email with four buttons. One tap answers it. No login needed.",
    effort: "Very low: one tap per request",
    freshness: "Your answer counts as up to date for 2 hours",
    booking: "The guest books the moment you confirm",
    bestFor: "Every operator. It works with the weekly sheet, with your dashboard, or on its own.",
    steps: [
      "A guest (or a travel agent) chooses a sailing and cabins on Nilecruz and sends a booking request. If your availability came from a sheet or was entered by hand, we ask you before anyone pays.",
      "You receive one email. It shows the ship, the date, the route, the cabin type, how many cabins, the guests’ ages and the lead guest’s nationality, and a reference such as NQ-4F7K2Q. It never shows the guests’ names or contact details. When a travel agent asks, the email names the agency.",
      "Under the details are four buttons: Confirm, Decline, Hold 72h and Offer other. Tap one. A page opens with a single button to confirm your choice, so opening the email by mistake changes nothing.",
      "That’s it. The page shows the answer you recorded, and the link can’t be used twice.",
    ],
    weDo: [
      "Confirm: the booking is made at once, in the guest’s name, and the guest is asked to pay. Your availability on that sailing goes down by the cabins booked.",
      "Decline: we tell the guest and suggest nearby dates and similar ships. We also mark that cabin type as full on that sailing, so nobody else asks for it.",
      "Hold 72h: the cabins are kept for the guest for 72 hours. Before the hold ends you can still confirm or decline; if you do neither, the cabins are released and the guest is told.",
      "Offer other: you suggest another date or cabin type, and the guest can accept it in their account.",
      "Each answer updates your availability on Nilecruz, so you don’t have to update it twice.",
    ],
    update:
      "Please answer within your reply time: 6 hours unless we agree another with you. If a request is still waiting at that time, we send a reminder; at twice that time a Nilecruz admin phones you. Every morning at 09:00 Cairo time you get one email listing the requests waiting for you and any holds ending that day.",
    notes: [
      "The buttons work for 7 days. Every answer is timed: guests see “usually confirmed within X hours”, based on how fast you really answer.",
      "Over 90 days we also measure how often your sheet or dashboard was right when guests asked. Accurate availability means fewer declines and happier guests.",
      "The same four buttons will arrive on WhatsApp as quick replies once WhatsApp approves our business messages.",
    ],
    shots: [
      shot(
        "one-tap-reply",
        "The page that opens from the email’s Confirm button: the request’s ship, date, cabins and guests, and one button to record the answer.",
        "The page that opens when you tap Confirm.",
        576,
        504,
      ),
      shot(
        "booking-request",
        "A booking request in the operator’s dashboard, with its status, the time it arrived and the answer.",
        "The same request in your dashboard, if you prefer to answer there.",
        1200,
        1072,
      ),
    ],
  },
  {
    id: "dashboard",
    title: "3. Keep your cabins up to date in your dashboard",
    summary: "Your team enters ships, cabins, sailings, prices and free cabins on Nilecruz directly.",
    effort: "Medium: your team updates it when things change",
    freshness: "Counts for 7 days after each update",
    booking: "Booking requests you confirm",
    bestFor: "Operators who want full control and have someone to keep it current.",
    steps: [
      "Your dashboard has your ships, each ship’s cabin types (deck, size, beds, how many guests, view), its schedules (route, nights, days it sails) and the sailings that follow from them.",
      "For each sailing you enter the price per person for one, two or three guests in a cabin, in US$ or €, and the number of free cabins of each type. Prices for children and the crew gratuity are set once for the ship.",
      "Your team can have several people with different roles: owner, reservations, finance and viewer. Each sees and changes only what their role allows.",
      "Whenever cabins sell elsewhere, change the number. You can also paste a whole list at once.",
    ],
    weDo: [
      "We show your prices and free cabins to guests and agents, and check them again at the moment someone books, so a cabin is never sold twice.",
      "Before a ship goes live, Nilecruz checks it is complete and publishes its evaluation. Your ship’s facts stay yours to update.",
    ],
    update:
      "Whenever something changes. Numbers you enter count as up to date for 7 days; after that the sailing shows “to be confirmed”.",
    shots: [
      shot(
        "dashboard-inventory",
        "The operator’s inventory page: each sailing’s cabin types with free cabins and when they were last confirmed.",
        "Free cabins per sailing, and when each was last confirmed.",
        1152,
        1426,
      ),
      shot(
        "dashboard-cabins",
        "The operator’s cabin types for one ship: deck, size, beds and how many guests each sleeps.",
        "Your cabin types, set up once.",
        1152,
        228,
      ),
    ],
  },
  {
    id: "feed",
    title: "4. Publish a feed we read every hour",
    summary: "Your booking system publishes a file with free cabins and prices at a web address; we read it every hour.",
    effort: "One-off work for your IT person",
    freshness: "Up to date to the hour",
    booking: "Instant booking",
    bestFor: "Operators whose booking system can publish a file, but can’t send updates itself.",
    steps: [
      "Your IT person sets your system to publish one file (JSON or XML, in the Nilecruz format) at a secure web address (https).",
      "You enter that address in your dashboard. A Nilecruz admin approves it.",
      "From then on there is nothing to do. When cabins sell in your system, the file changes and we see it within the hour.",
    ],
    weDo: [
      "We read the file every hour. If it can’t be read three times in a row, we try every two hours and show the problem on your connection health page until it works again.",
      "We apply only your own ships and sailings, and never overwrite something more recent.",
    ],
    update: "Automatic, every hour.",
    shots: [
      shot(
        "connection-health",
        "The operator’s connection health page: the feed’s last successful read, the number of sailings it updated, and any problems.",
        "Connection health: when we last read your feed and what it changed.",
        1152,
        348,
      ),
    ],
  },
  {
    id: "api",
    title: "5. Connect your booking system to our API",
    summary: "Your booking system sends us a message the moment cabins or prices change.",
    effort: "Most work: a developer connects the two systems",
    freshness: "Up to the minute",
    booking: "Instant booking",
    bestFor: "Operators with their own booking system and a developer.",
    steps: [
      "In your dashboard you create a key. It proves the updates really come from you.",
      "Your developer reads the format page in your dashboard and sets your system to send each change to Nilecruz, signed with that key.",
      "Our answer says what was applied and lists any rows with a problem, so your developer can fix them.",
    ],
    weDo: [
      "We apply each update within seconds. Sending the same update twice changes nothing twice.",
      "Keys can be replaced at any time without stopping the connection.",
    ],
    update: "Automatic, whenever something changes in your system.",
    shots: [
      shot(
        "format-page",
        "The format page in the operator’s dashboard: the operator’s own ship, cabin and schedule codes, and the JSON example.",
        "The format page: your codes and examples for your developer.",
        1200,
        1500,
      ),
    ],
  },
  {
    id: "allotments",
    title: "6. Give Nilecruz an allotment",
    summary: "You contract a number of cabins on chosen sailings to Nilecruz. They book instantly until a release date.",
    effort: "Low once agreed",
    freshness: "Always bookable until release",
    booking: "Instant booking",
    bestFor: "Operators who want their ship to book instantly without connecting a system.",
    steps: [
      "We agree with you how many cabins of which type on which sailings, and how many days before departure unsold cabins return to you (the release period).",
      "A Nilecruz admin enters the allotment. You see it in your dashboard, with how many of its cabins are booked on each sailing.",
    ],
    weDo: [
      "Guests and agents book allotment cabins instantly, even if your sheet is a few days old.",
      "Once the release date passes, unsold cabins are yours again. A cancelled booking returns its cabin to the allotment.",
    ],
    update: "Nothing to update while the allotment runs. Your other cabins keep using whichever way you chose above.",
    shots: [
      shot(
        "allotments",
        "The operator’s allotment view: each sailing with the cabins allotted, the number booked, and the release date.",
        "Your allotments, and how many are booked on each sailing.",
        1152,
        355,
      ),
    ],
  },
];

export const BOOKING_RULE = {
  title: "How each way changes the way guests book",
  paragraphs: [
    "Guests can book and pay at once only when we are sure the cabin is free right now: when it comes from your feed or API, from an answer you gave in the last 2 hours, or from an allotment.",
    "Cabins from your sheet or your dashboard are shown as available for 7 days. Guests then send a booking request, you confirm it with one tap, and the guest pays after you confirm. Nobody pays for a cabin you haven’t confirmed.",
    "After 7 days without news, a sailing shows “to be confirmed”, and guests can ask us about it.",
    "Exact numbers of free cabins (such as “Last few cabins”) are only ever shown from your feed, your API, a one-tap answer in the last 2 hours, or an allotment.",
  ],
};

export const NEVER = [
  "We never give guests’ names or contact details to anyone before they book.",
  "We never change your prices. Discounts and promotions are yours to set.",
  "We never sell a cabin twice: every booking checks the cabin is still free at that moment.",
  "We never show other operators or the public how many cabins you have from your sheet or dashboard.",
];

export const START = {
  title: "How to start",
  steps: [
    "Create an account on Nilecruz and apply as an operator: your company’s name, its registration and its website.",
    "Nilecruz reviews your company and talks with you about the commercial terms.",
    "We set up your ships with you, and you choose how to share your cabins. You can change it any time.",
    "If any of this is new to you, we walk you through it, by phone or in person.",
  ],
  apply: "/account/apply-operator/",
};

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need a booking system to work with Nilecruz?",
    a: "No. Many operators send us the weekly vacancy sheet they already send agents and answer booking requests with one tap from the email. Nothing else is needed.",
  },
  {
    q: "Can I use more than one way?",
    a: "Yes. For example, a weekly sheet for most sailings, an allotment on your busiest dates, and one-tap answers for everything in between. The most recent information always wins.",
  },
  {
    q: "Who sees my prices and free cabins?",
    a: "Guests see your public price per person for each sailing. Approved travel agents see trade prices. Numbers of free cabins are shown only when they come from your feed, your API, a recent one-tap answer or an allotment.",
  },
  {
    q: "What if I can’t answer a booking request in time?",
    a: "We send a reminder at your reply time, and at twice that time a Nilecruz admin phones you. If you need more time, tap Hold 72h: the cabins are kept for the guest while you check.",
  },
  {
    q: "What happens if my sheet has a mistake?",
    a: "A Nilecruz admin checks every sheet before it changes anything, sees what changed and asks you if something looks wrong. Nothing is booked from a sheet without your confirmation.",
  },
  {
    q: "What are the commercial terms?",
    a: "They are agreed with each operator. We talk them through with you when we review your application.",
  },
];

export const FOR_IT = {
  title: "For your IT person",
  paragraphs: [
    "Feeds and the API use one format, Nilecruz inventory format v1, in JSON or XML. Each document lists your ships by their Nilecruz code, each sailing by date (and schedule code when a ship sails twice that day), the free cabins of each cabin type and, if you like, the prices per person for one to three guests.",
    "API updates are signed with an Ed25519 key you create in your dashboard and carry an idempotency key, so a retry never applies twice. Feeds are read over https every hour, up to 5 MB.",
    "The full format, your own codes, examples and a signing example in Node.js are on the format page in your dashboard once you are approved.",
  ],
  sample: `{
  "cruises": [{
    "id": "your-ship-code",
    "availability": [{
      "date": "2027-02-12",
      "cabins": [{ "type": "DBL", "available": 4 }]
    }]
  }]
}`,
};
