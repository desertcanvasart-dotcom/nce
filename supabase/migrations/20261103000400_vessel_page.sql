-- The rebuilt vessel page (PAGE-072): what a visitor needs to judge a boat, kept as vessel data rather than in the
-- template. Every addition is optional, so vessels without it render as before and their sections simply hide.
-- Idempotent ("if not exists"), so it can run again on a database that already has it.

-- An indicative price: a guide per person and night, never a quote and never offered for booking. In minor units
-- (DATA-001), all four together.
alter table public.vessels
  add column if not exists indicative_per_night_minor bigint check (indicative_per_night_minor > 0),
  add column if not exists indicative_currency text check (indicative_currency in ('USD', 'EUR', 'EGP')),
  add column if not exists indicative_basis text check (indicative_basis in ('per_person_per_night')),
  add column if not exists indicative_status text check (indicative_status in ('indicative'));
alter table public.vessels drop constraint if exists indicative_price_complete;
alter table public.vessels add constraint indicative_price_complete check (
  num_nulls(indicative_per_night_minor, indicative_currency, indicative_basis, indicative_status) in (0, 4));

-- "Is this the right boat for you?", and what a cruise includes, in each language. `less_suited_to` may hold one
-- site link written [words](/path/). The three lists hold verified entries only; an empty list isn't shown.
alter table public.vessel_translations
  add column if not exists good_for text check (length(good_for) <= 400),
  add column if not exists less_suited_to text check (length(less_suited_to) <= 400),
  add column if not exists included text[] not null default '{}',
  add column if not exists optional_extras text[] not null default '{}',
  add column if not exists not_included text[] not null default '{}';

-- Cabin facts that came from an import but nobody has confirmed: the page hides them until they are.
alter table public.cabin_types
  add column if not exists unverified_fields text[] not null default '{}'
    check (unverified_fields <@ array['size', 'bed', 'max_guests', 'view']);

-- A vessel photo that shows one of its cabin types: the cabin's card shows it, the gallery doesn't. (A photo
-- parented to the cabin type itself would need its file under that parent's path; these stay vessel photos.)
alter table public.media
  add column if not exists shows_cabin_type_id uuid references public.cabin_types (id) on delete set null;
alter table public.media drop constraint if exists shows_cabin_on_vessel_photo;
alter table public.media add constraint shows_cabin_on_vessel_photo check (shows_cabin_type_id is null or vessel_id is not null);

-- An evaluation is published on the page only once someone has confirmed it is real (verified) and its evaluator,
-- method, conclusion, strengths, watch points and a note per dimension are all there. Existing ones stay unverified.
alter table public.evaluations
  add column if not exists verified boolean not null default false,
  add column if not exists evaluator_role text check (length(trim(evaluator_role)) between 1 and 120),
  add column if not exists assessment_method text
    check (assessment_method in ('onboard_inspection', 'document_review', 'onboard_and_documents'));
alter table public.evaluations drop constraint if exists verified_has_evaluator;
alter table public.evaluations add constraint verified_has_evaluator check (
  not verified or (evaluator_role is not null and assessment_method is not null));
alter table public.evaluation_translations
  add column if not exists verdict_summary text check (length(verdict_summary) <= 400),
  add column if not exists strengths text[] not null default '{}',
  add column if not exists watch_points text[] not null default '{}',
  add column if not exists dimension_notes jsonb not null default '{}'::jsonb check (jsonb_typeof(dimension_notes) = 'object');

-- "Ask for an offer" from a vessel page, without an account: a contact message that keeps the boat, route, nights
-- and date it was asked from.
alter type public.contact_topic add value if not exists 'offer';
alter table public.contact_messages
  add column if not exists vessel_id uuid references public.vessels (id) on delete set null,
  add column if not exists route text check (length(route) <= 80),
  add column if not exists nights smallint check (nights between 1 and 21),
  add column if not exists departs_on date,
  add column if not exists guests smallint check (guests between 1 and 30);

-- ── Mövenpick MS Royal Lily: the reference vessel. Nothing happens on a database without it. ─────────────────────
do $$
declare
  rl uuid := (select id from public.vessels where slug = 'movenpick-royal-lily');
  four uuid;
  three uuid;
begin
  if rl is null then return; end if;
  four := (select id from public.schedules where vessel_id = rl and code = 'LXR-ASW-4');
  three := (select id from public.schedules where vessel_id = rl and code = 'ASW-LXR-3');

  -- Five decks (A to E) on Mövenpick's deck plan; the price is the guide Nilecruz gave, not a quote.
  update public.vessels set deck_count = 5, indicative_per_night_minor = 30000, indicative_currency = 'USD',
    indicative_basis = 'per_person_per_night', indicative_status = 'indicative'
  where id = rl;

  -- Size, beds, guests and view came from the import and aren't confirmed yet.
  update public.cabin_types set unverified_fields = array['size', 'bed', 'max_guests', 'view']
  where vessel_id = rl and code in ('STD', 'RS');

  -- The queen and twin cabin photos show the Standard Cabin: shown on its card instead of in the gallery.
  update public.media set shows_cabin_type_id = (select id from public.cabin_types where vessel_id = rl and code = 'STD')
  where vessel_id = rl and (storage_path like '%/royal-lily-04-queen-cabin.jpg' or storage_path like '%/royal-lily-05-twin-cabin.jpg');

  insert into public.vessel_translations (vessel_id, locale, summary, description, dining, good_for, less_suited_to)
  values
    (rl, 'en',
     'A motor cruise ship with 56 cabins, four Royal Suites, a pool and set weekly sailings between Luxor and Aswan.',
     'Royal Lily has a pool, a sun deck, a restaurant, a lounge, a bar, a spa and a gym. Reception is open 24 hours, room service reaches every cabin and an entertainment team hosts the evenings. All cabins are non-smoking.',
     'The Lily Restaurant serves breakfast, lunch and dinner, with local and international cuisine.',
     'Travellers who want a pool, set departure days and a clear 3 or 4-night programme between Luxor and Aswan.',
     'Anyone looking for a small group or quiet riverbank moorings. For that, compare [sailing dahabiyas](/vessels/dahabiya/).'),
    (rl, 'es',
     'Un crucero a motor con 56 camarotes, cuatro Royal Suites, piscina y salidas semanales fijas entre Luxor y Asuán.',
     'El Royal Lily tiene piscina, solárium, restaurante, salón, bar, spa y gimnasio. La recepción abre las 24 horas, el servicio de habitaciones llega a todos los camarotes y un equipo de animación organiza las veladas. Ningún camarote es para fumadores.',
     'El restaurante Lily sirve desayuno, almuerzo y cena, con cocina local e internacional.',
     'Viajeros que quieren piscina, días de salida fijos y un programa claro de 3 o 4 noches entre Luxor y Asuán.',
     'Quien busque un grupo pequeño o amarres tranquilos en la orilla. Para eso, compara las [dahabiyas de vela](/vessels/dahabiya/).'),
    (rl, 'ja',
     '56室の客室と4室のロイヤルスイート、プールを備え、ルクソールとアスワンの間を毎週決まった曜日に運航するモータークルーズ船です。',
     'ロイヤル・リリーには、プール、サンデッキ、レストラン、ラウンジ、バー、スパ、ジムがあります。レセプションは24時間対応で、ルームサービスは全客室で利用でき、夜はエンターテインメントチームが催しを行います。全客室禁煙です。',
     'リリー・レストランでは、朝食・昼食・夕食に地元料理と各国料理を提供しています。',
     'プール、決まった出発曜日、ルクソールとアスワンの間のわかりやすい3泊または4泊の行程を求める方。',
     '少人数での旅や、静かな川岸での停泊を望む方。その場合は[帆船ダハビヤ](/vessels/dahabiya/)と比べてみてください。')
  on conflict (vessel_id, locale) do update set summary = excluded.summary, description = excluded.description,
    dining = excluded.dining, good_for = excluded.good_for, less_suited_to = excluded.less_suited_to, updated_at = now();

  -- The usual programme: the sightseeing listed day by day, with the offer confirming what's included.
  if four is not null then
    insert into public.schedule_days (schedule_id, day_number, locale, title, description) values
      (four, 4, 'en', 'Aswan', 'Visit the High Dam and Philae Temple. Your offer will confirm whether a felucca sail or other sightseeing is included. Overnight in Aswan.'),
      (four, 1, 'es', 'Luxor: templos de Karnak y Luxor', 'Embarque y almuerzo a bordo. Visita al templo de Karnak, famoso por su gran sala hipóstila, y después al templo de Luxor. Cena y noche en Luxor.'),
      (four, 2, 'es', 'Orilla occidental de Luxor', 'Tras el desayuno, visita al Valle de los Reyes, el templo funerario de la reina Hatshepsut y los Colosos de Memnón. De vuelta a bordo, navegación hacia el sur, en dirección a Esna.'),
      (four, 3, 'es', 'Edfu y Kom Ombo', 'Visita al templo de Horus en Edfu, uno de los templos mejor conservados de Egipto. Continuación hasta Kom Ombo y su templo doble de Sobek y Haroeris, y navegación hasta Asuán.'),
      (four, 4, 'es', 'Asuán', 'Visita a la Presa Alta y al templo de Filae. Tu oferta confirmará si incluye un paseo en faluca u otras visitas. Noche en Asuán.'),
      (four, 5, 'es', 'Desembarque en Asuán', 'Desayuno y desembarque.'),
      (four, 1, 'ja', 'ルクソール:カルナック神殿とルクソール神殿', '乗船し、船内で昼食。大列柱室で知られるカルナック神殿を訪れ、続いてルクソール神殿へ。夕食をとり、ルクソールで一泊します。'),
      (four, 2, 'ja', 'ルクソール西岸', '朝食後、王家の谷、ハトシェプスト女王葬祭殿、メムノンの巨像を見学。船に戻り、エスナへ向けて南へ航行します。'),
      (four, 3, 'ja', 'エドフとコム・オンボ', 'エジプトでも特に保存状態のよい神殿のひとつ、エドフのホルス神殿を見学。続いてセベク神と大ホルス神を祀るコム・オンボの二重神殿を訪れ、アスワンへ航行します。'),
      (four, 4, 'ja', 'アスワン', 'アスワン・ハイダムとフィラエ神殿を見学。ファルーカでの帆走やその他の観光が含まれるかは、お見積もりで確認できます。アスワンで一泊します。'),
      (four, 5, 'ja', 'アスワンで下船', '朝食後、下船します。')
    on conflict (schedule_id, day_number, locale) do update set title = excluded.title, description = excluded.description;
  end if;
  if three is not null then
    insert into public.schedule_days (schedule_id, day_number, locale, title, description) values
      (three, 3, 'en', 'Luxor', 'Sightseeing in Luxor, including the West Bank. Your offer will confirm the exact programme.'),
      (three, 4, 'en', 'Disembarkation in Luxor', 'Breakfast and disembarkation. Your offer will confirm whether the East Bank temples are visited before you leave.'),
      (three, 1, 'es', 'Asuán', 'Embarque en Asuán. Visita a la Presa Alta y al templo de Filae.'),
      (three, 2, 'es', 'Kom Ombo y Edfu', 'Visita a los templos de Kom Ombo y Edfu, y navegación hacia el norte.'),
      (three, 3, 'es', 'Luxor', 'Visitas en Luxor, incluida la orilla occidental. Tu oferta confirmará el programa exacto.'),
      (three, 4, 'es', 'Desembarque en Luxor', 'Desayuno y desembarque. Tu oferta confirmará si se visitan los templos de la orilla oriental antes de la salida.'),
      (three, 1, 'ja', 'アスワン', 'アスワンで乗船。アスワン・ハイダムとフィラエ神殿を見学します。'),
      (three, 2, 'ja', 'コム・オンボとエドフ', 'コム・オンボ神殿とエドフ神殿を見学し、北へ航行します。'),
      (three, 3, 'ja', 'ルクソール', '西岸を含むルクソールを観光します。詳しい行程はお見積もりで確認できます。'),
      (three, 4, 'ja', 'ルクソールで下船', '朝食後、下船します。出発前に東岸の神殿を訪れるかどうかは、お見積もりで確認できます。')
    on conflict (schedule_id, day_number, locale) do update set title = excluded.title, description = excluded.description;
  end if;
end $$;
