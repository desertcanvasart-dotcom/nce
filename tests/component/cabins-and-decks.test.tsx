// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CabinsAndDecks } from "@/components/marketplace/CabinsAndDecks";
import { parseLayout } from "@/lib/marketplace/deck-layout-schema";
import type { VesselCabin } from "@/lib/marketplace/vessel";
import philae from "../../docs/imports/deck-plans/oberoi-philae.json";
import { renderEn } from "./setup";

afterEach(cleanup);

const cabin = (code: string, name: string) => ({ id: code, code, name, deck: "D", photos: [] }) as unknown as VesselCabin;

describe("Cabins and decks [EXP-002]", () => {
  it("goes to the first deck with the cabin type when it is chosen, and stays put when it is cleared", () => {
    const scrolled: (string | undefined)[] = [];
    Element.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
      scrolled.push(this.dataset.deck);
    });
    renderEn(
      <CabinsAndDecks
        cabins={[cabin("LC", "Luxury Cabin")]}
        layout={parseLayout(philae.layout)}
        original={null}
        maxGuests={null}
        sharedSpaces={[]}
      />,
    );
    const button = screen.getByRole("button", { name: "Show on the deck plan" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(scrolled).toEqual(["D"]);
    expect((document.activeElement as HTMLElement).dataset.deck).toBe("D");
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(scrolled).toEqual(["D"]);
  });
});
