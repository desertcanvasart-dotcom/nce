// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { renderEn } from "./setup";
import { AmenityGrid } from "@/components/ds/AmenityGrid/AmenityGrid";
import { BookingSummary } from "@/components/ds/BookingSummary/BookingSummary";
import { CabinPicker } from "@/components/ds/CabinPicker/CabinPicker";
import { CruiseSearch } from "@/components/ds/CruiseSearch/CruiseSearch";
import { ItineraryTimeline } from "@/components/ds/ItineraryTimeline/ItineraryTimeline";
import { PriceAnatomy } from "@/components/ds/PriceAnatomy/PriceAnatomy";
import { Stepper } from "@/components/ds/Stepper/Stepper";
import { VesselCompare } from "@/components/ds/VesselCompare/VesselCompare";
import {
  sampleAmenities,
  sampleCabins,
  sampleFactors,
  samplePresets,
  sampleProfiles,
  sampleStops,
  sampleVessels,
} from "@/components/ds/__samples__/samples";

afterEach(cleanup);

describe("PriceAnatomy (COMP-PriceAnatomy)", () => {
  const props = {
    factors: sampleFactors,
    currency: "USD",
    presets: samplePresets,
    totalLabel: "per person",
    footnote: "Illustrative.",
  };

  it("adds the factors to the two five-star examples: US$800 and US$8,000", async () => {
    renderEn(<PriceAnatomy {...props} />);
    expect(screen.getByText("US$800")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: samplePresets.highLabel }));
    expect(screen.getByText("US$8,000")).toBeTruthy();
  });

  it("names every segment in the bar's text alternative, so colour is not the only cue (A11Y-008)", () => {
    renderEn(<PriceAnatomy {...props} />);
    const label = screen.getByRole("img").getAttribute("aria-label") ?? "";
    for (const f of sampleFactors) expect(label).toContain(f.label);
  });

  it("moves between options with arrow keys like a radio group (A11Y-009)", async () => {
    renderEn(<PriceAnatomy {...props} />);
    const group = screen.getByRole("radiogroup", { name: "Cabin size" });
    const [first, second] = within(group).getAllByRole("radio");
    first!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(second!.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(second);
  });
});

describe("Stepper (COMP-Stepper)", () => {
  it("disables at its limits", async () => {
    renderEn(<Stepper label="guests" min={1} max={2} defaultValue={1} />);
    const fewer = screen.getByRole("button", { name: "Fewer guests" });
    const more = screen.getByRole("button", { name: "More guests" });
    expect(fewer.hasAttribute("disabled")).toBe(true);
    await userEvent.click(more);
    expect(more.hasAttribute("disabled")).toBe(true);
    expect(fewer.hasAttribute("disabled")).toBe(false);
  });
});

describe("AmenityGrid (COMP-AmenityGrid)", () => {
  it("counts and filters by status, always with a word (BRAND-019)", async () => {
    renderEn(<AmenityGrid items={sampleAmenities} />);
    expect(screen.getByRole("radio", { name: "All · 12" })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Not aboard · 3" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByText("Not aboard").length).toBeGreaterThanOrEqual(3);
  });
});

describe("CabinPicker (COMP-CabinPicker, ADR-025)", () => {
  it("shows prices when signed in", () => {
    renderEn(<CabinPicker cabins={sampleCabins} />);
    expect(screen.getByText("US$1,240")).toBeTruthy();
    expect((screen.getByRole("radio", { name: /Royal suite/ }) as HTMLInputElement).disabled).toBe(true);
  });
  it("hides every price from signed-out visitors and says why", () => {
    renderEn(<CabinPicker cabins={sampleCabins} showPrices={false} />);
    expect(screen.queryByText(/US\$/)).toBeNull();
    expect(screen.getByText(/Sign in to see prices/)).toBeTruthy();
    expect(screen.getByText("32 m²")).toBeTruthy();
  });
});

describe("BookingSummary (COMP-BookingSummary, ADR-010/011/017)", () => {
  it("keeps the gratuity out of the total and says it is paid on board", () => {
    renderEn(
      <BookingSummary
        vesselName="V"
        cabinName="C"
        departure="2027-02-12"
        nights={4}
        lines={[{ label: "Fare", amount: { amount: 378000, currency: "USD" } }]}
        total={{ amount: 378000, currency: "USD" }}
        gratuity={{ perPersonPerNight: { amount: 500, currency: "USD" }, payingGuests: 2, nights: 4 }}
        extras={[{ label: "Airport and hotel transfers", href: "/tours-extras/transfers/" }]}
      />,
    );
    expect(screen.getAllByText("US$3,780").length).toBeGreaterThanOrEqual(2); // line and total
    expect(screen.getByText("US$40")).toBeTruthy();
    expect(screen.getByText(/paid on board at check-out/)).toBeTruthy();
    expect(screen.getByText(/not included in the total/)).toBeTruthy();
    expect(screen.queryByText(/flight/i)).toBeNull();
  });
});

describe("CruiseSearch (COMP-CruiseSearch, ADR-012)", () => {
  const routes = [{ id: "r", label: "Luxor to Aswan", dates: ["2099-03-01", "2099-03-05"] }];

  it("lets only real sailing dates be picked", async () => {
    renderEn(<CruiseSearch routes={routes} vessels={sampleVessels} action="/cruises/" />);
    await userEvent.click(screen.getByRole("button", { name: /Departure/ }));
    const dialog = screen.getByRole("dialog", { name: "Departure" });
    // March 2099 opens on the first sailing; only the two sailing days are enabled.
    const enabled = within(dialog)
      .getAllByRole("button")
      .filter((b) => /sailing day/.test(b.getAttribute("aria-label") ?? "") && !b.hasAttribute("disabled"));
    expect(enabled.map((b) => b.textContent)).toEqual(["1", "5"]);
  });

  it("asks for each child's age before searching, and submits ages with the form", async () => {
    renderEn(<CruiseSearch routes={routes} vessels={sampleVessels} action="/cruises/" />);
    await userEvent.click(screen.getByRole("button", { name: /Guests/ }));
    await userEvent.click(screen.getByRole("button", { name: "More Children" }));
    const form = screen.getByRole("search") as HTMLFormElement;
    fireEvent.submit(form);
    expect(screen.getByRole("alert").textContent).toMatch(/Choose each child's age/);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Age of child 1" }), "4");
    expect((form.querySelector('input[name="ages"]') as HTMLInputElement).value).toBe("4");
  });

  it("closes its popover with Escape", async () => {
    renderEn(<CruiseSearch routes={routes} vessels={sampleVessels} action="/cruises/" />);
    await userEvent.click(screen.getByRole("button", { name: /Vessel/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Tabs follow the WAI-ARIA pattern (A11Y-009)", () => {
  it("VesselCompare moves between types with arrow keys", async () => {
    renderEn(<VesselCompare profiles={sampleProfiles} />);
    const tabs = screen.getAllByRole("tab");
    tabs[0]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);
    expect(screen.getByRole("heading", { name: sampleProfiles[1]!.name })).toBeTruthy();
  });

  it("ItineraryTimeline moves between days with arrow keys, Home and End", async () => {
    renderEn(<ItineraryTimeline stops={sampleStops} />);
    const tabs = screen.getAllByRole("tab");
    tabs[0]!.focus();
    await userEvent.keyboard("{End}");
    expect(tabs[tabs.length - 1]!.getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{ArrowLeft}");
    expect(tabs[tabs.length - 2]!.getAttribute("aria-selected")).toBe("true");
  });
});
