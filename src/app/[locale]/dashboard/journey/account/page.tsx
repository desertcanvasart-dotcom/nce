import { redirect } from "next/navigation";

/** DASH-CUS-002: Account in My journey is the account security page, shared by every workspace. */
export default function JourneyAccount() {
  redirect("/account/security/");
}
