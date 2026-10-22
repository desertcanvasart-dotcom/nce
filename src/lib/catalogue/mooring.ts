/** EXP-005, EXP-002: how a vessel moors and the spaces its guests share, with the words travellers and staff see. */
export const MOORING = [
  { value: "private_bank", label: "A private riverbank" },
  { value: "rafted", label: "Alongside other ships" },
  { value: "varies", label: "It varies" },
] as const;
export type Mooring = (typeof MOORING)[number]["value"];

export const MOORING_TEXT: Record<Mooring, string> = {
  private_bank: "This vessel moors at a private riverbank: your window looks onto the river and its banks.",
  rafted:
    "This vessel moors alongside other ships, often several abreast: at some stops your window faces the next ship, and guests cross through other ships’ lobbies to reach the bank.",
  varies: "This vessel moors at a private bank where it can, and alongside other ships where it can’t.",
};

export const SHARED_SPACES = [
  { value: "sun_deck", label: "Sun deck" },
  { value: "pool", label: "Pool" },
  { value: "jacuzzi", label: "Jacuzzi" },
  { value: "dining_room", label: "Dining room" },
  { value: "lounge", label: "Lounge" },
  { value: "bar", label: "Bar" },
  { value: "spa", label: "Spa" },
  { value: "gym", label: "Gym" },
  { value: "library", label: "Library" },
] as const;
export type SharedSpace = (typeof SHARED_SPACES)[number]["value"];

export const isMooring = (v: unknown): v is Mooring => MOORING.some((m) => m.value === v);
export const spaceLabel = (v: string) => SHARED_SPACES.find((s) => s.value === v)?.label ?? v;
