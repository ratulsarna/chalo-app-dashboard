# ONDC Bus Ticket Booking & Validation Analytics Event Flow Diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- `isOndcTicketOrder: true` is added by the ONDC validation analytics manager (ticket fetched/validation/receipt/report-problem). Booking and payment events do not include it.
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

Use `stop based stop selection screen route result success` as the primary entry point for ONDC bus booking; multi-route selections also emit `stop based stop selection screen route result item click`.

```mermaid
flowchart TD
  %%chalo:diagram-link ev_routeItemClick -> title:Funnel: Fare Details → Booking → Payment → Success
  ui_search([Stop-based route search screen]) --> ui_results{Route search result}

  ui_results -->|Success (routes available)| ev_searchSuccess["stop based stop selection screen route result success"]
  ui_results -->|No routes| ev_searchSuccess
  ui_results -->|Failure| ev_searchFailure["stop based stop selection screen route result failure"]

  ev_searchSuccess -->|Single route| ui_fareDetails([Fare Details Screen])
  ev_searchSuccess -->|Multiple routes| ui_routes([Route list bottom sheet])
  ui_routes --> ev_routeItemClick["stop based stop selection screen route result item click"]
  ev_routeItemClick --> ui_fareDetails

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_searchSuccess,ev_searchFailure,ev_routeItemClick event;
  class ui_search,ui_results,ui_routes,ui_fareDetails ui;
```

## Funnel: Fare Details → Booking → Payment → Success

```mermaid
flowchart TD
  %%chalo:diagram-link ev_bookingConfirmed -> title:Funnel: Ticket Display → QR Validation
  ui_fareDetails([Fare Details Screen]) --> ev_fareScreenOpen["find my ticket fare fare details screen opened"]
  ev_fareScreenOpen --> ev_payBtnClicked["find my ticket fare fare details pay button clicked"]
  ev_payBtnClicked --> ui_createBooking([Create ONDC booking])
  ui_createBooking --> ui_finalFare([Final fare bottom sheet])
  ui_finalFare --> ev_tncClicked["fare details final amount bottomsheet tnc clicked"]
  ui_finalFare --> ev_continueClicked["fare details final amount bottomsheet continue click"]
  ev_continueClicked --> ui_createOrder([Create order])

  ui_createOrder --> external_checkout[Checkout Payment Flow]
  external_checkout --> ev_paymentSuccess["ondc ticket payment successful"]
  external_checkout --> ev_paymentFailed["ondc ticket payment failed"]

  %%chalo:diagram-link external_checkout -> flow:payment

  ev_paymentSuccess --> ev_bookingConfirmed["ondc booking confirmed"]
  ev_bookingConfirmed --> ui_ticketDisplay([Ticket Display Screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_fareScreenOpen,ev_tncClicked,ev_continueClicked,ev_payBtnClicked,ev_paymentSuccess,ev_paymentFailed,ev_bookingConfirmed event;
  class ui_fareDetails,ui_createBooking,ui_finalFare,ui_createOrder,ui_ticketDisplay ui;
  class external_checkout external;
```

## Funnel: Ticket Display → QR Validation

```mermaid
flowchart TD
  %%chalo:diagram-link ui_qrValidation -> title:Funnel: QR Validation → Punch Receipt
  ui_ticketList([My Tickets / History]) --> ev_ticketFetched["ondc ticket fetched"]
  ev_ticketFetched --> ui_ticketDisplay([Ticket Display Screen])
  ui_ticketDisplay --> ui_qrValidation([QR Validation Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_ticketFetched event;
  class ui_ticketList,ui_ticketDisplay,ui_qrValidation ui;
```

## Funnel: QR Validation → Punch Receipt

```mermaid
flowchart TD
  ui_qrValidation([QR validation screen]) --> ev_qrZoom["simple qr validation zoom qr clicked"]
  ui_qrValidation --> ui_conductorScans([Conductor scans QR])
  ui_conductorScans --> ui_punchNotification([Push notification received])
  ui_punchNotification --> ev_receiptPayload["ondc ticket receipt payload"]
  ev_receiptPayload --> ev_tripPunched["ondc ticket trip punched"]
  ev_tripPunched --> ev_viewReceipt["ondc ticket view receipt clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_qrZoom,ev_receiptPayload,ev_tripPunched,ev_viewReceipt event;
  class ui_qrValidation,ui_conductorScans,ui_punchNotification ui;
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
  ui_anyScreen --> ev_reportProblem["report problem clicked v2"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_reportProblem event;
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
  C --> D["fare details final amount bottomsheet continue click"]
  D --> E["ondc ticket payment successful"]
  E --> F["ondc booking confirmed"]
  F --> G["ondc ticket fetched"]
  G --> H([Conductor scans QR])
  H --> I["ondc ticket receipt payload"]
  I --> J["ondc ticket trip punched"]
  J --> K["ondc ticket view receipt clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class A,B,C,D,E,F,G,I,J,K event;
  class H ui;
```

## Key Analytics Insights for Funnel Building

### Primary Conversion Funnel
1. **Route Search Success** → `stop based stop selection screen route result success`
2. **Route Selected (Multi-route)** → `stop based stop selection screen route result item click`
3. **Fare Details View** → `find my ticket fare fare details screen opened`
4. **Payment Intent** → `find my ticket fare fare details pay button clicked`
5. **Final Fare Confirmed** → `fare details final amount bottomsheet continue click`
6. **Payment Success** → `ondc ticket payment successful`
7. **Booking Confirmed** → `ondc booking confirmed`
8. **Ticket Fetched** → `ondc ticket fetched`
9. **Trip Punched** → `ondc ticket trip punched` (via push notification after conductor scans QR)
10. **Receipt Viewed** → `ondc ticket view receipt clicked`

### Drop-off Analysis Points
- **Route Search Failure**: `stop based stop selection screen route result failure`
- **Fare Fetch Failure**: `ondc ticket fare fetch failure`
- **Payment Failure**: `ondc ticket payment failed`
- **Post-Payment Sync Failure**: `post payment history call use case failure`

### QR Validation Flow
ONDC bus tickets use QR-based validation only:
- **QR Zoom for Better Scanning**: `simple qr validation zoom qr clicked`
- **Punch Received via Push Notification**: `ondc ticket trip punched`
- **Receipt Viewed**: `ondc ticket view receipt clicked`

### Common Filter Property
Validation and receipt events include `isOndcTicketOrder: true` - use this to create ONDC-specific dashboards and filter out other ticket types (mticket, metro, premium bus, etc.).
