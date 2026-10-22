import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True once the page runs in the browser: interactive versions replace their no-JavaScript fallbacks. */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
