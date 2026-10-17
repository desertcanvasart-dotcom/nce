// Generated from vendor/design-system/components/bundle.js (its ICONS table). Do not edit by hand.
// 24px grid, 1.5 stroke, round caps and joins, currentColor (BRAND-BOOK §Iconography).

export type IconShape =
  | readonly ["path", { readonly d: string }]
  | readonly ["circle", { readonly cx: number; readonly cy: number; readonly r: number; readonly fill?: string }]
  | readonly [
      "rect",
      { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly rx?: number },
    ];

export const icons = {
  "arrow-right": [["path", { d: "M4 12h16M14 6l6 6-6 6" }]],
  "arrow-up-right": [["path", { d: "M7 17L17 7M8 7h9v9" }]],
  "chevron-down": [["path", { d: "M6 9l6 6 6-6" }]],
  "chevron-left": [["path", { d: "M15 6l-6 6 6 6" }]],
  "chevron-right": [["path", { d: "M9 6l6 6-6 6" }]],
  calendar: [
    ["rect", { x: 3, y: 5, width: 18, height: 16, rx: 1 }],
    ["path", { d: "M3 10h18M8 3v4M16 3v4" }],
  ],
  users: [
    ["circle", { cx: 9, cy: 8, r: 3.5 }],
    ["path", { d: "M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.4 4 5.2" }],
  ],
  pin: [
    ["path", { d: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" }],
    ["circle", { cx: 12, cy: 9.5, r: 2.5 }],
  ],
  heart: [
    [
      "path",
      {
        d: "M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 3.9 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.1 0 5.3 2.9 4.2 6.2C19.5 15.4 12 20 12 20z",
      },
    ],
  ],
  star: [["path", { d: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  minus: [["path", { d: "M5 12h14" }]],
  check: [["path", { d: "M4.5 12.5l5 5L19.5 7" }]],
  close: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
  menu: [["path", { d: "M4 7h16M4 12h16M4 17h16" }]],
  play: [["path", { d: "M8 5.5v13l10.5-6.5z" }]],
  pause: [["path", { d: "M8 5v14M16 5v14" }]],
  info: [
    ["circle", { cx: 12, cy: 12, r: 9 }],
    ["path", { d: "M12 11v6M12 7.5v.01" }],
  ],
  clock: [
    ["circle", { cx: 12, cy: 12, r: 9 }],
    ["path", { d: "M12 7v5l3 2" }],
  ],
  route: [
    ["circle", { cx: 6, cy: 19, r: 2 }],
    ["circle", { cx: 18, cy: 5, r: 2 }],
    ["path", { d: "M6 17V9a3 3 0 0 1 3-3h4M18 7v8a3 3 0 0 1-3 3h-4" }],
  ],
  ruler: [["path", { d: "M3 16.5L16.5 3 21 7.5 7.5 21zM7 12.5l2 2M10 9.5l2 2M13 6.5l2 2" }]],
  plane: [["path", { d: "M10.5 21l1.5-5.5-6 1.5-1.5-1.5 7-4V5.5a1.5 1.5 0 0 1 3 0v6l7 4-1.5 1.5-6-1.5 1.5 5.5" }]],
  sail: [["path", { d: "M12 3v15M12 4c4 3 6.5 7.5 7 12h-7M12 7c-2.5 2.5-4 5.5-4.5 9H12M3 18h18l-2.5 3h-13z" }]],
  engine: [
    ["circle", { cx: 12, cy: 12, r: 2 }],
    [
      "path",
      {
        d: "M12 10c-1-3-.5-6 1.6-7 1.4 2.1.4 5-1.6 7zM13.8 13.1c3.1.4 5.4 2.3 5.2 4.6-2.4.4-4.6-1.8-5.2-4.6zM10.3 13.1c-2.3 2-5.3 2.6-6.9.9 1.2-2.2 4.3-2.4 6.9-.9z",
      },
    ],
  ],
  steam: [
    ["path", { d: "M9 21v-9h6v9M7 21h10M8.5 12h7" }],
    ["circle", { cx: 11, cy: 7.5, r: 1.8 }],
    ["circle", { cx: 14.5, cy: 5, r: 2.2 }],
    ["circle", { cx: 18.5, cy: 3.5, r: 1.4 }],
  ],
  anchor: [
    ["circle", { cx: 12, cy: 5, r: 2 }],
    ["path", { d: "M12 7v14M8 11h8M4.5 14c.5 4 3.5 7 7.5 7s7-3 7.5-7" }],
  ],
  compass: [
    ["circle", { cx: 12, cy: 12, r: 9 }],
    ["path", { d: "M15.5 8.5l-2 5-5 2 2-5z" }],
  ],
  pool: [
    [
      "path",
      {
        d: "M8 14V6a2 2 0 0 1 2-2M15 14V6a2 2 0 0 1 2-2M8 8h7M8 11h7M3 17c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1",
      },
    ],
  ],
  sundeck: [
    ["circle", { cx: 7, cy: 6, r: 2.5 }],
    ["path", { d: "M3 19l3-6h9l4-5M6 13v6M15 13v6" }],
  ],
  spa: [
    [
      "path",
      {
        d: "M12 20c-3.5 0-7-2.5-8-6 3 0 6 1.5 8 6zM12 20c3.5 0 7-2.5 8-6-3 0-6 1.5-8 6zM12 20c-2-2.5-3-5.5-3-8 1.1-2.1 1.9-3.5 3-5 1.1 1.5 1.9 2.9 3 5 0 2.5-1 5.5-3 8z",
      },
    ],
  ],
  wifi: [
    ["path", { d: "M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" }],
    ["circle", { cx: 12, cy: 19.2, r: 1.1, fill: "currentColor" }],
  ],
  ac: [["path", { d: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" }]],
  balcony: [["path", { d: "M6 11V4h12v7M12 4v7M3 11h18M3 21h18M5 11v10M9.5 11v10M14.5 11v10M19 11v10" }]],
  bath: [["path", { d: "M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V5.5A2.5 2.5 0 0 1 10.5 4M7 19l-1 2M17 19l1 2" }]],
  restaurant: [["path", { d: "M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2 1-3 3.5-3 7h3" }]],
  bar: [["path", { d: "M5 4h14l-7 8zM12 12v8M8 20h8M8 7h8" }]],
  wine: [["path", { d: "M8 3h8c0 5-1.5 8-4 8s-4-3-4-8zM12 11v9M8.5 20h7" }]],
  gym: [["path", { d: "M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" }]],
  egyptologist: [["path", { d: "M12 11c-2.2-1.6-3.5-3.5-3.5-5.2a3.5 3.5 0 0 1 7 0c0 1.7-1.3 3.6-3.5 5.2zM6 11.5h12M12 11v10" }]],
  butler: [["path", { d: "M3 18h18M5 18a7 7 0 0 1 14 0M12 9V7M10.5 7h3" }]],
  library: [["path", { d: "M4 19.5V5a1.5 1.5 0 0 1 1.5-1.5H20v15H5.5A1.5 1.5 0 0 0 4 20a1.5 1.5 0 0 0 1.5 1.5H20M8 7.5h8" }]],
  accessible: [
    ["circle", { cx: 12, cy: 4.5, r: 1.8 }],
    ["path", { d: "M12 7.5v6h5l2 5M8.2 10.8a6 6 0 1 0 8.3 7.7" }],
  ],
  bed: [
    ["circle", { cx: 6.5, cy: 11.5, r: 1.8 }],
    ["path", { d: "M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6" }],
  ],
  temple: [["path", { d: "M3 21h18M4.5 21l2-14h4l.5 14M13 21l.5-14h4l2 14M6.5 7h4M13.5 7h4M11 11h2" }]],
  sunrise: [["path", { d: "M3 18h18M7 18a5 5 0 0 1 10 0M12 5v3M4.9 10.1l2.1 2.1M19.1 10.1L17 12.2M7 21h10" }]],
  music: [
    ["path", { d: "M9 18V5l11-2v13" }],
    ["circle", { cx: 6.5, cy: 18, r: 2.5 }],
    ["circle", { cx: 17.5, cy: 16, r: 2.5 }],
  ],
  quiet: [["path", { d: "M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5c1 .8 1.5 1.6 1.5 2.5s-.5 1.7-1.5 2.5" }]],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof icons;
export const iconNames = Object.keys(icons) as IconName[];
