# BookingSummary

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/BookingSummary/README.md`._

Booking panel with a guests stepper, line items, gratuity and flight toggles, a counting total and Request to book (no payment).

Provide `pricePerPerson`, `nights`, `vesselName`, `cabinName` and `departure`. Every line that changes the total is visible; nothing is added at checkout.

## Changes in the build

- Rebuilt around data (ADR-007): lines and total from the caller; gratuity shown separately as paid on board at check-out, never in the total (ADR-010/017); extras listed separately, never in the total (ADR-011); the policy note comes from the departure's real deadline and cancellation rules.
- No built-in fees, flights, gratuity toggle or 'free cancellation' claim.

States: see `/dev/components/` and `BookingSummary.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
