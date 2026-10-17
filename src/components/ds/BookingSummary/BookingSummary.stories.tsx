import type { Story } from "../lib/story";
import { BookingSummaryDemo } from "../__samples__/BookingSummaryDemo";

export const stories: Story[] = [
  { name: "Two adults", sample: true, parity: true, render: () => <BookingSummaryDemo /> },
  {
    name: "Two adults, children aged 2 and 7 (under-3 free, 50%)",
    sample: true,
    render: () => <BookingSummaryDemo childAges={[2, 7]} />,
  },
];
