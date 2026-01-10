# Instant Ticket purchase analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The instant ticket flow supports route-based selection where users select route and stops before seeing fare
- Wallet integration is optional based on city configuration
- Validation can happen via QR or BLE depending on availability and permissions
- All events include `isInstantTicket: true` property to allow filtering in dashboards

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

## Entry → Route & Stop Selection

The instant ticket flow starts with route-based stop selection where users first select their journey details.

```mermaid
flowchart TD
  ui_entry([User initiates instant ticket]) --> ev_screenOpen["route based stop selection screen opened"]
  ev_screenOpen --> ui_routeSelection([User selecting route])
  ui_routeSelection --> ev_routeEntered["find my ticket fare route number entered"]

  ev_routeEntered --> ui_fromStop([User selecting FROM stop])
  ui_fromStop --> ev_stopClicked1["find my ticket fare stop clicked"]
  ev_stopClicked1 --> ev_stopEntered1["find my ticket fare stop entered"]

  ev_stopEntered1 --> ui_toStop([User selecting TO stop])
  ui_toStop --> ev_stopClicked2["find my ticket fare stop clicked"]
  ev_stopClicked2 --> ev_stopEntered2["find my ticket fare stop entered"]

  ev_stopEntered2 --> ui_next([User clicks next])
  ui_next --> ev_nextClicked["find my ticket fare route details next clicked"]

  ev_nextClicked --> ui_fareDetails([Navigate to fare details])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_screenOpen,ev_routeEntered,ev_stopClicked1,ev_stopEntered1,ev_stopClicked2,ev_stopEntered2,ev_nextClicked event;
  class ui_entry,ui_routeSelection,ui_fromStop,ui_toStop,ui_next,ui_fareDetails ui;
```

## Alternate Entry: Stop-Based Route Selection

Some cities/products use a stop-based route selection surface before fare details.

```mermaid
flowchart TD
  ui_entry([User initiates instant ticket]) --> ev_pickRoute["pick route screen opened"]
  ev_pickRoute --> ev_pickStop["pick stop screen opened"]

  ev_pickStop --> ev_stopBasedOpen["stop based stop selection screen opened"]
  ev_stopBasedOpen --> ui_selectFrom([Select FROM stop])
  ui_selectFrom --> ev_fromStop["stop based stop selection screen from stop"]
  ev_fromStop --> ui_selectTo([Select TO stop])
  ui_selectTo --> ev_toStop["stop based stop selection screen to stop"]

  ev_stopBasedOpen --> ui_results([Route results list])
  ui_results --> ev_resultClick["stop based stop selection screen route result item click"]
  ui_results --> ev_clear["stop based route selection screen clear search click"]

  ev_stopBasedOpen --> ui_configFetch{Instant ticket config fetch}
  ui_configFetch -->|Success| ev_cfgOk["stop based stop selection screen instant ticket config fetch success"]
  ui_configFetch -->|Failure| ev_cfgFail["stop based stop selection screen instant ticket config fetch failed"]

  ev_resultClick --> ev_proceed["stop based stop selection screen proceed button click"]
  ev_proceed --> ui_fareDetails([Navigate to fare details])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_pickRoute,ev_pickStop,ev_stopBasedOpen,ev_fromStop,ev_toStop,ev_resultClick,ev_clear,ev_cfgOk,ev_cfgFail,ev_proceed event;
  class ui_entry,ui_selectFrom,ui_selectTo,ui_results,ui_configFetch,ui_fareDetails ui;
```

## Fare Details → Passenger Selection → Payment

After route selection, users see fare details, can adjust passenger count, and proceed to payment.

```mermaid
flowchart TD
  ui_fareScreen([Fare details screen loads]) --> ev_fareOpen["find my ticket fare fare details screen opened"]

  ev_fareOpen --> ui_passengerAdjust([User may adjust passenger count])
  ui_passengerAdjust -->|increase/decrease| ev_passengerChanged["find my ticket fare fare details passenger count changed"]
  ev_passengerChanged --> ui_passengerAdjust

  ui_passengerAdjust --> ui_payClick([User clicks pay button])
  ev_fareOpen --> ui_payClick
  ui_payClick --> ev_payClicked["find my ticket fare fare details pay button clicked"]

  ev_payClicked -->|wallet enabled| ui_walletCheck([Check wallet status])
  ev_payClicked -->|wallet disabled or other modes| ui_directPayment([Direct to online payment])

  ui_walletCheck --> ev_bottomSheetOpen["instant ticket bottmsheet opened"]
  ev_bottomSheetOpen -->|insufficient balance| ev_rechargeClicked["instant ticket bottom sheet recharge button clicked"]
  ev_rechargeClicked --> ext_walletRecharge[Wallet recharge flow]

  ev_bottomSheetOpen -->|wallet payment| ev_paymentMethod["paymentMethod"]
  ev_paymentMethod --> ui_walletPayment([Create QuickPay order])
  ev_bottomSheetOpen -->|online payment| ui_directPayment

  ui_directPayment --> ext_orderCreation[Order creation API]
  ui_walletPayment --> ext_orderCreation
  ext_orderCreation --> ext_checkout[Checkout flow - separate instrumentation]

  ext_checkout -->|payment success| ev_ticketFetched["instant ticket fetched"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_fareOpen,ev_passengerChanged,ev_payClicked,ev_bottomSheetOpen,ev_paymentMethod,ev_rechargeClicked,ev_ticketFetched event;
  class ui_fareScreen,ui_passengerAdjust,ui_payClick,ui_walletCheck,ui_directPayment,ui_walletPayment ui;
  class ext_walletRecharge,ext_orderCreation,ext_checkout external;
```

## Fare Details: Auto Fare Updates (Seat Selection)

```mermaid
flowchart TD
  ev_fareOpen["find my ticket fare fare details screen opened"] --> ui_autoUpdate([Auto fare recalculation])
  ui_autoUpdate --> ev_autoFare["find my ticket fare auto fare update with seat selection"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_fareOpen,ev_autoFare event;
  class ui_autoUpdate ui;
```

## Ticket Validation → QR Flow

After successful payment, ticket can be validated via QR code.

```mermaid
flowchart TD
  ui_postPayment([After payment success]) --> ev_fetched["instant ticket fetched"]
  ev_fetched --> ui_qrFlow([User selects QR validation])
  ui_qrFlow --> ev_qrOpen["qr screen open"]

  ev_qrOpen --> ui_showQR([QR code displayed])
  ui_showQR --> ui_conductorScan([Conductor scans QR])
  ui_conductorScan --> ev_tripPunched["instant ticket trip punched"]

  ev_tripPunched --> ui_receiptOption([User views validation])
  ui_receiptOption --> ev_viewReceipt["instant ticket view receipt clicked"]

  ui_showQR --> ui_reportIssue([User reports problem])
  ui_reportIssue --> ev_reportProblem["report problem clicked v2"]

  ui_showQR --> ui_viewMenu([User opens menu])
  ui_viewMenu --> ev_menuReceipt["view trip receipt from menu clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_fetched,ev_qrOpen,ev_tripPunched,ev_viewReceipt,ev_reportProblem,ev_menuReceipt event;
  class ui_postPayment,ui_qrFlow,ui_showQR,ui_conductorScan,ui_receiptOption,ui_reportIssue,ui_viewMenu ui;
```

## Receipt Payload (Debug/Diagnostics)

```mermaid
flowchart TD
  ui_receipt([Receipt payload prepared]) --> ev_payload["instantTicket receipt payload"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_payload event;
  class ui_receipt ui;
```

## Ticket Validation → BLE Flow

Alternative validation via Bluetooth with permission handling.

```mermaid
flowchart TD
  ui_postPayment([After payment success]) --> ev_fetched["instant ticket fetched"]
  ev_fetched --> ui_bleFlow([User selects BLE validation])
  ui_bleFlow --> ev_bleOpen["ble screen open"]

  ev_bleOpen --> ev_permCheck["BLE permission check on validation initialization"]

  ev_permCheck -->|not granted| ui_requestPerm([Request BLE permission])
  ui_requestPerm -->|granted| ev_permGranted["BLE permission granted"]
  ui_requestPerm -->|denied| ev_permDenied["BLE permission denied"]

  ev_permDenied --> ui_fallbackQR([Show QR option])

  ev_permCheck -->|already granted| ui_bleReady([BLE ready for validation])
  ev_permGranted --> ui_bleReady

  ui_bleReady --> ui_conductorValidate([Conductor validates via BLE])
  ui_conductorValidate --> ev_tripPunched["instant ticket trip punched"]

  ev_tripPunched --> ev_postValidationOpen["Post validation screen opened"]
  ev_postValidationOpen --> ui_postValActions([User post-validation actions])

  ui_postValActions --> ev_viewReceiptPost["view receipt post validation clicked"]
  ui_postValActions --> ev_exitPost["view receipt post validation clicked"]

  ui_bleReady --> ui_backPress([User presses back])
  ui_backPress --> ev_confirmShown["exit chalo pay confirmation shown"]
  ev_confirmShown --> ev_confirmYes["exit chalo pay confirmation yes clicked"]
  ev_confirmShown --> ev_confirmNo["exit chalo pay confirmation no clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_fetched,ev_bleOpen,ev_permCheck,ev_permGranted,ev_permDenied,ev_tripPunched,ev_postValidationOpen,ev_viewReceiptPost,ev_exitPost,ev_confirmShown,ev_confirmYes,ev_confirmNo event;
  class ui_postPayment,ui_bleFlow,ui_requestPerm,ui_fallbackQR,ui_bleReady,ui_conductorValidate,ui_postValActions,ui_backPress ui;
```

## TITO (Tap-In Tap-Out) Validation Events

Advanced validation flow for TITO-enabled routes with polling and notification mechanisms.

```mermaid
flowchart TD
  ui_bleValidation([BLE validation active]) --> ui_titoPolling([TITO polling started])

  ui_titoPolling --> ui_pollCheck([Poll for tap-in data])
  ui_pollCheck -->|valid data| ev_validTito["valid tito tap in data received in polling"]
  ui_pollCheck -->|invalid data| ev_invalidTito["invalid tito tap in data received in polling"]

  ev_validTito --> ui_processData([Process validation])
  ev_invalidTito --> ui_pollCheck

  ui_pollCheck -->|notification arrives| ev_notifReceived["tito tapIn notif recv on conductor flow"]
  ev_notifReceived --> ev_pollingStopped["tito tapin polling stopped due to notification received"]
  ev_pollingStopped --> ui_processData

  ui_processData --> ui_bleAck([BLE ack data received])
  ui_bleAck -->|valid| ev_ackConsumed["ble validation ack data consumed"]
  ui_bleAck -->|invalid| ev_invalidAck["invalid ble validation ack data received"]

  ev_ackConsumed --> ui_sync([Sync validation])
  ui_sync -->|sync fails| ev_syncFailed["syncing post ble validation failed"]
  ui_sync -->|sync success| ev_tripPunched["instant ticket trip punched"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_validTito,ev_invalidTito,ev_notifReceived,ev_pollingStopped,ev_ackConsumed,ev_invalidAck,ev_syncFailed,ev_tripPunched event;
  class ui_bleValidation,ui_titoPolling,ui_pollCheck,ui_processData,ui_bleAck,ui_sync ui;
```

## Complete Funnel Overview

Use this diagram to build complete conversion funnels from entry to validation.

```mermaid
flowchart TD
  Start([User Entry]) --> F1["route based stop selection screen opened"]
  F1 --> F2["find my ticket fare route number entered"]
  F2 --> F3["find my ticket fare stop clicked"]
  F3 --> F4["find my ticket fare stop entered"]
  F4 --> F5["find my ticket fare route details next clicked"]
  F5 --> F6["find my ticket fare fare details screen opened"]
  F6 --> F7["find my ticket fare fare details pay button clicked"]

  F7 -->|wallet flow| F8["instant ticket bottmsheet opened"]
  F8 --> F9["instant ticket fetched"]

  F7 -->|direct payment| F9

  F9 -->|QR| F10["qr screen open"]
  F9 -->|BLE| F11["ble screen open"]

  F10 --> F12["instant ticket trip punched"]
  F11 --> F12

  F12 --> F13["post validation screen opened"]
  F13 --> F14["view receipt post validation clicked"]

  F13 --> End([Flow Complete])
  F14 --> End

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class F1,F2,F3,F4,F5,F6,F7,F8,F9,F10,F11,F12,F13,F14 event;
  class Start,End ui;
```

## Key Funnel Metrics

### Primary Conversion Funnel
Track the core conversion from entry to payment:

1. `route based stop selection screen opened` - Entry point
2. `find my ticket fare route number entered` - Route selected
3. `find my ticket fare route details next clicked` - Journey configured
4. `find my ticket fare fare details screen opened` - Fare displayed
5. `find my ticket fare fare details pay button clicked` - Payment initiated
6. `instant ticket fetched` - Payment success

**Drop-off Analysis**: Monitor drop-offs between each step to identify friction points.

### Validation Funnel
Track validation completion:

1. `instant ticket fetched` - Ticket ready
2. `qr screen open` OR `ble screen open` - Validation started
3. `instant ticket trip punched` - Validation success

**Split by**: `validationFlowType` to compare QR vs BLE success rates.

### Wallet Adoption Funnel
Track wallet usage:

1. `instant ticket bottmsheet opened` - Wallet option shown
2. Filter by `isChalowWalletActivated: true` - Wallet activated users
3. Filter by `balanceAmount > amount` - Sufficient balance
4. `instant ticket fetched` where payment via wallet - Wallet payment success

**Cohorts**:
- `isQuickPayBoughtOnce: false` - First-time QuickPay users
- `isRechargeDoneOnce: false` - Users who haven't recharged

### Permission Funnel (BLE)
Track BLE permission handling:

1. `ble screen open` - BLE validation attempted
2. `BLE permission check on validation initialization` - Permission status checked
3. `BLE permission granted` - Permission granted rate
4. `BLE permission denied` - Permission denied rate
5. `instant ticket trip punched` where BLE - Successful BLE validation

**Metrics**:
- Permission grant rate
- Validation success rate with/without permission

### TITO Performance Metrics
For TITO-enabled routes:

1. `tito tapIn notif recv on conductor flow` - TITO notification received
2. Split by `notificationDeliveryMedium` - INTERNET vs BLE delivery
3. `valid tito tap in data received in polling` vs `invalid tito tap in data received in polling` - Data quality
4. `ble validation ack data consumed` - Processing success
5. `syncing post ble validation failed` - Sync failure rate

## Dashboard Segments

### By Flow Type
All events include `flowType: "Instant Ticket"` - use this to isolate instant ticket analytics from other ticketing products.

### By Product Type
All events include:
- `productType: "mobileTicket"`
- `productSubType: "instantTicket"`
- `isInstantTicket: true`

Use any of these properties to filter instant ticket events.

### By Validation Method
Segment validation events by:
- QR: Events starting with `qr screen open`
- BLE: Events starting with `ble screen open`
- TITO: Events containing `tito` in the name

### By Payment Method
Track payment method via:
- `paymentMethod` property in relevant events
- Presence of `instant ticket bottmsheet opened` indicates wallet flow attempted

### By User Journey
Track different user segments:
- New users: `isQuickPayBoughtOnce: false`
- Wallet users: `isChalowWalletActivated: true`
- High-value users: Filter by `amount` ranges

## Common Analytics Questions

### Q: What's the conversion rate from entry to payment?
**Answer**: Create funnel from `route based stop selection screen opened` → `instant ticket fetched`

### Q: Why do users drop off at fare details?
**Answer**: Compare users who reach `find my ticket fare fare details screen opened` vs those who click `find my ticket fare fare details pay button clicked`. Check `amount` distribution and passenger count patterns.

### Q: Is wallet adoption increasing?
**Answer**: Track `instant ticket bottmsheet opened` over time, segment by `isChalowWalletActivated` and measure conversion to wallet payment.

### Q: Which validation method is more successful?
**Answer**: Compare time from validation screen open to `instant ticket trip punched` for QR vs BLE. Check `BLE permission denied` rate for BLE friction.

### Q: What's the TITO failure rate?
**Answer**: Count `invalid tito tap in data received in polling` and `syncing post ble validation failed` as failures. Compare to successful `instant ticket trip punched` events.

### Q: Do users with higher balance use wallet more?
**Answer**: Segment `instant ticket bottmsheet opened` by `balanceAmount` ranges and measure conversion to wallet payment.

### Q: What's the passenger count distribution?
**Answer**: Analyze `find my ticket fare fare details passenger count changed` events and final values in `find my ticket fare fare details pay button clicked`.

### Q: How many users need to adjust passenger count?
**Answer**: Count unique users with `find my ticket fare fare details passenger count changed` events vs total users reaching fare details.
