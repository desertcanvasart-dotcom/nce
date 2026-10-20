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
 ("§Account roles; Faris 17 Oct 2026 (ADR-063); PROPOSED-002", "Operator teams have owner, reservations, finance and viewer roles, and each role's permissions are enforced on the server and in RLS.", "4a"),
 ("§Account roles; Faris 17 Oct 2026 (ADR-063); PROPOSED-003", "Admins have a sub-role (super, catalogue, finance, content) that limits which admin actions they can take; only super admins change roles.", "4a"),
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
 ("§Public ¶3", "Exact departure rates and additional cabin details require an account.", "5"),  # ADR-093: brought forward from Batch 8
 ("§Public ¶3", "Reserving or sending a personal request requires an account.", "5"),  # ADR-093: brought forward from Batch 8
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
 ("ARCH §Data; ADR-052", "Passenger personal data is readable only by the booking's customer, partner, operator and admins.", "4e"),
 ("Faris 17 Oct 2026 (ADR-063); PROPOSED-001", "People can confirm their email, reset a forgotten password and change their email, through single-use links that expire.", "4a"),
 ("Faris 17 Oct 2026 (ADR-064)", "Admins must use two-step sign-in (authenticator app); admin powers in the database require a two-step session.", "4a"),
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
 ("Faris 17 Oct 2026 (ADR-025); Q3", "Prices for every cabin category and departure date appear only to signed-in customers (and to eligible partners at their rates).", "5"),  # ADR-093: brought forward from Batch 8
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
 ("Faris 17 Oct 2026 (ADR-053); PROPOSED-015", "Egyptologist profiles exist as a translatable CMS content type (name, photo, qualifications, languages, bio); names, bios and photos come from Faris.", "3"),
 ("Faris 17 Oct 2026 (ADR-051)", "Imported vessels are mapped to wind (dahabiya), engine (powered, Lake Nasser) or steam; steam vessels are confirmed by Faris, never guessed; the import lists candidates.", "3"),
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
 "ENG-011": ("In progress", B1+"local + staging verified: Railway staging (EU West) deploys from main and serves /api/health/ 200; Supabase staging and production verified. Carried over to Batch 11: the separate Railway production environment is created at launch (ADR-029, ADR-042)"),
 "ENG-012": ("Verified", B1+"CI run on PR #1 green (4/4 jobs) 17 Oct 2026; .github/workflows/ci.yml"),
 "ENG-016": ("Verified", B1+"pnpm 10 via corepack; dependencies listed in docs/briefs/BATCH-01.md"),
 "ENG-017": ("Verified", B1+"e2e 404 per locale and '500 page'; screenshots no-such-page-*, dev-error-preview-*"),
 "ENG-018": ("Verified", B1+"e2e 'home renders…the shell'; screenshots"),
 "ENG-019": ("Verified", B1+"e2e 'draft legal pages…'; screenshots terms-*, privacy-*"),
 "A11Y-001": ("Verified", B1+"axe (WCAG 2.2 AA tags) on every e2e page, both themes; 0 serious/critical"),
 "A11Y-006": ("Verified", B1+"e2e 'skip link moves focus…'"),
 "PERF-004": ("Verified", B1+"pnpm budget: max 154.2 KB gzipped per route"),
 "PERF-006": ("Verified", B1+"next/font; render-blocking CSS cut from ~200 KB to ~5 KB (ADR-035)"),
 "PERF-007": ("Verified", B1+"strict simulated gate on the Railway deployment (EU West): runs 39043008311 and 39043005483 passed; median LCP 1.36–2.42 s, CLS ≤ 0.012, TBT ≤ 95 ms, accessibility 100 (ADR-040, ADR-041, ADR-042)"),
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
B2 = "Batch 2 (17 Oct 2026): "
STATUS.update({
 "COMP-AmenityGrid": ("Verified", B2+"gallery /dev/components; parity 0.09% Day / 0.08% Night; component test (filters); axe both themes"),
 "COMP-Badge": ("Verified", B2+"gallery /dev/components; parity 0.71% Day / 2.6% Night (allowlisted reason); axe both themes"),
 "COMP-BookingSummary": ("Verified", B2+"gallery /dev/components; parity 4.75% Day / 4.21% Night (allowlisted reason); component test (gratuity outside total); axe both themes"),
 "COMP-Button": ("Verified", B2+"gallery /dev/components; parity 0.47% Day / 0.47% Night; axe both themes"),
 "COMP-CabinPicker": ("Verified", B2+"gallery /dev/components; parity 0.27% Day / 0.27% Night; component tests (prices shown/hidden); axe both themes"),
 "COMP-CruiseCard": ("Verified", B2+"gallery /dev/components; parity 4.49% Day / 4.44% Night (allowlisted reason); axe both themes"),
 "COMP-CruiseSearch": ("Verified", B2+"gallery /dev/components; parity 3.82% Day / 3.82% Night (allowlisted reason); component tests (sailing dates, child ages, Escape); axe both themes"),
 "COMP-ExperienceCard": ("Verified", B2+"gallery /dev/components; parity 1.36% Day / 1.31% Night (allowlisted reason); axe both themes"),
 "COMP-Gallery": ("Verified", B2+"gallery /dev/components; parity 4.31% Day / 3.86% Night (allowlisted reason); axe both themes"),
 "COMP-Hero": ("Verified", B2+"gallery /dev/components; parity 16.13% Day / 14.46% Night (allowlisted reason); axe both themes"),
 "COMP-Icon": ("Verified", B2+"gallery /dev/components; parity 0.07% Day / 0.07% Night; axe both themes"),
 "COMP-ItineraryTimeline": ("Verified", B2+"gallery /dev/components; parity 0.06% Day / 0.06% Night; component test (tab keys); axe both themes"),
 "COMP-NavBar": ("Verified", B2+"gallery /dev/components; parity 7.12% Day / 7.07% Night (allowlisted reason); axe both themes"),
 "COMP-PriceAnatomy": ("Verified", B2+"gallery /dev/components; parity 0.27% Day / 0.43% Night; component tests (totals, keys, radio keys); axe both themes"),
 "COMP-Rating": ("Verified", B2+"gallery /dev/components; parity 0.4% Day / 0.39% Night; axe both themes"),
 "COMP-Scene": ("Verified", B2+"gallery /dev/components; parity 12.67% Day / 11.23% Night (allowlisted reason); axe both themes"),
 "COMP-SectionHeading": ("Verified", B2+"gallery /dev/components; parity 0.09% Day / 0.09% Night; axe both themes"),
 "COMP-Stepper": ("Verified", B2+"gallery /dev/components; parity 0.27% Day / 0.26% Night; component test (limits); axe both themes"),
 "COMP-TextField": ("Verified", B2+"gallery /dev/components; parity 0.2% Day / 0.2% Night; axe both themes"),
 "COMP-VesselArt": ("Verified", B2+"gallery /dev/components; parity 44.65% Day / 44.63% Night (allowlisted reason); axe both themes"),
 "COMP-VesselCompare": ("Verified", B2+"gallery /dev/components; parity 0.54% Day / 0.71% Night; component test (tab keys); axe both themes"),
 "COMP-VesselTypeCard": ("Verified", B2+"gallery /dev/components; parity 7.38% Day / 7.36% Night (allowlisted reason); axe both themes"),
 "BRAND-004": ("Verified", B2+"messages in sentence case; uppercase only via CSS text-transform"),
 "BRAND-005": ("Verified", B2+"tests/unit/format.test.ts (US$1,240, minor units)"),
 "BRAND-006": ("Verified", B2+"tests/unit/format.test.ts (12 Feb 2027)"),
 "BRAND-007": ("Verified", B2+"tests/unit/format.test.ts (4 nights)"),
 "BRAND-011": ("Verified", B2+"ornament exists only in SectionHeading"),
 "BRAND-012": ("Verified", B2+"radius-lg only on CruiseSearch panel/popovers; radius-sm on inputs; stylelint token rule"),
 "BRAND-013": ("Verified", B2+"Media renders next/image when a photo exists, else Scene"),
 "BRAND-015": ("Verified", B2+"own icon set only (icons.ts from bundle); amenity labels in messages; AmenityGrid test"),
 "BRAND-016": ("Verified", B2+"type icon on CruiseCard eyebrow, VesselCompare tabs, VesselTypeCard art"),
 "BRAND-017": ("Verified", B2+"NavBar wordmark Nilecruz; screenshots"),
 "BRAND-018": ("Verified", B2+"dusk-* used only for Scene and saved heart; brass-500 only ornaments/route dashes"),
 "BRAND-019": ("Verified", B2+"Badge/AmenityGrid statuses carry words and icons; AmenityGrid test"),
 "BRAND-020": ("Verified", B2+"Hero on-media over scrim, extended on phones; screenshots"),
 "BRAND-022": ("Verified", B2+"card padding space-5, grid gaps space-5, container gutters (shell)"),
 "BRAND-023": ("Verified", B2+"hover fills/borders, selected primary, disabled 45% (Button, chips, CabinPicker)"),
 "BRAND-024": ("Verified", B2+"lining figures on prices (PriceAnatomy/BookingSummary fixed), tabular on totals/steppers"),
 "BRAND-027": ("Verified", B2+"no felucca variant in VesselArt/Scene/ExperienceCard; parity allowlist records it"),
 "ENG-007": ("Verified", B2+"/dev/components index + 23 pages, every state, Day/Night; tests/unit/registry.test.ts; gated by ENABLE_DEV_ROUTES"),
 "ENG-009": ("Verified", B2+"tests/e2e/parity.spec.ts + parity-allowlist.json; report docs/screenshots/batch-02/parity/report.json"),
 "A11Y-002": ("Verified", B2+"keyboard component tests; e2e focus walk"),
 "A11Y-003": ("Verified", B2+"e2e 'every focusable control shows the 2px focus ring'"),
 "A11Y-004": ("Verified", B2+"e2e reduced-motion test (0 running animations, no tilt, count-up jumps); animation delays zeroed"),
 "A11Y-005": ("Verified", B2+"axe colour-contrast on every gallery page, Day and Night"),
 "A11Y-007": ("Verified", B2+"TextField labels/errors; CruiseSearch age error with role=alert"),
 "A11Y-008": ("Verified", B2+"PriceAnatomy bar text alternative test; status words"),
 "A11Y-009": ("Verified", B2+"tabs, radio groups, carousel keyboard tests"),
 "A11Y-010": ("Verified", B2+"aria-live on totals, counts, stepper output"),
 "PERF-005": ("Verified", B2+"Media/Hero use next/image with sizes (no real photos yet; re-checked on pages in Batch 5)"),
 "I18N-007": ("Verified", B2+"Button labels wrap; e2e no sideways scroll at 375 px on every gallery page"),
 "I18N-008": ("Verified", B2+"global :lang(ja) tracking 0; component tracking overrides (tagline, labels)"),
 "I18N-010": ("Verified", B2+"format.test.ts locale cases (es, ja)"),
 "DATA-010": ("Verified", B2+"StateView (loading, empty, error, denied) in EN/ES/JA; gallery stories"),
 "BRAND-021": ("In progress", B2+"Carried over to Batch 6: section spacing and alternating bands are page composition (first applied on the homepage); components follow their own spacing tokens"),
})
B3 = "Batch 3 (17 Oct 2026): "
STATUS.update({
 "DATA-001": ("Verified", B3+"supabase/tests/020_data_formats.sql (no float money; money-like columns bigint); currency_code domain; validation.test.ts 'money'"),
 "DATA-002": ("Verified", B3+"020_data_formats.sql 'every timestamp has a time zone'"),
 "DATA-005": ("Verified", B3+"vessels, vessel_translations, destinations, media in Supabase; article, faq, vesselTypeProfile, priceFactorSet in Sanity (studio/schemaTypes); components take data by props (Batch 2)"),
 "DATA-006": ("Verified", B3+"is_sample on vessels/destinations/media, Sanity 'sample' field (default on); src/lib/data/sample.ts + data-helpers.test.ts"),
 "DATA-013": ("Verified", B3+"supabase/seed.sql: 11 users (every platform, admin and team role), 4 organisations, 4 sample vessels in every visibility; supabase/seed-users.md"),
 "DATA-014": ("Verified", B3+"approved by Faris 17 Oct 2026; docs/imports/vessels-dry-run.md: 609 source records, 622 vessels (14 from the bundled unverified-names record), 0 skipped; staging holds 622 private drafts (368 motor, 251 sail, 3 steam), 622 private-facts rows, 1,244 audit entries; re-run inserts 0; anonymous API sees 0"),
 "DATA-044": ("Verified", B3+"studio/schemaTypes/documents/egyptologist.ts (field-level EN/ES/JA, photo consent required); schema validates (pnpm studio:check). Content from Faris: CONTENT-NEEDED #13"),
 "DATA-045": ("Verified", B3+"scripts/lib/vessel-import.ts; vessel-import.test.ts; Faris confirmed the Sudan as the only steamer (ADR-060): 3 Sudan records steam, Karim, Misr and Sphinx stay motor"),
 "SEC-001": ("Verified", B3+"010_rls_coverage.sql (RLS on and a policy on every table); 030_isolation.sql (23 checks); 060_privileges.sql; tests/db-api/rest.test.ts through PostgREST and Auth; staging: grant diff empty, anonymous API refused on private tables (ADR-061)"),
 "SEC-004": ("Verified", B3+"src/server/validation (zod, mirrors DB checks); parseInput/withInput; validation.test.ts"),
 "SEC-010": ("Verified", B3+"040_audit.sql: update, delete, truncate refused for owner and service role; direct inserts refused; role changes and catalogue writes logged by triggers"),
 "SEO-030": ("Verified", B3+"app.is_reserved_slug check; 050_catalogue_rules.sql; validation.test.ts (list equals the SQL function); import renames reserved slugs"),
 "I18N-011": ("Verified", B3+"*_translations tables (en/es/ja); pickTranslation English fallback + data-helpers.test.ts; Sanity document-level and field-level translations, English required"),
 "BRAND-008": ("Verified", B3+"vessel_type enum sail/motor/steam; labels from messages (Batch 2); Sanity vesselTypeProfile options use the exact labels"),
 "BRAND-009": ("Verified", B3+"destinations.name holds the common English name (seed: Luxor, Aswan, Edfu); Sanity destinationStory joins by slug, so names have one source"),
 "BRAND-014": ("Verified", B3+"media_one_parent and path-matches-parent checks; 050_catalogue_rules.sql; 030 'operator A cannot add photos to operator B's vessel'; private storage bucket served only with a readable media row"),
})
B4A = "Batch 4a (17 Oct 2026): "
STATUS.update({
 "DASH-ROLE-001": ("Verified", B4A+"e2e dashboard.spec 'each role lands in its own workspace' (8 seed users + applied company); unit auth.test 'workspaces'"),
 "DASH-ROLE-002": ("Verified", B4A+"admin workspace behind requireAdmin + aal2; e2e 'seeded admin … reaches the admin workspace'; DB 030/070; scope grows in 4b–4h"),
 "DASH-ROLE-003": ("Verified", B4A+"requireOrgRole + RLS (Batch 3); e2e operator A refused operator B and partner workspaces (403); DB 030 isolation"),
 "DASH-ROLE-004": ("Verified", B4A+"customers reach only My journey; e2e customer refused admin, operator and partner (403); profile RLS 030"),
 "DASH-ROLE-005": ("Verified", B4A+"partner roles: e2e finance sees Payments not Search, reservations refused Payments (403); company status gate"),
 "DASH-ROLE-006": ("Verified", B4A+"src/lib/auth/dashboard-nav.ts (sections per role, from the guide); e2e 'navigation changes with role'; phone Sections menu"),
 "DASH-ROLE-007": ("Verified", B4A+"team roles in navFor/sectionAccess and requireOrgRole; e2e viewer and finance refusals; DB 030 viewer can't edit"),
 "DASH-ROLE-008": ("Verified", B4A+"admin sub-roles in nav and requireAdmin(roles); e2e catalogue admin refused finance (403); DB 070 only super admins change roles"),
 "DASH-CUS-013": ("Verified", B4A+"/account/security/: change email (double confirmation), change password (current required), two-step on/off, sign out everywhere; e2e auth.spec"),
 "SEC-002": ("Verified", B4A+"guards in every dashboard page and action; ESLint local/server-action-guard; e2e 11 cross-role 403 checks"),
 "SEC-005": ("Verified", B4A+"httpOnly SameSite=Lax cookies (e2e), server-side sign-out revokes copied cookies (e2e), cross-origin sign-out 403, safe return paths (unit), sign-in without JS (e2e)"),
 "SEC-014": ("Verified", B4A+"e2e sign-up confirmation, reset link, used link refused, reset needs a fresh link, email change confirmed from both addresses; branded templates"),
 "SEC-015": ("Verified", B4A+"app.is_admin() requires aal2 (DB 030/070, API test); app sends admins to set-up or code screen (e2e); admins can't turn it off (e2e)"),
 "DATA-003": ("Verified", B4A+"formatCairo + CairoTime; unit cairo-time.test (winter, summer, 29 Oct 2026 repeated hour); e2e 'dashboard shows Cairo time'"),
})
B4B = "Batch 4b (18 Oct 2026): "
STATUS.update({
 "DASH-ADM-001": ("Verified", B4B+"overview counter 'Operator applications awaiting approval' → /operators/?status=applied; e2e operator flow"),
 "DASH-ADM-002": ("Verified", B4B+"overview counters for private drafts and submissions awaiting review; e2e catalogue.spec 'activity history'"),
 "DASH-ADM-007": ("Verified", B4B+'every counter links to its pre-filtered list (operators ?status=applied, catalogue ?visibility=private, submissions ?status=submitted)'),
 "DASH-ADM-008": ("Verified", B4B+'/dashboard/admin/activity/ reads the append-only audit log with names, changed fields, Cairo time, filters; e2e catalogue.spec'),
 "DASH-ADM-009": ("Verified", B4B+'overview is a queue only; later counters say which batch brings them; no reporting views'),
 "DASH-ADM-010": ("Verified", B4B+"catalogue search by name or alias; e2e catalogue.spec 'search and filters'"),
 "DASH-ADM-011": ("Verified", B4B+"visibility filter; e2e catalogue.spec 'search and filters'"),
 "DASH-ADM-012": ("Verified", B4B+'readiness filter and Incomplete marker with count; e2e catalogue.spec'),
 "DASH-ADM-013": ("Verified", B4B+'editor holds name, type, route, category, description EN/ES/JA, photos, cabins, operator, Best for labels'),
 "DASH-ADM-014": ("Verified", B4B+'/catalogue/new/ creates a private draft with a safe address name'),
 "DASH-ADM-015": ("Verified", B4B+"editor saves details, descriptions, photos; e2e catalogue.spec 'edit details, descriptions and a photo'"),
 "DASH-ADM-016": ("Verified", B4B+'operator list shows approved operators only and the action re-checks status on the server'),
 "DASH-ADM-017": ("Verified", B4B+'Publish action only when the readiness check is complete; e2e catalogue.spec refusal'),
 "DASH-ADM-018": ("Verified", B4B+'readiness list in the editor (src/lib/catalogue/readiness.ts, unit tests); updates after a photo is added (e2e)'),
 "DASH-ADM-019": ("Verified", B4B+'showcase is visible but never bookable (no rates exist; DATA-024); 110_showcase.sql'),
 "DASH-ADM-020": ("Verified", B4B+'template download route (text/csv, example row refused); e2e'),
 "DASH-ADM-021": ("Verified", B4B+'CSV upload (2 MB, 2,000 rows); e2e'),
 "DASH-ADM-022": ("Verified", B4B+'row-by-row preview stored before anything is written; unit csv tests; e2e preview counts'),
 "DASH-ADM-023": ("Verified", B4B+'confirmed rows become private drafts; e2e checks visibility private'),
 "DASH-ADM-024": ("Verified", B4B+'duplicates by source reference or name skipped (again re-checked at confirmation); unit + e2e'),
 "DASH-ADM-025": ("Verified", B4B+'import columns are profile fields only; unknown columns refused (unit)'),
 "DASH-ADM-026": ("Verified", B4B+'evaluations created and edited from the vessel editor'),
 "DASH-ADM-027": ("Verified", B4B+"seven dimensions of method v1 (ADR-070); unit 'weights sum to 100'"),
 "DASH-ADM-028": ("Verified", B4B+'four criteria per dimension scored 0–5 (half points); DB and unit validation'),
 "DASH-ADM-029": ("Verified", B4B+'dimension results (sum ÷ 20) × weight in app.evaluation_results; 080_evaluations.sql vector equals unit vector'),
 "DASH-ADM-030": ("Verified", B4B+"overall score out of 100 stored by the database; unit 'all 5s 100, all 4s 80, vector 74.5'; e2e 80.75"),
 "DASH-ADM-031": ("Verified", B4B+'assessment date, evaluator, fixed verdict (ADR-074) and notes EN/ES/JA'),
 "DASH-ADM-032": ("Verified", B4B+'published flag; 080: anon and operators read only published evaluations of visible vessels'),
 "DASH-ADM-033": ("Verified", B4B+'external_ratings table, separate from evaluations; editor copy and e2e'),
 "DASH-ADM-034": ("Verified", B4B+'safety observations admin-only (080: anon refused, operator sees none); e2e'),
 "DASH-ADM-035": ("Verified", B4B+'operators prepare and submit vessel information; e2e round-trip'),
 "DASH-ADM-036": ("Verified", B4B+'states draft → submitted → changes requested → approved/rejected enforced in app.submission_transition; 090 history test'),
 "DASH-ADM-037": ("Verified", B4B+'admin review page shows proposal next to current values'),
 "DASH-ADM-038": ("Verified", B4B+'history of states and edits (vessel_submission_events); 090'),
 "DASH-ADM-039": ("Verified", B4B+'request changes with a required note; operator sees it (e2e)'),
 "DASH-ADM-040": ("Verified", B4B+'approve (applies proposal / creates private draft) or reject with reason; 090 + e2e'),
 "DASH-ADM-041": ("Verified", B4B+"submitted proposals locked (090) and the vessel under review can't be edited, even by admins (090)"),
 "DASH-ADM-042": ("Verified", B4B+'operators list and detail with application facts; e2e'),
 "DASH-ADM-043": ("Verified", B4B+'approve / pause / reject with reason; e2e approval'),
 "DASH-ADM-044": ("Verified", B4B+'connect and disconnect vessels on the operator page'),
 "DASH-OPR-006": ("Verified", B4B+'operator cruises page: propose new vessel or changes, save draft, submit; e2e'),
 "DASH-OPR-007": ("Verified", B4B+'operator reads feedback, edits and resubmits; e2e'),
 "DASH-BND-004": ("Verified", B4B+'import screen states its scope (vessel profiles only); e2e'),
 "DASH-BND-005": ("Verified", B4B+'external ratings entered by hand with source and date read; no automatic refresh'),
 "DATA-021": ("Verified", B4B+'Publish refused until readiness incl. cabin types and rates (4c) is complete; e2e refusal'),
 "DATA-024": ("Verified", B4B+'dated showcase with reason (DB check), expires (110_showcase.sql); e2e showcase'),
})
B4C1 = "Batch 4c-1 (18 Oct 2026): "
STATUS.update({
 "DASH-ADM-048": ("Verified", B4C1+'cabin_types table + editor (name, description EN/ES/JA, photos, size, beds, occupancy, view, balcony, amenities, active); e2e product.spec'),
 "DASH-ADM-049": ("Verified", B4C1+'deck on every cabin type (Lower/Middle/Upper or vessel name); grouped by deck'),
 "DASH-ADM-050": ("Verified", B4C1+'same category on two decks = two cabin types (codes unique per vessel); e2e product.spec Middle and Upper'),
 "DASH-ADM-051": ("Verified", B4C1+'schedules: directional route, nights, ISO sailing days, periods, itinerary days EN/ES/JA; generate_departures (120: 8 sailings, idempotent); unit departures'),
 "DASH-ADM-052": ("Verified", B4C1+'several schedules per vessel (unique code per vessel)'),
 "DASH-ADM-053": ("Verified", B4C1+'rates: departure × cabin type × occupancy × plan × currency, amount in minor units; 120'),
 "DASH-ADM-054": ("Verified", B4C1+"bulk form applies to one date (From = To) or all matching dates and weekdays; e2e product.spec 'Updated 8 departures'"),
 "DASH-ADM-055": ("Verified", B4C1+"inventory confirmed_at + source; app.inventory_is_fresh (120); 'To confirm' badge; overview issues; unit freshness"),
 "DASH-ADM-056": ("Verified", B4C1+"inventory keyed by departure and cabin type, separate from rates; 120 'two prices share one quantity'; e2e product.spec EUR leaves 6 cabins"),
 "DASH-ADM-074": ("Verified", B4C1+'promotions by owners and catalogue admins; e2e product.spec'),
 "DASH-ADM-075": ("Verified", B4C1+'percentage kind; unit promotedPrice; e2e product.spec'),
 "DASH-ADM-076": ("Verified", B4C1+'fixed amount kind in its own currency (DB check on rate currency); unit'),
 "DASH-ADM-077": ("Verified", B4C1+'included extra kind (benefit text, price unchanged); unit'),
 "DASH-ADM-078": ("Verified", B4C1+'upgrade kind referencing an active cabin type of the same vessel; 120'),
 "DASH-ADM-079": ("Verified", B4C1+'booking period (booking_from/to)'),
 "DASH-ADM-080": ("Verified", B4C1+'departure dates restrict the resolved rates'),
 "DASH-ADM-081": ("Verified", B4C1+'applies to selected rates resolved from cabin types, plans and dates (promotion_rates)'),
 "DASH-ADM-082": ("Verified", B4C1+'benefit and terms EN/ES/JA (promotion_translations)'),
 "DASH-ADM-083": ("Verified", B4C1+'pause and resume; e2e product.spec'),
 "DASH-ADM-084": ("Verified", B4C1+'upgrade only with available inventory in the upgraded cabin type, never creates stock (120)'),
 "DASH-ADM-085": ("Verified", B4C1+"a rate carries one promotion (unique rate_id): 120 and e2e product.spec '8 skipped'"),
 "DASH-OPR-001": ("Verified", B4C1+"RLS and requireProductEditor: operator A can't touch operator B's product (120); vessel must belong to the workspace's company"),
 "DASH-OPR-004": ("Verified", B4C1+'operator overview lists upcoming departures; e2e product.spec'),
 "DASH-OPR-005": ("Verified", B4C1+'overview lists departures without availability, needing confirmation, or without rates (feed errors join in 4c-2)'),
 "DASH-OPR-008": ("Verified", B4C1+'operator cabin pages (descriptions, photos, decks, capacities)'),
 "DASH-OPR-009": ("Verified", B4C1+'operator schedules, departures and rates pages'),
 "DASH-OPR-010": ("Verified", B4C1+'plans international, Egyptian citizen, foreign resident, trade (ADR-078); E£ only for local plans (DB check, unit, e2e)'),
 "DASH-OPR-012": ("Verified", B4C1+'owners only (reservations get 403); e2e product.spec'),
 "DATA-015": ("Verified", B4C1+'vessels.gratuity_usd_minor ≥ 500 (DB check, 120); form refuses US$4 (e2e); unit gratuity counts ages 3+; never in totals'),
 "DATA-019": ("Verified", B4C1+'default bands in platform_settings and code; unit tests at 2/3/5/6/11/12 and age on departure incl. leap day'),
 "DATA-022": ("Verified", B4C1+'operator override on the operator page, validated (no gaps), audited; new rates only (rates.child_bands snapshot; e2e keeps 25%)'),
 "DATA-023": ("Verified", B4C1+"max_occupancy 1–3 per cabin type (DB, 120); occupancy rule unit-tested (infants under 3 don't count, adult needed)"),
})
B4C2 = "Batch 4c-2 (18 Oct 2026): "
STATUS.update({
 "DASH-ADM-006": ("Verified", B4C2+"overview counters 'Inventory connection errors' (failing active feeds + API calls with refused rows in 24 h) and 'Inventory feeds awaiting approval', each linking to the filtered operators list; e2e connections.spec"),
 "DASH-ADM-045": ("Verified", B4C2+'operators list: modes in use and the last error per operator, filter "with connection errors"; operator page: health per route, feed, keys, recent activity; e2e connections.spec + axe'),
 "DASH-ADM-046": ("Verified", B4C2+'manual entry (4c-1), paste, feed and API all supported; modes shown per operator; all three write through app.apply_inventory_rows (130_connections)'),
 "DASH-ADM-047": ("Verified", B4C2+"feeds start 'pending'; only catalogue admins with two-step approve (130: owner, reservations, aal1 admin refused); a changed address needs a new approval (130); approval pulls once (e2e)"),
 "DASH-OPR-005": ("Verified", B4C2+'overview issues now include feed awaiting approval, not approved or paused, and the last feed/API problem; e2e connections.spec'),
 "DASH-OPR-016": ("Verified", B4C2+'owners configure paste, feed and API on Inventory connections (owners only, as in the menu; RLS + functions check again); e2e connections.spec'),
 "DASH-OPR-024": ("Verified", B4C2+'JSON or XML (format v1, ADR-080) pasted or uploaded; row-by-row preview, nothing written until applied, checked again on apply; unit format tests; 130; e2e connections.spec'),
 "DASH-OPR-025": ("Verified", B4C2+'https feed address, checked after DNS on save and inside every connection; pulled hourly by pg_cron via a signed call (ADR-081); e2e pulls from a local https server'),
 "DASH-OPR-026": ("Verified", B4C2+'Ed25519 key pairs (ADR-085): private key shown once, two active for rotation, revoke; signed POST /api/v1/inventory/; e2e signed call, replay, tamper, revoked key'),
 "DASH-OPR-027": ("Verified", B4C2+'health per route: last success, data age, rows changed, last problem in plain words; recent activity of pastes, pulls and API calls; e2e connections.spec'),
 "SEC-007": ("Verified", B4C2+'https 443/8443 only; private, internal, metadata, IPv6 loopback, mapped and NAT64 addresses refused inside the DNS lookup used to connect (no rebinding); redirects re-checked; 5 MB, 20 s, no compression; XML without DTD/entities; unit tests incl. local server; e2e 169.254.169.254 refused'),
 "SEC-008": ("Verified", B4C2+'only the Ed25519 public key is stored (130: no secret column), max two active (130, trigger), revoked keys stay revoked; e2e: stored row has no private key'),
 "SEC-009": ("Verified", B4C2+'Ed25519 signature over method, path, timestamp (±5 min), idempotency key, body hash; idempotency per company 24 h (replay returns the first answer, different body 422); webhooks signed the same way (unit; sending in 4e)'),
})
B4D = "Batch 4d (18 Oct 2026): "
STATUS.update({
 "DASH-ADM-058": ("Verified", B4D+'tours table with kind (museum visit, excursion, evening tour, transfer, other), separate from cruises; admin Tours and sightseeing; e2e tours.spec'),
 "DASH-ADM-059": ("Verified", B4D+'name, location (optional destination link), duration in minutes (15 min to 14 days); e2e'),
 "DASH-ADM-060": ("Verified", B4D+'description and step-by-step itinerary per language (EN/ES/JA); e2e EN and ES'),
 "DASH-ADM-061": ("Verified", B4D+'photos on media with a tour parent: credit, alt EN/ES/JA, rights confirmation; e2e upload'),
 "DASH-ADM-062": ("Verified", B4D+'inclusions and exclusions per language, one per line; e2e'),
 "DASH-ADM-063": ("Verified", B4D+'meeting point or pickup per language; e2e'),
 "DASH-ADM-064": ("Verified", B4D+'tour_suppliers (company, contact, email, phone, registration, notes), admins only, never public (140); e2e add + assign'),
 "DASH-ADM-065": ("Verified", B4D+'cancellation wording per language + bands validated in DB and code (cover day 0, never cheaper closer): 140, unit, e2e refuses bands without day 0'),
 "DASH-ADM-066": ("Verified", B4D+'standalone flag + assignment to cruise schedules (tour_schedules); e2e'),
 "DASH-ADM-067": ("Verified", B4D+'sessions with start/end (Cairo in, UTC stored), capacity, US$/€ and price; bulk creation by dates, weekdays and times, idempotent (unit incl. summer time; e2e 22 + 0 of 22)'),
 "DASH-ADM-068": ("Verified", B4D+'shared or private sessions; both offered for the same start (140, e2e)'),
 "DASH-ADM-069": ("Verified", B4D+'per guest or per group; shared is always per guest (140); unit price maths: ages 3+ pay, under-3s free, group price once, adults-only (ADR-087)'),
 "DASH-ADM-070": ("Verified", B4D+'programs with days, tours by day, descriptions EN/ES/JA, linked to cruise schedules; day N = departure + N − 1 (unit); e2e'),
 "DASH-ADM-071": ("Verified", B4D+'availability grid per upcoming departure for a party size; missing sessions named (unit, e2e 1 of 2 / 2 of 2 / 8 guests)'),
 "DASH-ADM-073": ("Verified", B4D+'published tours are information-only until supplier + bands + a future session (public.tour_is_bookable, 140; unit; e2e badge changes to bookable)'),
 "DATA-042": ("Verified", B4D+'only admins manage tours; catalogue/super everything, content texts and photos only (ADR-087); operators and partners refused (140, e2e 403)'),
})
B4E = "Batch 4e (18 Oct 2026): "
STATUS.update({
 "DASH-ADM-004": ("Verified", B4E+"admin overview counter 'Current and upcoming bookings' (reservations not cancelled, not yet returned), linking to Requests and bookings; e2e bookings.spec"),
 "DASH-ADM-057": ("Verified", B4E+'no cabin limit: accept_offer takes as many cabins as the offer lists, only against inventory (150: 3 cabins refused when 2 left; db-api concurrency)'),
 "DASH-ADM-090": ("Verified", B4E+'admin Requests and bookings lists every request (RLS: admins read all); e2e'),
 "DASH-ADM-091": ("Verified", B4E+'every offer with operator, version, status, total; e2e'),
 "DASH-ADM-092": ("Verified", B4E+'every reservation; e2e'),
 "DASH-ADM-093": ("Verified", B4E+'booking record: sailing, guests, cabins and decks, prices, payment status, terms and policy as accepted (ReservationRecord); e2e admin opens it'),
 "DASH-ADM-094": ("Verified", B4E+'incomplete transactions: reservations awaiting payment, requests with no offer after 3 days'),
 "DASH-ADM-096": ("Verified", B4E+'search by booking reference, operator, route and departure dates; e2e finds by reference'),
 "DASH-OPR-002": ("Verified", B4E+'operator overview counter of new requests to answer + new-request notices (150, e2e)'),
 "DASH-OPR-003": ("Verified", B4E+'operator overview counter of outstanding (open, unexpired) offers'),
 "DASH-OPR-011": ("Verified", B4E+'operators answer matching requests with personal offers (send_offer; 150; e2e two operators)'),
 "DASH-OPR-017": ("Verified", B4E+'an offer names a departure and, per cabin, the cabin type and who sleeps there (150, e2e)'),
 "DASH-OPR-018": ("Verified", B4E+'price from rates and child bands unless changed with a price note; inclusions, terms, expiry 24 h–14 days (default 72 h, ADR-088); unit + 150'),
 "DASH-OPR-019": ("Verified", B4E+"required 'Who this offer is for' (family make-up, eligibility) shown to the customer"),
 "DASH-OPR-020": ("Verified", B4E+'sending holds no cabins (150; e2e inventory unchanged after sending)'),
 "DASH-OPR-021": ("Verified", B4E+'accept_offer re-checks version, expiry, bookable gate and ages, locks inventory in a fixed order; db-api: 20 parallel acceptances for 3 cabins → exactly 3, availability 0, no deadlocks; e2e sold-out refusal'),
 "DASH-OPR-022": ("Verified", B4E+'offer cabins store the deck as offered (150; e2e shows Upper deck)'),
 "DASH-OPR-023": ("Verified", B4E+'offers are immutable; a change sends version N+1 and supersedes the old, which cannot be accepted; customer told to review (150, e2e)'),
 "DASH-CUS-004": ("Verified", B4E+'My journey → Cruise requests lists each request with status and offer count; e2e'),
 "DASH-CUS-005": ("Verified", B4E+'offers side by side (latest version per offer) on the request and on Offers; e2e two offers'),
 "DASH-CUS-006": ("Verified", B4E+'each offer shows real dates, route, vessel, cabins and decks, price per cabin and total, gratuity separately'),
 "DASH-CUS-007": ("Verified", B4E+'accept page shows terms and the cancellation policy; tick + guest names and dates of birth; only open, current versions (unit, 150, e2e)'),
 "DASH-CUS-014": ("Verified", B4E+'request: route or flexible, date window, back-by date, nights, adults, each child’s age, cabins, sharing notes, budget, notes; unit requestProblems'),
 "DASH-CUS-015": ("Verified", B4E+'the request page says it asks for offers: no bid and no lowest price guaranteed'),
 "DASH-BND-001": ("Verified", B4E+'public.departure_bookable: published vessel, approved operator, future scheduled departure, cancellation policy, a cabin type with a rate and fresh availability (150; unit gateProblems; operator builder flags unbookable sailings)'),
 "SEC-013": ("Verified", B4E+'passengers readable only by the customer, the operator’s team and admins (RLS, 150: other operator and partner see none; e2e 404); passenger changes audited without copying data; proofs in a private bucket'),
 "DATA-020": ("Verified", B4E+'requests store each child’s age; offers store ages per cabin; acceptance checks ages on the departure date (unit, 150)'),
})
B4F1 = "Batch 4f-1 (18 Oct 2026): "
STATUS.update({
 "DASH-PAY-001": ("Verified", B4F1+'deadlines (reservations.payment_due_at, app.payment_deadline) and cancellation policies (cancellation_policies, 4e) are separate tables and code'),
 "DASH-PAY-002": ("Verified", B4F1+'24 Dec–7 Jan or a premium period: 3 days (unit boundaries 23/24 Dec, 7/8 Jan; 160)'),
 "DASH-PAY-003": ("Verified", B4F1+'other October–April: 7 days (unit 30 Apr, 1 Oct, 20/30 Mar)'),
 "DASH-PAY-004": ("Verified", B4F1+'May–September: 14 days (unit 1 May, 30 Sep)'),
 "DASH-PAY-005": ("Verified", B4F1+'never later than the end of the day before departure; the booking day for last-minute bookings (unit, 160)'),
 "DASH-PAY-006": ("Verified", B4F1+'finance admins add, edit and remove premium periods (Deposits and commission → Premium calendar; e2e)'),
 "DASH-PAY-007": ("Verified", B4F1+'Western Easter 21–29 Mar 2027 seeded (160; e2e sees it)'),
 "DASH-PAY-008": ("Verified", B4F1+'hourly pg_cron app.release_unpaid cancels unpaid reservations past the deadline and returns cabins (160; unit releaseDecision)'),
 "DASH-PAY-009": ("Verified", B4F1+'a reported payment awaiting verification keeps the reservation for admin review (not released): finance page lists them; unit'),
 "DASH-PAY-010": ("Verified", B4F1+'deadline set by trigger at booking and frozen (keep_deadline trigger, 160: rewrite refused, new premium period leaves it); policy snapshot from 4e'),
 "DASH-PAY-013": ("Verified", B4F1+'policy acknowledged at acceptance (4e) and again before card payment (startCheckout refuses without the tick; e2e)'),
 "DASH-ADM-003": ("Verified", B4F1+"overview counter 'Payments awaiting verification' linking to the finance queue; e2e"),
 "DASH-ADM-097": ("Verified", B4F1+'finance/super admins with two-step verify or reject reported payments (verify_payment; 160: customer, operator, aal1 refused); e2e'),
 "DASH-ADM-098": ("Verified", B4F1+'Deposits and commission: all payments, receipts, payables, payouts'),
 "DASH-ADM-099": ("Verified", B4F1+'premium calendar on the finance page; e2e adds a period'),
 "DASH-ADM-100": ("Verified", B4F1+'payment requests: the reservation shows what is due by when with Pay by card / report a transfer; operators send reminders (send_payment_reminder, 12 h limit; e2e)'),
 "DASH-ADM-101": ("Verified", B4F1+'reported payments with amount, date, reference and optional private proof (report_payment; e2e)'),
 "DASH-ADM-102": ("Verified", B4F1+'each received payment gets a receipt number NCR-YYYY-NNNNNN and a printable receipt page (160, e2e)'),
 "DASH-ADM-103": ("Verified", B4F1+'total, received, outstanding, reported, deadline on customer, operator and admin views (reservation_balance; 160; e2e)'),
 "DASH-ADM-106": ("Verified", B4F1+'commission_entries per verified payment (kind payment; reversal kind ready for 4f-2 refunds); unit commission and reversal'),
 "DASH-ADM-107": ("Verified", B4F1+'finance page and payout messages say recording never charges a card or moves money; card status only from Stripe webhooks'),
 "DASH-OPR-013": ("Verified", B4F1+'operator booking page shows payment status, balance and deadline (e2e)'),
 "DASH-OPR-014": ("Verified", B4F1+'narrowed by ADR-089: operators send payment reminders; only Nilecruz admins record money (160 refuses; e2e no record button, 403 on finance)'),
 "DASH-CUS-008": ("Verified", B4F1+'reservation shows deadline (with its rule in words), total, received, outstanding (e2e)'),
 "DASH-CUS-009": ("Verified", B4F1+'report a transfer and follow its status: reported → received (e2e)'),
 "DASH-BND-008": ("Verified", B4F1+'operational tracking only: no accounting or bank settlement; payouts are records of transfers made elsewhere; refunds need admin approval (4f-2)'),
 "DATA-026": ("Built", B4F1+'Stripe Checkout for the outstanding balance in US$/€ (unit checkoutParams); live Checkout untested until Faris adds Stripe test keys (CONTENT-NEEDED #23)'),
 "DATA-028": ("Verified", B4F1+'status changes only from signature-verified webhooks; repeats change nothing (service_card_payment idempotent per intent; 160; e2e bad signature 400, duplicate)'),
 "DATA-030": ("Built", B4F1+'card entry only on Stripe-hosted Checkout (no card fields in our app); test mode on staging once Faris adds test keys'),
 "DATA-035": ("Verified", B4F1+'payments go to Nilecruz (one Stripe account, no Connect); receipts say received by Nilecruz'),
 "DATA-036": ("Verified", B4F1+'10 % from platform_settings.commission_bp, half-up, never on the gratuity (not in totals); proportional reversal unit-tested; 4f-2a: refunds write reversal entries (170: 10 % of the charge kept)'),
 "DATA-037": ("Verified", B4F1+'each verified payment creates the operator payable; admins record payouts; balances per operator and currency (160, e2e)'),
 "DATA-038": ("Verified", B4F1+'operator owners and finance see payables, payouts and balance read-only; viewers and other operators see none (160, e2e)'),
 "DATA-039": ("Verified", B4F1+'Cairo calendar days from the booking date; 24 Dec and 7 Jan inclusive; season by departure date (unit at every boundary; SQL mirrors TS, 160)'),
 "DATA-040": ("Verified", B4F1+'release at the deadline unless a reported payment awaits verification (160; unit)'),
 "DATA-043": ("Verified", B4F1+'finance admins record manual payments with method, reference and approver (record_manual_payment; 160)'),
})
B4F2A = "Batch 4f-2a (19 Oct 2026): "
STATUS.update({
 "DASH-PAY-011": ("Verified", B4F2A+'each reservation keeps the bands and wording of the policy accepted at booking (4e snapshot); the charge uses those bands, never later edits (170)'),
 "DASH-PAY-012": ("Verified", B4F2A+'charge, refundable amount and unpaid charge from the Cairo days before departure on the day of the request (unit at every edge of the luxury and standard bands; app.cancellation_quote mirrors it, 170)'),
 "DASH-CUS-010": ("Verified", B4F2A+'the customer sees what cancelling today costs, asks (policy ticked), can withdraw, and follows requested → refund being issued → cancelled, with each refund listed (e2e)'),
 "DASH-OPR-015": ("Verified", B4F2A+'narrowed by ADR-089: the operator confirms or contests the figures with a note; it can\'t decide or refund (170 refuses; e2e no refund buttons)'),
 "DASH-ADM-005": ("Verified", B4F2A+"overview counter 'Cancellation requests and refund reviews' linking to the finance queue (e2e)"),
 "DASH-ADM-095": ("Verified", B4F2A+'finance/super admins with two-step approve or refuse (reason required) on the booking record, with the operator\'s check shown; queue on Deposits and commission (170, e2e)'),
 "DASH-ADM-104": ("Verified", B4F2A+'the finance workflow fixes the charge at the request and refreshes the refund against what was received at approval (170)'),
 "DASH-ADM-105": ("Verified", B4F2A+'refunds table: each refund against the payment it gives back, method, Stripe id or how/reference, who recorded it; audited (170, e2e)'),
 "DATA-029": ("Verified", B4F2A+'refunds only after a finance admin approves, never more than is due (stripe_refund_plan, service_record_stripe_refund; 170); Stripe refunds per card payment with idempotency keys, manual refunds for the rest; checked live against the Stripe sandbox: US$1,300 refund succeeded, recorded once, request closed, commission net 10 % of the charge'),
})
B4F2C = "Batch 4f-2c (19 Oct 2026): "
STATUS.update({
 "DASH-PAY-014": ("Verified", B4F2C+'tour orders have their own table, amount, terms snapshot, payments and refunds (tour_orders, tour_payments, tour_refunds); a tour payment never touches a reservation (190: no cruise payment or commission from a tour; unit: tour Checkout carries no reservation id); cancellation by the tour\'s own bands, decided by a finance admin (190, e2e)'),
 "DATA-027": ("Verified", B4F2C+'tour orders paid by card through Stripe Checkout as separate payments, recorded only from the signed webhook, once (190, e2e); checked live against the Stripe sandbox: US$200 paid on Checkout, the real event recorded once, order confirmed with a receipt, no cruise payment'),
 "DATA-041": ("Verified", B4F2C+'tour orders are Nilecruz\'s own sales: no operator payable and no commission entry (190; e2e checks no cruise payment row)'),
})
B4G = "Batch 4g (20 Oct 2026): "
STATUS.update({
 "DASH-CUS-001": ("Verified", B4G+'the customer workspace and its Overview heading are "My journey" (e2e)'),
 "DASH-CUS-002": ("Verified", B4G+'sections Overview, Requests and offers, Bookings, Tours and sightseeing, Past trips, Account (ADR-091; e2e checks the nav in order); URLs unchanged'),
 "DASH-CUS-003": ("Verified", B4G+'Overview: actions (pay, finish a held tour payment, eligibility proof, live offers; open cancellations and reported transfers shown as waiting) by deadline, next trip with its tours, coming up; journeyState() unit-tested per scenario; e2e on a seeded customer shows exactly their 4 actions and 4 upcoming items, another customer sees none'),
 "DASH-CUS-011": ("Verified", B4G+'"Suggested for your cruise": bookable tours linked to the cruise schedule with places on a sailing day; airport services only on embarkation and disembarkation days (unit, e2e); booking and orders from 4f-2c'),
 "DASH-CUS-012": ("Verified", B4G+'Past trips: finished and cancelled reservations, past tours and lapsed holds, closed and expired requests (accepted ones show as bookings); Cairo date boundary unit-tested; e2e'),
})
B4H1 = "Batch 4h-1 (20 Oct 2026): "
STATUS.update({
 "DASH-ADM-086": ("Verified", B4H1+'Admin → Travel partners: company, legal name, country, registration or licence number, website, contact, team (e2e)'),
 "DASH-ADM-087": ("Verified", B4H1+'catalogue/super admins approve trade access (e2e); only approved agencies can search (210)'),
 "DASH-ADM-088": ("Verified", B4H1+'pausing keeps the team and records; a paused agency keeps Overview, bookings and payments but can\'t search (210, e2e 403 and notice)'),
 "DASH-ADM-089": ("Verified", B4H1+'partners never read rate tables or operator screens; operators can\'t search as partners; company rates are per agency (210)'),
 "DASH-B2B-001": ("Verified", B4H1+'Search departures by dates, route, nights and guests over bookable departures with fresh availability (partner_search; e2e)'),
 "DASH-B2B-002": ("Verified", B4H1+'company rate, then trade rate, then public rate, labelled (ADR-092; 210, unit, e2e "Your company rate")'),
 "DASH-B2B-009": ("Verified", B4H1+'the owner invites colleagues who accept and land in the partner workspace (e2e); shared team page with operators'),
 "DASH-B2B-010": ("Verified", B4H1+'owner, reservations and finance roles; no viewer (database trigger, 210); finance users can\'t search (210, e2e 403)'),
 "DASH-B2B-011": ("Verified", B4H1+'apply for trade access from the account with registration details; admin approval required before searching (210, e2e)'),
 "DASH-B2B-012": ("Verified", B4H1+'trade channel = rate plan trade; one company = partner_rates set by the operator; never visible to customers, the public or other agencies (210, e2e)'),
})
B4H2A = "Batch 4h-2a (20 Oct 2026): "
STATUS.update({
 "DASH-B2B-003": ("Verified", B4H2A+'reservations users reserve 1–5 cabins from a search result at the agency\'s rate (partner_reserve: takes cabins under row locks, guests named, adults by count and children by age; 220, e2e)'),
 "DASH-B2B-005": ("Verified", B4H2A+'Company bookings and Payments pages; deadlines, balances, card and transfer, receipts, cancellations from 4f at company level; finance users and owners pay (220, e2e three-role booking)'),
 "DASH-B2B-006": ("Verified", B4H2A+'every guest named at booking; client reference kept in partner_booking_details, editable by owners and reservations users, not finance (220, e2e)'),
 "DASH-B2B-007": ("Verified", B4H2A+'selling total and the difference from the supplier total on the booking; hidden from the operator and the client record shows only the selling price (220, e2e)'),
 "DASH-B2B-008": ("Verified", B4H2A+'printable client booking record: agency name, client reference, trip, cabins, guests, cancellation terms, selling price; "Booked through Nilecruz" in small print; never the trade price or bank details (e2e)'),
 "DASH-B2B-013": ("Verified", B4H2A+'local-rate eligibility proof stays with the reservation and can be uploaded by the agency\'s owner or reservations users (policy acts_for_reservation); verified by the operator as before'),
})
B4H2B = "Batch 4h-2b (20 Oct 2026): "
STATUS.update({
 "DASH-B2B-004": ("Verified", B4H2B+'owners and reservations users send requests for the company; operators see them marked "Travel partner" and may offer at the trade rate (the trade plan is refused on customers\' requests); any owner or reservations user compares the offers and accepts one, with the client reference and selling price; the booking belongs to the company; finance users and customers see none of it (230, e2e)'),
})
B51 = "Batch 5-1 (20 Oct 2026): "
STATUS.update({
 "PAGE-060": ("Verified", B51+'/cruises/ with H1 "Compare Nile cruises", CruiseSearch, facet links and CruiseCards; CollectionPage, ItemList and BreadcrumbList; canonical and indexable (e2e marketplace)'),
 "PAGE-061": ("Verified", B51+'/cruises/dahabiyas/: sailing vessels only (unit facets, e2e)'),
 "PAGE-062": ("Verified", B51+'/cruises/motor-ships/: motor ships only (unit facets, e2e)'),
 "PAGE-064": ("Verified", B51+'/cruises/luxury/: vessels whose category is luxury, not deluxe (ADR-093; unit facets, e2e)'),
 "PAGE-066": ("Verified", B51+'/cruises/luxor-to-aswan/: vessels with a Luxor → Aswan itinerary (unit facets, e2e)'),
 "PAGE-067": ("Verified", B51+'/cruises/aswan-to-luxor/: vessels with an Aswan → Luxor itinerary (unit facets, e2e)'),
 "DASH-PUB-001": ("Verified", B51+'visitors browse published and showcase vessels with photo, type, route, nights and guests (e2e marketplace)'),
 "DASH-PUB-002": ("In progress", B51+'cards show the published Nilecruz evaluation as NN/100; the full evaluation on the vessel page follows in 5-2'),
 "DASH-PUB-004": ("Verified", B51+'"Compare" ticks on cards (up to three) open /cruises/compare/ with type, guests, cabins, decks, evaluation, from price and itineraries; noindex (unit, e2e)'),
 "DASH-PUB-005": ("Verified", B51+'one "from" price per vessel where an operator supplied a rate (public_vessel_prices; 240, e2e)'),
 "DASH-PUB-010": ("Verified", B51+'showcase and unbookable vessels stay listed as "Information only" with no price (240, unit, e2e)'),
 "BRAND-026": ("Verified", B51+'cards always show the maximum guests and no stars; ratings only from verified reviews, none yet (unit, e2e)'),
 "BRAND-028": ("Verified", B51+'cards show "NN/100 · Nilecruz evaluation"; external ratings are not on cards (unit, e2e)'),
 "PERF-010": ("Verified", B51+'listings are cached under the catalogue tag (static facet pages, cached data for the hub), refreshed by operator and admin changes, feed pulls, the inventory API and a signed refresh route, and every ten minutes (e2e: a vessel taken off sale leaves the listing after a refresh)'),
 "SEO-016": ("Verified", B51+'only the five listed facets exist; searches and comparisons are parameters canonical to the clean URL with noindex; unlisted facets 404 (unit, e2e)'),
 "DATA-012": ("Verified", B51+'CruiseSearch routes, dates and match counts come from real schedules and future departures (unit, e2e)'),
 "DATA-032": ("Verified", B51+'the lowest international per-person price for two over bookable departures in the next 12 months, with confirmed places, US$ before €; none otherwise (240)'),
 "SEO-004": ("In progress", B51+'breadcrumbs and BreadcrumbList on the hub, facets and comparison; vessel pages follow in 5-2'),
})
B52 = "Batch 5-2 (20 Oct 2026): "
STATUS.update({
 "PAGE-072": ("Verified", B52+'/cruises/{vessel}/ with H1 "{name} — {route}, {nights} nights", facts, gallery, itineraries with the day-by-day programme and next departures, cabins by deck, evaluation and external ratings; TouristTrip with AggregateOffer from the "from" price, BreadcrumbList, no AggregateRating (e2e marketplace-vessel, unit)'),
 "DASH-PUB-002": ("Verified", B51+'cards show NN/100; '+B52+'the vessel page shows the score, verdict, date, evaluator and the seven weighted dimensions (e2e)'),
 "DASH-PUB-003": ("Verified", B52+'external ratings on the vessel page only, with source, scale, review count and the date checked, labelled as not Nilecruz reviews (e2e)'),
 "DASH-PUB-008": ("Verified", B52+'every cabin and departure price only after sign-in (vessel_departure_prices refuses visitors; 250, e2e redirect to sign-in)'),
 "DASH-PUB-009": ("Verified", B52+'reserving needs an account (customer_reserve refuses visitors; 250, e2e)'),
 "DATA-033": ("Verified", B52+'signed-in customers see each cabin type\'s published price per departure (alone, two and three sharing) with places left; visitors see only the "from" price (250, e2e)'),
 "DASH-CUS-016": ("Verified", B52+'signed-in customers choose a departure, then a deck and cabin type (radio groups by deck), the party and the number of cabins, see the exact total and reserve (e2e exit criterion)'),
 "DASH-CUS-017": ("Verified", B52+'the deck view and the deck choice say "Schematic: not a floor plan … your cabin number is assigned by the operator" (e2e)'),
 "DASH-BND-002": ("Verified", B52+'a vessel without structured cabin types shows a plain empty state instead of a deck view (e2e)'),
 "DASH-BND-003": ("Verified", B52+'no screen draws numbered cabins or a floor plan; decks list cabin types only (e2e)'),
 "BRAND-003": ("Verified", B52+'"Only N cabins left" appears only from confirmed inventory and only at three or fewer; sold-out cabins can\'t be chosen (unit, 250)'),
 "SEO-004": ("Verified", B51+'hub, facets, comparison; '+B52+'vessel and reserve pages: visible breadcrumbs and BreadcrumbList (e2e)'),
 "SEO-013": ("In progress", B52+'vessel pages link up to /cruises/ and their type facet; links to the vessel-type hub and destination pages are rendered once those pages exist (Batches 6 and 7, ADR-093)'),
 "SEO-026": ("Verified", B52+'no AggregateRating anywhere until verified reviews exist (unit, e2e)'),
 "DATA-004": ("Verified", B52+'departure and assessment dates are formatted in the visitor\'s language as calendar dates (unit en/es/ja)'),
 "DATA-018": ("In progress", B52+'vessel pages and direct-booking terms say check-in on day 1 to check-out on the last day, transfers, flights and tours not included; the link to /tours-extras/transfers/ follows when that page exists (Batch 7)'),
 "DATA-031": ("Verified", B52+'one static page per vessel with every itinerary; ?itinerary=CODE switches it and the canonical stays the vessel URL (unit, e2e)'),
 "DATA-034": ("Verified", B52+'the vessel page\'s AggregateOffer uses only the public "from" price (lowPrice, priceCurrency) (unit, e2e)'),
})
B61 = "Batch 6-1 (21 Oct 2026): "
_link = 'the linking engine (link map from the workbook, scripts/link-map.py) and the CI link check (silo-links.spec) cover home and the Vessels silo; Guide and Prices follow in 6-2'
STATUS.update({
 "PAGE-001": ("Verified", B61+'home: Hero with CruiseSearch, the three vessel types, VesselCompare with catalogue figures, drafted sections, live cruises; Organization and WebSite data (silo-links.spec)'),
 "PAGE-026": ("Verified", B61+'/vessels/ pillar: vessel-type cards, comparison, children, drafted copy (silo-links.spec)'),
 "PAGE-027": ("Verified", B61+'/vessels/dahabiya/ hub (silo-links.spec)'),
 "PAGE-030": ("Verified", B61+'/vessels/dahabiya/a-day-on-board/ (silo-links.spec)'),
 "PAGE-032": ("Verified", B61+'/vessels/motor-cruise-ships/ hub (silo-links.spec)'),
 "PAGE-033": ("Verified", B61+'/vessels/motor-cruise-ships/a-day-on-board/ (silo-links.spec)'),
 "PAGE-036": ("Verified", B61+'/vessels/paddle-steamers/ hub; closing cruises filtered to steamers until /cruises/paddle-steamers/ exists (silo-links.spec)'),
 "PAGE-041": ("Verified", B61+'/vessels/compare/ hub (silo-links.spec)'),
 "PAGE-042": ("Verified", B61+'/vessels/compare/dahabiya-vs-cruise-ship/ (silo-links.spec)'),
 "SEO-008": ("In progress", B61+'breadcrumb and one link up in the intro on every built page; '+_link),
 "SEO-009": ("In progress", B61+'hubs and pillars link every built child by its keyword; '+_link),
 "SEO-010": ("In progress", B61+'"Keep reading" shows up to three built siblings from the workbook; '+_link),
 "SEO-011": ("In progress", B61+'bridges only where the workbook lists them, checked in CI; '+_link),
 "SEO-012": ("In progress", B61+'every informational page ends with up to three real cruises and its matching listing; '+_link),
 "SEO-014": ("In progress", B61+'anchors are the target keyword (place names capitalised) or a close variant; never "click here" (CI); '+_link),
 "SEO-024": ("Verified", B61+'vessel-type hubs show at most three cruise cards, then link to the listing (unit, e2e)'),
 "SEO-028": ("Verified", B61+'home emits Organization and WebSite with SearchAction to /cruises/?q=, which searches vessel names (unit, e2e)'),
 "DATA-009": ("Verified", B61+'VesselCompare and VesselTypeCard take guests and cabins from the catalogue (vessel_type_stats: the middle half of each type, sample vessels excluded) and editorial text drafted for review; no sample prices (unit, e2e)'),
 "SEO-013": ("In progress", B52+'vessel pages link up to /cruises/ and their type facet; '+B61+'and to their vessel-type hub by its keyword (e2e); destination links follow in Batch 7'),
})
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
