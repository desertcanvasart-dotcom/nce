/**
 * Japanese for the cabin amenities and deck names the catalogue stores in English only (no locale column). A term with
 * no entry shows as stored. Drafted for review (I18N-005).
 */
const AMENITIES_JA: Record<string, string> = {
  "43-inch LED TV": "43インチLEDテレビ",
  "Air conditioning": "エアコン",
  "Bathrobe and slippers": "バスローブとスリッパ",
  "Bathrobes and slippers": "バスローブとスリッパ",
  Bathtub: "バスタブ",
  "Butler on request": "リクエストに応じてバトラー",
  "Carpeted floor": "カーペット敷き",
  "Changing room": "更衣スペース",
  "Complimentary soft minibar": "無料のミニバー（ソフトドリンク）",
  "Complimentary toiletries": "無料のアメニティ",
  "Connecting arrangement": "コネクティング利用",
  "Connecting cabins available": "コネクティングルームあり",
  "Daily fruit, cookies or pastries": "毎日のフルーツ、クッキーまたはペストリー",
  "Daily housekeeping": "毎日の客室清掃",
  "Electronic lock": "電子ロック",
  "Espresso machine": "エスプレッソマシン",
  "Free Wi-Fi": "無料Wi-Fi",
  "Full-size bathtub": "フルサイズのバスタブ",
  Hairdryer: "ヘアドライヤー",
  "Heated outdoor whirlpool": "屋外の温水ジェットバス",
  "Heated whirlpool": "温水ジェットバス",
  "In-suite dining until midnight": "深夜0時までのインルームダイニング",
  Jacuzzi: "ジャグジー",
  "LCD TV with satellite channels": "衛星放送対応の液晶テレビ",
  "LED TV": "LEDテレビ",
  "LED TV with satellite channels": "衛星放送対応のLEDテレビ",
  "Live sailing channel": "航行中の映像チャンネル",
  "Living and dining areas": "リビングとダイニングのスペース",
  "Living area": "リビングエリア",
  "Living space": "リビングスペース",
  Minibar: "ミニバー",
  "Music system": "オーディオ機器",
  "Panoramic French windows": "パノラマのフレンチ窓",
  "Personal bar": "専用バー",
  "Pillow menu": "枕の選択メニュー",
  "Private MiFi device": "専用モバイルWi-Fiルーター",
  "Private balcony": "専用バルコニー",
  "Private balcony (8 m²)": "専用バルコニー（8m²）",
  "Private bathroom": "専用バスルーム",
  "Private bathroom with bathtub": "バスタブ付き専用バスルーム",
  "Private bathroom with bathtub and shower": "バスタブとシャワー付き専用バスルーム",
  "Private dining area": "専用ダイニングスペース",
  "Private lounge": "専用ラウンジ",
  "Private patio (8 m²)": "専用パティオ（8m²）",
  "Private terrace": "専用テラス",
  "Rain shower": "レインシャワー",
  "Rain shower with a view": "景色を望むレインシャワー",
  Safe: "セーフティボックス",
  "Satellite flat-screen TV": "衛星放送対応の薄型テレビ",
  "Seating area": "シーティングエリア",
  "Separate bedroom": "独立した寝室",
  "Separate living room": "独立したリビングルーム",
  "Separate lounge": "独立したラウンジ",
  "Separate seating area": "独立したシーティングエリア",
  "Separate shower": "独立シャワー",
  "Standalone bathtub": "置き型バスタブ",
  "Steam bath": "スチームバス",
  "Sun lounger": "サンラウンジャー",
  "Tea and coffee": "紅茶とコーヒー",
  Telephone: "電話",
  Television: "テレビ",
  "Television with films": "映画も観られるテレビ",
  "Two bedrooms": "寝室2室",
  Wardrobe: "ワードローブ",
  "Water massage": "ウォーターマッサージ",
  "Welcome bottle of local wine": "地元産ワインのウェルカムボトル",
  "Wi-Fi": "Wi-Fi",
};

export const amenityText = (a: string, locale: string) => (locale === "ja" ? (AMENITIES_JA[a] ?? a) : a);

/** A deck's name as the plan stores it ("1", "A", "Sun"), to go in front of "デッキ". */
export const deckName = (name: string, locale: string) => (locale === "ja" && name === "Sun" ? "サン" : name);

/** A cabin type's deck as stored ("Deck 1", "Decks B, C and D", "To be confirmed"), as a whole Japanese label. */
export function cabinDeckText(deck: string, locale: string): string | null {
  if (locale !== "ja") return null;
  if (deck === "To be confirmed") return "デッキ未定";
  const m = /^Decks? (.+)$/.exec(deck);
  return m ? `${m[1]!.split(/, | and /).join("・")}デッキ` : null;
}
