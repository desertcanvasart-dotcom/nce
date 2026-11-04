// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { renderEn } from "./setup";
import { SailingCalendar } from "@/components/marketplace/SailingCalendar";
import { calendarSailings, patternLines, type CalendarItinerary } from "@/lib/marketplace/sailing-calendar";

afterEach(cleanup);

const TODAY = "2026-11-03";
const its: CalendarItinerary[] = [
  {
    code: "LXR4",
    origin: "Luxor",
    destination: "Aswan",
    nights: 4,
    sailingDays: [1],
    periods: [{ startsOn: "2026-10-01", endsOn: "2027-01-31" }],
    sailings: [
      { id: "dep-1", departsOn: "2026-11-09", returnsOn: "2026-11-13", status: "scheduled" },
      { id: "dep-2", departsOn: "2026-11-16", returnsOn: "2026-11-20", status: "cancelled" },
    ],
  },
  {
    code: "ASW3",
    origin: "Aswan",
    destination: "Luxor",
    nights: 3,
    sailingDays: [5],
    periods: [{ startsOn: "2026-10-01", endsOn: "2027-01-31" }],
    sailings: [],
  },
];

function show(bookable = true, list = its) {
  return renderEn(
    <SailingCalendar
      sailings={calendarSailings(list, TODAY)}
      patterns={patternLines(list, TODAY)}
      today={TODAY}
      bookable={bookable}
      reserve="/cruises/sample/reserve/"
      ask="/cruises/sample/ask/"
    />,
  );
}

describe("SailingCalendar", () => {
  it("states the weekly pattern in words and that it is not live availability", () => {
    show();
    expect(screen.getByText("Monday")).toBeTruthy();
    expect(screen.getByText(/not live availability/)).toBeTruthy();
  });

  it("opens on the first sailing, with its route, length, status and the way to book it", () => {
    show();
    expect(screen.getByRole("heading", { name: /November 2026/ })).toBeTruthy();
    const day = screen.getByRole("button", { name: /9 November 2026: Luxor → Aswan, 4 nights, Confirmed departure/ });
    expect(day.getAttribute("aria-pressed")).toBe("true");
    const book = screen.getByRole("link", { name: "See prices for this date" });
    expect(book.getAttribute("href")).toBe("/cruises/sample/reserve/?itinerary=LXR4&dep=dep-1");
  });

  it("never offers to book a date that is only expected from the pattern", async () => {
    show();
    await userEvent.click(
      screen.getByRole("button", { name: /13 November 2026: Aswan → Luxor, 3 nights, Expected, not confirmed/ }),
    );
    expect(screen.queryByRole("link", { name: "See prices for this date" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ask about this date" }).getAttribute("href")).toMatch(
      /^\/cruises\/sample\/ask\/\?itinerary=[^&]+&date=2026-11-13$/,
    );
    expect(screen.getByText(/hasn’t confirmed this date/)).toBeTruthy();
  });

  it("marks a cancelled sailing in words, with nothing to book or ask", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: /16 November 2026: Luxor → Aswan, 4 nights, Cancelled/ }));
    expect(screen.getByText("The operator has cancelled this sailing.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /this date/ })).toBeNull();
  });

  it("asks instead of booking when the vessel can't be booked on Nilecruz", () => {
    show(false);
    expect(screen.queryByRole("link", { name: "See prices for this date" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ask about this date" })).toBeTruthy();
  });

  it("moves between months with the arrows and the month strip", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /December 2026/ })).toBeTruthy();
    const strip = screen.getByRole("navigation", { name: "Months with sailings" });
    await userEvent.click(within(strip).getByRole("button", { name: /January 2027/ }));
    expect(screen.getByRole("heading", { name: /January 2027/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next month" }).hasAttribute("disabled")).toBe(true);
  });

  it("says so when a vessel has no published dates", () => {
    show(true, [{ ...its[0]!, periods: [], sailings: [] }]);
    expect(screen.getByText(/No sailing dates are published for this vessel/)).toBeTruthy();
  });
});
