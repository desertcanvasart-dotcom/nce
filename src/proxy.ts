import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, the dev-only parity frame and files with an extension.
  matcher: "/((?!api|_next|_vercel|dev-parity|.*\\..*).*)",
};
