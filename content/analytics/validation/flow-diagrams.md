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
  %%chalo:diagram-link ui_bleBranch -> title:BLE Validation Flow - Permission Check
  %%chalo:diagram-link ui_qrBranch -> title:QR Validation Flow
  %%chalo:diagram-link ui_vehicleBranch -> title:Vehicle-Based Validation (QR Scanner)
  ui_entry([User initiates validation]) --> ev_start["start product validation"]

  ev_start --> ui_checkProduct{Product found?}
  ui_checkProduct -->|No| ev_notFound["validation product not found"]

  ui_checkProduct -->|Yes| ui_validationType{Validation type?}

  ui_validationType -->|Vehicle-based (ONDC/Metro)| ui_vehicleBranch([Vehicle-Based Validation (QR Scanner)])
  ui_validationType -->|Static QR (Metro/ONDC)| ui_qrBranch([QR Validation Flow])
  ui_validationType -->|BLE-capable products| ui_bleGate{Bluetooth available + BLE validation enabled?}

  ui_bleGate -->|No, hardware unavailable| ev_hwNotAvailable["ble hardware not available on device"]
  ui_bleGate -->|No, BLE disabled| ui_qrBranch
  ev_hwNotAvailable --> ui_qrBranch

  ui_bleGate -->|Yes| ui_bleBranch([BLE Validation Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_start,ev_notFound,ev_hwNotAvailable event;
  class ui_entry,ui_checkProduct,ui_validationType,ui_bleGate,ui_bleBranch,ui_qrBranch,ui_vehicleBranch ui;
```

## BLE Validation Flow - Permission Check

```mermaid
flowchart TD
  %% Note: In code today, product fetch + permission check events are raised before `ble screen open`.
  %%chalo:diagram-link ui_qrFallback -> title:QR Validation Flow
  ui_bleInit([BLE validation component init]) --> ui_productData{Product data available?}

  ui_productData -->|Yes| ui_productType{Product type?}
  ui_productType -->|Super Pass| ev_spFetched["superPass fetched"]
  ui_productType -->|M-Ticket| ev_mtFetched["mTicket fetched"]
  ui_productType -->|Instant Ticket| ev_itFetched["instant ticket fetched"]
  ui_productType -->|Premium Bus| ev_pbFetched["premium reserve ticket fetched"]
  ui_productType -->|ONDC Bus| ev_ondcFetched["ondc ticket fetched"]
  ui_productType -->|ONDC Metro| ev_ondcMetroFetched["ondc metro ticket fetched"]
  ui_productType -->|Metro| ev_metroFetched["metro ticket fetched"]
  ui_productType -->|Quick Pay| ev_qpFetched["quick pay ticket fetched"]

  ev_spFetched --> ev_permCheck["BLE permission check on validation initialization"]
  ev_mtFetched --> ev_permCheck
  ev_itFetched --> ev_permCheck
  ev_pbFetched --> ev_permCheck
  ev_ondcFetched --> ev_permCheck
  ev_ondcMetroFetched --> ev_permCheck
  ev_metroFetched --> ev_permCheck
  ev_qpFetched --> ev_permCheck

  ui_productData -->|No| ev_bleOpen["ble screen open"]
  ev_permCheck --> ev_bleOpen
  ev_bleOpen --> ui_hasPermission{Has BLE permission?}

  ui_hasPermission -->|Yes, granted| ev_granted["BLE permission granted"]
  ev_granted --> ui_bleValidation([Active BLE Validation])

  ui_hasPermission -->|No, denied| ev_denied["BLE permission denied"]
  ev_denied --> ev_qrOptionShown["BLE denial qr option shown"]
  ev_qrOptionShown --> ev_rationaleScreen["BLE validation permission rationale screen opened"]

  ev_rationaleScreen --> ui_userChoice{User action?}
  ui_userChoice -->|Accept rationale| ev_rationaleAccepted["BLE permission rationale accepted"]
  ui_userChoice -->|Open settings| ev_settingsOpen["BLE validation permission settings screen opened"]
  ui_userChoice -->|Switch to QR| ui_qrFallback([QR Validation Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bleOpen,ev_spFetched,ev_mtFetched,ev_itFetched,ev_pbFetched,ev_ondcFetched,ev_ondcMetroFetched,ev_metroFetched,ev_qpFetched,ev_permCheck,ev_granted,ev_denied,ev_rationaleScreen,ev_rationaleAccepted,ev_settingsOpen,ev_qrOptionShown event;
  class ui_bleInit,ui_productData,ui_productType,ui_hasPermission,ui_userChoice,ui_bleValidation,ui_qrFallback ui;
```

## BLE Validation Flow - Active Validation

```mermaid
flowchart TD
  %%chalo:diagram-link ui_qrScreen -> title:QR Validation Flow
  ui_bleActive([BLE validation active]) --> ui_interactions{User interaction?}

  ui_interactions -->|View details| ev_bottomSheetClicked["ble bottom sheet clicked"]
  ui_interactions -->|Help button| ev_helpClicked["BLE validation help btn clicked"]
  ev_helpClicked --> ui_switchToQr([Switch to QR explainer])
  ui_switchToQr -->|Use QR| ev_openQrBtn["BLE validation open qr btn clicked"]
  ev_openQrBtn --> ui_qrScreen([QR Validation Flow])
  ui_switchToQr -->|Got it| ev_switchGotIt["BLE validation switch to qr got it clicked"]
  ev_switchGotIt --> ui_bleActive

  ui_bleActive --> ui_activationExpiry{Activation expired?}
  ui_activationExpiry -->|Yes| ev_expiredShown["mpass activation duration expired dialog shown"]
  ev_expiredShown --> ui_expiredAction{User action?}
  ui_expiredAction -->|OK| ev_expiredOk["activation duration expired dialog ok clicked"]
  ui_expiredAction -->|View summary| ev_expiredSummary["activation duration expired dialog view summary clicked"]

  ui_bleActive --> ui_validationResult{Validation result?}

  ui_validationResult -->|ACK received| ui_ackType{ACK data type?}
  ui_ackType -->|Valid conductor| ui_conductorPunch([Product trip punch event])
  ui_ackType -->|Valid TITO tap-in| ev_titoTapIn["tito tapIn notif recv on conductor flow"]
  ui_ackType -->|Invalid data| ev_invalidAck["invalid ble validation ack data received"]

  ui_conductorPunch --> ev_spPunch["superPass trip punch"]
  ui_conductorPunch --> ev_mtPunch["mTicket trip punch"]
  ui_conductorPunch --> ev_pbPunch["premium reserve ticket trip punched"]
  ui_conductorPunch --> ev_itPunch["instant ticket trip punched"]
  ui_conductorPunch --> ev_ondcPunch["ondc ticket trip punched"]
  ui_conductorPunch --> ev_ondcMetroPunch["ondc metro ticket trip punched"]
  ui_conductorPunch --> ev_metroPunch["metro ticket trip punched"]
  ui_conductorPunch --> ev_qpPunch["chalo pay ticket punched"]

  ev_spPunch --> ev_ackConsumed["ble validation ack data consumed"]
  ev_mtPunch --> ev_ackConsumed
  ev_pbPunch --> ev_ackConsumed
  ev_itPunch --> ev_ackConsumed
  ev_ondcPunch --> ev_ackConsumed
  ev_ondcMetroPunch --> ev_ackConsumed
  ev_metroPunch --> ev_ackConsumed
  ev_qpPunch --> ev_ackConsumed

  ev_titoTapIn --> ev_ackConsumed
  ev_invalidAck --> ev_ackConsumed

  ev_ackConsumed --> ui_syncResult{Sync success?}
  ui_syncResult -->|Success| ui_postValidation([Post-Validation Screen])
  ui_syncResult -->|Failed| ev_syncFailed["syncing post ble validation failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bottomSheetClicked,ev_helpClicked,ev_openQrBtn,ev_switchGotIt,ev_expiredShown,ev_expiredOk,ev_expiredSummary,ev_spPunch,ev_mtPunch,ev_pbPunch,ev_itPunch,ev_ondcPunch,ev_ondcMetroPunch,ev_metroPunch,ev_qpPunch,ev_titoTapIn,ev_invalidAck,ev_ackConsumed,ev_syncFailed event;
  class ui_bleActive,ui_interactions,ui_switchToQr,ui_activationExpiry,ui_expiredAction,ui_validationResult,ui_ackType,ui_conductorPunch,ui_syncResult,ui_qrScreen,ui_postValidation ui;
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
  %% Note: there is no "QR screen open" analytics event raised by the current QR validation component.
  ui_qrInit([QR validation screen init]) --> ui_qrActive([QR code displayed])

  ui_qrActive --> ui_userAction{User action?}

  ui_userAction -->|Zoom QR| ev_qrZoom["simple qr validation zoom qr clicked"]

  ui_userAction -->|Help button| ev_qrHelp["qr validation screen help button clicked"]
  ui_userAction -->|View journey| ev_viewJourney["qr validation screen view journey button clicked"]

  ev_viewJourney --> ui_tripPlannerResult{Trip planner result?}
  ui_tripPlannerResult -->|Success| ev_tripSuccess["qr validation screen trip planner success"]
  ui_tripPlannerResult -->|Failed| ev_tripFailed["qr validation screen trip planner failed"]

  ui_userAction -->|Report problem| ev_reportProblem["report problem clicked v2"]

  ui_qrActive --> ui_durationCheck{Activation duration?}
  ui_durationCheck -->|Expired| ui_expiredDialog([Activation duration expired dialog])
  ui_expiredDialog --> ui_expiredAction{User action?}
  ui_expiredAction -->|OK| ev_expiredOk["activation duration expired dialog ok clicked"]
  ui_expiredAction -->|View summary| ev_expiredSummary["activation duration expired dialog view summary clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_qrZoom,ev_qrHelp,ev_viewJourney,ev_tripSuccess,ev_tripFailed,ev_reportProblem,ev_expiredOk,ev_expiredSummary event;
  class ui_qrInit,ui_qrActive,ui_userAction,ui_tripPlannerResult,ui_durationCheck,ui_expiredDialog,ui_expiredAction ui;
```

## Vehicle-Based Validation (QR Scanner)

```mermaid
flowchart TD
  %% Note: QR scanner validation does not emit analytics events today.
  ui_scannerInit([QR scanner validation init]) --> ui_scannerReady([QR scanner ready])
  ui_scannerReady --> ui_userAction{User action?}
  ui_userAction -->|Validate details| ui_validate([Validate ONDC ticket + fetch receipt])
  ui_validate --> ui_result{Validation result?}
  ui_result -->|Success| ui_receipt([Receipt screen])
  ui_result -->|Failed| ui_error([Validation failed bottom sheet])
  ui_error --> ui_retry([Retry validate])
  ui_retry --> ui_validate

  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ui_scannerInit,ui_scannerReady,ui_userAction,ui_validate,ui_result,ui_receipt,ui_error,ui_retry ui;
```

## Conductor Punch Notifications

```mermaid
flowchart TD
  ui_validation([Any validation type active]) --> ui_punchReceived{Punch notification?}

  ui_punchReceived -->|Super Pass| ev_spPayload["superPass receipt payload"]
  ev_spPayload --> ev_spPunch["superPass trip punch"]

  ui_punchReceived -->|M-Ticket| ev_mtPayload["MTicketPunchedEvent receipt payload"]
  ev_mtPayload --> ev_mtPunch["mTicket trip punch"]

  ui_punchReceived -->|Instant Ticket| ev_itPayload["instantTicket receipt payload"]
  ev_itPayload --> ev_itPunch["instant ticket trip punched"]

  ui_punchReceived -->|Premium Bus| ev_pbPayload["premium reserve ticket receipt payload"]
  ev_pbPayload --> ev_pbPunch["premium reserve ticket trip punched"]

  ui_punchReceived -->|ONDC Bus| ev_ondcPayload["ondc ticket receipt payload"]
  ev_ondcPayload --> ev_ondcPunch["ondc ticket trip punched"]

  ui_punchReceived -->|ONDC Metro| ev_ondcMetroPunch["ondc metro ticket trip punched"]
  ui_punchReceived -->|Metro| ev_metroPunch["metro ticket trip punched"]

  ui_punchReceived -->|Quick Pay| ev_qpPayload["quickpay receipt payload"]
  ev_qpPayload --> ev_qpPunch["chalo pay ticket punched"]

  ev_spPunch --> ui_postValidation([Post-Validation Screen])
  ev_mtPunch --> ui_postValidation
  ev_itPunch --> ui_postValidation
  ev_pbPunch --> ui_postValidation
  ev_ondcPunch --> ui_postValidation
  ev_ondcMetroPunch --> ui_postValidation
  ev_metroPunch --> ui_postValidation
  ev_qpPunch --> ui_postValidation

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_spPayload,ev_spPunch,ev_mtPayload,ev_mtPunch,ev_itPayload,ev_itPunch,ev_pbPayload,ev_pbPunch,ev_ondcPayload,ev_ondcPunch,ev_ondcMetroPunch,ev_metroPunch,ev_qpPayload,ev_qpPunch event;
  class ui_validation,ui_punchReceived,ui_postValidation ui;
```

## Post-Validation Success Screen

```mermaid
flowchart TD
  ui_validationSuccess([Post-validation screen / bottom sheet]) --> ui_userChoice{User action?}

  ui_userChoice -->|View receipt| ev_viewReceipt["view receipt post validation clicked"]
  ev_viewReceipt --> ext_receiptScreen[Receipt/History Screen]

  ui_userChoice -->|Exit/Done| ev_exit["view receipt post validation clicked"]
  ev_exit --> ui_exitFlow([Exit validation flow])

  ui_userChoice -->|Menu: View trip receipt| ev_menuReceipt["view trip receipt from menu clicked"]
  ev_menuReceipt --> ext_receiptScreen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_viewReceipt,ev_exit,ev_menuReceipt event;
  class ui_validationSuccess,ui_userChoice,ui_exitFlow ui;
  class ext_receiptScreen external;
```

## Complete Validation Funnel Overview

Use this diagram to understand the high-level funnel structure across all validation types:

```mermaid
flowchart TD
  %%chalo:diagram-link ui_bleActive -> title:BLE Validation Flow - Active Validation
  %%chalo:diagram-link ui_qrActive -> title:QR Validation Flow
  %%chalo:diagram-link ui_vehicleFlow -> title:Vehicle-Based Validation (QR Scanner)
  %%chalo:diagram-link ui_postValOpen -> title:Post-Validation Success Screen
  ev_start["start product validation"] --> ui_validationType{Validation type?}

  ui_validationType -->|Vehicle-based| ui_vehicleFlow([QR scanner validation])
  ui_validationType -->|Static QR| ui_qrActive([QR validation screen])
  ui_validationType -->|BLE-capable| ui_bleGate{Bluetooth available + BLE validation enabled?}

  ui_bleGate -->|No, hardware unavailable| ev_hwNotAvailable["ble hardware not available on device"]
  ui_bleGate -->|No, BLE disabled| ui_qrActive
  ev_hwNotAvailable --> ui_qrActive

  %% In code today, `BLE permission check...` is raised before `ble screen open`.
  ui_bleGate -->|Yes| ev_permCheck["BLE permission check on validation initialization"]
  ev_permCheck --> ev_bleOpen["ble screen open"]
  ev_bleOpen --> ui_permResult{Permission granted?}

  ui_permResult -->|Yes| ui_bleActive([BLE validation active])
  ui_permResult -->|No| ev_qrFallback["BLE denial qr option shown"]
  ev_qrFallback --> ui_qrActive

  ui_bleActive --> ui_punchNotification{Punch received?}
  ui_qrActive --> ui_punchNotification

  ui_punchNotification -->|Yes| ui_punch([Product trip punch event])
  ui_punch --> ui_postValOpen([Post-validation screen / bottom sheet])

  ui_postValOpen --> ui_postAction{User action?}
  ui_postAction -->|View receipt| ev_viewReceipt["view receipt post validation clicked"]
  ui_postAction -->|Exit| ev_exit["view receipt post validation clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_start,ev_bleOpen,ev_permCheck,ev_qrFallback,ev_hwNotAvailable,ev_viewReceipt,ev_exit event;
  class ui_validationType,ui_bleGate,ui_permResult,ui_bleActive,ui_qrActive,ui_vehicleFlow,ui_punchNotification,ui_punch,ui_postValOpen,ui_postAction ui;
```

## Key Funnel Metrics to Track

### Permission Funnel (BLE validation)
1. `ble screen open` → Entry point
2. `BLE permission check on validation initialization` → Permission check (raised before `ble screen open` today)
3. `BLE permission granted` / `BLE permission denied` → Permission decision
4. `BLE denial qr option shown` → Fallback trigger
5. (No QR screen open event today) → QR fallback screen shown

### Validation Success Funnel (Any product)
1. `start product validation` → Entry
2. `ble screen open` or (no QR screen open event) → Type selection
3. `[product] trip punch` → Validation success
4. Post-validation screen / bottom sheet (no explicit event today)
5. `view receipt post validation clicked` → Receipt view or exit

### TITO Tap-In Funnel
1. `ble screen open` (with validationFlowType = conductorOrUnifiedTapIn)
2. `tito tapIn notif recv on conductor flow` → Tap-in received
3. `ble validation ack data consumed` → Processed
4. Post-validation screen / bottom sheet (no explicit event today)

### QR Validation Engagement Funnel
1. (No QR screen open event today) → Entry
2. `simple qr validation zoom qr clicked` → Engagement
3. `qr validation screen view journey button clicked` → Journey interest
4. `qr validation screen trip planner success` → Journey fetched
5. `[product] trip punch` → Validation success

### Error/Fallback Funnel
1. `BLE permission denied` → Permission issue
2. `BLE denial qr option shown` → Fallback offered
3. `BLE validation permission settings screen opened` → Settings attempt
4. `ble hardware not available on device` → Hardware fallback
5. (No QR screen open event today) → Alternative path

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
