# Live Tracking analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The live tracking flow can start from multiple entry points: search, home screen, nearby stops, or deep links.
- WebSocket config + connection events (`crts_*`, plus config/handshake events) run continuously in the background throughout the tracking session.
- Seat availability events only fire for premium/airport routes where seat occupancy data is available.
- Search events are optional if user enters route details directly from home or nearby stops.

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

## Entry flow: Search → Route Selection → Route Details

```mermaid
flowchart TD
  %%chalo:diagram-link ev_routeDetailsOpen -> title:Route Details screen open & hooks
  ui_entry([User wants to track a bus]) --> ui_searchOrDirect{How did user navigate?}

  ui_searchOrDirect -->|Via Search| ev_searchOpen["search screen opened"]
  ev_searchOpen --> ev_firstChar["first character type after search open"]
  ev_firstChar --> ev_searchResults["Search results shown"]
  ev_searchResults --> ev_resultClick["search result clicked"]
  ev_resultClick --> ev_routeDetailsOpen["route details activity open"]

  ui_searchOrDirect -->|Direct from home/nearby| ev_routeDetailsOpen

  ui_searchOrDirect -->|Back from search| ev_searchBack["search screen back clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_searchOpen,ev_firstChar,ev_searchResults,ev_resultClick,ev_routeDetailsOpen,ev_searchBack event;
  class ui_entry,ui_searchOrDirect ui;
```

## Route Details screen open & hooks

```mermaid
flowchart TD
  %%chalo:diagram-link ui_liveDataFetch -> title:Live data fetching & display
  ev_routeDetailsOpen["route details activity open"] --> ui_checkRouteType{Route type?}

  ev_routeDetailsOpen --> ui_nativeAd([Route details native ad load])
  ui_nativeAd --> ev_nativeAdFailed["route details native ad load failed"]

  ui_checkRouteType -->|Premium/Airport| ev_premiumHook["premium bus hook route details rendered"]
  ui_checkRouteType -->|Regular with tickets| ev_mticketHook["mticket hook route details rendered"]
  ui_checkRouteType -->|Service issue| ev_availabilityBanner["availability route banner"]

  ev_premiumHook --> ui_liveDataFetch([Fetch live data])
  ev_mticketHook --> ui_liveDataFetch
  ev_availabilityBanner --> ui_liveDataFetch
  ui_checkRouteType -->|Normal| ui_liveDataFetch

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_routeDetailsOpen,ev_nativeAdFailed,ev_premiumHook,ev_mticketHook,ev_availabilityBanner event;
  class ui_checkRouteType,ui_nativeAd,ui_liveDataFetch ui;
```

## WebSocket connection lifecycle (background)

This flow runs in parallel with the main route details flow throughout the session.

```mermaid
flowchart TD
  ui_socketConfig([Fetch RTS socket config]) --> ev_configSuccess["crts config success"]
  ui_socketConfig --> ev_configFailed["crts config failed"]

  ev_configSuccess --> ui_socketInit([Initialize WebSocket])
  ui_socketInit -->|Cookies enabled| ev_cookieConnect["starting crts connection with cookies"]
  ev_cookieConnect --> ev_connect["crts connect"]
  ui_socketInit --> ev_connect
  ui_socketInit --> ev_connectError["crts connect error"]
  ui_socketInit --> ev_connectTimeout["crts connect timeout"]

  ev_connect --> ui_connected([Connected, streaming data])
  ui_connected --> ev_response["crts response"]

  ui_connected -->|Network drops| ev_disconnect["crts disconnect"]
  ui_connected -->|Error occurs| ev_error["crts error"]

  ev_disconnect --> ev_reconnectAttempt["crts reconnect attempt"]
  ev_error --> ev_reconnectAttempt
  ev_connectError --> ev_reconnectAttempt
  ev_connectTimeout --> ev_reconnectAttempt

  ev_reconnectAttempt --> ev_reconnect["crts reconnect"]
  ev_reconnectAttempt --> ev_reconnectError["crts reconnect error"]

  ev_reconnect --> ui_connected
  ev_reconnectError --> ev_reconnectAttempt

  ev_reconnectAttempt -->|Max retries exceeded| ev_reconnectFailed["crts reconnect failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_configSuccess,ev_configFailed,ev_cookieConnect,ev_connect,ev_connectError,ev_connectTimeout,ev_response,ev_disconnect,ev_error,ev_reconnectAttempt,ev_reconnect,ev_reconnectError,ev_reconnectFailed event;
  class ui_socketConfig,ui_socketInit,ui_connected ui;
```

## Live data fetching & display

```mermaid
flowchart TD
  %%chalo:diagram-link ui_stopSelection -> title:Stop selection funnel
  %%chalo:diagram-link ui_userActions -> title:User action events (from route details)
  ui_liveDataFetch([Fetch live route data]) --> ev_routeDetailsFetched["Live route details fetched"]

  ev_routeDetailsFetched -->|Success| ui_displayData([Display buses on map & ETAs in list])

  ui_displayData --> ui_etaLoop([ETA updates every few seconds])
  ui_etaLoop --> ev_etaFetch["live eta fetch"]
  ev_etaFetch --> ui_etaLoop

  ui_displayData -->|Debug enabled| ev_liveVehicleDetails["LIVE VEHICLE DETAILS"]
  ui_displayData -->|Debug enabled| ev_liveEtaDetails["LIVE ETA DETAILS"]

  ui_displayData -->|Premium route| ui_seatAvailLoop([Seat availability updates])
  ui_seatAvailLoop --> ev_seatStatus["seat status"]
  ev_seatStatus -->|Per vehicle| ui_seatAvailLoop

  ui_displayData -->|User clicks info icon| ev_seatBottomsheet["seat occupancy bottomsheet rendered on demand busRouteFragment"]
  ev_seatBottomsheet --> ev_seatGotIt["seat occupancy bottomsheet got it clicked"]
  ev_seatBottomsheet --> ev_seatLearnMore["seat occupancy bottomsheet learn more clicked"]

  ui_displayData -->|User views all vehicles| ev_etaScreen["eta screen open"]
  ui_displayData --> ui_stopSelection([Stop selection & destination changes])
  ui_displayData --> ui_userActions([Route details actions])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_routeDetailsFetched,ev_etaFetch,ev_liveVehicleDetails,ev_liveEtaDetails,ev_seatStatus,ev_seatBottomsheet,ev_seatGotIt,ev_seatLearnMore,ev_etaScreen event;
  class ui_liveDataFetch,ui_displayData,ui_etaLoop,ui_seatAvailLoop,ui_stopSelection,ui_userActions ui;
```

## Stop selection funnel

```mermaid
flowchart TD
  %%chalo:diagram-link ev_routeDetailsOpen -> title:Route Details screen open & hooks
  ui_userWantsStop([User wants to select/change stop]) --> ui_selectionSource{How did user select?}
  ui_initialDest([Short trip requires destination selection]) --> ev_destScreenOpen

  ui_selectionSource -->|From stop list| ev_routeStopSelected["Route stop selected"]
  ui_selectionSource -->|From map marker| ev_mapStopSelected["Route map stop selected"]
  ui_selectionSource -->|From search| ev_searchStopClick["Search stop clicked"]

  ev_searchStopClick --> ui_searchStopUI([Search UI appears])
  ui_searchStopUI --> ev_searchStopSelected["Search stop selected"]

  ev_routeStopSelected --> ui_etaUpdate([ETAs update for new stop])
  ev_mapStopSelected --> ui_etaUpdate
  ev_searchStopSelected --> ui_etaUpdate

  ui_selectionSource -->|Disabled stop| ev_disabledStop["Disabled stop selected"]

  ui_selectionSource -->|Change destination| ev_changeDestClick["Route details change destination click"]
  ev_changeDestClick --> ev_destScreenOpen["Route destination stop screen open"]
  ev_destScreenOpen --> ev_destChanged["Route destination stop changed"]
  ev_destScreenOpen --> ev_destClosed["Route destination screen closed"]

  ev_destChanged -->|First destination selection| ev_routeDetailsOpen["route details activity open"]
  ev_destChanged --> ui_etaUpdate
  ev_destClosed --> ui_etaUpdate

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_routeStopSelected,ev_mapStopSelected,ev_searchStopClick,ev_searchStopSelected,ev_disabledStop,ev_changeDestClick,ev_destScreenOpen,ev_destChanged,ev_destClosed,ev_routeDetailsOpen event;
  class ui_userWantsStop,ui_selectionSource,ui_searchStopUI,ui_etaUpdate,ui_initialDest ui;
```

## User action events (from route details)

```mermaid
flowchart TD
  %%chalo:diagram-link ext_checkout -> title:External: Checkout flow (Payment module)
  %%chalo:diagram-link ext_premiumBooking -> title:External: Premium bus booking flow
  ui_routeDetails([Route details screen displayed]) --> ui_userAction{User action?}

  ui_userAction -->|Add to favorites| ev_favAdded["favorite added"]
  ui_userAction -->|Remove from favorites| ev_favDeleted["favorite deleted"]

  ui_userAction -->|View schedule| ev_scheduleClick["view schedule clicked"]

  ui_userAction -->|Buy ticket/pass| ev_payTicketClick["route details pay for ticket clicked"]
  ui_userAction -->|View existing pass| ev_passBookedClick["route details pass booked clicked"]
  ui_userAction -->|Reserve seat (premium)| ev_reserveSeatClick["route details reserve seat btn clicked"]

  ev_payTicketClick --> ext_checkout[Checkout flow]
  ev_reserveSeatClick --> ext_premiumBooking[Premium bus booking flow]

  ui_userAction -->|Check in| ev_checkin["checkin initiated"]

  ui_userAction -->|Report problem| ev_reportClick["report problem clicked"]
  ui_userAction -->|Report issue (with ETA context)| ev_reportHookClick["Report issue hook clicked"]

  ev_reportClick --> ui_reportUI([Report problem UI])
  ev_reportHookClick --> ui_reportUI
  ui_reportUI --> ev_reportSubmit["report problem submitted"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_favAdded,ev_favDeleted,ev_scheduleClick,ev_payTicketClick,ev_passBookedClick,ev_reserveSeatClick,ev_checkin,ev_reportClick,ev_reportHookClick,ev_reportSubmit event;
  class ui_routeDetails,ui_userAction,ui_reportUI ui;
  class ext_checkout,ext_premiumBooking external;
```

## Funnel: Stop Details & ETA Insights

Events emitted on stop details surfaces (ETA viewing, traffic, and nearby station notifications).

```mermaid
flowchart TD
  ui_stopDetails([Stop details screen]) --> ev_stopDetailsOpen["stop details screen opened"]

  ev_stopDetailsOpen --> ui_etaSection([ETA section visible])
  ui_etaSection --> ev_etaSeen["Eta Seen"]
  ui_etaSection --> ev_etaMulti["stop eta seen - multiple routes"]
  ui_etaSection --> ev_inboundTraffic["inbound traffic"]

  ev_stopDetailsOpen --> ev_nearbyStationNotifClicked["nearby station notification clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_stopDetailsOpen,ev_etaSeen,ev_etaMulti,ev_inboundTraffic,ev_nearbyStationNotifClicked event;
  class ui_stopDetails,ui_etaSection ui;
```

## Funnel: TITO Ride Detail (Tap-In/Tap-Out) & Missed Tap-Out

```mermaid
flowchart TD
  ui_open([Open TITO ride detail]) --> ev_titoRideOpen["tito ride detail screen opened"]

  ev_titoRideOpen --> ui_routeFetch{Fetch ride route}
  ui_routeFetch -->|Success| ev_routeSuccess["tito ride detail route result success"]
  ui_routeFetch -->|Failure| ev_routeFailure["tito ride detail route result failure"]

  ev_routeFailure --> ev_retry["tito view retry btn click"]

  ev_routeSuccess --> ui_vehicleAvail{Vehicle available?}
  ui_vehicleAvail -->|No| ev_vehicleNo["tito ride detail vehicle no unavailable"]

  ev_titoRideOpen --> ev_markerClick["tito map stop marker click"]
  ev_titoRideOpen --> ev_back["tito ride detail back press"]

  ev_titoRideOpen --> ui_onboarding{Show onboarding?}
  ui_onboarding -->|Start| ev_obStart["tito ob tutorial started"]
  ev_obStart --> ev_obReplay["tito ob replay btn click"]
  ev_obStart --> ev_obFinish["tito ob tutorial finished"]
  ev_obFinish --> ev_obGotIt["tito ob got it btn click"]

  ev_titoRideOpen --> ui_missedTapOut{Missed tap-out?}
  ui_missedTapOut --> ev_missedTapOutClick["missed tap out btn click"]
  ev_missedTapOutClick --> ev_slideSubmit["slide to tap out submit"]
  ev_slideSubmit --> ev_doneSheetOpen["missed tap out done bottom sheet opened"]
  ev_doneSheetOpen --> ev_doneViewReceipt["missed tap out done bottom sheet view receipt btn click"]
  ev_doneSheetOpen --> ev_doneExit["missed tap out done bottom sheet exit btn click"]
  ev_doneSheetOpen --> ev_feedbackSubmit["missed tito tapout feedback submit"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_titoRideOpen,ev_routeSuccess,ev_routeFailure,ev_retry,ev_vehicleNo,ev_markerClick,ev_back,ev_obStart,ev_obReplay,ev_obFinish,ev_obGotIt,ev_missedTapOutClick,ev_slideSubmit,ev_doneSheetOpen,ev_doneViewReceipt,ev_doneExit,ev_feedbackSubmit event;
  class ui_open,ui_routeFetch,ui_vehicleAvail,ui_onboarding,ui_missedTapOut ui;
```

## Complete funnel: Search → Track → Act

This is the recommended funnel for PMs to measure user engagement with live tracking.

```mermaid
flowchart TD
  Start([User needs to track a bus]) --> ev_1["search screen opened"]
  ev_1 --> ev_2["Search results shown"]
  ev_2 --> ev_3["search result clicked"]
  ev_3 --> ev_4["route details activity open"]

  ev_4 --> ui_branch{What does user do?}

  ui_branch -->|Views ETAs| ev_5a["live eta fetch"]
  ui_branch -->|Changes stop| ev_5b["Route stop selected"]
  ui_branch -->|Views all buses| ev_5c["eta screen open"]

  ev_5a --> ui_decision{User decides to...}
  ev_5b --> ui_decision
  ev_5c --> ui_decision

  ui_decision -->|Buy ticket| ev_6a["route details pay for ticket clicked"]
  ui_decision -->|Save route| ev_6b["favorite added"]
  ui_decision -->|Check in| ev_6c["checkin initiated"]
  ui_decision -->|View schedule| ev_6d["view schedule clicked"]
  ui_decision -->|Report problem| ev_6e["report problem submitted"]

  ev_6a --> ext_conversion[Conversion: Ticket purchase]
  ev_6b --> ext_retention[Retention: Favorite added]
  ev_6c --> ext_engagement[Engagement: Active user]
  ev_6d --> ext_fallback[Fallback: No live data]
  ev_6e --> ext_feedback[Feedback: User issue]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_1,ev_2,ev_3,ev_4,ev_5a,ev_5b,ev_5c,ev_6a,ev_6b,ev_6c,ev_6d,ev_6e event;
  class Start,ui_branch,ui_decision ui;
  class ext_conversion,ext_retention,ext_engagement,ext_fallback,ext_feedback external;
```

## Suggested funnels for dashboards

### Funnel 1: Search to Track (Discovery)
Measure how effectively users find and access live tracking.

```
search screen opened
  → Search results shown
    → search result clicked
      → route details activity open
        → live eta fetch (success indicator)
```

**Drop-off analysis:**
- High drop at "Search results shown" → Search not returning relevant results
- High drop at "search result clicked" → Results not compelling enough
- High drop at "route details activity open" → Navigation/loading issues
- High drop at "live eta fetch" → Live data unavailability

### Funnel 2: Track to Act (Engagement)
Measure user actions after viewing live tracking.

```
route details activity open
  → live eta fetch
    → [User action events]:
      - route details pay for ticket clicked (conversion)
      - favorite added (retention)
      - checkin initiated (engagement)
      - view schedule clicked (fallback)
```

**Conversion metrics:**
- % who buy tickets after tracking
- % who add to favorites
- % who check in
- % who view schedule (indicates live data insufficient)

### Funnel 3: Stop Selection (Navigation)
Measure how users navigate stops within route.

```
route details activity open
  → Route stop selected / Route map stop selected / Search stop selected
    → live eta fetch (ETA updates for new stop)
```

**Engagement metrics:**
- Average number of stop selections per session
- % using map vs list vs search
- Most frequently selected stops

### Funnel 4: Premium Bus Conversion
Measure seat selection and premium booking.

```
route details activity open
  → premium bus hook route details rendered
    → seat status (seat availability shown)
      → route details reserve seat btn clicked
        → [Premium booking flow]
```

**Conversion metrics:**
- % of premium route views leading to seat reservations
- Impact of seat availability on conversions

## External: Checkout flow (Payment module)

See `content/analytics/payment/flow-diagrams.md` for the full checkout/payment instrumentation.

## External: Premium bus booking flow

See:
- `content/analytics/premium-bus-booking/flow-diagrams.md` (booking conversion)
- `content/analytics/premium-bus-bulk-booking/flow-diagrams.md` (manage rides + bulk booking)
- `content/analytics/premium-bus-activation-tracking/flow-diagrams.md` (post-booking activation + live tracking)

### Funnel 5: Problem Reporting (Feedback)
Measure user feedback submission rate.

```
route details activity open
  → report problem clicked / Report issue hook clicked
    → report problem submitted
```

**Quality metrics:**
- % of tracking sessions with problems reported
- Most common problem types
- Correlation with ETA accuracy

### Funnel 6: WebSocket Reliability (Technical)
Monitor real-time connection health.

```
crts connect / crts connect error
  → crts disconnect (if occurs)
    → crts reconnect attempt
      → crts reconnect / crts reconnect failed
```

**Health metrics:**
- Connection success rate
- Average reconnection time
- Network-specific failure rates
- Impact on user engagement
