# Validation analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- Validation supports multiple products: Super Pass, M-Ticket, Instant Ticket, Premium Bus, ONDC Bus/Metro, Metro, Quick Pay
- Three validation types: BLE validation (conductor/TITO), QR validation, Vehicle-based validation
- BLE validation requires permissions; QR serves as fallback
- TITO (Ticket-In-Ticket-Out) enables tap-in/tap-out for distance-based fares
- Notifications can arrive via GCM (push), BLE (direct), or Polling (periodic API)

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

## Entry → Validation Type Selection

```mermaid
flowchart TD
  ui_entry([User initiates validation]) --> ev_start["start product validation"]

  ev_start --> ui_checkProduct{Product found?}
  ui_checkProduct -->|No| ev_notFound["validation product not found"]

  ui_checkProduct -->|Yes| ui_validationType{Validation type?}

  ui_validationType -->|BLE required| ui_bleBranch([BLE Validation Flow])
  ui_validationType -->|QR only| ui_qrBranch([QR Validation Flow])
  ui_validationType -->|Vehicle scanner| ui_vehicleBranch([Vehicle-Based Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_start,ev_notFound event;
  class ui_entry,ui_checkProduct,ui_validationType,ui_bleBranch,ui_qrBranch,ui_vehicleBranch ui;
```

## BLE Validation Flow - Permission Check

```mermaid
flowchart TD
  ui_bleInit([BLE validation component init]) --> ev_bleOpen["ble screen open"]
  ev_bleOpen --> ui_hwCheck{BLE hardware available?}
  ui_hwCheck -->|No| ev_hwNotAvailable["ble hardware not available on device"]
  ev_hwNotAvailable --> ui_qrFallback([QR Validation Flow])
  ui_hwCheck -->|Yes| ev_permCheck["BLE permission check on validation initialization"]

  ev_permCheck --> ui_hasPermission{Has BLE permission?}

  ui_hasPermission -->|Yes, granted| ev_granted["BLE permission granted"]
  ev_granted --> ui_bleValidation([Active BLE Validation])

  ui_hasPermission -->|No, denied| ev_denied["BLE permission denied"]
  ev_denied --> ev_rationaleScreen["BLE validation permission rationale screen opened"]

  ev_rationaleScreen --> ui_userChoice{User action?}
  ui_userChoice -->|Accept rationale| ev_rationaleAccepted["BLE permission rationale accepted"]
  ui_userChoice -->|Open settings| ev_settingsOpen["BLE validation permission settings screen opened"]

  ui_userChoice -->|Deny again| ev_qrOptionShown["BLE denial qr option shown"]
  ev_qrOptionShown --> ev_useQrClicked["BLE denial use qr clicked"]
  ev_useQrClicked --> ui_qrFallback([QR Validation Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bleOpen,ev_hwNotAvailable,ev_permCheck,ev_granted,ev_denied,ev_rationaleScreen,ev_rationaleAccepted,ev_settingsOpen,ev_qrOptionShown,ev_useQrClicked event;
  class ui_bleInit,ui_hwCheck,ui_hasPermission,ui_userChoice,ui_bleValidation,ui_qrFallback ui;
```

## BLE Validation Flow - Active Validation

```mermaid
flowchart TD
  ui_bleActive([BLE validation active]) --> ui_interactions{User interaction?}

  ui_interactions -->|View details| ev_bottomSheetClicked["ble bottom sheet clicked"]
  ui_interactions -->|Help button| ev_helpClicked["BLE validation help btn clicked"]
  ui_interactions -->|Switch to QR| ev_openQrBtn["BLE validation open qr btn clicked"]
  ev_openQrBtn --> ev_switchGotIt["BLE validation switch to qr got it clicked"]
  ev_switchGotIt --> ui_qrScreen([QR Validation Flow])

  ui_interactions -->|Back pressed| ev_backShown["confirmation on backpress shown"]
  ev_backShown --> ui_confirmExit{Confirm exit?}
  ui_confirmExit -->|Yes| ev_backYes["confirmation on backpress yes clicked"]
  ui_confirmExit -->|No| ev_backNo["confirmation on backpress no clicked"]

  ui_bleActive --> ui_validationResult{Validation result?}

  ui_validationResult -->|ACK received| ui_ackType{ACK data type?}
  ui_ackType -->|Valid conductor| ev_conductorPunch["[product] trip punch"]
  ui_ackType -->|Valid TITO tap-in| ev_titoTapIn["tito tapIn notif recv on conductor flow"]
  ui_ackType -->|Invalid data| ev_invalidAck["invalid ble validation ack data received"]

  ev_conductorPunch --> ev_ackConsumed["ble validation ack data consumed"]
  ev_titoTapIn --> ev_ackConsumed
  ev_invalidAck --> ev_ackConsumed

  ev_ackConsumed --> ui_syncResult{Sync success?}
  ui_syncResult -->|Success| ui_postValidation([Post-Validation Screen])
  ui_syncResult -->|Failed| ev_syncFailed["syncing post ble validation failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bottomSheetClicked,ev_helpClicked,ev_openQrBtn,ev_switchGotIt,ev_backShown,ev_backYes,ev_backNo,ev_conductorPunch,ev_titoTapIn,ev_invalidAck,ev_ackConsumed,ev_syncFailed event;
  class ui_bleActive,ui_interactions,ui_confirmExit,ui_validationResult,ui_ackType,ui_syncResult,ui_qrScreen,ui_postValidation ui;
```

## TITO Tap-In Polling Flow

```mermaid
flowchart TD
  ui_conductorFlow([Conductor validation active with TITO]) --> ui_pollingActive([Polling for tap-in])

  ui_pollingActive --> ui_notificationReceived{Notification received?}

  ui_notificationReceived -->|Yes, via GCM/BLE| ev_titoNotif["tito tapIn notif recv on conductor flow"]
  ev_titoNotif --> ev_pollingStopped["tito tapin polling stopped due to notification received"]
  ev_pollingStopped --> ui_processNotif([Process tap-in])

  ui_notificationReceived -->|No, polling continues| ui_pollingResult{Polling result?}

  ui_pollingResult -->|Valid tap-in data| ev_validPolling["valid tito tap in data received in polling"]
  ev_validPolling --> ui_processNotif

  ui_pollingResult -->|Invalid data| ev_invalidPolling["invalid tito tap in data received in polling"]
  ev_invalidPolling --> ui_pollingActive

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_titoNotif,ev_pollingStopped,ev_validPolling,ev_invalidPolling event;
  class ui_conductorFlow,ui_pollingActive,ui_notificationReceived,ui_pollingResult,ui_processNotif ui;
```

## QR Validation Flow

```mermaid
flowchart TD
  ui_qrInit([QR validation screen init]) --> ev_qrOpen["qr screen open"]

  ev_qrOpen --> ui_qrActive([QR code displayed])

  ui_qrActive --> ui_userAction{User action?}

  ui_userAction -->|Zoom QR| ui_productType{Product type?}
  ui_productType -->|Super Pass| ev_spQrZoom["super pass active qr zoomed screen opened"]
  ui_productType -->|M-Ticket| ev_mtQrZoom["mticket qr code zoomed"]
  ui_productType -->|Other| ev_genericQrZoom["simple qr validation zoom qr clicked"]

  ui_userAction -->|Help button| ev_qrHelp["qr validation screen help button clicked"]
  ui_userAction -->|View journey| ev_viewJourney["qr validation screen view journey button clicked"]

  ev_viewJourney --> ui_tripPlannerResult{Trip planner result?}
  ui_tripPlannerResult -->|Success| ev_tripSuccess["qr validation screen trip planner success"]
  ui_tripPlannerResult -->|Failed| ev_tripFailed["qr validation screen trip planner failed"]

  ui_userAction -->|Report problem| ev_reportProblem["report problem clicked v2"]

  ui_qrActive --> ui_durationCheck{Activation duration?}
  ui_durationCheck -->|Expired| ev_durationExpired["mpass activation duration expired dialog shown"]
  ev_durationExpired --> ui_expiredAction{User action?}
  ui_expiredAction -->|OK| ev_expiredOk["activation duration expired dialog ok clicked"]
  ui_expiredAction -->|View summary| ev_expiredSummary["activation duration expired dialog view summary clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_qrOpen,ev_spQrZoom,ev_mtQrZoom,ev_genericQrZoom,ev_qrHelp,ev_viewJourney,ev_tripSuccess,ev_tripFailed,ev_reportProblem,ev_durationExpired,ev_expiredOk,ev_expiredSummary event;
  class ui_qrInit,ui_qrActive,ui_userAction,ui_productType,ui_tripPlannerResult,ui_durationCheck,ui_expiredAction ui;
```

## Conductor Punch Notifications

```mermaid
flowchart TD
  ui_validation([Any validation type active]) --> ui_punchReceived{Punch notification?}

  ui_punchReceived -->|Super Pass| ev_spPunch["superPass trip punch"]
  ui_punchReceived -->|M-Ticket| ev_mtPunch["mTicket trip punch"]
  ui_punchReceived -->|Instant Ticket| ev_itPunch["instant ticket trip punched"]
  ui_punchReceived -->|Premium Bus| ev_pbPunch["premium reserve ticket trip punched"]
  ui_punchReceived -->|ONDC Bus| ev_ondcPunch["ondc ticket trip punched"]
  ui_punchReceived -->|ONDC Metro| ev_ondcMetroPunch["ondc metro ticket trip punched"]
  ui_punchReceived -->|Metro| ev_metroPunch["metro ticket trip punched"]
  ui_punchReceived -->|Quick Pay| ev_qpPunch["chalo pay ticket punched"]

  ev_spPunch --> ui_postValidation([Post-Validation Screen])
  ev_mtPunch --> ui_postValidation
  ev_itPunch --> ui_postValidation
  ev_pbPunch --> ui_postValidation
  ev_ondcPunch --> ev_ondcReceiptPayload["ondc ticket receipt payload"]
  ev_ondcReceiptPayload --> ui_postValidation
  ev_ondcMetroPunch --> ui_postValidation
  ev_metroPunch --> ui_postValidation
  ev_qpPunch --> ui_postValidation

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_spPunch,ev_mtPunch,ev_itPunch,ev_pbPunch,ev_ondcPunch,ev_ondcReceiptPayload,ev_ondcMetroPunch,ev_metroPunch,ev_qpPunch event;
  class ui_validation,ui_punchReceived,ui_postValidation ui;
```

## Post-Validation Success Screen

```mermaid
flowchart TD
  ui_validationSuccess([Validation successful]) --> ev_postValOpen["Post validation screen opened"]

  ev_postValOpen --> ui_userChoice{User action?}

  ui_userChoice -->|View receipt| ev_viewReceipt["view receipt post validation clicked"]
  ev_viewReceipt --> ext_receiptScreen[Receipt/History Screen]

  ui_userChoice -->|Exit/Done| ev_exit["view receipt post validation clicked"]
  ev_exit --> ui_exitFlow([Exit validation flow])

  ui_userChoice -->|Menu: View trip receipt| ev_menuReceipt["view trip receipt from menu clicked"]
  ev_menuReceipt --> ext_receiptScreen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_postValOpen,ev_viewReceipt,ev_exit,ev_menuReceipt event;
  class ui_validationSuccess,ui_userChoice,ui_exitFlow ui;
  class ext_receiptScreen external;
```

## Complete Validation Funnel Overview

Use this diagram to understand the high-level funnel structure across all validation types:

```mermaid
flowchart TD
  ev_start["start product validation"] --> ui_validationType{Validation type?}

  ui_validationType -->|BLE| ev_bleOpen["ble screen open"]
  ui_validationType -->|QR| ev_qrOpen["qr screen open"]

  ev_bleOpen --> ev_permCheck["BLE permission check on validation initialization"]
  ev_permCheck --> ui_permResult{Permission granted?}

  ui_permResult -->|Yes| ui_bleActive([BLE validation active])
  ui_permResult -->|No| ev_qrFallback["BLE denial qr option shown"]
  ev_qrFallback --> ev_qrOpen

  ev_qrOpen --> ui_qrActive([QR validation active])

  ui_bleActive --> ui_punchNotification{Punch received?}
  ui_qrActive --> ui_punchNotification

  ui_punchNotification -->|Yes| ev_punch["[product] trip punch"]
  ev_punch --> ev_postValOpen["Post validation screen opened"]

  ev_postValOpen --> ui_postAction{User action?}
  ui_postAction -->|View receipt| ev_viewReceipt["view receipt post validation clicked"]
  ui_postAction -->|Exit| ev_exit["view receipt post validation clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_start,ev_bleOpen,ev_qrOpen,ev_permCheck,ev_qrFallback,ev_punch,ev_postValOpen,ev_viewReceipt,ev_exit event;
  class ui_validationType,ui_permResult,ui_bleActive,ui_qrActive,ui_punchNotification,ui_postAction ui;
```

## Key Funnel Metrics to Track

### Permission Funnel (BLE validation)
1. `ble screen open` → Entry point
2. `BLE permission check on validation initialization` → Permission check
3. `BLE permission granted` / `BLE permission denied` → Permission decision
4. `BLE denial qr option shown` → Fallback trigger
5. `qr screen open` → Fallback completion

### Validation Success Funnel (Any product)
1. `start product validation` → Entry
2. `ble screen open` or `qr screen open` → Type selection
3. `[product] trip punch` → Validation success
4. `Post validation screen opened` → Confirmation
5. `view receipt post validation clicked` → Receipt view or exit

### TITO Tap-In Funnel
1. `ble screen open` (with validationFlowType = conductorOrUnifiedTapIn)
2. `tito tapIn notif recv on conductor flow` → Tap-in received
3. `ble validation ack data consumed` → Processed
4. `Post validation screen opened` → Success

### QR Validation Engagement Funnel
1. `qr screen open` → Entry
2. `simple qr validation zoom qr clicked` → Engagement
3. `qr validation screen view journey button clicked` → Journey interest
4. `qr validation screen trip planner success` → Journey fetched
5. `[product] trip punch` → Validation success

### Error/Fallback Funnel
1. `BLE permission denied` → Permission issue
2. `BLE denial qr option shown` → Fallback offered
3. `BLE denial use qr clicked` → Fallback accepted
4. `qr screen open` → Alternative path

### Product-Specific Funnels
Filter by `productType` property to analyze:
- Super Pass validation rates
- M-Ticket validation success
- Premium Bus validation patterns
- ONDC/Metro validation flows
- Quick Pay validation frequency

### Notification Delivery Analysis
Use `notificationDeliveryMedium` to segment:
- GCM (push notification) delivery rates
- BLE (direct Bluetooth) delivery rates
- Polling (API call) delivery rates
