import type { ReactNode } from "react";

/** One state of a component, rendered by /dev/components and the tests (ENG-007). */
export type Story = {
  name: string;
  render: () => ReactNode;
  /** Shows the "Sample data" flag above the story. */
  sample?: boolean;
  /** Renders on a dark media background (onMedia variants). */
  onMedia?: boolean;
  /** Story used for visual parity with the design system's preview.html (ENG-009). */
  parity?: boolean;
};
