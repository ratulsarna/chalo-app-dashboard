# ONDC Bus Ticket Booking & Validation Analytics Event Flow Diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- All ONDC bus events include `isOndcTicketOrder: true` as a common property to filter this flow family.
- The checkout payment processing UI lives in the Checkout module; this doc only shows ONDC-specific instrumentation.
- ONDC bus tickets use QR-based validation only. Conductor scans the QR code and ticket punch receipt is delivered via push notification.

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

## Entry: Route Search & Discovery

Use `stop based stop selection screen route result success` as the primary entry point for ONDC bus booking funnel.

```mermaid
flowchart TD
  ui_search([User selects origin/destination stops]) --> ev_searchSuccess["stop based stop selection screen route result success"]
  ui_search --> ev_searchFailure["stop based stop selection screen route result failure"]

  ev_searchSuccess --> ui_fareDetails([Fare Details Screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_searchSuccess,ev_searchFailure event;
  class ui_search,ui_fareDetails ui;
```

## Funnel: Fare Details → Order Creation → Payment → Success

```mermaid
flowchart TD
  ui_fareDetails([Fare Details Screen]) --> ev_fareScreenOpen["find my ticket fare fare details screen opened"]
  ev_fareScreenOpen --> ev_tncClicked["fare details final amount bottomsheet tnc clicked"]
  ev_fareScreenOpen --> ev_continueClicked["fare details final amount bottomsheet continue click"]
  ev_continueClicked --> ev_payBtnClicked["find my ticket fare fare details pay button clicked"]

  ev_payBtnClicked --> ui_confirm([Confirmation Screen])
  ui_confirm --> ev_confirmScreenOpen["confirm screen opened"]
  ev_confirmScreenOpen --> ev_confirmPayBtn["pay button clicked"]

  ev_confirmPayBtn --> ev_fareFetchSuccess["confirm final fare fetch success"]
  ev_confirmPayBtn --> ev_fareFetchFailed["confirm final fare fetch failed"]

  ev_fareFetchSuccess --> ev_orderSuccess["order api success"]
  ev_fareFetchSuccess --> ev_orderFailure["order api failure"]

  ev_orderFailure --> ev_retry["retry button clicked"]
  ev_retry --> ev_confirmPayBtn

  ev_orderSuccess --> external_checkout[Checkout Payment Flow]
  external_checkout --> ev_paymentSuccess["ondc ticket payment successful"]
  external_checkout --> ev_paymentFailed["ondc ticket payment failed"]

  ev_paymentSuccess --> ev_bookingConfirmed["ondc booking confirmed"]
  ev_bookingConfirmed --> ui_ticketDisplay([Ticket Display Screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_fareScreenOpen,ev_tncClicked,ev_continueClicked,ev_payBtnClicked,ev_confirmScreenOpen,ev_confirmPayBtn,ev_fareFetchSuccess,ev_fareFetchFailed,ev_orderSuccess,ev_orderFailure,ev_retry,ev_paymentSuccess,ev_paymentFailed,ev_bookingConfirmed event;
  class ui_fareDetails,ui_confirm,ui_ticketDisplay ui;
  class external_checkout external;
```

## Funnel: Ticket Display → QR Validation

```mermaid
flowchart TD
  ui_ticketList([My Tickets / History]) --> ev_ticketFetched["ondc ticket fetched"]
  ev_ticketFetched --> ui_ticketDisplay([Ticket Display Screen])
  ui_ticketDisplay --> ev_qrScreenOpen["qr screen open"]
  ev_qrScreenOpen --> ui_qrValidation([QR Validation Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_ticketFetched,ev_qrScreenOpen event;
  class ui_ticketList,ui_ticketDisplay,ui_qrValidation ui;
```

## Funnel: QR Validation → Punch Receipt

```mermaid
flowchart TD
  ev_qrScreenOpen["qr screen open"] --> ev_qrZoom["simple qr validation zoom qr clicked"]
  ev_qrScreenOpen --> ui_conductorScans([Conductor scans QR])
  ui_conductorScans --> ui_punchNotification([Push notification received])
  ui_punchNotification --> ev_tripPunched["ondc ticket trip punched"]
  ev_tripPunched --> ev_viewReceipt["ondc ticket view receipt clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_qrScreenOpen,ev_qrZoom,ev_tripPunched,ev_viewReceipt event;
  class ui_conductorScans,ui_punchNotification ui;
```

## Funnel: Receipt & Menu Actions

```mermaid
flowchart TD
  ui_ticketScreen([Ticket/Validation Screen]) --> ev_menuReceiptClick["view trip receipt from menu clicked"]
  ui_ticketScreen --> ev_viewReceipt["ondc ticket view receipt clicked"]

  ev_viewReceipt --> ui_receiptScreen([Receipt Display])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_menuReceiptClick,ev_viewReceipt event;
  class ui_ticketScreen,ui_receiptScreen ui;
```

## Global Events (Can Fire From Multiple Locations)

```mermaid
flowchart TD
  ui_anyScreen([Any Validation Screen]) --> ev_backShown["exit chalo pay confirmation shown"]
  ev_backShown --> ev_backYes["exit chalo pay confirmation yes clicked"]
  ev_backShown --> ev_backNo["exit chalo pay confirmation no clicked"]

  ui_anyScreen --> ev_reportProblem["report problem clicked v2"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_backShown,ev_backYes,ev_backNo,ev_reportProblem event;
  class ui_anyScreen ui;
```

## Error Events (Side Paths)

```mermaid
flowchart TD
  ui_fareDetails([Fare Details Screen]) --> ev_fareFetchFailure["ondc ticket fare fetch failure"]
  ui_payment([Payment Flow]) --> ev_historyFailure["post payment history call use case failure"]

  ev_fareFetchFailure --> ui_errorState([Error State])
  ev_historyFailure --> ui_retryOrManualRefresh([Retry or Manual Refresh])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_fareFetchFailure,ev_historyFailure event;
  class ui_fareDetails,ui_payment,ui_errorState,ui_retryOrManualRefresh ui;
```

## Complete End-to-End Funnel Summary

```mermaid
flowchart TD
  A["stop based stop selection screen route result success"] --> B["find my ticket fare fare details screen opened"]
  B --> C["find my ticket fare fare details pay button clicked"]
  C --> D["order api success"]
  D --> E["ondc ticket payment successful"]
  E --> F["ondc booking confirmed"]
  F --> G["ondc ticket fetched"]
  G --> H["qr screen open"]
  H --> I([Conductor scans QR])
  I --> J["ondc ticket trip punched"]
  J --> K["ondc ticket view receipt clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class A,B,C,D,E,F,G,H,J,K event;
  class I ui;
```

## Key Analytics Insights for Funnel Building

### Primary Conversion Funnel
1. **Route Search Success** → `stop based stop selection screen route result success`
2. **Fare Details View** → `find my ticket fare fare details screen opened`
3. **Payment Intent** → `find my ticket fare fare details pay button clicked`
4. **Order Created** → `order api success`
5. **Payment Success** → `ondc ticket payment successful`
6. **Booking Confirmed** → `ondc booking confirmed`
7. **Ticket Fetched** → `ondc ticket fetched`
8. **QR Validation Started** → `qr screen open`
9. **Trip Punched** → `ondc ticket trip punched` (via push notification after conductor scans QR)
10. **Receipt Viewed** → `ondc ticket view receipt clicked`

### Drop-off Analysis Points
- **Route Search Failure**: `stop based stop selection screen route result failure`
- **Fare Fetch Failure**: `ondc ticket fare fetch failure`
- **Order Creation Failure**: `order api failure`
- **Payment Failure**: `ondc ticket payment failed`
- **Post-Payment Sync Failure**: `post payment history call use case failure`

### QR Validation Flow
ONDC bus tickets use QR-based validation only:
- **QR Screen Opened**: `qr screen open`
- **QR Zoom for Better Scanning**: `simple qr validation zoom qr clicked`
- **Punch Received via Push Notification**: `ondc ticket trip punched`
- **Receipt Viewed**: `ondc ticket view receipt clicked`

### Common Filter Property
All events include `isOndcTicketOrder: true` - use this to create ONDC-specific dashboards and filter out other ticket types (mticket, metro, premium bus, etc.).
