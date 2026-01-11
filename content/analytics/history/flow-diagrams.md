# History flow analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The History flow encompasses both the **Active** and **Expired/History** tabs within the My Tickets screen
- Events track tab selection, page rendering with booking counts, individual product interactions, and flows like activation, renewal, reclaim, and purchase
- My Tickets tab events originate from `Source.MY_TICKETS_SCREEN_TAB`
- Ticket Summary screen events originate from `Source.TICKET_SUMMARY_SCREEN` (except `ticket summary screen opened`, whose `source` varies by entrypoint)

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

## Entry → Tab Selection → Page Rendering

The primary funnel starts with tab selection and page rendering events that include booking counts.

```mermaid
flowchart TD
  ui_screenOpen([My Tickets Screen Opens]) --> ui_tabSelect{User selects tab}

  ui_tabSelect -->|Active tab| ev_activeTab["active tickets tab selected"]
  ui_tabSelect -->|History tab| ev_expiredTab["expired tickets tab selected"]

  ev_activeTab --> ui_hasActiveBookings{Has active bookings?}
  ui_hasActiveBookings -->|Yes| ev_activePage["active tickets page rendered"]
  ui_hasActiveBookings -->|No, but has expired| ev_emptyActive["empty active tickets page rendered"]

  ev_expiredTab --> ui_hasExpiredBookings{Has expired bookings?}
  ui_hasExpiredBookings -->|Yes| ev_expiredPage["expired tickets page rendered"]
  ui_hasExpiredBookings -->|No, but has active| ev_emptyExpired["empty expired tickets page rendered"]

  ui_hasActiveBookings -->|No bookings at all| ev_emptyPage["empty tickets page rendered"]
  ui_hasExpiredBookings -->|No bookings at all| ev_emptyPage

  ev_emptyActive --> ev_cardRendered
  ev_emptyExpired --> ev_cardRendered
  ev_emptyPage --> ev_cardRendered

  ev_activePage --> ui_multiDevice{Multi-device user?}
  ui_multiDevice -->|Yes| ev_reclaimShown["reclaim card shown"]

  ev_emptyActive --> ev_hookRendered
  ev_emptyExpired --> ev_hookRendered
  ev_emptyPage --> ev_hookRendered

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_activeTab,ev_expiredTab,ev_activePage,ev_expiredPage,ev_emptyActive,ev_emptyExpired,ev_emptyPage,ev_cardRendered,ev_reclaimShown,ev_hookRendered event;
  class ui_screenOpen,ui_tabSelect,ui_hasActiveBookings,ui_hasExpiredBookings,ui_multiDevice ui;

  %%chalo:diagram-link ev_cardRendered -> title:Funnel: Product Card Interactions -> Use/View/Renew
  %%chalo:diagram-link ev_hookRendered -> title:Funnel: Promotional Hooks -> Purchase Flow
  %%chalo:diagram-link ev_reclaimShown -> title:Funnel: Product Reclaim (Multi-Device)
```

## Funnel: Product Card Interactions → Use/View/Renew

Users interact with product cards to activate, view details, or renew passes.

```mermaid
flowchart TD
  ev_cardRendered["tickets page card item rendered"] --> ui_userAction{User action}

  ui_userAction -->|Taps Use Now| ev_useNow["product use now button clicked"]
  ui_userAction -->|Opens menu -> View Summary| ev_viewSummary["product menu view summary clicked"]
  ui_userAction -->|Taps Renew| ev_renewBtn["renew btn clicked"]
  ui_userAction -->|Cash payment pending| ev_cashPay["open super pass cash payment web page"]
  ui_userAction -->|Taps promotional card| ev_cardClick["tickets page card item clicked"]

  ev_viewSummary --> ui_ticketSummary(["Ticket Summary Screen (tickets)"])
  ev_viewSummary --> ui_passSummary(["Pass Summary Screen (passes)"])
  ev_cardClick --> ext_regularBusTab[Regular Bus Tab]
  ev_cashPay --> ext_cashPay[Cash payment web page]

  ev_useNow --> ui_notificationCheck{Notification permission?}
  ui_notificationCheck -->|Granted| ev_notifGranted["notification permission granted"]
  ui_notificationCheck -->|Denied| ev_notifDenied["notification permission denied"]

  ev_notifDenied --> ev_explainerRendered["notification permission explainer rendered"]
  ev_explainerRendered --> ui_explainerAction{User choice}
  ui_explainerAction -->|Enable| ev_explainerEnable["notification permission explainer enable clicked"]
  ui_explainerAction -->|Skip| ev_explainerSkip["notification permission explainer skipped"]

  ev_notifGranted --> ui_activation([Activation Flow])
  ev_explainerEnable --> ext_settings[System Settings]
  ev_explainerSkip --> ui_activation

  ui_activation --> ev_activationConfirm["product activation bottomsheet positive cta clicked"]
  ev_activationConfirm --> ui_activationResult{Activation success?}
  ui_activationResult -->|Failed| ev_activationFailed["product activation failed bottomsheet shown"]
  ev_activationFailed --> ev_activationFailedClose["product activation failed bottomsheet positive cta clicked"]
  ui_activationResult -->|Success| ext_validation[Validation Flow]

  ev_renewBtn --> ui_renewCheck{Can renew?}
  ui_renewCheck -->|Not renewable| ev_productSelection["product selection activity launched"]
  ui_renewCheck -->|Error/blocked| ev_renewError["renew error bottomsheet shown"]
  ui_renewCheck -->|Success| ext_superPassPurchase[Super Pass Purchase Flow]

  ev_renewError --> ui_renewAction{User choice}
  ui_renewAction -->|Positive CTA| ev_renewPositive["renew error bottomsheet positive cta clicked"]
  ui_renewAction -->|Negative CTA| ev_renewNegative["renew error bottomsheet negative cta clicked"]

  ev_renewPositive --> ext_explorePlans[Explore Plans]
  ev_productSelection --> ext_productPurchase[Product Selection / Purchase Flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_cardRendered,ev_useNow,ev_viewSummary,ev_renewBtn,ev_cashPay,ev_cardClick,ev_notifGranted,ev_notifDenied,ev_explainerRendered,ev_explainerEnable,ev_explainerSkip,ev_activationConfirm,ev_activationFailed,ev_activationFailedClose,ev_renewError,ev_renewPositive,ev_renewNegative,ev_productSelection event;
  class ui_userAction,ui_ticketSummary,ui_passSummary,ui_notificationCheck,ui_explainerAction,ui_activation,ui_activationResult,ui_renewCheck,ui_renewAction ui;
  class ext_regularBusTab,ext_cashPay,ext_settings,ext_validation,ext_superPassPurchase,ext_explorePlans,ext_productPurchase external;

  %%chalo:diagram-link ui_ticketSummary -> title:Funnel: View Summary -> Ticket Summary (Data Fetch -> Actions)
  %%chalo:diagram-link ui_passSummary -> title:Funnel: View Summary -> Pass Summary -> Trip Receipt
```

## Funnel: View Summary → Ticket Summary (Data Fetch → Actions)

This funnel is what PMs typically use to build “opened summary → loaded → acted” funnels.

```mermaid
flowchart TD
  ev_viewSummary["product menu view summary clicked"] --> ev_open["ticket summary screen opened"]

  ui_entry([Other entrypoints: deeplink / notification / validation redirect]) --> ev_open

  ev_open --> ui_bookingResolved{Booking type resolved?}
  ui_bookingResolved -->|Yes| ev_productOk["product data fetch success"]
  ui_bookingResolved -->|No| ev_productFail["product data fetch failure"]

  ev_productOk --> ui_receiptFetch{Receipt fetch result}
  ui_receiptFetch -->|Success| ev_receiptOk["receipt data fetch success"]
  ui_receiptFetch -->|Failure| ev_receiptFail["receipt data fetch failure"]

  ev_receiptOk --> ui_actions{User action}
  ev_receiptFail --> ui_actions

  ui_actions --> ev_help["ticket summary screen help button clicked"]
  ui_actions --> ui_invoice{Invoice download}
  ui_invoice --> ev_invoiceOk["invoice download success"]
  ui_invoice --> ev_invoiceFail["invoice download failure"]

  ui_actions --> ev_banner["product summary banner cta click"]
  ev_banner --> ui_bannerType{CTA type}
  ui_bannerType -->|Use Product Now| ev_startValidation["start product validation"]
  ui_bannerType -->|Premium bus activation| ev_startPremium["start premium product validation"]
  ui_bannerType -->|Try Booking Again| ev_bookAgain["summary book again clicked"]

  ev_startValidation --> ui_validation["Validation flow"]
  ev_startPremium --> ui_premium["Premium bus activation flow"]
  ev_bookAgain --> ui_purchase["Purchase flow (see product flow docs)"]

  ui_actions --> ev_fullImageClose["full image cancel btn click"]
  ev_startValidation --> ui_activationResult{Activation/validation start OK?}
  ui_activationResult -->|Fail| ev_activationFailed["product activation failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_viewSummary,ev_open,ev_productOk,ev_productFail,ev_receiptOk,ev_receiptFail,ev_help,ev_invoiceOk,ev_invoiceFail,ev_banner,ev_startValidation,ev_startPremium,ev_bookAgain,ev_fullImageClose,ev_activationFailed event;
  class ui_entry,ui_bookingResolved,ui_receiptFetch,ui_actions,ui_invoice,ui_bannerType,ui_validation,ui_premium,ui_purchase,ui_activationResult ui;

  %%chalo:diagram-link ui_validation -> title:Validation flow
  %%chalo:diagram-link ui_premium -> title:Premium bus activation flow
```
External modules referenced here:
- Validation: `docs/analytics/validation/`
- Premium bus activation: `content/analytics/premium-bus-activation-tracking/`

## Funnel: Promotional Hooks → Purchase Flow

Users can discover and purchase products through promotional hooks and dedicated purchase CTAs.

```mermaid
flowchart TD
  ev_hookRendered["tickets page hook rendered"] --> ui_hookAction{User taps hook?}
  ui_hookAction -->|Yes| ev_hookClick["tickets page hook clicked"]
  ev_hookClick --> ext_hookTarget[Hook target destination]

  ui_emptyState([Empty page state]) --> ev_buyBtn["buy ticket passes button clicked"]
  ev_buyBtn --> ui_hasHooks{Has product hooks?}
  ui_hasHooks -->|Yes| ev_bottomsheet["product purchase bottomsheet opened"]
  ui_hasHooks -->|No| ext_regularBus[Regular Bus Tab]

  ev_bottomsheet --> ui_selectProduct([User selects product])
  ui_selectProduct --> ev_productSelectionLaunched["product selection activity launched"]
  ev_productSelectionLaunched --> ext_productPurchase[Product Selection / Purchase Flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_hookRendered,ev_hookClick,ev_buyBtn,ev_bottomsheet,ev_productSelectionLaunched event;
  class ui_hookAction,ui_emptyState,ui_hasHooks,ui_selectProduct ui;
  class ext_hookTarget,ext_regularBus,ext_productPurchase external;
```

## Funnel: Product Reclaim (Multi-Device)

Users with products on multiple devices see a reclaim card and can link devices to access all bookings.

```mermaid
flowchart TD
  ev_reclaimShown["reclaim card shown"] --> ui_reclaimAction{User taps reclaim?}
  ui_reclaimAction -->|Yes| ev_reclaimBtn["reclaim card button clicked"]
  ev_reclaimBtn --> ui_dialog([Reclaim confirmation dialog])

  ui_dialog --> ui_userChoice{User choice}
  ui_userChoice -->|Confirm| ev_reclaimPos["reclaim dialog positive button clicked"]
  ui_userChoice -->|Cancel| ev_reclaimNeg["reclaim dialog negative button clicked"]

  ev_reclaimPos --> ui_linkDevice([Device linking process])
  ui_linkDevice --> ui_linkResult{Link success?}
  ui_linkResult -->|Success| ui_refresh([Refresh bookings])
  ui_linkResult -->|Failed| ui_error([Show error])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_reclaimShown,ev_reclaimBtn,ev_reclaimPos,ev_reclaimNeg event;
  class ui_reclaimAction,ui_dialog,ui_userChoice,ui_linkDevice,ui_linkResult,ui_refresh,ui_error ui;
```

## Global: Support & Help

The report problem flow is accessible from anywhere within the history screen.

```mermaid
flowchart TD
  ui_anyScreen([Any screen state]) --> ui_reportAction{User taps help?}
  ui_reportAction -->|Yes| ev_reportProblem["report problem clicked v2"]
  ev_reportProblem --> ext_reportProblem[Report Problem Flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_reportProblem event;
  class ui_anyScreen,ui_reportAction ui;
  class ext_reportProblem external;
```

## Funnel: History Sync (Background)

History sync runs in the background to refresh bookings. These events help diagnose sync reliability.

```mermaid
flowchart TD
  ui_sync([Background history sync]) --> ev_section["History sync section status"]
  ev_section --> ui_result{Sync result}
  ui_result -->|Failure| ev_failed["History sync failed"]
  ui_result -->|Success| ui_ok([Bookings refreshed])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_section,ev_failed event;
  class ui_sync,ui_result,ui_ok ui;
```

## Funnel: Product Status & Renew Disabled

```mermaid
flowchart TD
  ui_history([My Tickets screen]) --> ev_statusBtn["product status button clicked"]
  ev_statusBtn --> ui_statusSheet([Status / actions bottom sheet])

  ui_statusSheet --> ui_renewCheck{Renew allowed?}
  ui_renewCheck -->|No| ev_renewDisabled["renew disabled product error dialog rendered"]
  ui_renewCheck -->|Yes| ui_renew([Continue to renew flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_statusBtn,ev_renewDisabled event;
  class ui_history,ui_statusSheet,ui_renewCheck,ui_renew ui;
```

## Funnel: View Summary → Pass Summary → Trip Receipt

This funnel covers pass summary and trip receipt discovery from a booking.

```mermaid
flowchart TD
  ev_viewSummary["product menu view summary clicked"] --> ev_passSummary["pass summary screen opened"]
  ev_passSummary --> ui_tripHistory([User taps Trip History])
  ui_tripHistory --> ev_receiptOpen["ride receipt screen opened"]
  ev_receiptOpen --> ev_passRideHistoryFetch["pass ride history data fetch"]

  ev_receiptOpen --> ev_rideCardCta["ride card cta click"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_viewSummary,ev_passSummary,ev_receiptOpen,ev_passRideHistoryFetch,ev_rideCardCta event;
  class ui_tripHistory ui;
```

## Funnel: Activation Merge (Super Pass)

This is the post-purchase activation/update surface that can be reached from History flows.

```mermaid
flowchart TD
  ui_activation([Product activation screen]) --> ev_activationBtn["activation button clicked"]
  ev_activationBtn --> ev_mergeOpen["activate merged flow screen opened"]

  ev_mergeOpen --> ui_mergeResult{Update result}
  ui_mergeResult -->|Updated| ev_updated["super pass updated"]
  ui_mergeResult -->|Activated| ev_passActivated["pass activated"]

  ui_activation --> ev_viewTripReceipt["view trip receipt button clicked"]
  ev_viewTripReceipt --> ev_receiptOpen["ride receipt screen opened"]

  ui_activation --> ev_superPassViewSummary["super pass menu view summary clicked"]
  ev_superPassViewSummary --> ev_passSummary["pass summary screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_activationBtn,ev_mergeOpen,ev_updated,ev_passActivated,ev_viewTripReceipt,ev_superPassViewSummary,ev_passSummary,ev_receiptOpen event;
  class ui_activation,ui_mergeResult ui;

  %%chalo:diagram-link ev_passSummary -> title:Funnel: View Summary -> Pass Summary -> Trip Receipt
  %%chalo:diagram-link ev_receiptOpen -> title:Funnel: View Summary -> Pass Summary -> Trip Receipt
```

## Funnel: Ride Feedback

```mermaid
flowchart TD
  ui_feedback([Trip feedback prompt]) --> ev_rating["ride feedback rating selected"]
  ev_rating --> ev_submit["ride feedback submitted"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_rating,ev_submit event;
  class ui_feedback ui;
```

## Key Analytics Properties by Stage

### Page Rendering Events
All page rendering events that show bookings include these counts:
- `ride based pass booking count`
- `magic pass booking count`
- `super pass application booking count`
- `pending super pass application booking count`
- `quick pay booking count`
- `mobile ticket booking count`
- `instant ticket booking count`
- `premium bus booking count`

### Product Interaction Events
Events like `product use now button clicked`, `product menu view summary clicked`, and activation/renewal CTAs include:
- `productType`
- `productSubType`
- `bookingId`

### Ticket Summary Events
The Ticket Summary screen adds these properties:
- `ticketRequestType` + `bookingId` on `ticket summary screen opened`, `product data fetch success/failure`, `receipt data fetch success/failure`
- `bannerCtaType` on `product summary banner cta click`
- `errorMessage` on `invoice download failure`
- `passRequestType` on `summary book again clicked` (currently carries booking id string)

### Renew Button Clicked
The `renew btn clicked` event includes comprehensive super pass metadata:
- `isSuperPass` (always true)
- `passId`, `productId`, `productName`
- `categoryId`, `fareMappingId`
- `pass status`, `verificationFlag`, `verificationExpiryTime`, `expiry time`
- `paymentMode`, `transaction id`, `startDate`
- `isRenewFromProductStatusCard` (boolean flag)

### Hook Events
Both `tickets page hook rendered` and `tickets page hook clicked` include:
- `type` (hook feature type)
- `position` (zero-indexed)
- `title`
- `desc list` (array)
- `tag list` (array)
- `image url`

## Funnel Building Tips

1. **Tab-specific funnels**: Use `active tickets tab selected` or `expired tickets tab selected` as funnel start
2. **Booking type funnels**: Filter by specific booking count properties (e.g., `magic pass booking count > 0`)
3. **Activation funnels**: Track from `product use now button clicked` → notification flow → activation result
4. **Renewal funnels**: Track from `renew btn clicked` → error handling → purchase completion
5. **Multi-device funnels**: Track from `reclaim card shown` → reclaim dialog → device linking
6. **Purchase funnels**: Track from empty states → `buy ticket passes button clicked` → bottom sheet → purchase
7. **Hook engagement**: Track `tickets page hook rendered` → `tickets page hook clicked` with `position` and `type` properties
