# Premium Bus Booking Analytics Event Flow Diagrams

These diagrams help build funnels in analytics dashboards. Green nodes are exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show typical order and major forks.

Notes:
- Premium bus booking has **multiple entry points**: direct trip search, pass purchase landing, home screen widgets, and deeplinks.
- The flow branches based on whether the user has a pass, is purchasing fresh, or doing bulk booking.
- Pass-based bookings skip payment and go directly to activation after seat selection.
- Bulk bookings aggregate multiple trips and use a different confirmation flow.

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

## Entry Points → Flow Type Decision

Use the initial events to identify which funnel path the user takes.

```mermaid
flowchart TD
  ui_home([Home screen / App entry]) --> ev_passLandingOpen["pb pass purchase landing screen opened"]
  ui_home --> ev_tripDetailsOpen["pb event trip details screen shown"]
  ui_home --> ev_bulkOpen["pb bulk booking manage rides screen opened"]

  ev_passLandingOpen -->|Pass purchase intent| ui_passFlow([Pass Purchase Flow])
  ev_tripDetailsOpen -->|Fresh booking or rebook| ui_freshFlow([Fresh Booking Flow])
  ev_bulkOpen -->|Manage pass bookings| ui_bulkFlow([Bulk Booking Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_passLandingOpen,ev_tripDetailsOpen,ev_bulkOpen event;
  class ui_home,ui_passFlow,ui_freshFlow,ui_bulkFlow ui;
```

## Funnel 1: Fresh Booking (No Pass) - Complete Journey

```mermaid
flowchart TD
  ui_entry([Entry: Trip search or deeplink]) --> ev_tripDetailsShown["pb event trip details screen shown"]

  ev_tripDetailsShown -->|User explores routes| ev_landingRouteClicked["pb event landing route clicked"]
  ev_tripDetailsShown -->|View all routes| ev_viewAllClicked["pb event landing screen route view all clicked"]
  ev_tripDetailsShown -->|Click rebook card| ev_rebookClicked["pb event rebook card clicked"]
  ev_tripDetailsShown -->|Explore available routes| ev_exploreRoutesBtnClicked["pb event explore available routes button clicked"]
  ev_tripDetailsShown -->|View all routes (alt)| ev_viewAllClicked2["pb landing screen route view all clicked"]
  ev_tripDetailsShown -->|Rebook card (alt)| ev_rebookClicked2["pb rebook card clicked"]

  ev_viewAllClicked --> ui_allRoutes([All routes list])
  ev_viewAllClicked2 --> ui_allRoutes
  ev_exploreRoutesBtnClicked --> ui_allRoutes
  ui_allRoutes --> ev_allRoutesRouteClicked["pb all routes route clicked"]
  ev_allRoutesRouteClicked --> ev_landingRouteClicked

  ev_tripDetailsShown -->|Stop suggestion| ev_newStopSuggestion["pb event new stop suggestion"]
  ev_newStopSuggestion --> ev_stopSuggestionSubmitted["pb stop suggestion submitted"]

  ev_tripDetailsShown --> ui_preferredTime([Preferred time selection])
  ui_preferredTime --> ev_preferredTimeSubmitted["premium bus preferred time submitted"]

  ev_tripDetailsShown --> ui_odFetch([Fetch OD pairs for source/destination])
  ui_odFetch --> ev_odFetchSuccess["pb event pickup drop options fetched"]
  ui_odFetch --> ev_odFetchFailed["pb event pickup drop options fetched result failed"]
  ui_odFetch --> ev_odFetchSuccess2["pb pickup drop options fetched"]
  ui_odFetch --> ev_odFetchFailed2["pb pickup drop options fetched result failed"]

  ev_odFetchSuccess --> ui_userSelectsOD([User selects pickup/drop])
  ui_userSelectsOD --> ev_odSelected["pb event pickup drop selected"]
  ui_userSelectsOD --> ev_odSelected2["pb pickup drop selected"]

  ev_odSelected --> ui_configFetch([Fetch product config])
  ui_configFetch --> ev_configSuccess["pb event complete product config by id fetched result success"]
  ui_configFetch --> ev_configFailed["pb event complete product config by id fetched result failed"]
  ui_configFetch --> ev_configSuccess2["pb fetch complete product config success"]
  ui_configFetch --> ev_configFailed2["pb fetch complete product config failed"]
  ev_configFailed --> ev_noRouteError["pb no route error displayed"]
  ev_configFailed2 --> ev_noRouteError

  ev_configSuccess --> ev_slotScreenOpen["pb event slot selection screen opened"]
  ev_configSuccess2 --> ev_slotScreenOpen2["pb slot selection screen opened"]
  ev_slotScreenOpen2 --> ui_slotFetch

  ev_slotScreenOpen --> ui_slotFetch([Fetch available slots])
  ui_slotFetch --> ev_slotSuccess["pb event slot fetch success"]
  ui_slotFetch --> ev_slotFailure["pb event slot fetch failure"]
  ui_slotFetch --> ev_slotSuccess2["pb slot fetch success"]
  ui_slotFetch --> ev_slotFailure2["pb slot fetch failure"]

  ev_slotSuccess -->|User explores passes| ev_purchaseOptionsSuccess["pb event available purchase options success"]
  ev_slotSuccess --> ui_userSelectsSlot([User selects slot])
  ui_userSelectsSlot --> ev_slotSelected["pb event slot selected by user"]
  ui_userSelectsSlot --> ev_slotSelected2["pb slot selected by user"]

  ev_slotSelected --> ev_seatScreenOpen["pb seat selection screen opened"]

  ev_seatScreenOpen --> ui_seatFetch([Fetch seat layout])
  ui_seatFetch --> ev_seatLayoutSuccess["pb seat layout fetch success"]
  ui_seatFetch --> ev_seatLayoutFailure["pb seat layout fetch failure"]

  ev_seatLayoutSuccess --> ui_userClicksSeats([User selects seats])
  ui_userClicksSeats --> ev_seatClicked["premium bus seat selection seat icon clicked"]

  ui_userClicksSeats --> ui_userProceeds([User clicks proceed])
  ui_userProceeds --> ev_selectSeatsClicked["premium bus seat selection select seats clicked"]

  ev_selectSeatsClicked --> ext_checkout[Checkout flow - payment]
  ext_checkout --> ev_orderSuccess["premium bus order creation success"]
  ext_checkout --> ev_orderFailed["premium bus order creation failed"]

  ev_orderSuccess --> ev_bookingConfirmed["pb booking confirmed"]
  ev_bookingConfirmed --> ev_activationOpen["pb activation screen opened"]
  ev_bookingConfirmed --> ui_bookingSuccessScreen([Booking success screen])
  ui_bookingSuccessScreen --> ev_rescheduleSuccess["pb booking reschedule successful event"]

  ev_activationOpen --> ev_etaRendered["pb first time eta rendered on activation screen"]
  ev_activationOpen --> ev_trackingStarted["pb trip tracking started for user"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_tripDetailsShown,ev_landingRouteClicked,ev_viewAllClicked,ev_rebookClicked,ev_exploreRoutesBtnClicked,ev_viewAllClicked2,ev_rebookClicked2,ev_allRoutesRouteClicked,ev_newStopSuggestion,ev_stopSuggestionSubmitted,ev_preferredTimeSubmitted,ev_odFetchSuccess,ev_odFetchFailed,ev_odFetchSuccess2,ev_odFetchFailed2,ev_odSelected,ev_odSelected2,ev_configSuccess,ev_configFailed,ev_configSuccess2,ev_configFailed2,ev_noRouteError,ev_slotScreenOpen,ev_slotScreenOpen2,ev_slotSuccess,ev_slotFailure,ev_slotSuccess2,ev_slotFailure2,ev_purchaseOptionsSuccess,ev_slotSelected,ev_slotSelected2,ev_seatScreenOpen,ev_seatLayoutSuccess,ev_seatLayoutFailure,ev_seatClicked,ev_selectSeatsClicked,ev_orderSuccess,ev_orderFailed,ev_bookingConfirmed,ev_activationOpen,ev_rescheduleSuccess,ev_etaRendered,ev_trackingStarted event;
  class ui_entry,ui_allRoutes,ui_preferredTime,ui_odFetch,ui_userSelectsOD,ui_configFetch,ui_slotFetch,ui_userSelectsSlot,ui_seatFetch,ui_userClicksSeats,ui_userProceeds,ui_bookingSuccessScreen ui;
  class ext_checkout external;
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
  ev_passLandingOpen -->|User selects OD pair| ev_odPairClicked["pb pass landing screen od pair clicked"]
  ev_passLandingOpen -->|Product hook| ev_productHookClicked["product hook product selection screen clicked"]
  ev_productHookClicked --> ev_productHookFaqClicked["pb product hook product selection screen FAQ clicked"]

  ev_odPairClicked --> ui_configFetch([Fetch product config])
  ui_configFetch --> ev_configSuccess["pb product config fetch success"]
  ui_configFetch --> ev_configFailed["pb product config fetch failure"]
  ui_configFetch --> ev_configSuccessLegacy["pb event product config fetch success"]
  ui_configFetch --> ev_configFailedLegacy["pb event product config fetch failure"]

  ev_configSuccess -->|User proceeds| ev_proceedClicked["pb pass purchase landing proceed btn clicked intent"]
  ev_configSuccessLegacy -->|User proceeds| ev_proceedClicked

  ev_configFailed --> ev_retryIntent["pb pass purchase retry btn clicked intent"]
  ev_configFailedLegacy --> ev_retryIntent
  ev_retryIntent --> ui_configFetch

  ev_proceedClicked --> ext_superPassFlow[Super Pass Purchase Flow]

  ext_superPassFlow -->|After pass purchase| ev_slotScreenOpen["pb event slot selection screen opened"]
  ev_slotScreenOpen -->|User explores with pass| ev_slotSuccess["pb event slot fetch success"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_passLandingOpen,ev_imageSuccess,ev_imageFailed,ev_swapClicked,ev_buyPassClicked,ev_odPairClicked,ev_productHookClicked,ev_productHookFaqClicked,ev_configSuccess,ev_configFailed,ev_configSuccessLegacy,ev_configFailedLegacy,ev_retryIntent,ev_proceedClicked,ev_slotScreenOpen,ev_slotSuccess event;
  class ui_passEntry,ui_imageFetch,ui_configFetch ui;
  class ext_superPassFlow external;
```

## Funnel 3: Bulk Booking (Pass-Based Multi-Ride)

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
  ev_linkedSuccess -->|User books new rides| ev_bookNewRidesClick["pb bulk booking book new rides click"]
  ev_linkedSuccess -->|User rebooks past ride| ev_bookAgainClick["pb bulk booking book again cta click"]

  ev_bookNewRidesClick --> ui_rideDetailsDialog([Ride details dialog])
  ui_rideDetailsDialog --> ev_dismissDialog["pb bulk booking dismiss dialog"]
  ui_rideDetailsDialog --> ev_dimsissDialog["pb bulk booking dimsiss dialog"]
  ev_bookNewRidesClick --> ev_multipleRidesClick

  ev_multipleRidesClick --> ui_prebookingFlow([Pre-booking slot/seat selection for each day])

  ui_prebookingFlow --> ev_aggSeatLayoutSuccess["pb aggregated seat layout fetch success"]
  ui_prebookingFlow --> ev_aggSeatLayoutFailed["pb aggregated seat layout fetch failure"]

  ev_aggSeatLayoutSuccess --> ui_seatSelection([User selects seats for all days])
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

  ev_singleRideClick --> ui_normalFlow([Normal slot → seat → activation flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_bulkOpen,ev_passDataFetched,ev_linkedSuccess,ev_linkedFailed,ev_linkedRetry,ev_unknownSubType,ev_singleRideClick,ev_multipleRidesClick,ev_bookNewRidesClick,ev_bookAgainClick,ev_dismissDialog,ev_dimsissDialog,ev_aggSeatLayoutSuccess,ev_aggSeatLayoutFailed,ev_selectSeatsClicked,ev_confirmPageShown,ev_confirmClicked,ev_bulkSuccess,ev_bulkFailed,ev_viewRidesClicked,ev_navHome,ev_navPassDetails,ev_retryClicked event;
  class ui_passDetails,ui_passDataFetch,ui_linkedBookingsFetch,ui_rideDetailsDialog,ui_prebookingFlow,ui_seatSelection,ui_userConfirms,ui_bulkBookingProcess,ui_normalFlow ui;
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

  ev_stopSlotOpen --> ui_slotsFetch{Slots fetch result}
  ui_slotsFetch -->|No slots| ev_noSlots["bulk booking no slots available bottomsheet shown"]
  ui_slotsFetch -->|Error| ev_slotsError["bulk booking slots fetch error bottomsheet shown"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_stopSlotOpen,ev_noStops,ev_stopSelected,ev_stopEdit,ev_slotEdit,ev_slotListOpened,ev_slotSelected,ev_noSlots,ev_slotsError event;
  class ui_entry,ui_stops,ui_slotsFetch ui;
```

## Funnel 4: Ticket Activation & Live Tracking

This funnel is common to all booking types after successful booking confirmation.

```mermaid
flowchart TD
  ui_bookingComplete([Booking confirmed]) --> ev_activationOpen["pb activation screen opened"]

  ev_activationOpen --> ui_etaFetch([Fetch live ETA])
  ui_etaFetch --> ev_etaRendered["pb first time eta rendered on activation screen"]

  ev_activationOpen --> ui_trackingStart([Start live tracking])
  ui_trackingStart --> ev_trackingStarted["pb trip tracking started for user"]
  ui_trackingStart --> ev_tripPollingChange["pb trip polling response change"]

  ev_activationOpen --> ev_premiumReserveFetched["premium reserve ticket fetched"]
  ev_activationOpen -->|View receipt| ev_premiumReserveViewReceipt["premium reserve ticket view receipt clicked"]
  ev_premiumReserveViewReceipt --> ev_premiumReserveReceiptPayload["premium reserve ticket receipt payload"]

  ev_activationOpen -->|User clicks verify| ev_verifyClicked["pb verify ticket clicked"]
  ev_activationOpen -->|User clicks more options| ev_optionsClicked["pb active booking options clicked"]
  ev_activationOpen -->|User toggles traffic| ev_trafficToggled["pb activation screen traffic view toggled"]
  ev_activationOpen -->|User clicks directions| ev_directionsClicked["pb navigate directions clicked"]

  ev_optionsClicked --> ev_optionItemClicked["pb active booking option item clicked"]

  ev_optionItemClicked -->|Cancellation selected| ui_cancelFlow([Cancellation flow])
  ui_cancelFlow --> ev_cancelBottomSheet["pb trip cancel conf bottom sheet opened"]
  ev_cancelBottomSheet --> ev_cancelGoBack["pb trip cancellation go back cta clicked"]
  ev_cancelBottomSheet --> ev_cancelOkay["pb trip cancellation okay cta clicked"]
  ev_cancelBottomSheet --> ev_refundBlocked["pb value pass booking cancellation refund blocked"]
  ev_refundBlocked --> ev_upgradeCta["pb value pass booking cancellation upgrade CTA clicked"]

  ev_cancelOkay --> ev_cancelSuccess["pb booking cancellation successful"]
  ev_cancelSuccess --> ev_bookAnotherRide["pb trip cancellation book another ride cta clicked"]

  ui_trackingStart -->|Poor network detected| ev_deadZone["pb poor network or dead zone detected"]

  ui_trackingStart -->|User closes screen or trip ends| ui_trackingEnd([End tracking])
  ui_trackingEnd --> ev_trackingEnded["pb trip tracking ended for user"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_activationOpen,ev_etaRendered,ev_trackingStarted,ev_tripPollingChange,ev_premiumReserveFetched,ev_premiumReserveViewReceipt,ev_premiumReserveReceiptPayload,ev_verifyClicked,ev_optionsClicked,ev_trafficToggled,ev_directionsClicked,ev_optionItemClicked,ev_cancelBottomSheet,ev_cancelGoBack,ev_cancelOkay,ev_refundBlocked,ev_upgradeCta,ev_cancelSuccess,ev_bookAnotherRide,ev_deadZone,ev_trackingEnded event;
  class ui_bookingComplete,ui_etaFetch,ui_trackingStart,ui_cancelFlow,ui_trackingEnd ui;
```

## Slot Selection Detailed Instrumentation

This shows granular events within the slot selection screen, useful for conversion optimization.

```mermaid
flowchart TD
  ev_slotScreenOpen["pb event slot selection screen opened"] --> ui_odPairFetch([Fetch OD pairs])

  ui_odPairFetch --> ev_odSuccess["pb od pair fetch success"]
  ui_odPairFetch --> ev_odFailed["pb od pair fetch failed"]

  ev_odSuccess --> ui_slotFetch([Fetch slots for selected section])
  ui_slotFetch --> ev_slotSuccess["pb event slot fetch success"]
  ui_slotFetch --> ev_slotFailure["pb event slot fetch failure"]
  ui_slotFetch --> ev_slotSuccess2["pb slot fetch success"]
  ui_slotFetch --> ev_slotFailure2["pb slot fetch failure"]

  ev_slotSuccess -->|User clicks slot| ev_slotSelected["pb event slot selected by user"]
  ev_slotSuccess -->|User clicks slot (alt)| ev_slotSelected2["pb slot selected by user"]

  ev_slotSuccess -->|User explores passes| ui_passFetch([Fetch purchase options])
  ui_passFetch --> ev_passSuccess["pb event available purchase options success"]
  ui_passFetch --> ev_passFailed["pb event available purchase options failed"]
  ui_passFetch --> ev_passSuccess2["pb available purchase options success"]
  ui_passFetch --> ev_passFailed2["pb available purchase options failed"]

  ev_passSuccess --> ev_passBottomSheet["pb purchase option bottom sheet item clicked"]
  ev_passSuccess --> ev_passCardClicked["pb event pass purchased card clicked by user"]
  ev_passSuccess --> ev_passCardClicked2["pb pass purchased card clicked by user"]

  ev_passBottomSheet --> ev_valuePassBlocked["pb value pass bottomsheet booking blocked"]
  ev_valuePassBlocked --> ev_valuePassUpgradeCta["pb value pass bottomsheet upgrade CTA clicked"]

  ev_slotSuccess -->|User checks pass savings| ui_savingsFetch([Fetch pass savings])
  ui_savingsFetch --> ev_savingsSuccess["pb pass savings fetch success"]
  ui_savingsFetch --> ev_savingsFailed["pb pass savings fetch failure"]

  ev_savingsSuccess --> ev_savingsInfoClicked["pb pass savings info btn clicked"]

  ev_slotSuccess -->|User clicks view all| ev_viewAllClicked["premium bus view all slots clicked"]
  ev_slotSuccess -->|User clicks view all (alt)| ev_viewAllClicked2["pb view all slots clicked"]
  ev_slotSuccess -->|User clicks explore routes| ev_exploreClicked["premium bus explore available routes clicked"]
  ev_slotSuccess -->|User clicks explore routes (alt)| ev_exploreClicked2["pb explore available routes clicked"]
  ev_slotSuccess -->|User clicks directions| ev_directionsClicked["pb directions to stop clicked"]

  ev_slotSuccess --> ev_suggestedStops["pb suggested stops"]
  ev_suggestedStops --> ev_slotSuggestionSubmitted["pb slot suggestion submitted"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_slotScreenOpen,ev_odSuccess,ev_odFailed,ev_slotSuccess,ev_slotFailure,ev_slotSuccess2,ev_slotFailure2,ev_slotSelected,ev_slotSelected2,ev_passSuccess,ev_passFailed,ev_passSuccess2,ev_passFailed2,ev_passBottomSheet,ev_passCardClicked,ev_passCardClicked2,ev_valuePassBlocked,ev_valuePassUpgradeCta,ev_savingsSuccess,ev_savingsFailed,ev_savingsInfoClicked,ev_viewAllClicked,ev_viewAllClicked2,ev_exploreClicked,ev_exploreClicked2,ev_directionsClicked,ev_suggestedStops,ev_slotSuggestionSubmitted event;
  class ui_odPairFetch,ui_slotFetch,ui_passFetch,ui_savingsFetch ui;
```

## Seat Selection Detailed Instrumentation

Shows granular seat selection interactions including gender confirmation for reserved seats.

```mermaid
flowchart TD
  ev_seatScreenOpen["pb seat selection screen opened"] --> ui_layoutFetch([Fetch seat layout])

  ui_layoutFetch -->|Fresh/reschedule booking| ev_layoutSuccess["pb seat layout fetch success"]
  ui_layoutFetch -->|Fresh/reschedule booking| ev_layoutFailed["pb seat layout fetch failure"]

  ui_layoutFetch -->|Bulk booking| ev_aggLayoutSuccess["pb aggregated seat layout fetch success"]
  ui_layoutFetch -->|Bulk booking| ev_aggLayoutFailed["pb aggregated seat layout fetch failure"]

  ev_layoutSuccess --> ui_userClicksSeat([User clicks seat icons])
  ev_aggLayoutSuccess --> ui_userClicksSeat

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

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_seatScreenOpen,ev_layoutSuccess,ev_layoutFailed,ev_aggLayoutSuccess,ev_aggLayoutFailed,ev_seatIconClicked,ev_genderConfirm,ev_genderDismiss,ev_selectSeatsClicked,ev_changeSuccess,ev_changeFailed,ev_changeOkayClicked event;
  class ui_layoutFetch,ui_userClicksSeat,ui_genderCheck,ui_seatSelected,ui_userProceeds,ui_seatChangeRequest ui;
```

## Payment & Order Creation

Shows the payment flow with coupon application and order creation.

```mermaid
flowchart TD
  ui_paymentEntry([Enter payment flow]) --> ui_orderCreation([Create order])

  ui_orderCreation --> ev_orderSuccess["premium bus order creation success"]
  ui_orderCreation --> ev_orderFailed["premium bus order creation failed"]

  ev_orderSuccess --> ext_checkout[Checkout module - payment processing]

  ext_checkout -->|Coupon applied| ev_couponApplied["pb coupon applied"]
  ext_checkout --> ui_paymentComplete([Payment complete])

  ui_paymentComplete --> ev_bookingConfirmed["pb booking confirmed"]
  ui_paymentComplete --> ev_couponBookingConfirmed["pb coupon booking confirmed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_orderSuccess,ev_orderFailed,ev_couponApplied,ev_bookingConfirmed,ev_couponBookingConfirmed event;
  class ui_paymentEntry,ui_orderCreation,ui_paymentComplete ui;
  class ext_checkout external;
```

## Pass Management & Re-booking

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

  ev_configSuccess --> ui_rebookFlow([Navigate to slot selection with pre-filled details])

  ev_linkedSuccess -->|User views receipt| ev_viewReceiptClicked["pb bulk booking view trip receipt button clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_passInfoShown,ev_passCacheEmpty,ev_passCacheFailed,ev_bulkScreenOpen,ev_passDataFetched,ev_linkedSuccess,ev_bookAgainClick,ev_configSuccess,ev_configFailed,ev_viewReceiptClicked event;
  class ui_homeScreen,ui_pastRideClick,ui_configFetch,ui_rebookFlow ui;
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

### Fresh Booking Conversion Funnel
```
pb event trip details screen shown
  → pb event pickup drop selected
  → pb event slot selection screen opened
  → pb event slot selected by user
  → pb seat selection screen opened
  → premium bus seat selection select seats clicked
  → premium bus order creation success
  → pb booking confirmed
  → pb activation screen opened
```

### Pass Purchase Intent Funnel
```
pb pass purchase landing screen opened
  → pb pass landing screen od pair clicked
  → pb pass purchase landing proceed btn clicked intent
  → [Super Pass Purchase Flow - see super-pass-purchase/flow-diagrams.md]
  → pb event slot selection screen opened (with pass)
```

### Bulk Booking Funnel
```
pb bulk booking manage rides screen opened
  → pb bulk booking pass data fetched
  → pb bulk booking pass ticket success
  → pb bulk booking book multiple rides click
  → pb aggregated seat layout fetch success
  → premium bus seat selection select seats clicked
  → bulk booking confirm rides page shown
  → bulk booking confirm details clicked
  → bulk booking confirmation successful
```

### Slot Selection Conversion
```
pb event slot selection screen opened
  → pb event slot fetch success
  → pb event slot selected by user
  (Drop-off: pb event slot fetch failure, pb no slots available)
```

### Seat Selection Conversion
```
pb seat selection screen opened
  → pb seat layout fetch success
  → premium bus seat selection seat icon clicked (one or more)
  → premium bus seat selection select seats clicked
  (Drop-off: pb seat layout fetch failure, insufficient seats)
```

### Activation & Tracking Engagement
```
pb activation screen opened
  → pb first time eta rendered on activation screen
  → pb trip tracking started for user
  (Actions: pb verify ticket clicked, pb navigate directions clicked)
  → pb trip tracking ended for user
```

### Pass Management Engagement
```
homescreen premium bus active pass info
  → pb bulk booking manage rides screen opened
  → pb bulk booking pass ticket success
  → pb bulk booking book single ride click OR pb bulk booking book multiple rides click
```

## Error Events for Monitoring

Track these events to monitor booking flow health:

**Stop Selection Errors:**
- `pb event pickup drop options fetched result failed`
- `pb event no route error displayed`
- `pb event complete product config by id fetched result failed`

**Slot Selection Errors:**
- `pb event slot fetch failure`
- `pb event available purchase options failed`
- `pb od pair fetch failed`
- `pb pass savings fetch failure`

**Seat Selection Errors:**
- `pb seat layout fetch failure`
- `pb aggregated seat layout fetch failure`
- `premium bus seat selection seat change request failure`

**Payment & Order Errors:**
- `premium bus order creation failed`

**Bulk Booking Errors:**
- `pb bulk booking pass ticket failure`
- `pb bulk booking fetch ticket config failed`
- `bulk booking confirmation failed`

**Pass Management Errors:**
- `homescreen premium bus active pass cache failed`
