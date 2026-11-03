import { describe, expect, it } from "vitest";
import { CHOOSER, recommend } from "@/lib/vessels/chooser";

describe("which boat suits you (PAGE-026)", () => {
  const [priority, days, party] = CHOOSER.map((q) => q.answers.map((a) => a.id));

  it("waits until every question is answered", () => {
    expect(recommend({})).toBeNull();
    expect(recommend({ priority: "quiet", days: "slow" })).toBeNull();
    expect(recommend({ priority: "nonsense", days: "slow", party: "small" })).toBeNull();
  });

  it("adds up the brief's points and breaks a tie with the first answer, on every path", () => {
    const points: Record<string, Record<string, number>> = {
      quiet: { sail: 2 },
      facilities: { motor: 2 },
      character: { steam: 2 },
      slow: { sail: 1 },
      schedule: { motor: 1 },
      gentle: { steam: 1 },
      small: { sail: 1, steam: 1 },
      family: { motor: 1 },
      unsure: {},
    };
    const first: Record<string, string> = { quiet: "sail", facilities: "motor", character: "steam" };
    let paths = 0;
    for (const a of priority!)
      for (const b of days!)
        for (const c of party!) {
          const total = (t: string) => [a, b, c].reduce((n, x) => n + (points[x]![t] ?? 0), 0);
          const best = Math.max(...["sail", "motor", "steam"].map(total));
          const leaders = ["sail", "motor", "steam"].filter((t) => total(t) === best);
          const want = leaders.length === 1 ? leaders[0] : first[a];
          expect(recommend({ priority: a, days: b, party: c }), `${a}/${b}/${c}`).toBe(want);
          paths++;
        }
    expect(paths).toBe(27);
  });

  it("gives the expected type for typical answers", () => {
    expect(recommend({ priority: "quiet", days: "slow", party: "small" })).toBe("sail");
    expect(recommend({ priority: "facilities", days: "schedule", party: "family" })).toBe("motor");
    expect(recommend({ priority: "character", days: "gentle", party: "unsure" })).toBe("steam");
    // A tie (sail 2, motor 2) goes to the first question's answer.
    expect(recommend({ priority: "quiet", days: "schedule", party: "family" })).toBe("sail");
  });
});
