# mTicket purchase analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The mTicket flow starts from route selection and goes through payment to validation.
- Validation can happen via BLE (Bluetooth) or QR code depending on device capabilities and user choice.
- TITO (Tap-In/Tap-Out) events are specific to conductor-based validation flows.

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

## Complete Purchase Flow (Main Funnel)

Use this diagram to build the primary mTicket purchase funnel from selection to validation.

```mermaid
flowchart TD
  ui_start([User starts mTicket purchase]) --> ev_bookScreenOpen["book mticket screen opened"]

  ev_bookScreenOpen --> ev_freeRidesInfo["free rides info clicked"]
  ev_bookScreenOpen --> ev_invite["invite"]

  ev_bookScreenOpen --> ev_routeSelected["mticket route selected"]
  ev_routeSelected -->|stopType=FROM| ev_stopSelectedFrom["mticket stop selected"]
  ev_stopSelectedFrom -->|stopType=TO| ev_stopSelectedTo["mticket stop selected"]
  ev_stopSelectedTo --> ev_selectionScreenOpen["mticket selection screen opened"]

  ev_selectionScreenOpen --> ev_fareFetched["mticket fare fetched"]
  ev_fareFetched -->|response=true| ev_payButtonClicked["mticket pay button clicked"]
  ev_fareFetched -->|response=false| ui_retryFare([Retry / error])

  ev_payButtonClicked --> ev_bookingResponse["mticket booking response received"]
  ev_bookingResponse -->|response=true| external_checkout[Checkout module payment flow]
  ev_bookingResponse -->|response=false| ui_orderCreateFailed([Order creation failed])

  external_checkout --> ev_paymentSuccess["mticket payment success"]
  external_checkout --> ev_paymentFailed["mticket payment failed"]

  ev_paymentSuccess --> ev_postPaymentDetails["post payment mticket details fetched"]
  ev_postPaymentDetails --> ev_activateScreenOpen["mticket activate screen opened"]
  ev_activateScreenOpen --> ev_activated["mticket activated"]
  ev_activated --> ui_validationFlow([Validation flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bookScreenOpen,ev_freeRidesInfo,ev_invite,ev_routeSelected,ev_stopSelectedFrom,ev_stopSelectedTo,ev_selectionScreenOpen,ev_fareFetched,ev_payButtonClicked,ev_bookingResponse,ev_paymentSuccess,ev_paymentFailed,ev_postPaymentDetails,ev_activateScreenOpen,ev_activated event;
  class ui_start,ui_retryFare,ui_orderCreateFailed,ui_validationFlow ui;
  class external_checkout external;
```

## Route & Stop Selection Flow

```mermaid
flowchart TD
  ev_bookScreenOpen["book mticket screen opened"] --> ui_routeClick([Route option clicked])
  ui_routeClick --> ev_routeSelected["mticket route selected"]

  ev_routeSelected --> ui_fromStopClick([From stop clicked])
  ui_fromStopClick -->|stopType=FROM| ev_stopSelectedFrom["mticket stop selected"]

  ev_stopSelectedFrom --> ui_toStopClick([To stop clicked])
  ui_toStopClick -->|stopType=TO| ev_stopSelectedTo["mticket stop selected"]

  ev_stopSelectedTo --> ui_nextClicked([Next clicked])
  ui_nextClicked --> ev_selectionScreenOpen["mticket selection screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bookScreenOpen,ev_routeSelected,ev_stopSelectedFrom,ev_stopSelectedTo,ev_selectionScreenOpen event;
  class ui_routeClick,ui_fromStopClick,ui_toStopClick,ui_nextClicked ui;
```

## Passenger Selection & Order Creation Flow

```mermaid
flowchart TD
  ev_selectionScreenOpen["mticket selection screen opened"] --> ui_fetchFare([Fetch fare API])
  ui_fetchFare --> ev_fareFetched["mticket fare fetched"]

  ev_fareFetched -->|success| ui_selectPassengers([Select passenger counts])
  ev_fareFetched -->|failure| ui_retryFare([Retry fare fetch])

  ui_selectPassengers --> ui_payClicked([Pay clicked])

  ui_payClicked -->|T&C not seen| ui_tncDialog([T&C dialog shown])
  ui_tncDialog -->|accept| ui_proceed([Proceed])
  ui_tncDialog -->|decline| ev_cancelTerms["cancel terms"]
  ui_tncDialog -->|dismiss| ev_termsCancel["terms cancel"]

  ui_payClicked -->|T&C already seen| ui_proceed
  ui_proceed --> ev_payButtonClicked["mticket pay button clicked"]

  ev_payButtonClicked --> ui_createOrder([Create order API])
  ui_createOrder --> ev_bookingResponse["mticket booking response received"]

  ev_bookingResponse -->|response=true| external_checkout[Checkout module payment flow]
  ev_bookingResponse -->|response=false| ui_orderError([Error shown])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_selectionScreenOpen,ev_fareFetched,ev_cancelTerms,ev_termsCancel,ev_payButtonClicked,ev_bookingResponse event;
  class ui_fetchFare,ui_selectPassengers,ui_retryFare,ui_payClicked,ui_tncDialog,ui_proceed,ui_createOrder,ui_orderError ui;
  class external_checkout external;
```

## Fare Changed Dialog Flow

```mermaid
flowchart TD
  ev_fareFetched["mticket fare fetched"] --> ui_checkChange([Check if fare changed])
  ui_checkChange -->|fare changed| ev_fareChangedDialog["recent product error dialog rendered mTicket"]
  ev_fareChangedDialog --> ui_dismissDialog([Dialog dismissed])
  ui_dismissDialog --> ui_continue([Continue with new fare])
  ui_checkChange -->|no change| ui_continue

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_fareFetched,ev_fareChangedDialog event;
  class ui_checkChange,ui_dismissDialog,ui_continue ui;
```

## Payment Flow (Checkout Module)

```mermaid
flowchart TD
  external_checkout[Checkout module payment flow] --> ev_paymentSuccess["mticket payment success"]
  external_checkout --> ev_paymentFailed["mticket payment failed"]

  ev_paymentSuccess --> ev_postPaymentDetails["post payment mticket details fetched"]
  ev_paymentFailed --> ui_retryOrCancel([Retry / cancel])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_paymentSuccess,ev_paymentFailed,ev_postPaymentDetails event;
  class ui_retryOrCancel ui;
  class external_checkout external;
```

## Activation Flow

```mermaid
flowchart TD
  ui_postPayment([Post payment screen]) --> ui_navigateActivation([Navigate to activation])
  ui_navigateActivation --> ev_activateScreenOpen["mticket activate screen opened"]

  ev_activateScreenOpen --> ui_fetchTicket([Fetch ticket data])
  ui_fetchTicket --> ev_ticketFetched["mticket fetched"]
  ev_ticketFetched --> ui_preActivationChecks([Pre-activation checks])

  ui_preActivationChecks -->|success| ui_activationConfirmDialog([Activation confirmation dialog])
  ui_activationConfirmDialog --> ui_confirmActivate([Confirm activate])
  ui_confirmActivate --> ev_activated["mticket activated"]

  ui_preActivationChecks -->|failure| ui_activationError([Error dialog])

  ev_activated --> ui_validationFlow([Validation flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_activateScreenOpen,ev_ticketFetched,ev_activated event;
  class ui_postPayment,ui_navigateActivation,ui_fetchTicket,ui_preActivationChecks,ui_activationConfirmDialog,ui_confirmActivate,ui_activationError,ui_validationFlow ui;
```

## Validation Flow - BLE vs QR Decision

```mermaid
flowchart TD
  ev_activated["mticket activated"] --> ev_blePermCheck["ble permission check on initialization"]

  ev_blePermCheck -->|granted| ui_bleFlow([BLE validation flow])
  ev_blePermCheck -->|denied| ui_qrOption([QR option shown])

  ui_qrOption --> ev_bleRationaleOpen["ble permissions rationale screen opened"]
  ev_bleRationaleOpen -->|accept| ev_bleRationaleAccepted["ble permission rationale accepted"]
  ev_bleRationaleAccepted --> ui_requestPerm([Request permission again])
  ui_requestPerm -->|granted| ev_bleGranted["ble permission granted"]
  ui_requestPerm -->|denied| ev_bleDenied["ble permission denied"]

  ev_bleDenied --> ev_bleSettingsOpen["ble permissions settings opened"]

  ev_bleGranted --> ui_bleFlow
  ev_bleDenied --> ev_bleDenialQrShown["ble denial qr option shown"]
  ev_bleDenialQrShown --> ev_bleDenialUseQrClicked["ble denial use qr clicked"]
  ev_bleDenialUseQrClicked --> ui_qrFlow([QR validation flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_activated,ev_blePermCheck,ev_bleRationaleOpen,ev_bleRationaleAccepted,ev_bleGranted,ev_bleDenied,ev_bleSettingsOpen,ev_bleDenialQrShown,ev_bleDenialUseQrClicked event;
  class ui_bleFlow,ui_qrOption,ui_requestPerm,ui_qrFlow ui;
```

## BLE Validation Flow

```mermaid
flowchart TD
  ui_bleFlow([BLE validation flow]) --> ev_bleScreenOpen["ble screen open"]
  ev_bleScreenOpen --> ui_waitValidation([Wait for conductor validation])

  ui_waitValidation --> ui_titoFlow([TITO flow, if applicable])
  ui_waitValidation --> ui_conductorPunch([Conductor punches ticket])

  ev_bleScreenOpen --> ev_bleHelp["ble validation help btn clicked"]
  ev_bleScreenOpen --> ev_bleBottomSheet["ble bottom sheet clicked"]
  ev_bleScreenOpen --> ev_bleSwitchToQr["ble switch to qr got it clicked"]
  ev_bleSwitchToQr --> ev_bleOpenQr["ble open qr btn clicked"]
  ev_bleOpenQr --> ui_qrFlow([QR validation flow])

  ui_conductorPunch --> ev_tripPunch["mTicket trip punch"]
  ev_tripPunch --> ev_postValidationOpen["post validation screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bleScreenOpen,ev_bleHelp,ev_bleBottomSheet,ev_bleSwitchToQr,ev_bleOpenQr,ev_tripPunch,ev_postValidationOpen event;
  class ui_bleFlow,ui_waitValidation,ui_titoFlow,ui_conductorPunch,ui_qrFlow ui;
```

## QR Validation Flow

```mermaid
flowchart TD
  ui_qrFlow([QR validation flow]) --> ui_showQr([QR code displayed])
  ui_showQr --> ev_qrZoomed["mticket qr code zoomed"]
  ev_qrZoomed --> ev_simpleQrZoomClicked["simple qr validation zoom clicked"]

  ui_showQr --> ui_conductorScan([Conductor scans QR])
  ui_conductorScan --> ev_tripPunch["mTicket trip punch"]
  ev_tripPunch --> ev_postValidationOpen["post validation screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_qrZoomed,ev_simpleQrZoomClicked,ev_tripPunch,ev_postValidationOpen event;
  class ui_qrFlow,ui_showQr,ui_conductorScan ui;
```

## TITO (Tap-In/Tap-Out) Validation Flow

```mermaid
flowchart TD
  ev_activated["mticket activated"] --> ui_checkKeys([Check TITO encryption keys])

  ui_checkKeys -->|available| ev_keysAvailable["tito encryption keys available on mticket activation"]
  ui_checkKeys -->|not available| ev_keysNotAvailable["tito encryption keys not available on mticket activation"]

  ev_keysNotAvailable --> ui_fetchKeys([Fetch encryption keys])
  ui_fetchKeys -->|success| ev_keysFetched["tito encryption keys fetch success on mticket activation"]
  ui_fetchKeys -->|failed| ev_keysFetchFailed["tito encryption keys fetch failed on mticket activation"]

  ev_keysFetchFailed --> ev_keysRetry["tito encryption keys fetch retry clicked on mticket activation"]
  ev_keysFetchFailed --> ev_keysCancel["tito encryption keys fetch cancel clicked on mticket activation"]
  ev_keysRetry --> ui_fetchKeys

  ev_keysAvailable --> ui_waitTapIn([Wait for tap-in])
  ev_keysFetched --> ui_waitTapIn

  ui_waitTapIn --> ui_polling([Polling])
  ui_waitTapIn --> ui_notification([Push notification received])

  ui_notification --> ev_tapInNotif["tito tap in notification received on conductor validation"]
  ev_tapInNotif --> ev_pollingStopped["tito tap in polling stopped due to notification received"]

  ui_polling -->|valid data| ev_validTapIn["valid tito tap in data received in polling"]
  ui_polling -->|invalid data| ev_invalidTapIn["invalid tito tap in data received in polling"]

  ev_validTapIn --> ev_postValidationOpen["post validation screen opened"]
  ev_tapInNotif --> ev_postValidationOpen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_activated,ev_keysAvailable,ev_keysNotAvailable,ev_keysFetched,ev_keysFetchFailed,ev_keysRetry,ev_keysCancel,ev_tapInNotif,ev_pollingStopped,ev_validTapIn,ev_invalidTapIn,ev_postValidationOpen event;
  class ui_checkKeys,ui_fetchKeys,ui_waitTapIn,ui_polling,ui_notification ui;
```

## BLE Validation Acknowledgment Flow

```mermaid
flowchart TD
  ui_bleValidation([BLE validation in progress]) --> ui_receiveAck([BLE ack data received])

  ui_receiveAck -->|valid conductor receipt| ev_tripPunch["mTicket trip punch"]
  ui_receiveAck -->|valid TITO tap-in| ev_tapInNotif["tito tap in notification received on conductor validation"]
  ui_receiveAck -->|invalid data| ev_invalidAck["invalid ble validation ack data received"]

  ev_tripPunch --> ev_receiptPayload["MTicketPunchedEvent receipt payload"]
  ev_receiptPayload --> ev_ackConsumed["ble validation ack data consumed"]
  ev_tapInNotif --> ev_ackConsumed

  ev_ackConsumed --> ui_syncData([Sync validation data])
  ui_syncData -->|success| ev_postValidationOpen["post validation screen opened"]
  ui_syncData -->|failure| ev_syncFailed["syncing post ble validation failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_tripPunch,ev_receiptPayload,ev_tapInNotif,ev_invalidAck,ev_ackConsumed,ev_postValidationOpen,ev_syncFailed event;
  class ui_bleValidation,ui_receiveAck,ui_syncData ui;
```

## Post Validation Flow

```mermaid
flowchart TD
  ev_postValidationOpen["post validation screen opened"] --> ui_viewOptions([User options])

  ui_viewOptions --> ev_viewReceipt["view receipt post validation clicked"]
  ui_viewOptions --> ev_exitValidation["exit post validation clicked"]
  ui_viewOptions --> ev_menuReceipt["view trip receipt from menu clicked"]

  ev_viewReceipt --> ui_receiptScreen([Trip receipt screen])
  ev_menuReceipt --> ui_receiptScreen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_postValidationOpen,ev_viewReceipt,ev_exitValidation,ev_menuReceipt event;
  class ui_viewOptions,ui_receiptScreen ui;
```

## Back Press Confirmation Flow (During Validation)

```mermaid
flowchart TD
  ui_validationInProgress([Validation in progress]) --> ui_backPress([Back pressed])
  ui_backPress --> ev_confirmShown["confirmation on back press shown"]

  ev_confirmShown -->|yes| ev_confirmYes["confirmation on back press yes clicked"]
  ev_confirmShown -->|no| ev_confirmNo["confirmation on back press no clicked"]

  ev_confirmYes --> ui_exitValidation([Exit validation])
  ev_confirmNo --> ui_continueValidation([Continue validation])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_confirmShown,ev_confirmYes,ev_confirmNo event;
  class ui_validationInProgress,ui_backPress,ui_exitValidation,ui_continueValidation ui;
```

## Entry Points to mTicket Purchase

```mermaid
flowchart TD
  ui_home([Home screen]) --> ev_recentProductClicked["recent product mticket clicked"]
  ev_recentProductClicked --> ev_activateScreenOpen["mticket activate screen opened"]

  ui_routeDetails([Route details screen]) --> ev_hookRouteDetails["mticket hook route details rendered"]
  ev_hookRouteDetails --> ev_bookScreenOpen["book mticket screen opened"]

  ui_tripPlanner([Trip planner details]) --> ev_hookTripDetails["mticket hook trip details rendered"]
  ev_hookTripDetails --> ev_bookScreenOpen

  ui_myTickets([My tickets screen]) --> ui_ticketClicked([Existing mTicket selected])
  ui_ticketClicked --> ev_summaryDetailsOpen["mticket summary details screen opened"]
  ev_summaryDetailsOpen --> ev_activateScreenOpen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_recentProductClicked,ev_activateScreenOpen,ev_hookRouteDetails,ev_bookScreenOpen,ev_hookTripDetails,ev_summaryDetailsOpen event;
  class ui_home,ui_routeDetails,ui_tripPlanner,ui_myTickets,ui_ticketClicked ui;
```

## Report Problem Flow (Global)

```mermaid
flowchart TD
  ui_anyScreen([Any mTicket screen]) --> ui_reportClick([Report problem clicked])
  ui_reportClick --> ev_reportProblem["report problem clicked v2"]
  ev_reportProblem --> ui_reportScreen([Report problem screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_reportProblem event;
  class ui_anyScreen,ui_reportClick,ui_reportScreen ui;
```
