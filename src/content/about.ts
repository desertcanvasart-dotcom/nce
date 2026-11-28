import type { Locale } from "@/i18n/routing";

/**
 * About Nilecruz (P101), in the team's own words. The page is laid out by hand (the five roles on board), so its copy
 * lives here rather than in a Sanity article. Japanese is drafted for review (I18N-005); Spanish shows the English.
 */
export const ABOUT = {
  eyebrow: "About Nilecruz",
  rolesLabel: "Where we worked on board",
  keepReading: "Keep reading",
  howWeChoose: "How we choose vessels",
  title: "We've worked every deck",
  subtitle: "The people who evaluate your next Nile cruise",
  intro: [
    "Before we ever reviewed a Nile cruise, we worked on one. Then another. Then hundreds more.",
    "Between us, we've spent more than 300 years on board Nile vessels. Not as passengers, but as the people who make the journey happen while you sleep, eat, and watch the river slide past.",
  ],
  roles: [
    {
      role: "Kitchen",
      lead: "Some of us cooked.",
      text: "We know a galley at five in the morning, when the bread is late and every guest will want breakfast by seven. We can tell a buffet that's been refreshed from one that's only been refilled.",
    },
    {
      role: "Management",
      lead: "Some of us ran the boats.",
      text: "As managers, we've timed the lock at Esna, moored side by side with five other ships at Luxor, and kept a full sun deck calm when the schedule changed. We know which crews are ready for the unexpected, and which are hoping it never comes.",
    },
    {
      role: "Bar",
      lead: "Some of us tended the bar.",
      text: "We've poured the sundowner as the light turns gold over the West Bank. A good bartender knows your name by the second evening, and we notice when no one does.",
    },
    {
      role: "Housekeeping",
      lead: "Some of us made the beds.",
      text: "Housekeeping tells you more about a ship than any brochure: whether the linen is fresh or only folded, whether a cabin is clean or merely tidy, whether anyone checked the air conditioning before you walked in.",
    },
    {
      role: "Reception",
      lead: "And some of us stood at reception.",
      text: "We've welcomed every kind of arrival, from the delighted and the jet-lagged to the ones in the wrong cabin. We know how quickly a first impression becomes trust, or doesn't.",
    },
  ],
  statement: "That is who evaluates your next cruise.",
  closing: [
    "When we look at a vessel, we read it the way crew do. We notice what guests feel without always knowing why: the pace of the service, the care in the kitchen, the honesty of the cabin photos, the calm of the people in charge.",
    "So when a cruise appears on Nilecruz, someone who has done that job has looked at it closely. And when we tell you a ship is worth it, whether it costs €400 or €6,500, we've spent enough of our lives on the Nile to mean it.",
  ],
  seoTitle: "About Nilecruz: we've worked every deck",
  seoDescription:
    "The people who evaluate Nile cruises on Nilecruz have cooked, managed, tended bar, made beds and stood at reception on Nile vessels: more than 300 years on board between them.",
};

const JA: typeof ABOUT = {
  eyebrow: "Nilecruzについて",
  rolesLabel: "私たちが船内で担ってきた仕事",
  keepReading: "あわせて読む",
  howWeChoose: "船の選び方",
  title: "船のあらゆる持ち場で働いてきました",
  subtitle: "次のナイル川クルーズを評価するのは、こんな人たちです",
  intro: [
    "ナイル川クルーズを評価するようになる前、私たちは船で働いていました。1隻、また1隻と、やがて何百隻もの船で経験を重ねました。",
    "私たちがナイル川の船で過ごした年月は、合わせて300年以上になります。乗客としてではありません。皆さんが眠り、食事をし、川の流れを眺めているあいだに、旅を支える側として過ごした年月です。",
  ],
  roles: [
    {
      role: "厨房",
      lead: "料理をしていた者がいます。",
      text: "朝5時の厨房を知っています。パンの到着は遅れ、7時にはすべてのお客様が朝食を待っています。作り直したビュッフェと、継ぎ足しただけのビュッフェは見分けがつきます。",
    },
    {
      role: "運営",
      lead: "船を運営していた者がいます。",
      text: "マネージャーとして、エスナの水門の時間を計り、ルクソールでは他の5隻と横並びで停泊し、予定が変わったときもサンデッキ全体を落ち着かせてきました。予期せぬ事態に備えている乗組員と、起きないことを願っているだけの乗組員は分かります。",
    },
    {
      role: "バー",
      lead: "バーに立っていた者がいます。",
      text: "西岸の空が金色に染まるころ、夕暮れの一杯を注いできました。よいバーテンダーは2日目の夜にはお客様の名前を覚えています。誰も覚えていなければ、私たちは気づきます。",
    },
    {
      role: "客室清掃",
      lead: "ベッドを整えていた者がいます。",
      text: "客室清掃の仕事ぶりは、どんなパンフレットよりも船のことを教えてくれます。リネンが洗いたてなのか、畳み直しただけなのか。客室が清潔なのか、片づけただけなのか。お客様が入る前に、誰かがエアコンを確かめたのか。",
    },
    {
      role: "レセプション",
      lead: "そして、レセプションに立っていた者もいます。",
      text: "喜びにあふれた方、時差で疲れた方、客室の間違いに困った方まで、さまざまなお客様を迎えてきました。第一印象がいかに早く信頼につながるか、あるいはつながらないかを知っています。",
    },
  ],
  statement: "次のクルーズを評価するのは、そういう人たちです。",
  closing: [
    "船を見るとき、私たちは乗組員の目で読み取ります。サービスの間合い、厨房の気配り、客室写真の正直さ、責任者の落ち着き。お客様が理由を意識しないまま感じ取ることに、私たちは気づきます。",
    "ですから、Nilecruzにクルーズが掲載されるときは、その仕事を経験した者が細かく確かめています。そして、この船には価値があるとお伝えするとき、料金が€400でも€6,500でも、その言葉の裏にはナイル川で過ごしてきた長い年月があります。",
  ],
  seoTitle: "Nilecruzについて:船のあらゆる持ち場で働いてきました",
  seoDescription:
    "Nilecruzでナイル川クルーズを評価するのは、ナイル川の船で料理、運営、バー、客室清掃、レセプションを担ってきた人たちです。船上で過ごした年月は合わせて300年以上になります。",
};

export const aboutFor = (locale: Locale) => (locale === "ja" ? JA : ABOUT);
