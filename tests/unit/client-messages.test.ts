import { describe, expect, it } from "vitest";
import { clientMessages } from "@/i18n/client-messages";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";

/** Whatever is sent to client components is written into every page's HTML, where the page checks read it. */
describe("the words sent to every page", () => {
  it("never carry a draft label or a booking claim", () => {
    const sent = JSON.stringify(clientMessages(en));
    for (const banned of ["Draft for review", "Cruises you can book", "Information only", "Guests vary by vessel"])
      expect(sent, banned).not.toContain(banned);
  });
  it("add a page's own words only where asked", () => {
    expect(clientMessages(en).vesselPage).toBeUndefined();
    expect(clientMessages(en, "vesselPage").vesselPage).toBe(en.vesselPage);
    expect(JSON.stringify(clientMessages(en, "guideHub"))).not.toContain("Draft for review");
  });
  it("keep what client components read", () => {
    for (const messages of [en, ja]) {
      const sent = clientMessages(messages);
      for (const ns of ["shell", "ds", "account", "listing", "plan"]) expect(sent[ns], ns).toBeDefined();
      expect(sent.common).toEqual({ leaveEmpty: messages.common.leaveEmpty });
    }
  });
});
