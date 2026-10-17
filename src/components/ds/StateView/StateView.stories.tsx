import type { Story } from "../lib/story";
import { Button } from "../Button/Button";
import { StateView } from "./StateView";

export const stories: Story[] = [
  { name: "Loading", render: () => <StateView state="loading" /> },
  {
    name: "Empty",
    render: () => <StateView state="empty" title="No departures on these dates" body="Try a wider window or another route." />,
  },
  {
    name: "Error",
    render: () => (
      <StateView
        state="error"
        action={
          <Button variant="outline" size="sm">
            Try again
          </Button>
        }
      />
    ),
  },
  {
    name: "Permission denied",
    render: () => (
      <StateView
        state="denied"
        action={
          <Button variant="primary" size="sm" href="/account/">
            Sign in
          </Button>
        }
      />
    ),
  },
];
