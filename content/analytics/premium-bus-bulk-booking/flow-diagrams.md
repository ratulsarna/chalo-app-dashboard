# Premium Bus — Bulk Booking & Manage Rides Analytics Event Flow Diagrams

These diagrams help build funnels in analytics dashboards. Green nodes are exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show typical order and major forks.

Notes:
- This flow focuses on **manage rides** + **bulk booking (multi-ride)** behavior for premium bus.
- “Book single ride” / “rebook” paths converge back into the main booking conversion flow in `content/analytics/premium-bus-booking/flow-diagrams.md`.
- Post-booking activation & tracking is documented in `content/analytics/premium-bus-activation-tracking/flow-diagrams.md`.

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

## Entry: Home Screen → Manage Rides

```mermaid
flowchart TD
  ui_homeScreen([Home screen with active pass]) --> ev_passInfoShown["homescreen premium bus active pass info"]
  ui_homeScreen --> ev_passCacheEmpty["homescreen premium bus active pass cache empty"]
  ui_homeScreen --> ev_passCacheFailed["homescreen premium bus active pass cache failed"]

  ev_passInfoShown -->|User clicks manage| ev_bulkOpen["pb bulk booking manage rides screen opened"]

  %%chalo:diagram-link ev_bulkOpen -> title:Funnel: Manage Rides → Bulk Booking (Pass-Based Multi-Ride)

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_passInfoShown,ev_passCacheEmpty,ev_passCacheFailed,ev_bulkOpen event;
  class ui_homeScreen ui;
```

## Funnel: Manage Rides → Bulk Booking (Pass-Based Multi-Ride)

```mermaid
flowchart TD
  ui_passDetails([Pass details / Manage rides entry]) --> ev_bulkOpen["pb bulk booking manage rides screen opened"]

  ev_bulkOpen --> ui_passDataFetch([Fetch pass data from DB])
  ui_passDataFetch --> ev_passDataFetched["pb bulk booking pass data fetched"]

  ev_passDataFetched --> ui_linkedBookingsFetch([Fetch linked bookings])
  ui_linkedBookingsFetch --> ev_linkedSuccess["pb bulk booking pass ticket success"]
  ui_linkedBookingsFetch --> ev_linkedFailed["pb bulk booking pass ticket failure"]
  ev_linkedFailed --> ev_linkedRetry["pb bulk booking fetch linked booking retry btn click"]
  ev_linkedRetry --> ui_linkedBookingsFetch

  ev_passDataFetched --> ev_unknownSubType["pb unknown super pass sub type event"]

  ev_linkedSuccess -->|User books single ride| ev_singleRideClick["pb bulk booking book single ride click"]
  ev_linkedSuccess -->|User books multiple rides| ev_multipleRidesClick["pb bulk booking book multiple rides click"]
  ev_linkedSuccess -->|User rebooks past ride| ev_bookAgainClick["pb bulk booking book again cta click"]

  ev_bulkOpen -->|Dialog dismissed| ev_dimsissDialog["pb bulk booking dimsiss dialog"]

  ev_multipleRidesClick --> ui_prebookingDetails([Pre-booking details & eligibility])

  ui_prebookingDetails --> ui_prebookingFlow([Stop & slot selection for each ride])
  ui_prebookingFlow --> ui_seatSelection([User selects seats for all rides])
  ui_seatSelection --> ev_selectSeatsClicked["premium bus seat selection select seats clicked"]

  ev_selectSeatsClicked --> ev_confirmPageShown["bulk booking confirm rides page shown"]

  ev_confirmPageShown --> ui_userConfirms([User confirms bulk booking])
  ui_userConfirms --> ev_confirmClicked["bulk booking confirm details clicked"]

  ev_confirmClicked --> ui_bulkBookingProcess([Process bulk booking])
  ui_bulkBookingProcess --> ev_bulkSuccess["bulk booking confirmation successful"]
  ui_bulkBookingProcess --> ev_bulkFailed["bulk booking confirmation failed"]

  ev_bulkSuccess --> ev_viewRidesClicked["bulk booking confirmation view rides clicked"]
  ev_bulkSuccess --> ev_navHome["bulk booking confirmation navigate to homepage clicked"]
  ev_bulkSuccess --> ev_navPassDetails["bulk booking confirmation navigate to pass details page"]
  ev_bulkFailed --> ev_retryClicked["bulk booking confirmation retry clicked"]

  ev_singleRideClick --> ext_bookingFlow[Premium bus booking flow]
  ev_bookAgainClick --> ext_bookingFlow

  %%chalo:diagram-link ui_prebookingDetails -> title:Funnel: Bulk Booking - Pre-Booking Details & Eligibility Checks
  %%chalo:diagram-link ui_prebookingFlow -> title:Funnel: Bulk Booking - Stop & Slot Selection
  %%chalo:diagram-link ui_seatSelection -> title:Seat Selection (Bulk Context)
  %%chalo:diagram-link ext_bookingFlow -> title:External: Premium Bus Booking Flow

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bulkOpen,ev_passDataFetched,ev_linkedSuccess,ev_linkedFailed,ev_linkedRetry,ev_unknownSubType,ev_singleRideClick,ev_multipleRidesClick,ev_bookAgainClick,ev_dimsissDialog,ev_selectSeatsClicked,ev_confirmPageShown,ev_confirmClicked,ev_bulkSuccess,ev_bulkFailed,ev_viewRidesClicked,ev_navHome,ev_navPassDetails,ev_retryClicked event;
  class ui_passDetails,ui_passDataFetch,ui_linkedBookingsFetch,ui_prebookingDetails,ui_prebookingFlow,ui_seatSelection,ui_userConfirms,ui_bulkBookingProcess ui;
  class ext_bookingFlow external;
```

## Funnel: Bulk Booking - Pre-Booking Details & Eligibility Checks

```mermaid
flowchart TD
  ui_details([Bulk booking pre-booking details screen]) --> ev_durationEditClicked["booking duration edit clicked"]
  ev_durationEditClicked --> ev_durationEditChanged["booking duration edit changed"]

  ui_details --> ev_ridesOptionSelected["number of rides option selected"]
  ui_details --> ev_preferencesSelected["bulk book preferences selected"]

  ui_details --> ui_checks{Eligibility checks}

  ui_checks -->|Insufficient balance| ev_insufficientShown["bulk booking rides insufficient balance dialog shown"]
  ev_insufficientShown --> ev_insufficientOk["bulk booking rides insufficient balance okay clicked"]
  ev_insufficientShown --> ev_insufficientClosed["bulk booking rides insufficient balance closed"]

  ui_checks -->|Invalid date range| ev_invalidDateShown["bulk booking rides invalid date range dialog shown"]
  ev_invalidDateShown --> ev_invalidDateClosed["bulk booking rides invalid date range dialog closed"]

  ui_checks -->|Zero ride balance| ev_zeroRideShown["bulk booking rides zero ride balance dialog shown"]
  ev_zeroRideShown --> ev_zeroRideClosed["bulk booking rides zero ride balance dialog closed"]

  ui_details --> ui_continue([Proceed to stop/slot selection])

  %%chalo:diagram-link ui_continue -> title:Funnel: Bulk Booking - Stop & Slot Selection

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_durationEditClicked,ev_durationEditChanged,ev_ridesOptionSelected,ev_preferencesSelected,ev_insufficientShown,ev_insufficientOk,ev_insufficientClosed,ev_invalidDateShown,ev_invalidDateClosed,ev_zeroRideShown,ev_zeroRideClosed event;
  class ui_details,ui_checks,ui_continue ui;
```

## Funnel: Bulk Booking - Stop & Slot Selection

```mermaid
flowchart TD
  ui_entry([From pre-booking details]) --> ev_stopSlotOpen["bulk booking stop slot selection screen opened"]

  ev_stopSlotOpen --> ui_stops{Stops available?}
  ui_stops -->|No stops| ev_noStops["bulk booking stop slot selection screen no stops available opened"]
  ui_stops -->|Yes| ev_stopSelected["bulk booking stop selected"]

  ev_stopSlotOpen --> ev_stopEdit["bulk booking stop edit clicked"]
  ev_stopSlotOpen --> ev_slotEdit["bulk booking slot edit clicked"]

  ev_stopSelected --> ev_slotListOpened["bulk booking slot list opened"]
  ev_slotListOpened --> ev_slotSelected["bulk booking slot selected"]

  ev_stopSlotOpen --> ui_routeSuggestion([Suggest new route/stops])
  ui_routeSuggestion --> ev_suggestedStops["pb suggested stops"]

  ev_slotListOpened --> ui_slotSuggestion([Suggest new slot time])
  ui_slotSuggestion --> ev_slotSuggestionSubmitted["pb slot suggestion submitted"]

  ev_slotSelected --> ui_seatSelectionCta([User selects seats for ride])

  ev_stopSlotOpen --> ui_slotsFetch{Slots fetch result}
  ui_slotsFetch -->|No slots| ev_noSlots["bulk booking no slots available bottomsheet shown"]
  ui_slotsFetch -->|Error| ev_slotsError["bulk booking slots fetch error bottomsheet shown"]

  %%chalo:diagram-link ui_seatSelectionCta -> title:Seat Selection (Bulk Context)

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_stopSlotOpen,ev_noStops,ev_stopSelected,ev_stopEdit,ev_slotEdit,ev_slotListOpened,ev_slotSelected,ev_suggestedStops,ev_slotSuggestionSubmitted,ev_noSlots,ev_slotsError event;
  class ui_entry,ui_stops,ui_routeSuggestion,ui_slotSuggestion,ui_seatSelectionCta,ui_slotsFetch ui;
```

## Funnel: Pass Management & Re-booking

Shows how users manage their passes and rebook rides.

```mermaid
flowchart TD
  ui_homeScreen([Home screen with active pass]) --> ev_passInfoShown["homescreen premium bus active pass info"]
  ui_homeScreen --> ev_passCacheEmpty["homescreen premium bus active pass cache empty"]
  ui_homeScreen --> ev_passCacheFailed["homescreen premium bus active pass cache failed"]

  ev_passInfoShown -->|User clicks manage| ev_bulkScreenOpen["pb bulk booking manage rides screen opened"]

  ev_bulkScreenOpen --> ev_passDataFetched["pb bulk booking pass data fetched"]
  ev_passDataFetched --> ev_linkedSuccess["pb bulk booking pass ticket success"]

  ev_linkedSuccess -->|User clicks past ride| ui_pastRideClick([User selects past ride])
  ui_pastRideClick --> ev_bookAgainClick["pb bulk booking book again cta click"]

  ev_bookAgainClick --> ui_configFetch([Fetch ticket config for rebooking])
  ui_configFetch --> ev_configSuccess["pb bulk booking fetch ticket config success"]
  ui_configFetch --> ev_configFailed["pb bulk booking fetch ticket config failed"]

  ev_configSuccess --> ext_bookingFlow[Premium bus booking flow]

  ev_linkedSuccess -->|User views receipt| ev_viewReceiptClicked["pb bulk booking view trip receipt button clicked"]

  %%chalo:diagram-link ext_bookingFlow -> title:External: Premium Bus Booking Flow

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_passInfoShown,ev_passCacheEmpty,ev_passCacheFailed,ev_bulkScreenOpen,ev_passDataFetched,ev_linkedSuccess,ev_bookAgainClick,ev_configSuccess,ev_configFailed,ev_viewReceiptClicked event;
  class ui_homeScreen,ui_pastRideClick,ui_configFetch ui;
  class ext_bookingFlow external;
```

## Seat Selection (Bulk Context)

This is a minimal bulk-focused slice; for full seat selection instrumentation (gender confirmation + seat change flow), see `content/analytics/premium-bus-booking/flow-diagrams.md`.

```mermaid
flowchart TD
  ev_seatScreenOpen["pb seat selection screen opened"] --> ui_layoutFetch([Fetch seat layout (bulk)])

  ui_layoutFetch --> ev_aggLayoutSuccess["pb aggregated seat layout fetch success"]
  ui_layoutFetch --> ev_aggLayoutFailed["pb aggregated seat layout fetch failure"]

  ev_aggLayoutSuccess --> ev_seatIconClicked["premium bus seat selection seat icon clicked"]
  ev_seatIconClicked --> ev_selectSeatsClicked["premium bus seat selection select seats clicked"]

  %%chalo:diagram-link ev_selectSeatsClicked -> title:Funnel: Manage Rides → Bulk Booking (Pass-Based Multi-Ride)

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_seatScreenOpen,ev_aggLayoutSuccess,ev_aggLayoutFailed,ev_seatIconClicked,ev_selectSeatsClicked event;
  class ui_layoutFetch ui;
```

## Key Funnel Construction Guidelines for PMs

### Bulk Booking Funnel
```
pb bulk booking manage rides screen opened
  → pb bulk booking pass data fetched
  → pb bulk booking pass ticket success
  → pb bulk booking book multiple rides click
  → pb seat selection screen opened
  → pb aggregated seat layout fetch success
  → premium bus seat selection select seats clicked
  → bulk booking confirm rides page shown
  → bulk booking confirm details clicked
  → bulk booking confirmation successful
```

### Pass Management Engagement
```
homescreen premium bus active pass info
  → pb bulk booking manage rides screen opened
  → pb bulk booking pass ticket success
  → pb bulk booking book single ride click OR pb bulk booking book multiple rides click
```

## Error Events for Monitoring

Track these events to monitor bulk booking flow health:

**Bulk Booking Errors:**
- `pb bulk booking pass ticket failure`
- `pb bulk booking fetch ticket config failed`
- `bulk booking confirmation failed`

**Seat Selection (Bulk) Errors:**
- `pb aggregated seat layout fetch failure`

**Pass Management Errors:**
- `homescreen premium bus active pass cache failed`
