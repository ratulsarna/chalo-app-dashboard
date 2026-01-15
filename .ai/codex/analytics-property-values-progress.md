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
| authentication | authentication | done | Added finite domains for boolean flags (`isInvalidOtpEntered`, `isTrueCallerInstalled`, `loggedOutSuccessfully`, `sessionLogout`, and profile delete URL opened). |
| bills | bills | todo | |
| card | card | done | |
| chalo-wallet | chalo-wallet | done | |
| help | help | done | Added finite domains for `pass status` (cancel booking), SOS + autolink booleans, and `chat screen` source. |
| history | history | done | Added finite domains for overloaded `type`, super pass `pass status`, renew flags, `verificationFlag`, `isFreeRide`, and renew dialog source. |
| home | home | done | |
| instant-ticket | instant-ticket-purchase | done | Added finite domains for validation ack/flow types and several boolean flags. |
| lifecycle | lifecycle | done | Added finite values for app open migration flag, force update flags, migration results, and app store URL. |
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
| search | search | done | Added finite domains for boolean flags, `from_type`/`to_type`, top-result type (`PLACE`/`STOP`), and `universal item clicked` enum. |
| super-pass | super-pass-purchase | done | Added finite domains for pass purchase booleans, `gender`, `coming from source`, report-problem keys, and super pass subtypes. |
| trip-planner | trip-planner | todo | |
| validation | validation | done | Added finite report-problem + validation booleans; removed duplicate `failureReason` key via normalization. |
