# Metro flow analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

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

## Funnel: Stop-Based Metro Landing → Fare Fetch → Booking Confirmed

```mermaid
flowchart TD
  ui_open([Open Metro landing]) --> ev_open["stop based metro landing screen opened"]

  ev_open --> ui_config{Fetch config}
  ui_config -->|Success| ev_cfgOk["metro config fetch success"]
  ui_config -->|Failure| ev_cfgFail["metro config fetch failed"]

  ev_cfgOk --> ui_stations{Fetch station list}
  ui_stations -->|Success| ev_stationsOk["metro all stations fetch success"]
  ui_stations -->|Failure| ev_stationsFail["metro all stations fetch failed"]

  ev_stationsOk --> ui_tripType{User chooses journey}
  ui_tripType --> ev_searchMode["booking mode search button clicked"]
  ui_tripType --> ev_proceedMode["booking mode proceed button clicked"]

  ev_searchMode --> ui_selectStops([Select stations])
  ev_proceedMode --> ui_selectStops

  ui_selectStops --> ev_fromClick["from station clicked"]
  ev_fromClick --> ev_stopSelectedFrom["metro stop selected"]

  ui_selectStops --> ev_toClick["to station clicked"]
  ev_toClick --> ev_stopSelectedTo["metro stop selected"]

  ui_selectStops --> ev_recentTrip["recent stop based trip clicked"]

  ev_stopSelectedFrom --> ui_fareFetch{Fetch fare}
  ev_stopSelectedTo --> ui_fareFetch

  ui_fareFetch -->|Success| ev_fareOk["metro fare fetch success"]
  ui_fareFetch -->|Failure| ev_fareFail["metro fare fetch failed"]
  ui_fareFetch -->|Invalid response| ev_ticketFareFail["ticket fare fetch failure"]

  ev_fareOk --> ui_checkout([Checkout & payment])
  ui_checkout --> ui_success([Booking success screen])
  ui_success --> ev_confirmed["metro booking confirmed"]
  ui_success --> ev_ondcConfirmed["ondc metro booking confirmed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_open,ev_cfgOk,ev_cfgFail,ev_stationsOk,ev_stationsFail,ev_searchMode,ev_proceedMode,ev_fromClick,ev_stopSelectedFrom,ev_toClick,ev_stopSelectedTo,ev_recentTrip,ev_fareOk,ev_fareFail,ev_ticketFareFail,ev_confirmed,ev_ondcConfirmed event;
  class ui_open,ui_config,ui_stations,ui_tripType,ui_selectStops,ui_fareFetch,ui_checkout,ui_success ui;
```
