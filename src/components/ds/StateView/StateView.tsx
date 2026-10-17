import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./StateView.module.css";

export type ViewState = "loading" | "empty" | "error" | "denied";

export type StateViewProps = {
  state: ViewState;
  /** Overrides the default title for this state, e.g. a specific empty message. */
  title?: string;
  body?: ReactNode;
  /** A retry button, a sign-in link or a next step. */
  action?: ReactNode;
};

const ICON: Record<ViewState, IconName> = { loading: "clock", empty: "compass", error: "info", denied: "users" };

/** Loading, empty, error and permission-denied states in the brand voice, for every data view (DATA-010). */
export function StateView({ state, title, body, action }: StateViewProps) {
  const t = useTranslations("ds.state");
  const defaults: Record<ViewState, { title: string; body?: string }> = {
    loading: { title: t("loadingTitle"), body: t("loadingBody") },
    empty: { title: t("emptyTitle") },
    error: { title: t("errorTitle"), body: t("errorBody") },
    denied: { title: t("deniedTitle"), body: t("deniedBody") },
  };
  const d = defaults[state];
  return (
    <div
      className={styles.view}
      role={state === "loading" ? "status" : state === "error" ? "alert" : undefined}
      aria-busy={state === "loading" || undefined}
    >
      <Icon name={ICON[state]} className={styles.icon} />
      <p className={styles.title}>{title ?? d.title}</p>
      {(body ?? d.body) ? <p className={styles.body}>{body ?? d.body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
