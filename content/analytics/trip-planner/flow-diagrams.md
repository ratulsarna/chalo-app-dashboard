# Trip Planner analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- Trip planner has two main variants: **Universal Trip Planner** (location-based) and **Stop-Based Trip Planner** (stop-focused with nearby stops)
- Universal trip planner supports more transit modes including HOP integration
- Stop-based trip planner provides more granular stop selection with nearby stops functionality
- Both flows share similar result interaction patterns but have different entry points

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

## Universal Trip Planner: Entry → Results → Details

The universal trip planner supports location-based trip planning with multiple transit modes including HOP.

```mermaid
flowchart TD
  ui_entry([App opens trip planner]) --> ev_opened["trip planner opened"]

  ev_opened --> ui_search([User enters locations])
  ui_search --> ev_locationEntered["trip planner location entered"]

  ev_locationEntered --> ui_canSwap([User can swap locations])
  ui_canSwap --> ev_swap["tripPlanner swap button clicked"]

  ev_locationEntered --> ev_getRoute["get route clicked"]
  ev_getRoute --> ev_responseReceived["trip planner response received"]
  ev_getRoute --> ev_responseError["trip planner response error"]

  ev_responseReceived --> ev_etaAvailability["trip planner result screen eta availability"]
  ev_etaAvailability --> ui_resultsScreen([Results screen displayed])

  ui_resultsScreen --> ev_tabClicked["trip planner quick tab clicked"]
  ui_resultsScreen --> ev_timeEdit["trip planner time edit option clicked"]
  ui_resultsScreen --> ev_dateEdit["trip planner date edit option clicked"]
  ui_resultsScreen --> ev_routeEdit["trip planner route edit option clicked"]

  ev_timeEdit --> ev_timeChanged["trip planner time changed"]
  ev_dateEdit --> ev_dateChanged["trip planner date changed"]

  ui_resultsScreen --> ev_recentClicked["trip planner recent clicked"]
  ui_resultsScreen --> ev_resultClicked["trip planner result clicked"]

  ev_resultClicked --> ev_proceed["trip planner proceed clicked"]
  ev_proceed --> ev_tripDetailsActivityOpened["trip details activity opened"]
  ev_tripDetailsActivityOpened --> ev_detailsOpened["trip planner details page opened"]

  ev_detailsOpened --> ev_mticketHook["mticket hook trip details rendered"]
  ev_detailsOpened --> ev_mapMarker["trip planner map marker clicked"]
  ev_detailsOpened --> ev_buyProduct["trip details buy product button clicked"]
  ev_detailsOpened --> ev_trackBus["trip details track bus button clicked"]

  ev_buyProduct --> ext_checkout[Checkout flow]
  ev_trackBus --> ext_tracking[Live Tracking flow]

  ui_resultsScreen --> ev_back["trip planner back button clicked"]
  ev_responseError --> ev_hopRetry["tp hop api fetch failed snackbar retry event"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_opened,ev_locationEntered,ev_swap,ev_getRoute,ev_responseReceived,ev_responseError,ev_etaAvailability,ev_tabClicked,ev_timeEdit,ev_dateEdit,ev_routeEdit,ev_timeChanged,ev_dateChanged,ev_recentClicked,ev_resultClicked,ev_proceed,ev_tripDetailsActivityOpened,ev_detailsOpened,ev_mticketHook,ev_mapMarker,ev_buyProduct,ev_trackBus,ev_back,ev_hopRetry event;
  class ui_entry,ui_search,ui_canSwap,ui_resultsScreen ui;
  class ext_checkout,ext_tracking external;
```

## Stop-Based Trip Planner: Search → Stop Selection → Results

The stop-based trip planner focuses on stop-to-stop journey planning with nearby stops functionality.

```mermaid
flowchart TD
  ui_entry([App opens stop-based search]) --> ev_searchOpened["stop trip planner search screen opened"]

  ev_searchOpened --> ev_fromClicked["stop trip planner search from clicked"]
  ev_searchOpened --> ev_toClicked["stop trip planner search to clicked"]
  ev_searchOpened --> ev_swapClicked["swap button clicked"]
  ev_searchOpened --> ev_recentClicked["stop trip planner search recent clicked"]

  ev_fromClicked --> ui_searchBottomSheet([Search bottom sheet])
  ev_toClicked --> ui_searchBottomSheet

  ui_searchBottomSheet --> ev_stopSelected["stop search result selected"]
  ui_searchBottomSheet --> ev_placeSelected["place search result selected"]
  ui_searchBottomSheet --> ev_bottomSheetClosed["bottom sheet closed button clicked"]

  ev_placeSelected --> ui_nearbyStopsFetch([Fetch nearby stops])
  ui_nearbyStopsFetch --> ev_nearestSuccess["nearest stop fetch success"]
  ui_nearbyStopsFetch --> ev_nearestFailure["nearest stop fetch failure"]

  ev_nearestFailure --> ev_retryFetch["retry nearest stop fetch clicked"]
  ev_nearestSuccess --> ev_nearestNoStops["no nearby stops found for place"]

  ev_nearestSuccess --> ui_nearbyStopsSheet([Nearby stops bottom sheet])
  ui_nearbyStopsSheet --> ev_nearestSelected["nearest stop selected"]
  ui_nearbyStopsSheet --> ev_showAll["show all nearby stops clicked"]

  ev_stopSelected --> ui_resultsScreen([Results screen])
  ev_nearestSelected --> ui_resultsScreen
  ev_showAll --> ui_resultsScreen

  ui_resultsScreen --> ev_resultOpened["stop trip planner result opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_searchOpened,ev_fromClicked,ev_toClicked,ev_swapClicked,ev_recentClicked,ev_stopSelected,ev_placeSelected,ev_bottomSheetClosed,ev_nearestSuccess,ev_nearestFailure,ev_retryFetch,ev_nearestNoStops,ev_nearestSelected,ev_showAll,ev_resultOpened event;
  class ui_entry,ui_searchBottomSheet,ui_nearbyStopsFetch,ui_nearbyStopsSheet,ui_resultsScreen ui;
```

## Stop-Based Trip Planner: Results Interaction → Trip Details

After stops are selected, users interact with trip results and view details.

```mermaid
flowchart TD
  ui_resultsScreen([Results screen]) --> ui_fetchResults([Fetch trip results])
  ui_fetchResults --> ev_responseSuccess["stop trip planner response success"]
  ui_fetchResults --> ev_responseFailure["stop trip planner response failure"]

  ev_responseFailure --> ev_tryAgain["stop trip planner result try again click"]

  ev_responseSuccess --> ui_displayResults([Display itineraries])
  ui_displayResults --> ev_tabClicked["stop trip planner result tab clicked"]
  ui_displayResults --> ev_editClicked["stop trip planner result edit clicked"]

  ui_displayResults --> ui_nearbyStopsSection([Nearby stops section])
  ui_nearbyStopsSection --> ev_nearbyToggled["stop trip planner nearby stops toggled"]

  ui_displayResults --> ui_refreshNudge([Refresh nudge])
  ui_refreshNudge --> ev_refreshClicked["stop trip planner refresh nudge clicked"]

  ui_displayResults --> ev_toLocationClicked["stop trip planner result to clicked"]
  ui_displayResults --> ev_legClicked["stop trip planner result leg clicked"]
  ui_displayResults --> ev_moreDetails["stop trip planner more details click"]

  ev_legClicked --> ext_routeDetails[Route Details flow]
  ev_moreDetails --> ev_tripDetailsActivityOpened["trip details activity opened"]
  ev_tripDetailsActivityOpened --> ev_detailsOpened["trip planner details page opened"]

  ev_detailsOpened --> ev_mticketHook["mticket hook trip details rendered"]
  ev_detailsOpened --> ev_buyProduct["trip details buy product button clicked"]
  ev_detailsOpened --> ev_trackBus["trip details track bus button clicked"]

  ev_buyProduct --> ext_checkout[Checkout flow]
  ev_trackBus --> ext_tracking[Live Tracking flow]

  ui_resultsScreen --> ev_backPressed["stop trip planner results back pressed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_responseSuccess,ev_responseFailure,ev_tryAgain,ev_tabClicked,ev_editClicked,ev_nearbyToggled,ev_refreshClicked,ev_toLocationClicked,ev_legClicked,ev_moreDetails,ev_tripDetailsActivityOpened,ev_detailsOpened,ev_mticketHook,ev_buyProduct,ev_trackBus,ev_backPressed event;
  class ui_resultsScreen,ui_fetchResults,ui_displayResults,ui_nearbyStopsSection,ui_refreshNudge ui;
  class ext_routeDetails,ext_checkout,ext_tracking external;
```

## Key Funnel Patterns

### Universal Trip Planner Funnel (Simple)
```
trip planner opened
  → trip planner location entered
    → get route clicked
      → trip planner response received
        → trip planner result clicked
          → trip planner proceed clicked
            → trip planner details page opened
              → trip details buy product button clicked / trip details track bus button clicked
```

### Stop-Based Trip Planner Funnel (With Stop Selection)
```
stop trip planner search screen opened
  → stop trip planner search from clicked / stop trip planner search to clicked
    → stop search result selected / place search result selected
      [if place] → nearest stop fetch success
                    → nearest stop selected / show all nearby stops clicked
    → stop trip planner result opened
      → stop trip planner response success
        → stop trip planner result leg clicked
          → [Route Details] or [More Details]
```

### Tab Switching & Filters (Both Planners)
```
Results screen
  → trip planner quick tab clicked (Universal)
  → stop trip planner result tab clicked (Stop-based)
    → Re-fetch results with new tab filter
```

### Time/Date Modification (Universal Planner)
```
trip planner time edit option clicked
  → trip planner time changed
    → Re-fetch results with new time

trip planner date edit option clicked
  → trip planner date changed
    → Re-fetch results with new date
```

### Nearby Stops Management (Stop-based Planner)
```
[Nearby stops in results]
  → stop trip planner nearby stops toggled
    → [Expand/Collapse section]

[Stale results detected]
  → stop trip planner refresh nudge clicked
    → Re-fetch results for other tab
```

## Error Recovery Flows

### Universal Trip Planner Error Recovery
```
trip planner response error
  → tp hop api fetch failed snackbar retry event
    → [Re-attempt API call]
```

### Stop-Based Planner Error Recovery
```
stop trip planner response failure
  → stop trip planner result try again click
    → [Re-attempt trip search]

nearest stop fetch failure
  → retry nearest stop fetch clicked
    → [Re-attempt nearby stops fetch]
```

## Navigation Exit Points

Both trip planners can exit to:
- **Checkout flow** - via `trip details buy product button clicked`
- **Live Tracking flow** - via `trip details track bus button clicked`
- **Route Details flow** - via `stop trip planner result leg clicked` (stop-based only)
- **Back navigation** - via `trip planner back button clicked` or `stop trip planner results back pressed`
