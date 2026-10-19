# Cruise cancellation policies (CONTENT-NEEDED #4)

**Status:** Faris gave the bands on 19 Oct 2026, and they are confirmed. The English wording is a draft. **The Spanish and Japanese are Claude's drafts and need a native speaker's review before they are shown to customers.**

Days are counted before check-in, which is the departure date. The charge is a percentage of the whole cruise price.

## The bands

| Days before check-in | Luxury and branded vessels | All other vessels |
|---|---|---|
| 181 or more | Full refund | Full refund |
| 180–121 | 15 % | Full refund |
| 120–91 | 50 % | 25 % |
| 90–60 | 100 % | 35 % |
| 59–30 | 100 % | 50 % |
| 29 or fewer | 100 % | 100 % |

**Luxury and branded vessels:** Sonesta, Mövenpick, Oberoi, Historia, Solai, Mayfair.

### As entered on the Cabins page (`cancellation_policies.bands`)

Each band is "from this many days before departure, this percentage is charged".

- **Luxury and branded:** `[{from_days: 181, percent: 0}, {from_days: 121, percent: 15}, {from_days: 91, percent: 50}, {from_days: 0, percent: 100}]`
- **Other vessels:** `[{from_days: 121, percent: 0}, {from_days: 91, percent: 25}, {from_days: 60, percent: 35}, {from_days: 30, percent: 50}, {from_days: 0, percent: 100}]`

The screen lists the bands in words, generated from these numbers ("Cancelled 120 to 91 days before departure: 25 % charged"). At present those generated lines are in English only. That is why the wording below repeats the bands in each language.

## Wording: luxury and branded vessels

### English (draft)

> **Cancellation charges**
>
> If you cancel, a share of the whole cruise price is charged. The share depends on how many days before check-in we receive your cancellation:
>
> - 181 days or more: no charge, full refund
> - 180 to 121 days: 15 %
> - 120 to 91 days: 50 %
> - 90 days or fewer: 100 %
>
> Days are counted in Cairo calendar days, up to the departure date. Anything you have paid beyond the charge is refunded.

### Español (borrador, pendiente de revisión nativa)

> **Gastos de cancelación**
>
> Si cancela, se cobra un porcentaje del precio total del crucero, según los días que falten para el embarque cuando recibamos su cancelación:
>
> - 181 días o más: sin gastos, reembolso total
> - De 180 a 121 días: 15 %
> - De 120 a 91 días: 50 %
> - 90 días o menos: 100 %
>
> Los días se cuentan como días naturales en horario de El Cairo, hasta la fecha de salida. Le reembolsamos lo que haya pagado por encima de los gastos de cancelación.

### 日本語（下書き・ネイティブ確認待ち）

> **キャンセル料**
>
> ご予約をキャンセルされる場合、キャンセルのご連絡を受け付けた日がご乗船日の何日前かに応じて、クルーズ代金総額に対する以下の割合をキャンセル料として申し受けます。
>
> - 181日前まで：キャンセル料なし（全額返金）
> - 180日前〜121日前：15％
> - 120日前〜91日前：50％
> - 90日前以降：100％
>
> 日数はカイロ時間の暦日で、出発日まで数えます。お支払い済みの金額のうち、キャンセル料を超える分を返金いたします。

## Wording: all other vessels

### English (draft)

> **Cancellation charges**
>
> If you cancel, a share of the whole cruise price is charged. The share depends on how many days before check-in we receive your cancellation:
>
> - 121 days or more: no charge, full refund
> - 120 to 91 days: 25 %
> - 90 to 60 days: 35 %
> - 59 to 30 days: 50 %
> - 29 days or fewer: 100 %
>
> Days are counted in Cairo calendar days, up to the departure date. Anything you have paid beyond the charge is refunded.

### Español (borrador, pendiente de revisión nativa)

> **Gastos de cancelación**
>
> Si cancela, se cobra un porcentaje del precio total del crucero, según los días que falten para el embarque cuando recibamos su cancelación:
>
> - 121 días o más: sin gastos, reembolso total
> - De 120 a 91 días: 25 %
> - De 90 a 60 días: 35 %
> - De 59 a 30 días: 50 %
> - 29 días o menos: 100 %
>
> Los días se cuentan como días naturales en horario de El Cairo, hasta la fecha de salida. Le reembolsamos lo que haya pagado por encima de los gastos de cancelación.

### 日本語（下書き・ネイティブ確認待ち）

> **キャンセル料**
>
> ご予約をキャンセルされる場合、キャンセルのご連絡を受け付けた日がご乗船日の何日前かに応じて、クルーズ代金総額に対する以下の割合をキャンセル料として申し受けます。
>
> - 121日前まで：キャンセル料なし（全額返金）
> - 120日前〜91日前：25％
> - 90日前〜60日前：35％
> - 59日前〜30日前：50％
> - 29日前以降：100％
>
> 日数はカイロ時間の暦日で、出発日まで数えます。お支払い済みの金額のうち、キャンセル料を超える分を返金いたします。

## Notes for the reviewer

- "Check-in" here means boarding on the departure date. The Spanish uses *embarque* and the Japanese uses ご乗船日.
- Japanese 「181日前まで」 means "181 days or more before"; 「90日前以降」 means "from 90 days before onwards".
- The refund sentence says only what is decided: whatever was paid beyond the charge comes back. The way the refund is paid comes in Batch 4f-2.
