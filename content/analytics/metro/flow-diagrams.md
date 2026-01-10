# Metro flow analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The metro flow includes both regular metro tickets and ONDC metro tickets.
- ONDC metro events mirror regular metro events with `ondc` prefix.
- Metro tickets only support static QR validation (no BLE or TITO).

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

## Funnel: Landing Screen to Fare Discovery

This funnel covers the metro landing screen from screen open through station selection to fare fetch.

```mermaid
flowchart TD
  ui_open([Open Metro landing]) --> ev_open["stop based metro landing screen opened"]

  ev_open --> ui_config{Fetch config}
  ui_config -->|Success| ev_cfgOk["metro config fetch success"]
  ui_config -->|Failure| ev_cfgFail["metro config fetch failed"]

  ev_cfgOk --> ui_stations{Fetch station list}
  ui_stations -->|Success| ev_stationsOk["metro all stations fetch success"]
  ui_stations -->|Failure| ev_stationsFail["metro all stations fetch failed"]

  ev_stationsOk --> ui_selectStops([Select stations])

  ui_selectStops --> ev_fromClick["from station clicked"]
  ev_fromClick --> ev_stopSelectedFrom["metro stop selected"]

  ui_selectStops --> ev_toClick["to station clicked"]
  ev_toClick --> ev_stopSelectedTo["metro stop selected"]

  ui_selectStops --> ev_swap["swap button clicked"]
  ui_selectStops --> ev_recentTrip["recent stop based trip clicked"]

  ev_stopSelectedFrom --> ev_searchBtn["booking mode search button clicked"]
  ev_stopSelectedTo --> ev_searchBtn
  ev_recentTrip --> ev_searchBtn

  ev_searchBtn --> ui_fareFetch{Fetch fare}
  ui_fareFetch -->|Success| ev_fareOk["metro fare fetch success"]
  ui_fareFetch -->|Failure| ev_fareFail["metro fare fetch failed"]
  ui_fareFetch -->|Invalid response| ev_ticketFareFail["ticket fare fetch failure"]

  ev_fareOk --> ev_proceedBtn["booking mode proceed button clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_open,ev_cfgOk,ev_cfgFail,ev_stationsOk,ev_stationsFail,ev_fromClick,ev_stopSelectedFrom,ev_toClick,ev_stopSelectedTo,ev_swap,ev_recentTrip,ev_searchBtn,ev_fareOk,ev_fareFail,ev_ticketFareFail,ev_proceedBtn event;
  class ui_open,ui_config,ui_stations,ui_selectStops,ui_fareFetch ui;
```

## Funnel: Confirm Booking to Order Creation

This funnel covers the booking confirmation screen through payment initiation.

```mermaid
flowchart TD
  ui_confirmScreen([Confirm booking screen]) --> ev_confirmOpen["confirm screen opened"]

  ev_confirmOpen --> ui_finalFare{Fetch final fare}
  ui_finalFare -->|Success| ev_finalFareOk["confirm final fare fetch success"]
  ui_finalFare -->|Failure| ev_finalFareFail["confirm final fare fetch failed"]

  ev_finalFareFail --> ev_retryBtn["retry button clicked"]
  ev_retryBtn --> ui_finalFare

  ev_finalFareOk --> ev_payBtn["pay button clicked"]
  ev_payBtn --> ui_orderApi{Create order}
  ui_orderApi -->|Success| ev_orderOk["order api success"]
  ui_orderApi -->|Failure| ev_orderFail["order api failure"]

  ev_orderOk --> ext_checkout[Checkout flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_confirmOpen,ev_finalFareOk,ev_finalFareFail,ev_retryBtn,ev_payBtn,ev_orderOk,ev_orderFail event;
  class ui_confirmScreen,ui_finalFare,ui_orderApi ui;
  class ext_checkout external;
```

## Funnel: Payment to Booking Success

This funnel covers payment completion and booking confirmation.

```mermaid
flowchart TD
  ext_checkout[Checkout flow] --> ui_paymentResult{Payment result}

  ui_paymentResult -->|Success| ev_paymentOk["metro ticket payment successful"]
  ui_paymentResult -->|Failure| ev_paymentFail["metro ticket payment failed"]
  ui_paymentResult -->|ONDC Success| ev_ondcPaymentOk["ondc metro ticket payment successful"]
  ui_paymentResult -->|ONDC Failure| ev_ondcPaymentFail["ondc metro ticket payment failed"]

  ev_paymentOk --> ui_fetchTicketDetails{Fetch ticket details}
  ev_ondcPaymentOk --> ui_fetchTicketDetails

  ui_fetchTicketDetails -->|Success| ui_successScreen([Booking success screen])
  ui_fetchTicketDetails -->|Metro Failure| ev_detailsNotAvailable["metro ticket details not available"]
  ui_fetchTicketDetails -->|ONDC Failure| ev_ondcDetailsNotAvailable["ondc metro ticket details not available"]

  ui_successScreen --> ev_bookingConfirmed["metro booking confirmed"]
  ui_successScreen --> ev_ondcBookingConfirmed["ondc metro booking confirmed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_paymentOk,ev_paymentFail,ev_ondcPaymentOk,ev_ondcPaymentFail,ev_detailsNotAvailable,ev_ondcDetailsNotAvailable,ev_bookingConfirmed,ev_ondcBookingConfirmed event;
  class ui_paymentResult,ui_fetchTicketDetails,ui_successScreen ui;
  class ext_checkout external;
```

## Funnel: Ticket Validation - QR Flow

This funnel covers the static QR code validation path. Metro tickets only support QR validation.

```mermaid
flowchart TD
  ui_openTicket([User opens ticket for validation]) --> ev_ticketFetched["metro ticket fetched"]
  ui_openTicket --> ev_ondcTicketFetched["ondc metro ticket fetched"]

  ev_ticketFetched --> ev_qrOpen["qr screen open"]
  ev_ondcTicketFetched --> ev_qrOpen

  ev_qrOpen --> ev_qrZoom["simple qr validation zoom qr clicked"]
  ev_qrOpen --> ui_gateScan([Gate machine scans QR])

  ui_gateScan --> ev_tripPunched["metro ticket trip punched"]
  ui_gateScan --> ev_ondcTripPunched["ondc metro ticket trip punched"]

  ev_tripPunched --> ev_postValidation["Post validation screen opened"]
  ev_ondcTripPunched --> ev_postValidation

  ev_postValidation --> ev_viewReceipt["metro ticket view receipt clicked"]
  ev_postValidation --> ev_ondcViewReceipt["ondc ticket view receipt clicked"]
  ev_postValidation --> ev_viewReceiptPostValidation["view receipt post validation clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_ticketFetched,ev_ondcTicketFetched,ev_qrOpen,ev_qrZoom,ev_tripPunched,ev_ondcTripPunched,ev_postValidation,ev_viewReceipt,ev_ondcViewReceipt,ev_viewReceiptPostValidation event;
  class ui_openTicket,ui_gateScan ui;
```

## Exit Confirmation Dialog

Events for the exit confirmation dialog during validation.

```mermaid
flowchart TD
  ui_backPress([User presses back during validation]) --> ev_exitShown["exit chalo pay confirmation shown"]

  ev_exitShown --> ui_userChoice{User choice}
  ui_userChoice -->|Yes - Exit| ev_exitYes["exit chalo pay confirmation yes clicked"]
  ui_userChoice -->|No - Stay| ev_exitNo["exit chalo pay confirmation no clicked"]

  ev_exitYes --> ui_exit([Exit validation screen])
  ev_exitNo --> ui_stay([Stay on validation screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_exitShown,ev_exitYes,ev_exitNo event;
  class ui_backPress,ui_userChoice,ui_exit,ui_stay ui;
```

## Global Events

Events that can fire from multiple screens in the metro flow.

```mermaid
flowchart TD
  ui_anyScreen([Any validation screen]) --> ev_reportProblem["report problem clicked v2"]
  ui_anyScreen --> ev_viewReceiptMenu["view trip receipt from menu clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_reportProblem,ev_viewReceiptMenu event;
  class ui_anyScreen ui;
```

## Complete Happy Path: Discovery to Validation

End-to-end funnel for the complete metro booking journey using static QR validation.

```mermaid
flowchart TD
  ui_start([User opens metro]) --> ev_landingOpen["stop based metro landing screen opened"]
  ev_landingOpen --> ev_configOk["metro config fetch success"]
  ev_configOk --> ev_stationsOk["metro all stations fetch success"]
  ev_stationsOk --> ev_fromClick["from station clicked"]
  ev_fromClick --> ev_stopFrom["metro stop selected"]
  ev_stopFrom --> ev_toClick["to station clicked"]
  ev_toClick --> ev_stopTo["metro stop selected"]
  ev_stopTo --> ev_searchBtn["booking mode search button clicked"]
  ev_searchBtn --> ev_fareOk["metro fare fetch success"]
  ev_fareOk --> ev_proceedBtn["booking mode proceed button clicked"]

  ev_proceedBtn --> ev_confirmOpen["confirm screen opened"]
  ev_confirmOpen --> ev_finalFareOk["confirm final fare fetch success"]
  ev_finalFareOk --> ev_payBtn["pay button clicked"]
  ev_payBtn --> ev_orderOk["order api success"]

  ev_orderOk --> ext_checkout[Checkout flow]
  ext_checkout --> ev_paymentOk["metro ticket payment successful"]

  ev_paymentOk --> ev_bookingConfirmed["metro booking confirmed"]
  ev_bookingConfirmed --> ev_ticketFetched["metro ticket fetched"]
  ev_ticketFetched --> ev_qrOpen["qr screen open"]
  ev_qrOpen --> ev_tripPunched["metro ticket trip punched"]
  ev_tripPunched --> ev_postValidation["Post validation screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_landingOpen,ev_configOk,ev_stationsOk,ev_fromClick,ev_stopFrom,ev_toClick,ev_stopTo,ev_searchBtn,ev_fareOk,ev_proceedBtn,ev_confirmOpen,ev_finalFareOk,ev_payBtn,ev_orderOk,ev_paymentOk,ev_bookingConfirmed,ev_ticketFetched,ev_qrOpen,ev_tripPunched,ev_postValidation event;
  class ui_start ui;
  class ext_checkout external;
```
