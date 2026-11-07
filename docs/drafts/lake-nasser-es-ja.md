# Lake Nasser pages: Spanish and Japanese drafts (ADR-113, CONTENT-NEEDED #74)

Drafted by Claude on 7 Nov 2026, **to be reviewed by native speakers**. Not shown on the site yet: route guides and
facet listings are English-only today, and the Spanish and Japanese addresses show the English page with a note,
`noindex` (I18N-005). These drafts are ready for when Batch 10 translates the editorial pages, or for the Sanity
`article` in each language. The English source is `src/content/pages/P008.json` and the `lake-nasser` facet in
`src/lib/marketplace/listing.ts`; change the English there first, then these.

Place names follow the site's existing Spanish and Japanese (`src/content/river-stops.ts`): Asuán / アスワン,
Abu Simbel / アブ・シンベル, lago Nasser / ナセル湖, Luxor / ルクソール.

## `/cruises/lake-nasser/` (PAGE-069)

| Field | English | Español | 日本語 |
|---|---|---|---|
| H1 | Lake Nasser cruises | Cruceros por el lago Nasser | ナセル湖クルーズ |
| Title | Lake Nasser cruises between Aswan and Abu Simbel | Cruceros por el lago Nasser entre Asuán y Abu Simbel | アスワンとアブ・シンベルを結ぶナセル湖クルーズ |
| Description | Cruises on Lake Nasser, between Aswan and Abu Simbel: vessels, nights, evaluations and starting prices. | Cruceros por el lago Nasser, entre Asuán y Abu Simbel: barcos, noches, evaluaciones y precios desde. | アスワンとアブ・シンベルを結ぶナセル湖のクルーズ。船、泊数、評価、最低料金をご覧いただけます。 |
| Intro | Cruises that sail Lake Nasser, south of Aswan, between Aswan and the temples of Abu Simbel. | Cruceros que navegan por el lago Nasser, al sur de Asuán, entre Asuán y los templos de Abu Simbel. | アスワンの南、アスワンとアブ・シンベル神殿のあいだのナセル湖を航行するクルーズです。 |
| Empty | No Lake Nasser cruises are published yet. See all cruises. | Todavía no hay cruceros por el lago Nasser publicados. Ver todos los cruceros. | ナセル湖クルーズはまだ掲載されていません。すべてのクルーズを見る。 |

## `/nile-cruise-guide/routes/lake-nasser/` (PAGE-008)

### Español

**Cruceros por el lago Nasser: Abu Simbel por agua**

Abu Simbel está mucho más al sur de Asuán, a orillas del lago Nasser, y no forma parte de un crucero Luxor–Asuán.
Algunos barcos navegan por el lago, entre Asuán y Abu Simbel. Es una de las [[rutas de crucero por el Nilo]].

**Por dónde navegan los cruceros del lago.** Los cruceros por el lago Nasser navegan entre Asuán y Abu Simbel, al sur
del tramo Luxor–Asuán del Nilo. Algunos barcos amarran junto a los templos, así que se ven desde el agua y también a pie.
La página de cada barco indica sus noches, su sentido y sus fechas de salida.

**Los templos de Abu Simbel.** Dos templos excavados en la roca de Ramsés II: el Gran Templo, con sus cuatro estatuas
colosales sedentes del rey, y el templo menor de su reina, Nefertari. En los años sesenta ambos se cortaron en bloques y
se trasladaron más arriba, lejos de las aguas crecientes del nuevo lago.

**Por agua o por carretera.** La mayoría de los visitantes llega en una excursión de un día desde Asuán: unas tres o
cuatro horas por carretera en cada sentido, normalmente saliendo antes del amanecer, o un vuelo corto. Un crucero por el
lago Nasser llega a los templos por agua.

Dos veces al año, hacia el 22 de febrero y el 22 de octubre, el sol naciente llega al santuario interior del Gran
Templo. Esos días hay mucha gente.

Preguntas:
- *¿Un crucero de Luxor a Asuán va a Abu Simbel?* No. Abu Simbel está mucho más al sur de Asuán. Los cruceros
  Luxor–Asuán lo ofrecen como excursión opcional desde Asuán; un crucero por el lago Nasser navega hasta allí.
- *¿Cuántas noches dura un crucero por el lago Nasser?* Depende del barco. La página de cada barco indica sus noches y
  fechas de salida.
- *¿Los cruceros por el lago Nasser paran en los templos?* Algunos barcos amarran junto a los templos de Abu Simbel.
  Consulte el programa de cada barco.

SEO: «Cruceros por el lago Nasser: Abu Simbel por agua» · «Cruceros por el lago Nasser entre Asuán y Abu Simbel: por
dónde navegan, los templos de Ramsés II y Nefertari, y cómo se compara el lago con la carretera.»

### 日本語

**ナセル湖クルーズ：水路で行くアブ・シンベル**

アブ・シンベルはアスワンのはるか南、ナセル湖のほとりにあり、ルクソール〜アスワンのクルーズには含まれません。
代わりに、アスワンとアブ・シンベルのあいだの湖を航行する船がいくつかあります。[[ナイル川クルーズのルート]]のひとつです。

**湖のクルーズが航行する場所。** ナセル湖クルーズは、ナイル川のルクソール〜アスワン区間より南の、アスワンとアブ・シンベルのあいだを航行します。
神殿のそばに停泊する船もあり、歩いて見学するだけでなく水上からも神殿を眺められます。泊数、航行の向き、出航日は各船のページでご確認ください。

**アブ・シンベル神殿。** ラムセス2世の二つの岩窟神殿です。王の巨大な座像4体が並ぶ大神殿と、王妃ネフェルタリの小神殿。
1960年代に、新しい湖の水位上昇を避けるため、どちらも切り分けられ、より高い場所へ移設されました。

**水路か陸路か。** 多くの人はアスワンからの日帰りで訪れます。陸路で片道約3〜4時間、通常は夜明け前に出発します。短いフライトもあります。
ナセル湖クルーズなら水路で神殿に着きます。

年に2回、2月22日と10月22日ごろ、朝日が大神殿の奥の至聖所まで差し込みます。その日はとても混み合います。

よくある質問：
- *ルクソールからアスワンへのクルーズはアブ・シンベルに行きますか？* いいえ。アブ・シンベルはアスワンのはるか南にあります。
  ルクソール〜アスワンのクルーズではアスワンからのオプショナルツアーとして案内されます。ナセル湖クルーズは船でそこまで行きます。
- *ナセル湖クルーズは何泊ですか？* 船によって異なります。泊数と出航日は各船のページでご確認ください。
- *ナセル湖クルーズは神殿に停まりますか？* アブ・シンベル神殿のそばに停泊する船もあります。各船のプログラムをご確認ください。

SEO：「ナセル湖クルーズ：水路で行くアブ・シンベル」・「アスワンとアブ・シンベルを結ぶナセル湖クルーズ。航行する場所、ラムセス2世とネフェルタリの神殿、陸路との違い。」
