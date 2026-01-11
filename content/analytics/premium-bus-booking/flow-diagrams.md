# Premium Bus — Booking Analytics Event Flow Diagrams

These diagrams help build funnels in analytics dashboards. Green nodes are exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show typical order and major forks.

Notes:
- Premium bus booking has **multiple entry points**: direct trip search, pass purchase landing, home screen widgets, and deeplinks.
- The booking flow branches based on whether the user is purchasing fresh, rescheduling, or booking via a pass.
- Bulk booking / manage rides is documented in `content/analytics/premium-bus-bulk-booking/flow-diagrams.md`.
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

## Entry Points → Booking Funnel Decision

Use the initial events to identify which funnel path the user takes.

```mermaid
flowchart TD
  ui_home([Home screen / App entry]) --> ev_passLandingOpen["pb pass purchase landing screen opened"]
  ui_home --> ev_tripDetailsOpen["pb trip details screen shown"]
  ui_home --> ev_homeCta["pb homescreen book trip clicked"]

  ev_passLandingOpen -->|Pass purchase intent| ui_passFlow([Pass Purchase Flow])
  ev_tripDetailsOpen -->|Fresh booking or rebook| ui_freshFlow([Fresh Booking Flow])
  ev_homeCta -->|CTA-driven booking| ui_freshFlow

  %%chalo:diagram-link ui_passFlow -> title:Funnel 2: Pass Purchase Landing → Pass Exploration
  %%chalo:diagram-link ui_freshFlow -> title:Funnel 1: Fresh Booking (No Pass) - Complete Journey

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_passLandingOpen,ev_tripDetailsOpen,ev_homeCta event;
  class ui_home,ui_passFlow,ui_freshFlow ui;
```

## Funnel 1: Fresh Booking (No Pass) - Complete Journey

```mermaid
flowchart TD
  ui_entry([Entry: Trip search or deeplink]) --> ev_tripDetailsShown["pb trip details screen shown"]

  ev_tripDetailsShown -->|Route card click| ev_landingRouteClicked["pb landing route clicked"]
  ev_landingRouteClicked --> ext_routeDetails[Route details flow]

  ev_tripDetailsShown -->|View all routes| ev_viewAllClicked["pb landing screen route view all clicked"]
  ev_viewAllClicked --> ui_allRoutes([All routes list])
  ui_allRoutes --> ev_allRoutesRouteClicked["pb all routes route clicked"]
  ev_allRoutesRouteClicked --> ext_routeDetails

  ev_tripDetailsShown -->|Explore routes CTA| ev_exploreRoutesBtnClicked["pb explore available routes button clicked"]
  ev_exploreRoutesBtnClicked --> ui_allRoutes

  ev_tripDetailsShown -->|Rebook card| ev_rebookClicked["pb rebook card clicked"]

  ev_tripDetailsShown -->|Stop suggestion| ui_stopSuggestion([Stop suggestion bottom sheet])
  ui_stopSuggestion --> ev_stopSuggestionSubmitted["pb stop suggestion submitted"]

  ev_tripDetailsShown -->|Preferred time| ui_preferredTime([Preferred time selection])
  ui_preferredTime --> ev_preferredTimeSubmitted["premium bus preferred time submitted"]

  ev_tripDetailsShown --> ui_proceed([User taps proceed])
  ev_rebookClicked --> ui_proceed
  ui_proceed --> ev_tripDetailsSubmitted["pb trip details submitted"]

  ev_tripDetailsSubmitted --> ui_odFetch([Fetch OD pairs for source/destination])
  ui_odFetch --> ev_odFetchSuccess["pb pickup drop options fetched"]
  ui_odFetch --> ev_odFetchFailed["pb pickup drop options fetched result failed"]
  ui_odFetch --> ev_noRouteError["pb no route error displayed"]

  ev_odFetchSuccess --> ui_userSelectsOD([User selects pickup/drop])
  ui_userSelectsOD --> ev_odSelected["pb pickup drop selected"]

  ev_odSelected --> ev_slotScreenOpen["pb slot selection screen opened"]

  ev_odSelected -->|Pass purchase via All Products| ui_configFetch([Fetch complete product config])
  ui_configFetch --> ev_configSuccess["pb fetch complete product config success"]
  ui_configFetch --> ev_configFailed["pb fetch complete product config failed"]
  ev_configSuccess --> ext_superPassFlow[Super Pass Purchase Flow]

  ev_slotScreenOpen --> ui_slotFetch([Fetch available slots])
  ui_slotFetch --> ev_slotSuccess["pb slot fetch success"]
  ui_slotFetch --> ev_slotFailure["pb slot fetch failure"]

  ev_slotSuccess --> ui_userSelectsSlot([User selects slot])
  ui_userSelectsSlot --> ev_slotSelected["pb slot selected by user"]

  ev_slotSelected --> ev_seatScreenOpen["pb seat selection screen opened"]

  ev_seatScreenOpen --> ui_seatFetch([Fetch seat layout])
  ui_seatFetch --> ev_seatLayoutSuccess["pb seat layout fetch success"]
  ui_seatFetch --> ev_seatLayoutFailure["pb seat layout fetch failure"]

  ev_seatLayoutSuccess --> ui_userClicksSeats([User selects seats])
  ui_userClicksSeats --> ev_seatClicked["premium bus seat selection seat icon clicked"]

  ui_userClicksSeats --> ui_userProceeds([User clicks proceed])
  ui_userProceeds --> ev_selectSeatsClicked["premium bus seat selection select seats clicked"]

  ev_selectSeatsClicked --> ui_orderCreation([Create order])
  ui_orderCreation --> ev_orderSuccess["premium bus order creation success"]
  ui_orderCreation --> ev_orderFailed["premium bus order creation failed"]

  ev_orderSuccess --> ext_checkout[Checkout flow - payment]
  ext_checkout --> ui_paymentComplete([Payment complete])

  ui_paymentComplete --> ev_bookingConfirmed["pb booking confirmed"]
  ev_bookingConfirmed --> ui_bookingSuccessScreen([Booking success screen])
  ui_bookingSuccessScreen --> ev_rescheduleSuccess["pb booking reschedule successful event"]
  ev_bookingConfirmed --> ext_activation[Activation & tracking flow]

  %%chalo:diagram-link ev_slotScreenOpen -> title:Slot Selection Detailed Instrumentation
  %%chalo:diagram-link ev_seatScreenOpen -> title:Seat Selection Detailed Instrumentation
  %%chalo:diagram-link ext_checkout -> title:Payment & Order Creation
  %%chalo:diagram-link ext_superPassFlow -> title:External: Super Pass Purchase Flow
  %%chalo:diagram-link ext_routeDetails -> title:External: Route Details Screen & Hooks
  %%chalo:diagram-link ext_activation -> title:External: Premium Bus Activation & Tracking

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_tripDetailsShown,ev_landingRouteClicked,ev_viewAllClicked,ev_allRoutesRouteClicked,ev_exploreRoutesBtnClicked,ev_rebookClicked,ev_stopSuggestionSubmitted,ev_preferredTimeSubmitted,ev_tripDetailsSubmitted,ev_odFetchSuccess,ev_odFetchFailed,ev_noRouteError,ev_odSelected,ev_slotScreenOpen,ev_configSuccess,ev_configFailed,ev_slotSuccess,ev_slotFailure,ev_slotSelected,ev_seatScreenOpen,ev_seatLayoutSuccess,ev_seatLayoutFailure,ev_seatClicked,ev_selectSeatsClicked,ev_orderSuccess,ev_orderFailed,ev_bookingConfirmed,ev_rescheduleSuccess event;
  class ui_entry,ui_allRoutes,ui_stopSuggestion,ui_preferredTime,ui_proceed,ui_odFetch,ui_userSelectsOD,ui_configFetch,ui_slotFetch,ui_userSelectsSlot,ui_seatFetch,ui_userClicksSeats,ui_userProceeds,ui_orderCreation,ui_paymentComplete,ui_bookingSuccessScreen ui;
  class ext_checkout,ext_activation,ext_routeDetails,ext_superPassFlow external;
```

## Funnel 2: Pass Purchase Landing → Pass Exploration

```mermaid
flowchart TD
  ui_passEntry([Entry: Pass purchase deeplink or home widget]) --> ev_passLandingOpen["pb pass purchase landing screen opened"]

  ev_passLandingOpen --> ui_imageFetch([Fetch pass image])
  ui_imageFetch --> ev_imageSuccess["pass image url from config fetch success"]
  ui_imageFetch --> ev_imageFailed["pass image url from config fetch failure"]

  ev_passLandingOpen -->|User swaps stops| ev_swapClicked["pb pass landing swap btn clicked"]
  ev_passLandingOpen -->|User clicks buy pass| ev_buyPassClicked["pb pass landing buy pass btn clicked"]
  ev_passLandingOpen -->|User taps proceed| ev_proceedClicked["pb pass purchase landing proceed btn clicked intent"]
  ev_passLandingOpen -->|Product hook| ev_productHookClicked["product hook product selection screen clicked"]
  ev_productHookClicked --> ev_productHookFaqClicked["pb product hook product selection screen FAQ clicked"]

  ev_proceedClicked --> ui_odFetch([Fetch OD pairs for source/destination])
  ui_odFetch --> ev_odPairClicked["pb pass landing screen od pair clicked"]

  ev_odPairClicked --> ui_configFetch([Fetch product config])
  ui_configFetch --> ev_configSuccess["pb product config fetch success"]
  ui_configFetch --> ev_configFailed["pb product config fetch failure"]

  ev_configFailed --> ev_retryIntent["pb pass purchase retry btn clicked intent"]
  ev_retryIntent --> ui_configFetch

  ev_configSuccess --> ext_superPassFlow[Super Pass Purchase Flow]

  ext_superPassFlow -->|After pass purchase| ev_slotScreenOpen["pb slot selection screen opened"]
  ev_slotScreenOpen -->|User explores with pass| ev_slotSuccess["pb slot fetch success"]

  %%chalo:diagram-link ext_superPassFlow -> title:External: Super Pass Purchase Flow
  %%chalo:diagram-link ev_slotScreenOpen -> title:Slot Selection Detailed Instrumentation

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_passLandingOpen,ev_imageSuccess,ev_imageFailed,ev_swapClicked,ev_buyPassClicked,ev_proceedClicked,ev_odPairClicked,ev_productHookClicked,ev_productHookFaqClicked,ev_configSuccess,ev_configFailed,ev_retryIntent,ev_slotScreenOpen,ev_slotSuccess event;
  class ui_passEntry,ui_imageFetch,ui_odFetch,ui_configFetch ui;
  class ext_superPassFlow external;
```

## Slot Selection Detailed Instrumentation

This shows granular events within the slot selection screen, useful for conversion optimization.

```mermaid
flowchart TD
  ev_slotScreenOpen["pb slot selection screen opened"] --> ui_odPairFetch([Fetch OD pairs])

  ui_odPairFetch --> ev_odSuccess["pb od pair fetch success"]
  ui_odPairFetch --> ev_odFailed["pb od pair fetch failed"]

  ev_odSuccess --> ui_slotFetch([Fetch slots for selected section])
  ui_slotFetch --> ev_slotSuccess["pb slot fetch success"]
  ui_slotFetch --> ev_slotFailure["pb slot fetch failure"]

  ev_slotSuccess -->|User clicks slot| ev_slotSelected["pb slot selected by user"]

  ev_slotSelected --> ui_passFetch([Fetch purchase options])
  ui_passFetch --> ev_passSuccess["pb available purchase options success"]
  ui_passFetch --> ev_passFailed["pb available purchase options failed"]

  ev_passSuccess --> ev_passBottomSheet["pb purchase option bottom sheet item clicked"]
  ev_passSuccess --> ev_passCardClicked["pb pass purchased card clicked by user"]

  ev_passBottomSheet --> ev_valuePassBlocked["pb value pass bottomsheet booking blocked"]
  ev_valuePassBlocked --> ev_valuePassUpgradeCta["pb value pass bottomsheet upgrade CTA clicked"]

  ev_slotSuccess -->|User clicks view all| ev_viewAllClicked["pb view all slots clicked"]
  ev_slotSuccess -->|User clicks explore routes| ev_exploreClicked["pb explore available routes clicked"]
  ev_slotSuccess -->|User clicks directions| ev_directionsClicked["pb directions to stop clicked"]

  ev_slotSuccess --> ev_suggestedStops["pb suggested stops"]
  ev_suggestedStops --> ev_slotSuggestionSubmitted["pb slot suggestion submitted"]

  %%chalo:diagram-link ev_slotSelected -> title:Seat Selection Detailed Instrumentation
  %%chalo:diagram-link ev_passBottomSheet -> title:Payment & Order Creation

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_slotScreenOpen,ev_odSuccess,ev_odFailed,ev_slotSuccess,ev_slotFailure,ev_slotSelected,ev_passSuccess,ev_passFailed,ev_passBottomSheet,ev_passCardClicked,ev_valuePassBlocked,ev_valuePassUpgradeCta,ev_viewAllClicked,ev_exploreClicked,ev_directionsClicked,ev_suggestedStops,ev_slotSuggestionSubmitted event;
  class ui_odPairFetch,ui_slotFetch,ui_passFetch ui;
```

## Seat Selection Detailed Instrumentation

Shows granular seat selection interactions including gender confirmation for reserved seats.

```mermaid
flowchart TD
  ev_seatScreenOpen["pb seat selection screen opened"] --> ui_layoutFetch([Fetch seat layout])

  ui_layoutFetch -->|Fresh/reschedule booking| ev_layoutSuccess["pb seat layout fetch success"]
  ui_layoutFetch -->|Fresh/reschedule booking| ev_layoutFailed["pb seat layout fetch failure"]

  ev_layoutSuccess --> ui_userClicksSeat([User clicks seat icons])

  ui_userClicksSeat --> ev_seatIconClicked["premium bus seat selection seat icon clicked"]

  ev_seatIconClicked -->|Female-reserved seat| ui_genderCheck([Gender confirmation required])
  ui_genderCheck --> ev_genderConfirm["pb seat selection gender confirmation positive btn clicked"]
  ui_genderCheck --> ev_genderDismiss["pb seat selection gender confirmation bottom sheet dismissed"]

  ev_seatIconClicked -->|Regular seat| ui_seatSelected([Seat selected/deselected])

  ui_seatSelected --> ui_userProceeds([User clicks proceed])
  ev_genderConfirm --> ui_userProceeds

  ui_userProceeds --> ev_selectSeatsClicked["premium bus seat selection select seats clicked"]

  ev_selectSeatsClicked -->|Seat change flow| ui_seatChangeRequest([Submit seat change request])
  ui_seatChangeRequest --> ev_changeSuccess["premium bus seat selection seat change request success"]
  ui_seatChangeRequest --> ev_changeFailed["premium bus seat selection seat change request failure"]

  ev_changeSuccess --> ev_changeOkayClicked["premium bus seat selection change success screen okay btn click"]

  %%chalo:diagram-link ev_selectSeatsClicked -> title:Payment & Order Creation

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_seatScreenOpen,ev_layoutSuccess,ev_layoutFailed,ev_seatIconClicked,ev_genderConfirm,ev_genderDismiss,ev_selectSeatsClicked,ev_changeSuccess,ev_changeFailed,ev_changeOkayClicked event;
  class ui_layoutFetch,ui_userClicksSeat,ui_genderCheck,ui_seatSelected,ui_userProceeds,ui_seatChangeRequest ui;
```

## Payment & Order Creation

Shows the payment flow with coupon application and order creation.

```mermaid
flowchart TD
  ui_paymentEntry([Fare details / payment screen]) --> ev_couponApplied["pb coupon applied"]
  ui_paymentEntry --> ui_orderCreation([Create order])

  ui_orderCreation --> ev_orderSuccess["premium bus order creation success"]
  ui_orderCreation --> ev_orderFailed["premium bus order creation failed"]

  ev_orderSuccess --> ext_checkout[Checkout module - payment processing]
  ext_checkout --> ui_paymentComplete([Payment complete])

  ui_paymentComplete --> ev_bookingConfirmed["pb booking confirmed"]
  ui_paymentComplete --> ev_couponBookingConfirmed["pb coupon booking confirmed"]

  %%chalo:diagram-link ev_bookingConfirmed -> title:External: Premium Bus Activation & Tracking

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_orderSuccess,ev_orderFailed,ev_couponApplied,ev_bookingConfirmed,ev_couponBookingConfirmed event;
  class ui_paymentEntry,ui_orderCreation,ui_paymentComplete ui;
  class ext_checkout external;
```

## Key Funnel Construction Guidelines for PMs

### Fresh Booking Conversion Funnel
```
pb trip details screen shown
  → pb trip details submitted
  → pb pickup drop selected
  → pb slot selection screen opened
  → pb slot selected by user
  → pb seat selection screen opened
  → premium bus seat selection select seats clicked
  → premium bus order creation success
  → pb booking confirmed
```

### Pass Purchase Intent Funnel
```
pb pass purchase landing screen opened
  → pb pass purchase landing proceed btn clicked intent (optional)
  → pb pass landing screen od pair clicked
  → [Super Pass Purchase Flow - see super-pass-purchase/flow-diagrams.md]
  → pb slot selection screen opened (with pass)
```

### Slot Selection Conversion
```
pb slot selection screen opened
  → pb slot fetch success
  → pb slot selected by user
  (Drop-off: pb slot fetch failure)
```

### Seat Selection Conversion
```
pb seat selection screen opened
  → pb seat layout fetch success
  → premium bus seat selection seat icon clicked (one or more)
  → premium bus seat selection select seats clicked
  (Drop-off: pb seat layout fetch failure, insufficient seats)
```

## Error Events for Monitoring

Track these events to monitor booking flow health:

**Stop Selection Errors:**
- `pb pickup drop options fetched result failed`
- `pb no route error displayed`
- `pb fetch complete product config failed`

**Slot Selection Errors:**
- `pb slot fetch failure`
- `pb available purchase options failed`
- `pb od pair fetch failed`

**Seat Selection Errors:**
- `pb seat layout fetch failure`
- `premium bus seat selection seat change request failure`

**Payment & Order Errors:**
- `premium bus order creation failed`
