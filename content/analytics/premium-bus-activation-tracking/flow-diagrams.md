# Premium Bus — Activation & Tracking Analytics Event Flow Diagrams

These diagrams help build funnels in analytics dashboards. Green nodes are exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show typical order and major forks.

Notes:
- This flow starts **after a booking is confirmed** and the user enters activation / live tracking.
- It applies to fresh bookings, pass-based bookings, and bulk bookings.
- Booking conversion is documented in `content/analytics/premium-bus-booking/flow-diagrams.md`.
- Bulk booking / manage rides is documented in `content/analytics/premium-bus-bulk-booking/flow-diagrams.md`.

Visual key:
- Green solid boxes: analytics events (exact strings from `events.json`)
- Grey dashed pills: screens/states/branches (not analytics events)
- Grey dotted boxes: external flows instrumented elsewhere

```mermaid
flowchart LR
  ui([Screen / state / branch]) --> ev["analytics event name"]
  ext[External module flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev event;
  class ui ui;
  class ext external;
```

## Funnel: Booking Confirmed → Ticket Activation & Live Tracking

```mermaid
flowchart TD
  ev_bookingConfirmed["pb booking confirmed"] --> ev_activationOpen["pb activation screen opened"]

  ev_activationOpen --> ui_tripPolling([Trip details polling / live ETA])
  ui_tripPolling --> ev_etaRendered["pb first time eta rendered on activation screen"]
  ui_tripPolling --> ev_tripPollingChange["pb trip polling response change"]

  ev_activationOpen --> ui_trackingStart([Start live tracking])
  ui_trackingStart --> ev_trackingStarted["pb trip tracking started for user"]
  ui_trackingStart -->|Poor network detected| ev_deadZone["pb poor network or dead zone detected"]
  ui_trackingStart -->|User closes screen or trip ends| ui_trackingEnd([End tracking])
  ui_trackingEnd --> ev_trackingEnded["pb trip tracking ended for user"]

  ev_activationOpen -->|User clicks verify| ev_verifyClicked["pb verify ticket clicked"]
  ev_activationOpen -->|User clicks more options| ev_optionsClicked["pb active booking options clicked"]
  ev_activationOpen -->|User toggles traffic| ev_trafficToggled["pb activation screen traffic view toggled"]
  ev_activationOpen -->|User clicks directions| ev_directionsClicked["pb navigate directions clicked"]

  ev_optionsClicked --> ev_optionItemClicked["pb active booking option item clicked"]

  ev_optionItemClicked -->|Cancellation selected| ev_cancelBottomSheet["pb trip cancel conf bottom sheet opened"]
  ev_optionItemClicked -->|Reschedule selected| ext_reschedule[Reschedule flow — premium bus booking]

  ev_cancelBottomSheet --> ev_cancelGoBack["pb trip cancellation go back cta clicked"]
  ev_cancelBottomSheet --> ui_cancelFlow([Cancellation flow])
  ev_cancelBottomSheet --> ev_refundBlocked["pb value pass booking cancellation refund blocked"]
  ev_refundBlocked --> ev_upgradeCta["pb value pass booking cancellation upgrade CTA clicked"]

  %%chalo:diagram-link ev_verifyClicked -> title:Validation & Receipt (Premium Reserve Ticket)
  %%chalo:diagram-link ui_cancelFlow -> title:Cancellation Flow (Premium Bus Product Modification)
  %%chalo:diagram-link ext_reschedule -> flow:premium-bus-booking

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bookingConfirmed,ev_activationOpen,ev_etaRendered,ev_tripPollingChange,ev_trackingStarted,ev_deadZone,ev_trackingEnded,ev_verifyClicked,ev_optionsClicked,ev_trafficToggled,ev_directionsClicked,ev_optionItemClicked,ev_cancelBottomSheet,ev_cancelGoBack,ev_refundBlocked,ev_upgradeCta event;
  class ui_tripPolling,ui_trackingStart,ui_trackingEnd,ui_cancelFlow ui;
  class ext_reschedule external;
```

## Validation & Receipt (Premium Reserve Ticket)

```mermaid
flowchart TD
  ui_validationStart([Validation flow started]) --> ev_premiumReserveFetched["premium reserve ticket fetched"]

  ev_premiumReserveFetched --> ui_validationScreen([Validation / receipt screen])
  ui_validationScreen --> ev_premiumReserveViewReceipt["premium reserve ticket view receipt clicked"]

  ui_validationScreen --> ui_punch([Punch received / receipt payload])
  ui_punch --> ev_premiumReserveReceiptPayload["premium reserve ticket receipt payload"]
  ui_punch --> ev_premiumReserveTripPunched["premium reserve ticket trip punched"]

  ui_notification([Punch notification received]) --> ev_premiumReservePunchReceived["premium reserve ticket punch received"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_premiumReserveFetched,ev_premiumReserveViewReceipt,ev_premiumReserveReceiptPayload,ev_premiumReserveTripPunched,ev_premiumReservePunchReceived event;
  class ui_validationStart,ui_validationScreen,ui_punch,ui_notification ui;
```

## Cancellation Flow (Premium Bus Product Modification)

```mermaid
flowchart TD
  ui_cancelReasons([Cancellation reasons screen]) --> ev_cancelOkay["pb trip cancellation okay cta clicked"]
  ev_cancelOkay --> ev_cancelSuccess["pb booking cancellation successful"]
  ev_cancelSuccess --> ev_bookAnotherRide["pb trip cancellation book another ride cta clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_cancelOkay,ev_cancelSuccess,ev_bookAnotherRide event;
  class ui_cancelReasons ui;
```

## Home Screen Acknowledgment Cards

Shows premium bus acknowledgment cards shown on home screen after booking state changes.

```mermaid
flowchart TD
  ui_homeScreen([Home screen rendered]) --> ui_bookingStateCheck([Check for booking state changes])

  ui_bookingStateCheck --> ev_ackShown["premium reserve ticket ack shown"]

  ev_ackShown -->|User clicks Details| ui_detailsClick([User clicks Details CTA])
  ev_ackShown -->|User clicks Okay| ui_okayClick([User clicks Okay CTA])

  ui_detailsClick --> ev_ackCtaClicked["premium reserve ticket ack cta clicked"]
  ui_okayClick --> ev_ackCtaClicked

  ev_ackCtaClicked -->|Details clicked| ui_navigateToActivation([Navigate to activation screen])
  ev_ackCtaClicked -->|Okay clicked| ui_dismissCard([Dismiss acknowledgment card])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_ackShown,ev_ackCtaClicked event;
  class ui_homeScreen,ui_bookingStateCheck,ui_detailsClick,ui_okayClick,ui_navigateToActivation,ui_dismissCard ui;
```

## Key Funnel Construction Guidelines for PMs

### Activation & Tracking Engagement
```
pb activation screen opened
  → pb first time eta rendered on activation screen
  → pb trip tracking started for user
  (Actions: pb verify ticket clicked, pb navigate directions clicked)
  → pb trip tracking ended for user
```

## Monitoring Signals

These events can be useful as leading indicators / quality signals:
- `pb trip polling response change`
- `pb poor network or dead zone detected`
