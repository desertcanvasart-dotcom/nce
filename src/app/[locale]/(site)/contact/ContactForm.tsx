import { useLocale, useTranslations } from "next-intl";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Honeypot } from "@/components/forms/Honeypot";
import { Input, Select, TextArea } from "@/components/dashboard/ui";
import styles from "@/components/editorial/editorial.module.css";
import { sendContactMessage } from "./actions";

/** PAGE-106: the contact form. Works without JavaScript; nothing is shared beyond Nilecruz. */
export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  return (
    <section className={styles.contact} aria-labelledby="write">
      <h2 id="write">{t("heading")}</h2>
      <ActionForm action={sendContactMessage} submit={t("send")}>
        {/* The language the answer is written in. */}
        <input type="hidden" name="locale" value={locale} />
        <Input label={t("name")} name="name" required maxLength={120} autoComplete="name" />
        <Input label={t("email")} name="email" type="email" required maxLength={254} autoComplete="email" />
        <Select
          label={t("about")}
          name="topic"
          defaultValue="cruise"
          options={[
            { value: "cruise", label: t("cruise") },
            { value: "booking", label: t("booking") },
            { value: "vessel", label: t("vessel") },
            { value: "partner", label: t("partner") },
            { value: "other", label: t("other") },
          ]}
        />
        <TextArea label={t("message")} name="message" rows={6} required maxLength={4000} />
        <Honeypot />
        <p className={styles.muted}>{t("privacy")}</p>
      </ActionForm>
    </section>
  );
}
