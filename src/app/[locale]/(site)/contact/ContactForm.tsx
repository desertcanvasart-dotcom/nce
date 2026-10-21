import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Select, TextArea } from "@/components/dashboard/ui";
import styles from "@/components/editorial/editorial.module.css";
import { sendContactMessage } from "./actions";

/** PAGE-106: the contact form. Works without JavaScript; nothing is shared beyond Nilecruz. */
export function ContactForm() {
  return (
    <section className={styles.contact} aria-labelledby="write">
      <h2 id="write">Write to us</h2>
      <ActionForm action={sendContactMessage} submit="Send message">
        <Input label="Your name" name="name" required maxLength={120} autoComplete="name" />
        <Input label="Email" name="email" type="email" required maxLength={254} autoComplete="email" />
        <Select
          label="About"
          name="topic"
          defaultValue="cruise"
          options={[
            { value: "cruise", label: "Choosing a cruise" },
            { value: "booking", label: "A booking" },
            { value: "vessel", label: "A vessel or our evaluation" },
            { value: "partner", label: "Operators and travel partners" },
            { value: "other", label: "Something else" },
          ]}
        />
        <TextArea label="Message" name="message" rows={6} required maxLength={4000} />
        <div className={styles.trap} aria-hidden="true">
          <label>
            Leave this empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <p className={styles.muted}>We use your details only to reply to you.</p>
      </ActionForm>
    </section>
  );
}
