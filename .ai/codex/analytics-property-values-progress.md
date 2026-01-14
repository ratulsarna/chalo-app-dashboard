# Analytics Property Values — Flow Progress

Tracks which `content/analytics/<flowSlug>/events.json` files have had **finite** `propertyDefinitions.<key>.values[]`
populated using `scripts/analytics-updater/extract-property-values.js` + `scripts/analytics-updater/property-domains.json`.

Rule: only write `values[]` when the value set is provably **complete** (domain-backed or otherwise closed). No partial lists.

## Status

- `done` = ran `--only-missing --flow-scope --complete-only --apply`, reviewed diff, validated, committed.
- `partial` = some keys done but more finite keys likely remain (needs more domains / tighter scoping).
- `todo` = not started.

| Flow key (flows.json) | Flow slug (content dir) | Status | Notes |
|---|---|---|---|
| ads | ads | done | Added `hasVideo` (boolean). |
| authentication | authentication | todo | |
| bills | bills | todo | |
| card | card | done | |
| chalo-wallet | chalo-wallet | done | |
| help | help | todo | |
| history | history | todo | |
| home | home | done | |
| instant-ticket | instant-ticket-purchase | todo | |
| lifecycle | lifecycle | todo | |
| live-tracking | live-tracking | done | |
| metro | metro | done | |
| mticket | mticket | done | Added validation/report-problem finite keys (incl `type`, `problemSource`, `notificationDeliveryMedium`, boolean flags). |
| network | network | done | |
| notifications | notifications | todo | |
| onboarding | onboarding | todo | |
| ondc-bus | ondc-bus | done | |
| payment | payment | done | |
| premium-bus-activation-tracking | premium-bus-activation-tracking | done | |
| premium-bus-booking | premium-bus-booking | done | |
| premium-bus-bulk-booking | premium-bus-bulk-booking | done | |
| search | search | todo | |
| super-pass | super-pass-purchase | todo | |
| trip-planner | trip-planner | todo | |
| validation | validation | todo | |
