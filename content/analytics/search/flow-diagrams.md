# Search analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The search flow has two main paths: **Universal Search** (general route/stop/place search) and **Stop-Based Trip Planner Search** (from/to trip planning)
- `searchSessionId` ties together all events in a single universal search session from open to close
- Legacy `universal item clicked` events coexist with newer `search result clicked` events

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

## Entry Points → Search Initiation

Users can initiate search from multiple entry points in the app.

```mermaid
flowchart TD
  ui_home([Home Screen]) --> ev_searchBarClicked["chalo search bar clicked"]
  ui_regularBusTab([Regular Bus Tab]) --> ev_searchBarClicked
  ui_regularBusTab --> ev_recentSearchCard["regular bus page recent search card clicked"]
  ui_bottomNav([Bottom Navigation]) --> ev_bottomNavSearchTab["home screen bottom nav search tab clicked"]

  ev_searchBarClicked --> ui_universalSearch([Universal Search Screen])
  ev_bottomNavSearchTab --> ui_universalSearch
  ev_recentSearchCard --> ui_universalSearch

  %%chalo:diagram-link ui_universalSearch -> title:Universal Search Flow (Main Funnel)

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_searchBarClicked,ev_recentSearchCard,ev_bottomNavSearchTab event;
  class ui_home,ui_regularBusTab,ui_bottomNav,ui_universalSearch ui;
```

## Universal Search Flow (Main Funnel)

The primary search experience where users search for routes, stops, or places.

```mermaid
flowchart TD
  ui_searchOpen([Universal Search Opens]) --> ev_screenOpened["search screen opened"]
  ev_screenOpened --> ui_queryEmpty([Empty query / recent items])
  ui_queryEmpty --> ev_resultsShown["Search results shown"]

  ev_screenOpened --> ui_userTyping([User starts typing])
  ui_userTyping --> ev_firstChar["first character type after search open"]
  ev_firstChar --> ui_searching([Query being typed])
  ui_searching --> ev_resultsShown

  ev_resultsShown -->|Success| ui_resultsList([Results displayed])
  ev_resultsShown -->|Failure| ui_errorState([Error state])

  ui_resultsList --> ev_universalItemClicked["universal item clicked"]
  ev_universalItemClicked --> ev_resultClicked["search result clicked"]
  ui_resultsList --> ev_recentTripClicked["recent trip result clicked"]

  ev_resultClicked --> ext_routeDetails[Route Details Flow]
  ev_resultClicked --> ext_stopDetails[Stop Details Flow]
  ev_resultClicked --> ext_tripPlanner[Trip Planner Flow]

  ev_recentTripClicked --> ext_tripPlanner

  ui_resultsList --> ev_clearQuery["search clear query clicked"]
  ui_resultsList --> ev_backClicked["search screen back clicked"]
  ui_errorState --> ev_backClicked

  ev_clearQuery --> ui_emptySearch([Empty search state])
  ev_backClicked --> ui_previousScreen([Previous screen])

  %%chalo:diagram-link ev_resultClicked -> title:Universal Search Item Types (Result Click Detail)

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_screenOpened,ev_firstChar,ev_resultsShown,ev_resultClicked,ev_universalItemClicked,ev_recentTripClicked,ev_clearQuery,ev_backClicked event;
  class ui_searchOpen,ui_queryEmpty,ui_userTyping,ui_searching,ui_resultsList,ui_errorState,ui_emptySearch,ui_previousScreen ui;
  class ext_routeDetails,ext_stopDetails,ext_tripPlanner external;
```

## Stop-Based Trip Planner Search Flow

Dedicated flow for trip planning with from/to location selection and nearest stop resolution.

```mermaid
flowchart TD
  ui_tripPlannerOpen([Trip Planner Search Opens]) --> ev_screenOpened["stop trip planner search screen opened"]

  ev_screenOpened --> ui_fromToFields([From/To Fields])

  ui_fromToFields --> ev_fromClicked["stop trip planner search from clicked"]
  ui_fromToFields --> ev_toClicked["stop trip planner search to clicked"]
  ui_fromToFields --> ev_swapClicked["swap button clicked"]
  ui_fromToFields --> ev_recentClicked["stop trip planner search recent clicked"]

  ev_fromClicked --> ext_universalSearch[Universal Search Screen]
  ev_toClicked --> ext_universalSearch

  ext_universalSearch --> ev_stopSelected["stop search result selected"]
  ext_universalSearch --> ev_placeSelected["place search result selected"]

  ev_stopSelected --> ui_fieldPopulated([Field populated])

  ev_placeSelected --> ui_nearestStopFetch([Fetching nearest stops])
  ui_nearestStopFetch --> ev_fetchSuccess["nearest stop fetch success"]
  ui_nearestStopFetch --> ev_fetchFailure["nearest stop fetch failure"]

  ev_fetchSuccess --> ui_nearbyStopsSheet([Nearest stops bottom sheet])
  ev_fetchSuccess --> ev_noStops["no nearby stops found for place"]

  ui_nearbyStopsSheet --> ev_stopSelectedFromNearby["nearest stop selected"]
  ui_nearbyStopsSheet --> ev_showAllClicked["show all nearby stops clicked"]
  ui_nearbyStopsSheet --> ev_bottomSheetClosed["bottom sheet closed button clicked"]

  ev_fetchFailure --> ui_errorRetry([Error state with retry])
  ui_errorRetry --> ev_retryClicked["retry nearest stop fetch clicked"]
  ev_retryClicked --> ui_nearestStopFetch

  ev_recentClicked --> ui_fieldPopulated
  ev_swapClicked --> ui_fieldPopulated
  ev_noStops --> ui_fieldPopulated
  ev_stopSelectedFromNearby --> ui_fieldPopulated
  ev_showAllClicked --> ui_fieldPopulated

  ui_fieldPopulated --> ui_readyToSearch{From & To set?}
  ui_readyToSearch -->|Yes| ext_tripPlannerResults[Trip Planner Results Flow]
  ui_readyToSearch -->|No| ui_fromToFields
  ev_bottomSheetClosed --> ui_fromToFields

  %%chalo:diagram-link ext_universalSearch -> title:Universal Search Flow (Main Funnel)

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_screenOpened,ev_fromClicked,ev_toClicked,ev_swapClicked,ev_recentClicked,ev_stopSelected,ev_placeSelected,ev_fetchSuccess,ev_fetchFailure,ev_noStops,ev_stopSelectedFromNearby,ev_showAllClicked,ev_retryClicked,ev_bottomSheetClosed event;
  class ui_tripPlannerOpen,ui_fromToFields,ui_fieldPopulated,ui_readyToSearch,ui_nearestStopFetch,ui_nearbyStopsSheet,ui_errorRetry ui;
  class ext_universalSearch,ext_tripPlannerResults external;
```

## Universal Search Item Types (Result Click Detail)

Different result types in universal search have different properties tracked.

```mermaid
flowchart TD
  ui_resultClick([User clicks search result]) --> ev_searchResultClicked["search result clicked"]

  ev_searchResultClicked -->|Type: ROUTE| ui_routeProps([Route properties: name, agency, start stop, is free ride])
  ev_searchResultClicked -->|Type: STOP| ui_stopProps([Stop properties: stop name, stop id])
  ev_searchResultClicked -->|Type: LOCATION/PLACE| ui_placeProps([Place properties: location name, lat/long])
  ev_searchResultClicked -->|Type: TRIP_LOCATION| ui_tripProps([Trip properties: origin, destination])

  ui_routeProps --> ext_routeDetails[Route Details Screen]
  ui_stopProps --> ext_stopDetails[Stop Details Screen]
  ui_placeProps --> ext_nearbyStops[Nearby Stops View]
  ui_tripProps --> ext_tripPlanner[Trip Planner]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_searchResultClicked event;
  class ui_resultClick,ui_routeProps,ui_stopProps,ui_placeProps,ui_tripProps ui;
  class ext_routeDetails,ext_stopDetails,ext_nearbyStops,ext_tripPlanner external;
```

## Search Session Tracking

All universal search events within a single session share the same `searchSessionId`.

```mermaid
flowchart LR
  ev_open["search screen opened"] -->|searchSessionId: 1234567890| ev_firstChar["first character type after search open"]
  ev_firstChar -->|searchSessionId: 1234567890| ev_results["Search results shown"]
  ev_results -->|searchSessionId: 1234567890| ev_click["search result clicked"]
  ev_results -->|searchSessionId: 1234567890| ev_clear["search clear query clicked"]
  ev_results -->|searchSessionId: 1234567890| ev_back["search screen back clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;

  class ev_open,ev_firstChar,ev_results,ev_click,ev_clear,ev_back event;
```

## Funnel: Universal Search Errors & Campaign Cards

These events are useful for reliability dashboards and campaign attribution. They are not always part of the main “search → result click” funnel.

```mermaid
flowchart TD
  ui_universal([Universal search]) --> ui_api{Search API}
  ui_api -->|Error| ev_apiErr["universal search api error"]

  ui_universal --> ui_cityFromLoc{Fetch city from location}
  ui_cityFromLoc -->|Failure| ev_cityFail["universal search city fetch from location failed"]

  ui_universal --> ev_useCurrent["use_current_location_clicked"]

  ui_home([Home screen]) --> ui_campaign{Premium bus campaign card}
  ui_campaign --> ev_cardShown["pb adjust campaign card shown"]
  ev_cardShown --> ev_cardClicked["pb adjust campaign card clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_apiErr,ev_cityFail,ev_useCurrent,ev_cardShown,ev_cardClicked event;
  class ui_universal,ui_api,ui_cityFromLoc,ui_home,ui_campaign ui;
```

## Funnel Building Guide

### Universal Search Conversion Funnel

To measure search effectiveness:

```
1. Entry → "chalo search bar clicked"
2. Engagement → "first character type after search open"
3. Results → "Search results shown" (success)
4. Conversion → "search result clicked" OR "universal item clicked"
5. Abandonment → "search screen back clicked"
```

Filter by `searchSessionId` to track individual sessions.

### Trip Planner Search Funnel

To measure trip planning search:

```
1. Entry → "stop trip planner search screen opened"
2. From Selection → "stop trip planner search from clicked" → "stop search result selected" OR "place search result selected"
3. To Selection → "stop trip planner search to clicked" → "stop search result selected" OR "place search result selected"
4. Place Resolution → "nearest stop fetch success" → "nearest stop selected"
```

Filter by `searchTarget` (FROM/TO) to analyze each field separately.

### Search Result Quality Analysis

To analyze search result quality:

```
- Join "Search results shown" with "search result clicked" by searchSessionId
- Calculate: click_rate = clicks / results_shown
- Analyze "searchResultPosition" to understand result ranking quality
- Examine "searchResult1Type/Name" through "searchResult3Type/Name" in back/clear events for abandonment analysis
```

### Nearest Stop Resolution Funnel

For places requiring nearest stop resolution:

```
1. Place Selected → "place search result selected"
2. Fetch → "nearest stop fetch success" OR "nearest stop fetch failure"
3. Selection → "nearest stop selected" OR "show all nearby stops clicked"
4. Error Recovery → "retry nearest stop fetch clicked"
```

Conversion rate: `nearest stop selected / place search result selected`

## Session Example

A typical successful universal search session:

```
1. User clicks search bar on home screen
   → "chalo search bar clicked" { search bar title: "Search routes, stops & places" }

2. Search screen opens
   → "search screen opened" { searchSessionId: "1234567890", no of recent trips available: 3 }

3. User types "bu"
   → "first character type after search open" { searchSessionId: "1234567890", queryString: "b" }

4. Results load for "bus stand"
   → "Search results shown" { searchSessionId: "1234567890", queryString: "bus stand",
      total results: "15", route: "5", trips stops: "8", trips locations: "2", loadingTime: "450" }

5. User clicks 2nd result (Central Bus Stand stop)
   → "search result clicked" { searchSessionId: "1234567890", searchResultType: "STOP",
      searchResultPosition: "2", searchResultName: "Central Bus Stand" }
   → "universal item clicked" { stop: "Central Bus Stand", stopid: "12345",
      universal item clicked: "STOP" }

6. User navigates to stop details screen
```

An abandoned search session:

```
1. "chalo search bar clicked"
2. "search screen opened"
3. "first character type after search open" { queryString: "a" }
4. "Search results shown" { total results: "50" }
5. "search screen back clicked" { queryString: "airport", searchResult1Name: "Airport Road",
   is device back clicked: "true", time from result shown: "3500" }
```

## Property Value Examples

### searchScreenType
- Common values: "universal search", "route", "stop", "trip planner"

### searchScreenInputScreen
- Common values: "home", "route details", "stop details", "nearby stops", "trip planner"

### searchResultType
- Values: "LOCATION", "STOP", "ROUTE", "TRIP_STOP", "TRIP_LOCATION"

### searchPartner
- Values: "Chalo", "Google", "Here", etc.

### searchTarget (Trip Planner)
- Values: "FROM", "TO"

### from_type / to_type (Trip Planner)
- Values: "STOP", "PLACE"

## Notes for Dashboard Creation

1. **Search Effectiveness**: Use `searchSessionId` to track complete search journeys from open to result selection
2. **Result Quality**: Compare `searchResultPosition` distribution to understand if users find results at top of list
3. **Abandonment Analysis**: Look at `search screen back clicked` with top 3 results to understand why users abandon
4. **Performance**: Track `loadingTime` in "Search results shown" to identify slow searches
5. **Place Resolution**: Monitor "nearest stop fetch failure" and "no nearby stops found for place" to identify areas needing better stop coverage
6. **Query Analysis**: Use `queryString` and `queryLength` to understand search patterns and popular queries
7. **Legacy vs New**: Both `universal item clicked` and `search result clicked` fire for the same action - use `search result clicked` for new dashboards
8. **Entry Point Analysis**: Track which entry points (`chalo search bar clicked`, `regular bus page recent search card clicked`, etc.) lead to best conversion
9. **Recent Item Usage**: Filter by `is recent item: "true"` to understand repeat search behavior
10. **Time-Based Patterns**: Use `time from result shown` in back/clear events to measure user engagement duration
