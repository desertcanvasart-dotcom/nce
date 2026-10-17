"""Generates docs/REQUIREMENTS.md and docs/_coverage.md from one table.
Run: python3 -I ledger.py <silo.xlsx> <out_dir>"""
import sys, collections, openpyxl

DG = "DG"  # Nilecruz Dashboard Guide.docx
R = []  # (id, source, requirement, batch)
def add(i, s, r, b): R.append((i, s, r, b))

# ---------------------------------------------------------------- DASH
def dash(prefix, sec, items):
    for n, (txt, b) in enumerate(items, 1):
        pass
    return items

ROLE = [
 ("§Account roles", "There are four account types: Admin, Operator, Customer and Travel partner (B2B), each landing in its own workspace.", "4a"),
 ("§Account roles", "Admin can act on vessels, operators, partners, evaluations, bookings, payments and tours across the whole marketplace.", "4a"),
 ("§Account roles", "Operator can read and write only its own vessels, cabins, schedules, prices, offers and bookings (enforced by RLS and server checks).", "4a"),
 ("§Account roles", "Customer can read and write only their own requests, offers, reservations, payments and tours.", "4a"),
 ("§Account roles", "Travel partner can see only approved trade availability, its company's bookings and its team permissions.", "4a"),
 ("§Intro ¶2", "The dashboard's navigation and content change according to the signed-in account type.", "4a"),
]
ADM = [
 ("§Admin/Overview", "Overview shows a counter of operator applications awaiting approval.", "4b"),
 ("§Admin/Overview", "Overview shows a counter of private vessel drafts and cruise submissions awaiting review.", "4b"),
 ("§Admin/Overview", "Overview shows a counter of payments awaiting verification.", "4f"),
 ("§Admin/Overview", "Overview shows a counter of current and upcoming bookings.", "4e"),
 ("§Admin/Overview", "Overview shows a counter of cancellation requests and refund reviews.", "4f"),
 ("§Admin/Overview", "Overview shows a counter of inventory connection errors.", "4c"),
 ("§Admin/Overview", "Each overview counter links to the list of the records it counts, pre-filtered.", "4b"),
 ("§Admin/Overview", "An activity history records marketplace actions (actor, action, record, time) and admins can browse it.", "4b"),
 ("§Admin/Overview", "The overview is an operational queue; business-intelligence reporting is out of scope unless Faris adds it.", "4b"),
 ("§Admin/Catalogue ¶1", "Admins can search the vessel directory by vessel name.", "4b"),
 ("§Admin/Catalogue ¶1", "Admins can filter vessels by publication status.", "4b"),
 ("§Admin/Catalogue ¶1", "Admins can filter to, and see a marker on, incomplete vessel records.", "4b"),
 ("§Admin/Catalogue ¶2", "A vessel record holds name, type, route, category, description, photographs, total cabin count, assigned operator and editorial 'Best for' labels.", "4b"),
 ("§Admin/Catalogue ¶3", "Admins can create a vessel.", "4b"),
 ("§Admin/Catalogue ¶3", "Admins can edit a vessel.", "4b"),
 ("§Admin/Catalogue ¶3", "Admins can assign a vessel to an operator, choosing only from approved operators.", "4b"),
 ("§Admin/Catalogue ¶3", "Admins can approve a vessel's publication.", "4b"),
 ("§Admin/Catalogue ¶3", "A listing-readiness check lists the missing information for each vessel.", "4b"),
 ("§Admin/Catalogue ¶4", "A vessel can be publicly visible as information-only while prices and availability are prepared; visibility never makes it bookable.", "4b"),
 ("§Admin/Catalogue ¶5", "Admins can download the vessel CSV import template.", "4b"),
 ("§Admin/Catalogue ¶5", "Admins can upload a vessel CSV file.", "4b"),
 ("§Admin/Catalogue ¶5", "The importer previews row-level validation errors before anything is written.", "4b"),
 ("§Admin/Catalogue ¶5", "Imported rows become private vessel drafts.", "4b"),
 ("§Admin/Catalogue ¶5", "Rows whose source reference or vessel name already exists are skipped and existing records are left unchanged.", "4b"),
 ("§Admin/Catalogue ¶6", "The CSV importer covers vessel profiles only, not cabins, departure prices, availability, cancellation policies or evaluations.", "4b"),
 ("§Admin/Evaluations ¶1", "Evaluations are entered from the vessel's catalogue editor.", "4b"),
 ("§Admin/Evaluations ¶1", "An evaluation covers seven dimensions: Hygiene, Service, Food, Amenities, Management, Cabin and vessel, Cruise experience.", "4b"),
 ("§Admin/Evaluations ¶2", "Each dimension has inspection criteria scored 0 to 5.", "4b"),
 ("§Admin/Evaluations ¶2", "The system calculates a weighted result for each dimension.", "4b"),
 ("§Admin/Evaluations ¶2", "The system calculates an overall score out of 100 (unit-tested).", "4b"),
 ("§Admin/Evaluations ¶3", "An evaluation records assessment date, evaluator or team name, verdict and notes for travellers.", "4b"),
 ("§Admin/Evaluations ¶3", "Admins control whether an evaluation is published; unpublished evaluations are never readable publicly.", "4b"),
 ("§Admin/Evaluations ¶4", "External review ratings are stored separately from Nilecruz's evaluation and are never treated as an inspection score.", "4b"),
 ("§Admin/Evaluations ¶5", "Admins can record internal safety observations with a review status and notes; they are never public.", "4b"),
 ("§Admin/Submissions ¶1", "Operators can prepare vessel information and submit it for review.", "4b"),
 ("§Admin/Submissions ¶1", "A submission moves through private draft, submitted for review, changes requested, approved and rejected.", "4b"),
 ("§Admin/Submissions ¶2", "Admins can inspect the submitted information.", "4b"),
 ("§Admin/Submissions ¶2", "Admins can review a submission's history of states and changes.", "4b"),
 ("§Admin/Submissions ¶2", "Admins can send feedback to the operator.", "4b"),
 ("§Admin/Submissions ¶2", "Admins make the final approve or reject decision.", "4b"),
 ("§Admin/Submissions ¶2", "A submitted record cannot be edited through ordinary editing while under review.", "4b"),
 ("§Admin/Operators ¶1", "Admins can review operator applications.", "4b"),
 ("§Admin/Operators ¶1", "Admins can approve an operator's marketplace access.", "4b"),
 ("§Admin/Operators ¶1", "Admins can manage which vessels are connected to an operator.", "4b"),
 ("§Admin/Operators ¶2", "Admins can see each operator's inventory connection status and integration problems.", "4c"),
 ("§Admin/Operators ¶2", "An operator works through manual entry, an inventory feed or an API connection.", "4c"),
 ("§Admin/Operators ¶2", "A feed connection becomes active only after an admin approves it.", "4c"),
 ("§Admin/Cabins ¶2", "A cabin type holds name, description, photographs, size, bed configuration, maximum occupancy, view, balcony, amenities and active/inactive status.", "4c"),
 ("§Admin/Cabins ¶3", "A cabin type has a deck: Lower, Middle, Upper or a vessel-specific deck name.", "4c"),
 ("§Admin/Cabins ¶4", "The same cabin category on different decks is stored as separate cabin types so offers state the location.", "4c"),
 ("§Admin/Cabins ¶5", "A schedule holds a directional route, number of nights, weekly sailing days, operating date ranges and itinerary details.", "4c"),
 ("§Admin/Cabins ¶5", "A vessel can have several schedules for different routes or directions.", "4c"),
 ("§Admin/Cabins ¶6", "A departure rate links one sailing, one cabin type, an occupancy, a currency, a price and an available quantity.", "4c"),
 ("§Admin/Cabins ¶6", "Rates can be entered for one departure or applied to all matching dates of a schedule.", "4c"),
 ("§Admin/Cabins ¶7", "The system distinguishes a scheduled sailing from confirmed, sufficiently recent cabin availability.", "4c"),
 ("§Admin/Cabins ¶7", "Several prices or currencies for the same physical cabin inventory never add cabins: quantity is shared.", "4c"),
 ("§Admin/Cabins ¶8", "There is no fixed per-booking cabin limit; reservations are limited only by available inventory and validation.", "4e"),
 ("§Admin/Tours ¶2", "Tours and extras are independent products (museum visits, evening tours, excursions, transfers).", "4d"),
 ("§Admin/Tours ¶2", "A tour has a name, location and duration.", "4d"),
 ("§Admin/Tours ¶2", "A tour has a description and an itinerary.", "4d"),
 ("§Admin/Tours ¶2", "A tour has photographs.", "4d"),
 ("§Admin/Tours ¶2", "A tour has inclusions and exclusions.", "4d"),
 ("§Admin/Tours ¶2", "A tour has meeting-point or pickup instructions.", "4d"),
 ("§Admin/Tours ¶2", "A tour has supplier information.", "4d"),
 ("§Admin/Tours ¶2", "A tour has cancellation wording and percentage calculation bands.", "4d"),
 ("§Admin/Tours ¶2", "A tour is available standalone or assigned to relevant cruises.", "4d"),
 ("§Admin/Tours ¶3", "A tour has bookable sessions with start and end times, guest capacity, currency and price.", "4d"),
 ("§Admin/Tours ¶3", "A session is shared or private.", "4d"),
 ("§Admin/Tours ¶3", "A session is priced per guest or per group.", "4d"),
 ("§Admin/Tours ¶4", "Multi-night sightseeing programs can be associated with cruise schedules and departures.", "4d"),
 ("§Admin/Tours ¶4", "A program links its included tour sessions and checks their availability.", "4d"),
 ("§Admin/Tours ¶5", "Each tour has its own detail page; catalogue cards do not carry the full itinerary.", "7"),
 ("§Admin/Tours ¶6", "An information-only tour can be published before rates and sessions exist and stays non-bookable until they do.", "4d"),
 ("§Admin/Promotions ¶1", "Admins and authorised operators can create promotions against existing cruise rates and inventory.", "4c"),
 ("§Admin/Promotions ¶1", "A promotion can be a percentage discount.", "4c"),
 ("§Admin/Promotions ¶1", "A promotion can be a fixed-amount discount.", "4c"),
 ("§Admin/Promotions ¶1", "A promotion can be an included extra service.", "4c"),
 ("§Admin/Promotions ¶1", "A promotion can be a guaranteed cabin upgrade.", "4c"),
 ("§Admin/Promotions ¶2", "A promotion can be restricted to a booking period.", "4c"),
 ("§Admin/Promotions ¶2", "A promotion can be restricted to departure dates.", "4c"),
 ("§Admin/Promotions ¶2", "A promotion can be restricted to selected cabin rates.", "4c"),
 ("§Admin/Promotions ¶2", "A promotion carries its own benefit description and terms.", "4c"),
 ("§Admin/Promotions ¶2", "A promotion can be paused and resumed.", "4c"),
 ("§Admin/Promotions ¶3", "An upgrade promotion must reference matching inventory in the upgraded cabin type and never creates stock.", "4c"),
 ("§Admin/Promotions ¶3", "A promotion cannot be applied on top of another promotional rate.", "4c"),
 ("§Admin/Partners ¶2", "Admins can review a travel partner's company details and registration information.", "4h"),
 ("§Admin/Partners ¶2", "Admins can approve a partner's trade access.", "4h"),
 ("§Admin/Partners ¶2", "Admins can pause a partner's access while keeping its historical records.", "4h"),
 ("§Admin/Partners ¶3", "Travel partners (buyers) and operators (suppliers) have separate permissions and workflows.", "4h"),
 ("§Admin/Requests ¶1", "Admins can see all customer requests across the marketplace.", "4e"),
 ("§Admin/Requests ¶1", "Admins can see all operator offers.", "4e"),
 ("§Admin/Requests ¶1", "Admins can see all resulting reservations.", "4e"),
 ("§Admin/Requests ¶2", "A booking record shows sailing, guests, cabin arrangements, cabin decks, prices, payment status and the applicable terms.", "4e"),
 ("§Admin/Requests ¶3", "Admins can find and investigate incomplete transactions.", "4e"),
 ("§Admin/Requests ¶3", "Admins can investigate cancellation requests and refund cases.", "4f"),
 ("§Admin/Requests ¶3", "Admins can search and filter requests and bookings by operator, route and booking reference.", "4e"),
 ("§Admin/Deposits ¶1", "Admins can verify reported payments.", "4f"),
 ("§Admin/Deposits ¶1", "Admins can browse financial records.", "4f"),
 ("§Admin/Deposits ¶1", "Admins maintain a premium-date calendar.", "4f"),
 ("§Admin/Deposits ¶2", "The finance workflow supports payment requests.", "4f"),
 ("§Admin/Deposits ¶2", "The finance workflow supports reported payments.", "4f"),
 ("§Admin/Deposits ¶2", "The finance workflow supports recorded receipts.", "4f"),
 ("§Admin/Deposits ¶2", "The finance workflow shows outstanding balances.", "4f"),
 ("§Admin/Deposits ¶2", "The finance workflow calculates cancellation charges.", "4f"),
 ("§Admin/Deposits ¶2", "The finance workflow keeps refund records.", "4f"),
 ("§Admin/Deposits ¶2", "Commission records track commission entries and reversals.", "4f"),
 ("§Admin/Deposits ¶3", "Recording or verifying a payment never charges a card or moves money, and the UI never implies it does.", "4f"),
]
OPR = [
 ("§Operator ¶1", "An operator sees only its own business, never other operators' data.", "4c"),
 ("§Operator list", "Operator overview shows new requests.", "4e"),
 ("§Operator list", "Operator overview shows outstanding offers.", "4e"),
 ("§Operator list", "Operator overview shows upcoming departures.", "4c"),
 ("§Operator list", "Operator overview shows inventory issues.", "4c"),
 ("§Operator list", "An operator can create cruise drafts and submit them for admin approval.", "4b"),
 ("§Operator list", "An operator can respond to requested changes and resubmit.", "4b"),
 ("§Operator list", "An operator can maintain cabin descriptions, photographs, decks and capacities.", "4c"),
 ("§Operator list", "An operator can create routes, schedules and departure rates.", "4c"),
 ("§Operator list", "An operator can manage international, Egyptian-citizen, foreign-resident and trade rate plans.", "4c"),
 ("§Operator list", "An operator can prepare personal offers for suitable customer requests.", "4e"),
 ("§Operator list", "An authorised operator can manage promotions and upgrades.", "4c"),
 ("§Operator list", "An operator can review its bookings and their payment information.", "4f"),
 ("§Operator list", "An operator can request payments and record money received, subject to its permissions.", "4f"),
 ("§Operator list", "An operator can handle cancellation and refund workflows for its bookings.", "4f"),
 ("§Operator list", "An operator can configure manual, feed or API inventory connections.", "4c"),
 ("§Operator ¶offers", "A personal offer specifies a sailing and cabin arrangement.", "4e"),
 ("§Operator ¶offers", "A personal offer specifies price, inclusions, terms and expiry.", "4e"),
 ("§Operator ¶offers", "The operator confirms the family or passenger-eligibility conditions of an offer.", "4e"),
 ("§Operator ¶offers", "Sending an offer does not hold inventory.", "4e"),
 ("§Operator ¶offers", "Accepting an offer re-checks the sailing and cabin availability atomically.", "4e"),
 ("§Operator ¶deck", "An offer records the cabin deck.", "4e"),
 ("§Operator ¶deck", "If the deck changes before acceptance, the customer receives an updated offer to review and the old one cannot be accepted.", "4e"),
 ("§Operator ¶integration", "An operator can paste supported JSON or XML inventory.", "4c"),
 ("§Operator ¶integration", "An operator can configure an inventory feed URL.", "4c"),
 ("§Operator ¶integration", "An operator can generate and rotate API credentials.", "4c"),
 ("§Operator ¶integration", "The dashboard shows connection health and feed activity.", "4c"),
]
CUS = [
 ("§Customer ¶1", "The customer dashboard is called 'My journey'.", "4g"),
 ("§Customer ¶2", "My journey has sections Overview, Requests and offers, Bookings, Tours and sightseeing, Past trips and Account.", "4g"),
 ("§Customer list", "Overview shows upcoming trips and actions requiring attention.", "4g"),
 ("§Customer list", "A customer can track their submitted cruise requests.", "4e"),
 ("§Customer list", "A customer can compare the personal offers received.", "4e"),
 ("§Customer list", "An offer shows actual departure dates, route, cabin arrangement and price.", "4e"),
 ("§Customer list", "A customer can read the terms and accept a valid (unexpired, current) offer.", "4e"),
 ("§Customer list", "A customer can review reservations, payment deadlines and outstanding balances.", "4f"),
 ("§Customer list", "A customer can report a payment and follow its verification status.", "4f"),
 ("§Customer list", "A customer can request cancellation and follow the refund-review status.", "4f"),
 ("§Customer list", "A customer can browse and manage eligible tours and sightseeing separately from cruises.", "4g"),
 ("§Customer list", "A customer can review past trips and closed requests.", "4g"),
 ("§Customer list", "A customer can manage account security.", "4a"),
 ("§Customer ¶request", "A request captures routes or flexible preferences, dates or windows, latest finish date, duration, guests, cabin arrangements and optional budget.", "4e"),
 ("§Customer ¶request", "Request copy states it is a request for offers: no bid or lowest market price is guaranteed.", "4e"),
 ("§Customer ¶deck", "A signed-in customer can use the cabin-deck selector to choose a deck and cabin type.", "5"),
 ("§Customer ¶deck", "The deck selector is labelled schematic and never implies a numbered cabin is reserved.", "5"),
]
B2B = [
 ("§Partner list", "An approved partner can search available departures.", "4h"),
 ("§Partner list", "An approved partner sees eligible trade and market-specific rates.", "4h"),
 ("§Partner list", "A partner can reserve cabins for clients.", "4h"),
 ("§Partner list", "A partner can submit company requests and compare offers.", "4h"),
 ("§Partner list", "A partner can view company bookings and payment records.", "4h"),
 ("§Partner list", "A partner can record passenger details and client references.", "4h"),
 ("§Partner list", "A partner can record an agency selling total and see the difference from the supplier total.", "4h"),
 ("§Partner list", "A partner can produce a client booking record.", "4h"),
 ("§Partner list", "A partner owner can invite team members and set their permissions.", "4h"),
 ("§Partner ¶teams", "Team roles are company owner, reservations user and finance user, each with distinct permissions.", "4h"),
 ("§Partner ¶access", "Trade access requires admin approval.", "4h"),
 ("§Partner ¶access", "A rate can be restricted to the trade channel or to one particular company.", "4h"),
 ("§Partner ¶access", "Passenger-market eligibility (e.g. Egyptian-citizen rates) remains subject to verification.", "4h"),
]
PAY = [
 ("§Payment ¶1", "Payment deadlines and cancellation policies are separate mechanisms in data and code.", "4f"),
 ("§Payment table", "Departures from 24 Dec to 7 Jan, or in a configured premium period, require full payment within 3 days of booking.", "4f"),
 ("§Payment table", "Other October–April departures require full payment within 7 days of booking.", "4f"),
 ("§Payment table", "May–September departures require full payment within 14 days of booking.", "4f"),
 ("§Payment ¶2", "The deadline is never later than departure.", "4f"),
 ("§Payment ¶2", "Admins can add and edit premium periods.", "4f"),
 ("§Payment ¶2", "Western Easter 21–29 Mar 2027 is configured as a premium period.", "4f"),
 ("§Payment ¶3", "Unpaid reservations past their deadline are subject to cancellation and cabin release.", "4f"),
 ("§Payment ¶3", "A reservation with a reported payment awaiting verification is reviewed before release, never released automatically.", "4f"),
 ("§Payment ¶4", "Bookings keep the deadline and policy terms agreed at booking; later rule changes never rewrite them.", "4f"),
 ("§Payment ¶5", "Each cruise can have its own cancellation wording and percentage bands by time before departure.", "4f"),
 ("§Payment ¶5", "The system calculates cancellation charges, refundable amounts and unpaid cancellation charges (unit-tested).", "4f"),
 ("§Payment ¶5", "A customer must acknowledge the applicable policy before the payment workflow proceeds.", "4f"),
 ("§Payment ¶6", "Tours have their own orders, amounts, terms and payments; a tour payment can never settle a cruise balance.", "4f"),
]
PUB = [
 ("§Public ¶1", "Visitors can browse published vessels with photographs, descriptions and routes.", "5"),
 ("§Public ¶1", "Visitors can see published Nilecruz evaluations.", "5"),
 ("§Public ¶1", "Visitors can see external reviews, labelled by source.", "5"),
 ("§Public ¶1", "Visitors can use comparison tools.", "5"),
 ("§Public ¶1", "Visitors see starting prices where an operator supplied them.", "5"),
 ("§Public ¶2", "Visitors can browse tour pages.", "7"),
 ("§Public ¶2", "Visitors can begin planning a request without an account.", "8"),
 ("§Public ¶3", "Exact departure rates and additional cabin details require an account.", "8"),
 ("§Public ¶3", "Reserving or sending a personal request requires an account.", "8"),
 ("§Public ¶3", "Information-only listings stay visible without implying prices or stock.", "5"),
 ("§Public ¶4", "A read-only MCP layer offers cruise search, comparison and availability.", "8"),
 ("§Public ¶4", "The MCP layer applies the same account and pricing restrictions and cannot book or administer.", "8"),
]
BND = [
 ("§Boundaries 1", "A sailing is bookable only when its cabin, schedule, rate, inventory and policy records are complete.", "4e"),
 ("§Boundaries 2", "The deck selector shows an honest empty state when a vessel has no structured cabin types.", "5"),
 ("§Boundaries 3", "No screen implies numbered-cabin selection or a verified floor plan.", "5"),
 ("§Boundaries 4", "The importer's scope (vessel profiles only) is stated in the import screen.", "4b"),
 ("§Boundaries 5", "External reviews are not collected or refreshed automatically; each shows its source and retrieval date.", "4b"),
 ("§Boundaries 6", "Public surfaces are in EN/ES/JA; admin and operational interfaces may stay in English.", "10"),
 ("§Boundaries 7", "Account-email sending depends on a configured sender and fails visibly, not silently, when it is missing.", "8"),
 ("§Boundaries 8", "Finance tracking is operational only; no accounting, bank settlement or automated refunds.", "4f"),
]
for code, items in [("ROLE", ROLE), ("ADM", ADM), ("OPR", OPR), ("CUS", CUS), ("B2B", B2B), ("PAY", PAY), ("PUB", PUB), ("BND", BND)]:
    for n, (s, r, b) in enumerate(items, 1):
        add(f"DASH-{code}-{n:03d}", f"{DG} {s}", r, b)

# ---------------------------------------------------------------- PAGE
xlsx, out = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(xlsx)["Silo map"]
PAGES = []
for row in ws.iter_rows(min_row=2, values_only=True):
    pid, silo, lvl, url, parent, h1, ptype, intent, kw, skw, links, bridges, comps, schema, phase = row[:15]
    n = int(pid[1:])
    if phase == 1:
        if silo == "Cruises (marketplace)": b = "5"
        elif silo in ("Home", "Vessels", "Prices Explained", "Nile Cruise Guide"): b = "6"
        elif url == "/plan-my-cruise/": b = "8"
        else: b = "7"
    else:
        b = "12" if phase == 2 else "13"
    PAGES.append((n, pid, silo, url, h1, ptype, comps, schema, phase, links, bridges, kw))
    add(f"PAGE-{n:03d}", f"silo.xlsx Silo map {pid}",
        f"`{url}` ({ptype}, P{phase}): H1 \"{h1}\"; components {comps}; schema {schema}; links per row (same-silo + bridges); primary keyword \"{kw}\".", b)

# ---------------------------------------------------------------- COMP
COMPS = [("Icon","UI"),("Button","primitive"),("Badge","primitive"),("Rating","primitive"),("Stepper","primitive"),("TextField","primitive"),
 ("NavBar","frame"),("Hero","frame"),("SectionHeading","frame"),("Scene","frame"),("VesselArt","frame"),
 ("CruiseCard","discovery"),("ExperienceCard","discovery"),("ItineraryTimeline","discovery"),("Gallery","discovery"),
 ("CruiseSearch","booking"),("CabinPicker","booking"),("BookingSummary","booking"),
 ("VesselTypeCard","education"),("VesselCompare","education"),("PriceAnatomy","education"),("AmenityGrid","education")]
for name, grp in COMPS:
    add(f"COMP-{name}", f"DS components/{name}/README.md, preview.html, index.d.ts",
        f"{name} is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night.", "2")

# ---------------------------------------------------------------- TOK
TOK = [
 ("TOK-COLOR-SEMANTIC", "tokens.json color.tokens (19 themed)", "All 19 semantic colour tokens exist as CSS custom properties with Day and Night values."),
 ("TOK-COLOR-PALETTE", "tokens.json color.tokens (12 constant)", "All 12 palette swatches exist as constant custom properties in both themes."),
 ("TOK-THEMES", "tokens.json color.themes; DS README", "Day (light) is the default theme and Night is applied with data-theme=\"dark\" on <html>, with no flash of the wrong theme."),
 ("TOK-TYPE-FAMILIES", "tokens.json type.families; BRAND-BOOK §Type", "--font-display and --font-sans stacks exist and Cormorant Garamond and Jost are loaded at the weights bundle.css uses."),
 ("TOK-TYPE-STYLES", "tokens.json type.groups (12 styles)", "Each of the 12 type styles exists as a class and as tokens, including display-xl dropping to 56px under 720px."),
 ("TOK-SPACING", "tokens.json spacing (space-1…10)", "space-1 to space-10 exist as custom properties."),
 ("TOK-RADIUS", "tokens.json radius", "radius-0, -sm, -lg and -pill exist, and lint flags any other border-radius."),
 ("TOK-SHADOW", "tokens.json shadow", "shadow-float and shadow-lift exist with themed values, and lint flags any other box-shadow."),
 ("TOK-LAYOUT", "tokens.json layout", "container, measure and nav-height exist as custom properties."),
 ("TOK-MOTION", "BRAND-BOOK §Motion; bundle.css :root", "--ease-river and --dur-1/2/3 are added to the design-system token source as a motion group and generated like every other token (ADR-016)."),
 ("TOK-PIPELINE", "CLAUDE.md §6 Design tokens", "A script generates the token CSS (and TS constants) from tokens.json; CI fails if the generated files are stale or edited by hand."),
 ("TOK-NO-HARDCODE", "CLAUDE.md §6", "Lint rejects hard-coded colours, sizes and fonts that have a token in component and page styles."),
]
for i, s, r in TOK: add(i, s, r, "1")

# ---------------------------------------------------------------- BRAND
BRAND = [
 ("BRAND-BOOK §Content ¶1", "UI and CMS copy never contains 'best', 'unbeatable' or 'once in a lifetime' (copy lint).", "1"),
 ("BRAND-BOOK §Content ¶2", "UI copy has no exclamation marks or emoji (copy lint).", "1"),
 ("BRAND-BOOK §Content ¶2", "Urgency appears only from real availability (e.g. 'Only 2 suites left' computed from inventory).", "5"),
 ("BRAND-BOOK §Content ¶3", "Headings, buttons and labels are sentence case in source; uppercase is applied only by CSS.", "2"),
 ("BRAND-BOOK §Content ¶4", "Prices are formatted as US$1,240, per person, with what is included stated.", "2"),
 ("BRAND-BOOK §Content ¶4", "Dates are formatted as 12 Feb 2027 in English.", "2"),
 ("BRAND-BOOK §Content ¶4", "Durations are stated in nights ('4 nights'), never days.", "2"),
 ("BRAND-BOOK §Content ¶5", "Vessel categories are labelled exactly 'sailing dahabiya', 'paddle steamer', 'motor cruise ship'.", "3"),
 ("BRAND-BOOK §Content ¶4", "Site names use the common English forms (Karnak, Esna, El Kab, Edfu, Kom Ombo, Philae, Gebel Silsila).", "3"),
 ("BRAND-BOOK §Content ¶1", "Every selling surface carries at least one honest, explanatory fact (editorial check per template).", "11"),
 ("BRAND-BOOK §Lines", "The ornament appears only under section titles.", "2"),
 ("BRAND-BOOK §Shape", "radius-sm is used only on inputs/checkboxes and radius-lg only on floating panels; everything else is square.", "2"),
 ("BRAND-BOOK §Imagery", "Components take a real image when one exists and fall back to Scene only when it does not.", "2"),
 ("BRAND-BOOK §Imagery", "A vessel's media can only be images of that vessel (media is attached to the vessel record).", "3"),
 ("BRAND-BOOK §Iconography", "Only the system's own icon set is used, and every amenity icon has a visible or accessible label.", "2"),
 ("BRAND-BOOK §Iconography", "Wherever a vessel type is named it is paired with its icon (and VesselArt where space allows).", "2"),
 ("BRAND-BOOK §Logo; ADR-022", "The wordmark reads 'Nilecruz' (Cormorant Garamond 500 34px + strapline in Jost 9px tracked 0.42em) until a logo file exists.", "2"),
 ("BRAND-BOOK §Color", "dusk-* is never used for UI text and brass-500 never for small text.", "2"),
 ("BRAND-BOOK §Color", "Success and danger colours always come with a word or an icon.", "2"),
 ("BRAND-BOOK §Color", "Text on photography uses on-media over scrim.", "2"),
 ("LandingPage/README; BRAND §Space", "Sections are space-9 apart and alternate surface and surface-sunk; a section title sits space-8 above its content.", "2"),
 ("BRAND-BOOK §Space", "Card padding and grid gaps are space-5; content is capped at container with space-6 gutters (space-4 on mobile).", "2"),
 ("BRAND-BOOK §States", "Hover darkens the border to ink or fills with primary; selected uses primary/on-primary; disabled is 45% opacity.", "2"),
 ("BRAND-BOOK §Type", "Prices use lining figures; totals and steppers use tabular figures.", "2"),
 ("NavBar/README", "Main navigation has at most seven links and 'Why prices differ' is always visible.", "1"),
 ("Rating/README; CruiseCard/README", "Ratings render only when backed by real reviews, and cards always show the maximum guest count.", "5"),
 ("Faris 17 Oct 2026 (ADR-008)", "The felucca appears only on /tours-extras/felucca-sail-aswan/ as a reference that the boat type exists: no vessel-type page, no evaluation, no recommendation, no promotion, no VesselArt/Scene felucca variant, no search option.", "2"),
 ("Faris 17 Oct 2026 (ADR-009); Q6", "CruiseCard shows the published Nilecruz evaluation as 'NN/100 · Nilecruz evaluation'; stars appear only for verified guest reviews; external ratings appear only on the vessel page with source and date.", "5"),
]
for n, (s, r, b) in enumerate(BRAND, 1): add(f"BRAND-{n:03d}", s, r, b)

# ---------------------------------------------------------------- cross-cutting
X = {
"ENG": [
 ("CLAUDE.md §5", "typecheck passes with zero errors under TypeScript strict.", "1"),
 ("CLAUDE.md §5", "lint passes with zero errors.", "1"),
 ("CLAUDE.md §5", "format:check passes.", "1"),
 ("CLAUDE.md §5", "No @ts-ignore or eslint-disable without a written reason (enforced by lint rule).", "1"),
 ("CLAUDE.md §5", "Vitest unit tests run in CI.", "1"),
 ("CLAUDE.md §5; ADR-029", "Playwright end-to-end tests run in CI against a production build of the app.", "1"),
 ("CLAUDE.md §6", "A private /dev/components gallery renders every component in every state in both themes, unavailable in production to the public.", "2"),
 ("CLAUDE.md §5", "A screenshot script captures any route at 375, 768 and 1440 px in Day and Night into docs/screenshots/batch-<nn>/.", "1"),
 ("CLAUDE.md §5", "A visual-parity check compares each ported component with its preview.html and logs differences.", "2"),
 ("CLAUDE.md §4", "Work happens on batch-<nn>-<slug> branches with conventional commits citing requirement IDs.", "1"),
 ("ARCH §Environments; ADR-029", "Local, staging and production environments (Railway + Supabase) exist with separate databases and secrets.", "1"),
 ("ARCH §CI", "CI runs typecheck, lint, format, unit, e2e, axe and bundle-size checks on every PR.", "1"),
 ("CLAUDE.md §4", "REQUIREMENTS, BUILD-LOG and DECISIONS are updated at the end of every batch.", "0"),
 ("ARCH §Monitoring; ADR-029", "Server and client errors are reported to an error tracker with release tags.", "11"),
 ("ARCH §Backups", "Database backups and point-in-time recovery are enabled and a restore has been rehearsed.", "11"),
 ("CLAUDE.md §6", "pnpm is the package manager and new dependencies are justified in the batch brief.", "1"),
 ("CLAUDE.md §6", "404 and 500 pages exist in the brand voice in all three languages.", "1"),
 ("CLAUDE.md §6", "The app shell (NavBar, footer, theme, language switch, skip link) wraps every public page.", "1"),
 ("Faris 17 Oct 2026 (ADR-031); PROPOSED-007", "Draft /terms/ and /privacy/ pages exist in EN, linked from the footer, visibly marked 'Draft, under review' and noindex until Faris approves the text.", "1"),
],
"A11Y": [
 ("CLAUDE.md §5", "axe reports no serious or critical issues on every e2e-visited page (CI gate).", "1"),
 ("CLAUDE.md §5", "Every interaction is keyboard-operable.", "2"),
 ("CLAUDE.md §5; BRAND §States", "Keyboard focus shows a solid 2px focus ring at 2px offset (on-media ring on photography) everywhere, not only inside .nc-root.", "2"),
 ("CLAUDE.md §5; BRAND §Motion", "prefers-reduced-motion disables CSS and JS motion (count-up, gallery tilt, parallax, autoplay, smooth scroll).", "2"),
 ("CLAUDE.md §5", "Text contrast ≥4.5:1 (≥3:1 large text and UI marks) in both themes, checked automatically including on-media over scrim.", "2"),
 ("CLAUDE.md §5", "Pages have a skip link and landmark regions.", "1"),
 ("DS TextField", "Every form field has a label and errors say how to fix the problem.", "2"),
 ("DS PriceAnatomy/Badge", "Colour is never the only cue (segment keys, status words).", "2"),
 ("DS Gallery/VesselCompare/ItineraryTimeline", "Carousel, tabs and radio-group widgets follow WAI-ARIA patterns including arrow-key navigation.", "2"),
 ("DS Stepper/PriceAnatomy", "Changing totals and counts are announced politely to screen readers.", "2"),
 ("CLAUDE.md §5", "Pre-launch accessibility audit (automated + manual screen reader pass) has no open serious issues.", "11"),
],
"PERF": [
 ("CLAUDE.md §5", "LCP ≤ 2.5 s on Lighthouse mobile for key templates (production build).", "11"),
 ("CLAUDE.md §5", "CLS ≤ 0.05 on key templates.", "11"),
 ("CLAUDE.md §5", "INP ≤ 200 ms on key templates.", "11"),
 ("CLAUDE.md §5", "No route ships more than ~200 KB gzipped JS without a logged reason (CI bundle budget).", "1"),
 ("CLAUDE.md §5", "Images use next/image with explicit sizes.", "2"),
 ("PERF/BRAND §Type; ADR-035", "Fonts are self-hosted via next/font with display swap; only first-paint Latin files are preloaded; no Japanese web font is downloaded (the stacks fall back to installed Noto JP or system Japanese faces).", "1"),
 ("CLAUDE.md §5", "Lighthouse CI runs on key templates on every PR to main.", "1"),
 ("CLAUDE.md §7", "Heavy effects meet the budget on a mid-range phone and degrade to static design-system art.", "9"),
 ("CLAUDE.md §6", "Public pages render their content on the server and are readable without JavaScript.", "1"),
 ("ARCH §Caching", "Public pages are statically generated or cached and revalidated on content change.", "5"),
],
"SEC": [
 ("CLAUDE.md §5", "Every table has row-level security enabled with explicit policies (CI test fails on a table without RLS).", "3"),
 ("CLAUDE.md §5", "Every dashboard action is authorised server-side against the caller's role and ownership.", "4a"),
 ("CLAUDE.md §5", "No secrets in the client bundle or repository (secret scanning in CI).", "1"),
 ("CLAUDE.md §5", "All server inputs are validated with zod.", "3"),
 ("DG §Customer list", "Sign-up, sign-in, sign-out and session handling are secure (httpOnly cookies, CSRF-safe mutations).", "4a"),
 ("ARCH §Security", "Public forms and auth endpoints are rate-limited and protected from bots.", "8"),
 ("DG §Operator ¶integration", "Feed fetching blocks private network addresses and XML parsing rejects external entities.", "4c"),
 ("DG §Operator ¶integration", "API credentials are stored hashed and can be rotated without downtime.", "4c"),
 ("DG §Operator ¶integration", "Inbound API calls are signed and idempotent; outbound webhooks are signed.", "4c"),
 ("DG §Admin/Overview", "Privileged actions write an append-only audit log entry.", "3"),
 ("CLAUDE.md §5", "A security review before launch has no open high findings.", "11"),
 ("ARCH §Security", "Security headers (CSP, HSTS, frame-ancestors, referrer policy) are set.", "1"),
 ("ARCH §Data", "Passenger personal data is readable only by the booking's customer, partner, operator and admins.", "3"),
],
"SEO": [
 ("silo.xlsx Read me C10", "URLs are lowercase, hyphenated and end with a trailing slash; non-slash variants redirect.", "1"),
 ("CLAUDE.md §5", "Each public page has a unique title and meta description from a metadata helper.", "1"),
 ("CLAUDE.md §5", "Each public page has exactly one H1 (CI check).", "10"),
 ("CLAUDE.md §5; Linking rules", "Each public page shows a breadcrumb and emits BreadcrumbList.", "5"),
 ("CLAUDE.md §5", "Each page emits the schema types listed in its silo row (validated in CI).", "10"),
 ("CLAUDE.md §5", "Each page has a self-referencing canonical tag.", "1"),
 ("silo.md §Languages", "Each page has reciprocal hreflang for en, es, ja and x-default.", "10"),
 ("Linking rules: Up", "Each page links to its parent and pillar in the breadcrumb and once in the intro text.", "6"),
 ("Linking rules: Down", "Pillars and hubs link to every child in card grids with the child's primary keyword as anchor.", "6"),
 ("Linking rules: Across", "Supporting pages link to two or three siblings in the same hub in a 'Keep reading' block.", "6"),
 ("Linking rules: Bridges", "Cross-silo links appear only where the row's Bridge links column lists them (CI check against the workbook).", "6"),
 ("Linking rules: Money flow", "Every informational page ends with a filtered CruiseCard row linking to the matching listing.", "6"),
 ("Linking rules: Money flow", "Each vessel page links to its vessel-type hub and to each destination it stops at.", "5"),
 ("Linking rules: Anchor text", "Anchors use the target's primary keyword or a close variant, never 'click here' or a bare URL.", "6"),
 ("Linking rules: Navigation", "Main nav shows the five pillars plus Cruises; the footer holds Trust pages and silo roots.", "1"),
 ("Linking rules: Facets", "Only listed /cruises/ facet pages are indexable; parameters canonicalise to the clean URL with noindex.", "5"),
 ("silo.md rule 8; Orphan check", "Every page is within three folders and three clicks of home (crawler check).", "10"),
 ("Linking rules: Orphan check", "A crawler run after each release finds no orphan pages.", "10"),
 ("ARCH §Routing", "XML sitemaps per locale list only indexable URLs.", "10"),
 ("ARCH §Routing", "robots.txt disallows dashboards, account, API and MCP paths.", "1"),
 ("silo.md §Assumptions", "Current nilecruz.com URLs redirect (301) to their silo equivalents.", "10"),
 ("silo.md §Assumptions", "Tours & Extras slugs are reconciled with any live nilecruz.com tour URLs.", "7"),
 ("silo.md §Cannibalisation", "Route guides carry no price grid and listings carry no long itinerary text.", "6"),
 ("silo.md §Cannibalisation", "A vessel-type hub shows at most three CruiseCards, then links to its listing.", "6"),
 ("silo.md §Cannibalisation", "The /cruises/compare/ tool is lightly indexed (indexable shell, parameterised states noindex).", "12"),
 ("silo.xlsx P072 schema", "AggregateRating is emitted only from verified reviews.", "5"),
 ("silo.xlsx P104 schema", "/reviews/ emits no self-serving review stars.", "12"),
 ("silo.xlsx P001 schema", "Home emits Organization and WebSite with SearchAction.", "6"),
 ("silo.md §Assumptions", "Primary keywords are validated in a keyword tool before copy is written.", "6"),
 ("ARCH §Routing", "Vessel slugs cannot collide with reserved /cruises/ facet slugs.", "3"),
],
"I18N": [
 ("silo.md §Languages", "English is served unprefixed; Spanish under /es/ and Japanese under /ja/.", "1"),
 ("silo.md §Languages; ADR-022", "Spanish pages use translated slugs; Japanese pages use the English (Latin-letter) slugs.", "10"),
 ("Linking rules: Languages", "Internal links stay within the current language.", "10"),
 ("Linking rules: Languages", "The language switch goes to the equivalent page via hreflang alternates.", "10"),
 ("silo.md §Languages", "Translation is plumbed in the order pillars/hubs, money pages, supporting articles.", "10"),
 ("CLAUDE.md §6", "UI strings live in next-intl message files, none hard-coded in components.", "1"),
 ("BRAND-BOOK §Multilingual", "No fixed-width buttons or labels; layouts tolerate ~30% longer Spanish.", "2"),
 ("CLAUDE.md §6; ADR-016", "Japanese text is never letter-spaced: letter-spacing 0 under :lang(ja), overriding the bundle's 0.08em.", "2"),
 ("BRAND-BOOK §Multilingual", "Japanese falls back to Noto Serif JP / Noto Sans JP through the family stacks.", "1"),
 ("CLAUDE.md §6", "Numbers, dates and money format per locale while keeping brand formats in English.", "2"),
 ("CLAUDE.md §6", "Translatable content (CMS and database) is stored per locale with a fallback rule.", "3"),
 ("silo.md §Assumptions", "Spanish and Japanese keywords are validated before translated pages are written.", "10"),
],
"DATA": [
 ("CLAUDE.md §6", "Money is stored as integer minor units with an ISO currency code.", "3"),
 ("CLAUDE.md §6", "Timestamps are stored in UTC.", "3"),
 ("CLAUDE.md §6", "Operational dashboards display dates and times in Africa/Cairo.", "4a"),
 ("CLAUDE.md §6", "Public pages display dates in the visitor's locale.", "5"),
 ("CLAUDE.md §6", "Prices, vessel facts, itineraries, amenities, reviews and copy live in the database or CMS, not in components.", "3"),
 ("CLAUDE.md §6", "Seeded records carry a visible 'Sample data' flag wherever they render.", "3"),
 ("CLAUDE.md §6", "No invented facts: placeholders are marked and listed in docs/CONTENT-NEEDED.md.", "0"),
 ("CLAUDE.md §6; DS PriceAnatomy", "PriceAnatomy is fed from maintained data with an honest footnote, not the bundle defaults.", "6"),
 ("CLAUDE.md §6; DS VesselCompare", "VesselCompare and VesselTypeCard are fed from maintained data, not the bundle defaults.", "6"),
 ("CLAUDE.md §6", "Every data view has loading, empty, error and permission-denied states in the brand voice.", "2"),
 ("DS BookingSummary", "BookingSummary line items, fees, inclusions and notes come from the departure, rate and policy data.", "8"),
 ("DS CruiseSearch", "CruiseSearch routes, sailing days and match counts come from real schedules and departures.", "5"),
 ("CLAUDE.md §5", "Deterministic test fixtures seed every role and state for e2e tests.", "3"),
 ("ARCH §Migration", "Data chosen for carry-over from existing systems is migrated with a verified count report (see Q1).", "3"),
 ("Faris 17 Oct 2026 (ADR-010)", "Each vessel has an obligatory crew gratuity in US$ (never the rate currency) of at least US$5 per person per night for guests aged 3 and over; lower values are rejected.", "4c"),
 ("Faris 17 Oct 2026 (ADR-010)", "Gratuities are shown as a separate obligatory line 'paid on board at check-out'; they are never charged online, never part of the amount due, and carry no commission.", "8"),
 ("Faris 17 Oct 2026 (ADR-011)", "The cruise total never contains flights or other extras; tours, transfers and flights are separate products with their own orders.", "8"),
 ("Faris 17 Oct 2026 (ADR-011)", "A cruise runs from check-in to check-out; airport/hotel transfers are not included unless the package says so, and are offered separately, linked to /tours-extras/transfers/.", "5"),
 ("Faris 17 Oct 2026 (ADR-012)", "Default child pricing by age on the departure date, as a share of the adult per-person rate: under 3 free, 3–5.99 25%, 6–11.99 50%, 12+ full (unit-tested at every boundary).", "4c"),
 ("Faris 17 Oct 2026 (ADR-012)", "Search, requests, offers and bookings record each child's age so the child rule can be applied.", "4e"),
 ("Faris 17 Oct 2026 (ADR-013, ADR-019); Q26, Q49", "Every imported or newly created vessel stays a private draft and cannot be published until its readiness check, including rates and availability, reports complete.", "4b"),
 ("Faris 17 Oct 2026 (ADR-018)", "Admins can override the child-pricing bands per operator; the override is audited and applies to new rates only.", "4c"),
 ("Faris 17 Oct 2026 (ADR-018)", "Cabin occupancy is set per cabin type (1–3; most vessels 2); children share a parent's cabin; an infant under 3 does not count towards occupancy.", "4c"),
 ("Faris 17 Oct 2026 (ADR-019)", "Admins can grant a temporary showcase exception that publishes an incomplete vessel, which then renders a visible 'Details in preparation · sample' flag and is never bookable.", "4b"),
 ("Faris 17 Oct 2026 (ADR-019)", "At launch no showcase exception remains (launch checklist check).", "11"),
 ("Faris 17 Oct 2026 (ADR-020); Q2", "Cruise bookings are paid by card through Stripe, within the booking's payment deadline.", "4f"),
 ("Faris 17 Oct 2026 (ADR-020)", "Tour orders are paid by card through Stripe as separate payments from the cruise.", "4f"),
 ("Faris 17 Oct 2026 (ADR-020)", "Payment status changes only from verified, idempotent Stripe webhooks, never from the browser redirect.", "4f"),
 ("Faris 17 Oct 2026 (ADR-020)", "Refunds are issued through Stripe only after admin approval, for the amount the cancellation calculation produces.", "4f"),
 ("Faris 17 Oct 2026 (ADR-020)", "Card data never reaches our servers (Stripe-hosted fields or Checkout); non-production uses Stripe test mode only.", "4f"),
 ("Faris 17 Oct 2026 (ADR-021); Q4", "One page per vessel shows all its itineraries with a selector; the itinerary is a parameter canonical to the vessel URL.", "5"),
 ("Faris 17 Oct 2026 (ADR-025); Q3", "Public pages show one 'from' price per vessel: the lowest available cabin category, per person, with currency and what is included; other categories show no price.", "5"),
 ("Faris 17 Oct 2026 (ADR-025); Q3", "Prices for every cabin category and departure date appear only to signed-in customers (and to eligible partners at their rates).", "8"),
 ("Faris 17 Oct 2026 (ADR-025)", "Vessel-page Offer schema uses the public 'from' price only (AggregateOffer lowPrice and priceCurrency).", "5"),
 ("Faris 17 Oct 2026 (ADR-026); Q51", "Nilecruz is the merchant of record: card payments go to the Nilecruz Stripe account, not to operators.", "4f"),
 ("Faris 17 Oct 2026 (ADR-026); Q18", "Commission is 10% of each verified cruise payment, stored as a setting; it is reversed in proportion to any refund and never applies to gratuities.", "4f"),
 ("Faris 17 Oct 2026 (ADR-026); PROPOSED-013", "Each verified payment creates an operator payable (payment less commission); admins record payouts made outside the system and see each operator's outstanding balance.", "4f"),
 ("Faris 17 Oct 2026 (ADR-026)", "Operators see their own payables, payouts and balance, read-only.", "4f"),
 ("Faris 17 Oct 2026 (ADR-027); Q16", "Payment deadlines count Cairo calendar days from the booking date; 24 Dec and 7 Jan are inclusive; the season is set by the departure date (unit-tested at every boundary).", "4f"),
 ("Faris 17 Oct 2026 (ADR-027)", "At the deadline an unpaid reservation is cancelled and its cabins released automatically, unless a reported payment awaits verification, in which case it goes to the admin queue.", "4f"),
 ("Faris 17 Oct 2026 (ADR-030); Q54", "Tour and extra orders are sold and charged by Nilecruz alone: listed and paid separately from cruises, with no operator payable and no commission split.", "4f"),
 ("Faris 17 Oct 2026 (ADR-030); Q11", "Only Nilecruz admins create and manage tours, suppliers, sessions and programs; operators have no access to tours.", "4d"),
 ("Faris 17 Oct 2026 (ADR-030); Q55", "As a fallback, an admin can approve a manual payment (e.g. bank transfer) for any booking, recorded with method, reference and approver.", "4f"),
],
}
for p, items in X.items():
    for n, (s, r, b) in enumerate(items, 1): add(f"{p}-{n:03d}", s, r, b)

# ---------------------------------------------------------------- EXP (proposals, see EXPERIENCE.md)
EXP = ["Live price build-up linked from every price", "Vessel cutaway: who shares what, deck by deck", "Scroll-driven voyage Luxor → Aswan",
       "Compare tray that builds a side-by-side", "Mooring explainer: rafted six abreast vs private bank", "Season & deadline calendar",
       "View Transitions card → vessel page", "Day/night theme following Egypt time", "Evaluation radar that unfolds per dimension",
       "Ambient river sound (off by default)"]
for n, t in enumerate(EXP, 1): add(f"EXP-{n:03d}", "CLAUDE.md §7; EXPERIENCE.md", f"{t}: built to its EXPERIENCE.md spec if Faris approves it.", "9")

# Batch 1 results (17 Oct 2026). "Built" = done and checked locally, awaiting its first CI run.
B1 = "Batch 1 (17 Oct 2026): "
STATUS = {
 "TOK-COLOR-SEMANTIC": ("Verified", B1+"tests/unit/tokens.test.ts; screenshots docs/screenshots/batch-01"),
 "TOK-COLOR-PALETTE": ("Verified", B1+"tests/unit/tokens.test.ts"),
 "TOK-THEMES": ("Verified", B1+"e2e 'theme toggle…no flash', '500 page' regression; *-day/*-night screenshots"),
 "TOK-TYPE-FAMILIES": ("Verified", B1+"tokens.test.ts font stack; src/app/fonts.ts; screenshots"),
 "TOK-TYPE-STYLES": ("Verified", B1+"tokens.test.ts (12 styles, display-xl 56px under 720px)"),
 "TOK-SPACING": ("Verified", B1+"tokens.test.ts; stylelint nilecruz/use-tokens"),
 "TOK-RADIUS": ("Verified", B1+"tokens.test.ts; stylelint nilecruz/use-tokens"),
 "TOK-SHADOW": ("Verified", B1+"tokens.test.ts; stylelint rule caught a non-token box-shadow in the header (fixed)"),
 "TOK-LAYOUT": ("Verified", B1+"tokens.test.ts"),
 "TOK-MOTION": ("Verified", B1+"tokens/motion.json; tokens.test.ts 'motion tokens'"),
 "TOK-PIPELINE": ("Verified", B1+"pnpm tokens:check; tokens.test.ts 'matches the generated file'"),
 "TOK-NO-HARDCODE": ("Verified", B1+"tooling/stylelint-tokens.mjs via pnpm lint:css"),
 "BRAND-001": ("Verified", B1+"pnpm lint:copy; tests/unit/copy-rules.test.ts"),
 "BRAND-002": ("Verified", B1+"pnpm lint:copy; tests/unit/copy-rules.test.ts"),
 "BRAND-025": ("Verified", B1+"e2e 'main navigation shows the five pillars…'"),
 "ENG-001": ("Verified", B1+"pnpm typecheck (strict, noUncheckedIndexedAccess)"),
 "ENG-002": ("Verified", B1+"pnpm lint, pnpm lint:css"),
 "ENG-003": ("Verified", B1+"pnpm format:check"),
 "ENG-004": ("Verified", B1+"eslint ban-ts-comment + local/disable-needs-reason"),
 "ENG-005": ("Verified", B1+"CI run on PR #1 green (4/4 jobs) 17 Oct 2026; job 'Types, lint, format, unit tests'"),
 "ENG-006": ("Verified", B1+"CI run on PR #1 green (4/4 jobs) 17 Oct 2026; job 'Build, bundle budget, end-to-end'"),
 "ENG-008": ("Verified", B1+"scripts/screenshots.ts; 42 files in docs/screenshots/batch-01"),
 "ENG-010": ("Verified", B1+"branch batch-01-foundation, conventional commits with IDs"),
 "ENG-011": ("In progress", B1+"Supabase staging and production reachable, publishable keys valid (17 Oct 2026); secret keys entered are the anon key; Railway pending. Carried over (see BUILD-LOG)"),
 "ENG-012": ("Verified", B1+"CI run on PR #1 green (4/4 jobs) 17 Oct 2026; .github/workflows/ci.yml"),
 "ENG-016": ("Verified", B1+"pnpm 10 via corepack; dependencies listed in docs/briefs/BATCH-01.md"),
 "ENG-017": ("Verified", B1+"e2e 404 per locale and '500 page'; screenshots no-such-page-*, dev-error-preview-*"),
 "ENG-018": ("Verified", B1+"e2e 'home renders…the shell'; screenshots"),
 "ENG-019": ("Verified", B1+"e2e 'draft legal pages…'; screenshots terms-*, privacy-*"),
 "A11Y-001": ("Verified", B1+"axe (WCAG 2.2 AA tags) on every e2e page, both themes; 0 serious/critical"),
 "A11Y-006": ("Verified", B1+"e2e 'skip link moves focus…'"),
 "PERF-004": ("Verified", B1+"pnpm budget: max 154.2 KB gzipped per route"),
 "PERF-006": ("Verified", B1+"next/font; render-blocking CSS cut from ~200 KB to ~5 KB (ADR-035)"),
 "PERF-007": ("Verified", B1+"CI run on PR #1 green (4/4 jobs) 17 Oct 2026; job 'Lighthouse (mobile)', no assertion warnings. LCP gate method awaits Faris (Q58)"),
 "PERF-009": ("Verified", B1+"e2e 'without JavaScript…'"),
 "SEC-003": ("Verified", B1+"CI run on PR #1 green (4/4 jobs) 17 Oct 2026; gitleaks 'Secret scan'; e2e 'no secret appears in client JavaScript'"),
 "SEC-012": ("Verified", B1+"e2e 'security headers are set'"),
 "SEO-001": ("Verified", B1+"e2e trailing-slash 308; unit localizedPath"),
 "SEO-002": ("Verified", B1+"src/lib/seo/metadata.ts; e2e title present"),
 "SEO-006": ("Verified", B1+"e2e canonical per locale; unit pageMetadata"),
 "SEO-015": ("Verified", B1+"e2e main nav and footer link tests"),
 "SEO-020": ("Verified", B1+"unit tests/unit/robots.test.ts; e2e staging noindex"),
 "I18N-001": ("Verified", B1+"e2e lang + URL per locale"),
 "I18N-006": ("Verified", B1+"messages/{en,es,ja}.json, 47 keys each; copy lint scans them"),
 "I18N-009": ("Verified", B1+"generated stacks keep Noto JP names; ja screenshots (ADR-035)"),
}
DEFERRED = {
 "PAGE-039": "Felucca removed from the site (Faris 17 Oct 2026, ADR-008)",
 "PAGE-040": "Felucca removed from the site (Faris 17 Oct 2026, ADR-008)",
 "PAGE-045": "Felucca removed from the site (Faris 17 Oct 2026, ADR-008)",
}
# ---------------------------------------------------------------- outputs
ids = [r[0] for r in R]
assert len(ids) == len(set(ids)), "duplicate id"
# IDs are permanent: every ID ever issued must still exist with the same meaning slot.
import os
snap = os.path.join(os.path.dirname(__file__), "ledger-ids.txt")
issued = [l.strip() for l in open(snap) if l.strip()] if os.path.exists(snap) else []
missing = [i for i in issued if i not in ids]
assert not missing, f"IDs disappeared: {missing}"
with open(snap, "w") as fh: fh.write("\n".join(sorted(set(ids) | set(issued))) + "\n")
BATCHES = ["0","1","2","3","4a","4b","4c","4d","4e","4f","4g","4h","5","6","7","8","9","10","11","12","13"]
for r in R: assert r[3] in BATCHES, r

def src_group(i):
    if i.startswith("DASH-"): return "Dashboard guide (" + i.split("-")[1] + ")"
    return i.split("-")[0]

with open(f"{out}/REQUIREMENTS.md", "w") as f:
    f.write("# Requirement ledger\n\n")
    f.write("The single checklist for the whole build (CLAUDE.md §3). **Generated** from `scripts/ledger.py` during Batch 0; from Batch 1 on, edit this file directly and keep IDs stable. ")
    f.write("Statuses: `Planned`, `In progress`, `Built`, `Verified`, `Deferred (reason + Faris's OK)`. A requirement is never removed.\n\n")
    f.write("**Source keys:** `DG` = `Nilecruz Dashboard Guide.docx` (§ = heading, ¶ = paragraph within it, list = bullet list); `silo.xlsx` = `nilecrz-site-silo.xlsx`; `DS` = `nilecrz-design-system/`; `BRAND-BOOK` = `BRAND-BOOK.md` (= root `README.md`).\n\n")
    f.write("Batch codes are defined in `BATCH-PLAN.md`. Every ID below sits in exactly one batch; `PROPOSED-*` items at the end are **not** scheduled until Faris approves them.\n\n")
    groups = collections.OrderedDict()
    for r in R: groups.setdefault(src_group(r[0]), []).append(r)
    f.write("## Totals by source\n\n| Source | Rows |\n|---|---:|\n")
    for g, rows in groups.items(): f.write(f"| {g} | {len(rows)} |\n")
    f.write(f"| **Total** | **{len(R)}** |\n\n")
    for g, rows in groups.items():
        f.write(f"## {g}\n\n| ID | Source | Requirement | Batch | Status | Evidence |\n|---|---|---|---|---|---|\n")
        for i, s, req, b in rows:
            st = ("Deferred: " + DEFERRED[i]) if i in DEFERRED else ("Planned" if b != "0" else "Verified")
            ev = "Batch 0 docs approved by Faris 17 Oct 2026 (ADR-024)" if b == "0" else ""
            if i in STATUS: st, ev = STATUS[i]
            f.write(f"| {i} | {s} | {req.replace('|', '/')} | {b} | {st} | {ev} |\n")
        f.write("\n")
    f.write(open(f"{out}/../scripts/proposed.md").read())

with open(f"{out}/_coverage.md", "w") as f:
    c = collections.Counter(r[3] for r in R)
    d = collections.Counter(r[3] for r in R if r[0] in DEFERRED)
    f.write("| Batch | IDs | of which Deferred |\n|---|---:|---:|\n")
    for b in BATCHES: f.write(f"| {b} | {c[b]} | {d[b]} |\n")
    f.write(f"| **Sum** | **{sum(c.values())}** | **{sum(d.values())}** |\n| **Ledger total** | **{len(R)}** | |\n")
    f.write(f"| **Distinct IDs** | **{len(set(ids))}** | |\n")
    # per batch by prefix
    f.write("\n| Batch | Breakdown |\n|---|---|\n")
    for b in BATCHES:
        pc = collections.Counter(src_group(r[0]).split(' (')[0] if not r[0].startswith('DASH') else 'DASH-'+r[0].split('-')[1] for r in R if r[3]==b)
        f.write(f"| {b} | " + ", ".join(f"{k} {v}" for k, v in sorted(pc.items())) + " |\n")
print(len(R)); print(collections.Counter(src_group(r[0]) for r in R)); print(collections.Counter(r[3] for r in R))
