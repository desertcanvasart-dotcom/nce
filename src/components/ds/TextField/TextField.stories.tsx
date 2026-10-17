import type { Story } from "../lib/story";
import { TextField } from "./TextField";

export const stories: Story[] = [
  {
    name: "Empty, hint, filled, error",
    parity: true,
    render: () => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32, maxWidth: 720 }}>
        <TextField label="Full name" name="name" autoComplete="name" />
        <TextField label="Email" type="email" name="email" hint="We use it only to reply to you." />
        <TextField label="Preferred month" defaultValue="February 2027" />
        <TextField label="Phone" type="tel" error="Add a country code, e.g. +20" />
      </div>
    ),
  },
  {
    name: "Multiline",
    render: () => (
      <div style={{ maxWidth: 480 }}>
        <TextField label="Anything we should know?" multiline />
      </div>
    ),
  },
];
