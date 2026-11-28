import type { DimensionKey } from "@/lib/evaluation/method";

/** The evaluation method's dimensions and criteria in Japanese, drafted for review; the weights stay in the code. */
export const DIMENSIONS_JA: Record<DimensionKey, { label: string; criteria: string[] }> = {
  hygiene: { label: "衛生", criteria: ["客室と共用部の清潔さ", "浴室の衛生", "リネンとタオルの管理", "食品の取り扱いの衛生"] },
  service: {
    label: "サービス",
    criteria: ["スタッフの温かさとプロ意識", "要望への対応", "客室清掃サービス", "レストランとコンシェルジュのサービス"],
  },
  food: { label: "食事", criteria: ["食材の質と鮮度", "メニューの種類", "調理と盛り付け", "食事制限への対応"] },
  amenities: {
    label: "設備",
    criteria: ["サンデッキとプールの設備", "ラウンジと娯楽", "Wi-Fiと実用的な通信環境", "バリアフリーと実用設備"],
  },
  management: { label: "運営", criteria: ["段取りと情報伝達", "不具合への対応", "水準の一貫性", "問題へのプロとしての対処"] },
  cabin_vessel: {
    label: "客室と船",
    criteria: ["客室の広さ、ベッド、収納", "浴室と空調の状態", "騒音、振動、寝心地", "船の状態と整備"],
  },
  cruise_experience: {
    label: "クルーズ体験",
    criteria: ["航行時間と旅程の実行", "停泊と上陸のしやすさ", "乗客の密度と共用部の快適さ", "雰囲気と船上のペース配分"],
  },
};
