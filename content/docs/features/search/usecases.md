---
feature: search
layer: domain
lastUpdated: 2026-01-16
sourceCommit: null
---

# Search — UseCase Documentation

## Domain Layer Overview

The domain layer orchestrates search operations including API autocomplete, offline search, recent items management, and result transformation. Use cases coordinate repository calls, apply business rules, and format results for presentation.

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer"]
        Universal["Universal Picker"]
        TripSearch["Trip Planner Search"]
        PickStop["Pick Stop"]
        PickRoute["Pick Route"]
    end

    subgraph Domain["Domain Layer"]
        FetchRemote["FetchRemoteSearchResultUseCase"]
        FetchOffline["FetchOfflineSearchResultUseCase"]
        FetchRecent["FetchRecentSearchItemsUseCase"]
        ConvertResults["ConvertSearchResultsUseCase"]
        FilterFavorites["FilterFavoritesUseCase"]
        NearbyStops["FetchNearbyStopsUseCase"]
        RecentList["GetRecentSearchListUseCase"]
    end

    subgraph Data["Data Layer"]
        TrackingRepo["TrackingRepository"]
        RecentRepos["Recent Repositories"]
        CityData["City Data Store"]
    end

    Universal --> FetchRemote
    Universal --> FetchRecent
    Universal --> ConvertResults
    Universal --> FilterFavorites
    TripSearch --> NearbyStops
    TripSearch --> RecentList
    PickStop --> FetchOffline
    PickRoute --> FetchRemote
    FetchRemote --> TrackingRepo
    FetchOffline --> CityData
    FetchRecent --> RecentRepos
```

---

## Use Case Inventory

| Use Case | Purpose | Called From |
|----------|---------|-------------|
| **FetchRemoteSearchResult** | API autocomplete search | Universal Picker, Pick Route |
| **FetchOfflineSearchResult** | Local offline search | Universal Picker (offline mode) |
| **FetchRecentSearchItemsFromDatabase** | Load recent searches | Universal Picker |
| **ConvertSearchedResultItemsAppModelToUiModel** | Transform results for UI | Universal Picker |
| **FilterFavoriteMarkedStopsAndPlaces** | Extract favorites from recents | Universal Picker |
| **FetchNearbyStops** | Find stops near coordinates | Trip Planner Search |
| **GetRecentSearchList** | Format recents for home display | Home Screen |

---

## Fetch Remote Search Result

**Responsibility:** Executes API autocomplete search with location context, timeout handling, and error mapping.

### Search Flow

```mermaid
flowchart TD
    Start["invoke(searchSourceType)"]
    ValidateQuery{Query empty?}
    EmptyError["Return EmptyQuery error"]
    GetCity["Get current city"]
    GetLocation["Get user location or city center"]
    GetTimeout["Get timeout config"]
    BuildRequest["Build API request"]
    CallAPI["Repository.fetchAutocompleteResults()"]
    CheckResponse{Results empty?}
    EmptyResponse["Return EmptyApiResponse"]
    TransformResults["Map to app model"]
    ReturnSuccess["Return Success(results)"]
    HandleError["Map exception to error type"]
    ReturnError["Return Failure(error)"]

    Start --> ValidateQuery
    ValidateQuery -->|Yes| EmptyError
    ValidateQuery -->|No| GetCity
    GetCity --> GetLocation
    GetLocation --> GetTimeout
    GetTimeout --> BuildRequest
    BuildRequest --> CallAPI
    CallAPI --> CheckResponse
    CheckResponse -->|Yes| EmptyResponse
    CheckResponse -->|No| TransformResults
    TransformResults --> ReturnSuccess
    CallAPI -->|Exception| HandleError
    HandleError --> ReturnError
```

### Input: Search Source Type

| Source Type | Parameters | Usage |
|-------------|------------|-------|
| **Default** | query, source, searchFilters | Standard search |
| **Ondc** | query, source, searchFilters, mode | ONDC-specific search |

### Search Filters

| Filter | API Value | Results Included |
|--------|-----------|------------------|
| **STOPS** | "stops" | Bus/metro stops |
| **PLACES** | "places" | Addresses, landmarks |
| **ROUTES** | "routes" | Bus routes |
| **TRIPS** | "trips" | Saved trips |
| **ALL** | null | All types combined |

### Request Building

The request includes contextual information:

| Field | Source | Purpose |
|-------|--------|---------|
| **query** | User input | Search term |
| **source** | Flow source | Analytics context |
| **searchFilter** | Options | Filter results |
| **cityName** | CityProvider | City-specific results |
| **userId** | Session | Personalization |
| **currentLanguage** | LanguageFeature | Localization |
| **latLng** | Location or city center | Proximity sorting |
| **timeZoneId** | City config | Time context |
| **timeoutInMilliSec** | Config | Request timeout |

### Error Types

| Error | Cause | User Message |
|-------|-------|--------------|
| **EmptyQuery** | Query was blank | N/A (validation) |
| **InvalidRequestData** | Bad request format | "Invalid search" |
| **Timeout** | Request timed out | "Search timed out" |
| **API** | Server error | Server message |
| **Local** | Local storage error | "Something went wrong" |
| **ResponseParsing** | JSON parse failed | "Something went wrong" |
| **InvalidResponse** | Missing required fields | "Something went wrong" |
| **EmptyApiResponse** | No results returned | "No results found" |
| **UNKNOWN** | Unexpected error | "Something went wrong" |

### Error Mapping

```mermaid
flowchart TD
    Exception["Exception Caught"]
    Check1{NetworkTimeout?}
    Timeout["Timeout error"]
    Check2{ApiException?}
    API["API error with code"]
    Check3{ParseException?}
    Parse["ResponseParsing error"]
    Check4{LocalException?}
    Local["Local error"]
    Unknown["UNKNOWN error"]

    Exception --> Check1
    Check1 -->|Yes| Timeout
    Check1 -->|No| Check2
    Check2 -->|Yes| API
    Check2 -->|No| Check3
    Check3 -->|Yes| Parse
    Check3 -->|No| Check4
    Check4 -->|Yes| Local
    Check4 -->|No| Unknown
```

---

## Fetch Offline Search Result

**Responsibility:** Searches local city data when network is unavailable, using prefix and substring matching.

### Offline Search Flow

```mermaid
flowchart TD
    Start["invoke(query, searchFilters)"]
    GetCityData["Load city stops and routes"]
    SearchStops["Search stops by prefix"]
    SearchRoutes["Search routes by prefix"]
    NoPrefixMatch{Prefix results?}
    SubstringSearch["Search by substring"]
    CombineResults["Combine and limit results"]
    ReturnResults["Return SearchedResultItemsAppModel"]

    Start --> GetCityData
    GetCityData --> SearchStops
    GetCityData --> SearchRoutes
    SearchStops --> NoPrefixMatch
    SearchRoutes --> NoPrefixMatch
    NoPrefixMatch -->|None| SubstringSearch
    NoPrefixMatch -->|Some| CombineResults
    SubstringSearch --> CombineResults
    CombineResults --> ReturnResults
```

### Search Algorithm

| Phase | Method | Priority |
|-------|--------|----------|
| **Prefix Match** | Starts with query | High (shown first) |
| **Substring Match** | Contains query | Lower (fallback) |

### Result Limits

| Type | Limit | Reason |
|------|-------|--------|
| **Stops** | 10 | Manageable list size |
| **Routes** | 10 | Manageable list size |
| **Total** | 20 | Screen real estate |

---

## Fetch Recent Search Items From Database

**Responsibility:** Combines recent searches from multiple repositories and sorts by access time.

### Recent Fetch Flow

```mermaid
flowchart TD
    Start["invoke()"]
    GetCity["Get current city name"]
    CombineFlows["Combine 4 repository flows"]
    PlaceFlow["PlaceRecentRepository"]
    StopFlow["StopRecentRepository"]
    RouteFlow["RouteRecentRepository"]
    TripFlow["TripRecentRepository"]
    Flatten["Flatten to single list"]
    Sort["Sort by accessTime DESC"]
    ReturnFlow["Return Flow<List<RecentItem>>"]

    Start --> GetCity
    GetCity --> CombineFlows
    PlaceFlow --> CombineFlows
    StopFlow --> CombineFlows
    RouteFlow --> CombineFlows
    TripFlow --> CombineFlows
    CombineFlows --> Flatten
    Flatten --> Sort
    Sort --> ReturnFlow
```

### Recent Item Types

| Type | Contains | Source |
|------|----------|--------|
| **Place** | RecentPlaceAppModel | PlaceRecentRepository |
| **Stop** | RecentStopAppModel | StopRecentRepository |
| **Route** | RecentRouteAppModel | RouteRecentRepository |
| **Trip** | RecentTripAppModel | TripRecentRepository |

### Sorting Logic

All recents sorted by `accessTime` (most recent first):

```
Combined List → Sort by accessTime DESC → Return Flow
```

---

## Convert Searched Result Items to UI Model

**Responsibility:** Transforms domain search results into UI-ready view states.

### Conversion Flow

```mermaid
flowchart TD
    Start["invoke(searchResults, config)"]
    SplitResults["Split routes and places/stops"]
    FormatRoutes["Format route items"]
    FormatPlaces["Format place/stop items"]
    ApplyConfig["Apply display config"]
    GroupResults["Group by type"]
    ReturnUIModel["Return List<UniversalSearchItem>"]

    Start --> SplitResults
    SplitResults --> FormatRoutes
    SplitResults --> FormatPlaces
    FormatRoutes --> ApplyConfig
    FormatPlaces --> ApplyConfig
    ApplyConfig --> GroupResults
    GroupResults --> ReturnUIModel
```

### Route Formatting

| App Field | UI Field | Transform |
|-----------|----------|-----------|
| routeId | id | Direct |
| routeName | primaryText | Direct |
| firstStopName + lastStopName | secondaryText | "From X to Y" |
| transportType | icon | Transit mode icon |
| agencyName | tagText | If config.showAgency |
| isFreeRide | freeRideTag | Show badge |

### Place/Stop Formatting

| App Field | UI Field | Transform |
|-----------|----------|-----------|
| description | primaryText | Direct |
| stopAddress | secondaryText | Direct |
| resultType | itemType | PLACE or STOP |
| transitMode | icon | Mode-specific icon |
| placeId/stopId | id | Identifier |

---

## Filter Favorite Marked Stops and Places

**Responsibility:** Extracts items with favorite status from recent search list.

### Filter Flow

```mermaid
flowchart TD
    Start["invoke(recentItems)"]
    FilterFavorites["Filter by specialStatus"]
    CheckStatus{status == FAVOURITE?}
    Include["Include in result"]
    Exclude["Skip item"]
    ReturnFiltered["Return favorites list"]

    Start --> FilterFavorites
    FilterFavorites --> CheckStatus
    CheckStatus -->|Yes| Include
    CheckStatus -->|No| Exclude
    Include --> ReturnFiltered
```

### Favorite Status

| Status | Meaning | Shown In |
|--------|---------|----------|
| **FAVOURITE** | User marked as favorite | Favorites section |
| **RECENT** | Recently accessed | Recents section |
| **NONE** | No special status | Recents section |

---

## Fetch Nearby Stops

**Responsibility:** Finds stops near a given location, sorted by distance.

### Nearby Fetch Flow

```mermaid
flowchart TD
    Start["invoke(lat, lng, transitMode)"]
    LoadStops["Load all city stops"]
    FilterMode["Filter by transit mode"]
    CalcDistances["Calculate distance to each"]
    SortDistance["Sort by distance ASC"]
    LimitResults["Take top N results"]
    ReturnStops["Return List<NearbyStopAppModel>"]

    Start --> LoadStops
    LoadStops --> FilterMode
    FilterMode --> CalcDistances
    CalcDistances --> SortDistance
    SortDistance --> LimitResults
    LimitResults --> ReturnStops
```

### Distance Calculation

| Input | Output | Method |
|-------|--------|--------|
| User lat/lng | Distance in meters | Haversine formula |
| Stop lat/lng | | |

### Result Model

| Field | Type | Description |
|-------|------|-------------|
| **stop** | StopAppModel | Stop details |
| **distanceMeters** | Long | Distance from location |
| **formattedDistance** | String | "500m" or "1.2 km" |

---

## Get Recent Search List

**Responsibility:** Formats recent searches for home tab display with simplified structure.

### Format Flow

```mermaid
flowchart TD
    Start["invoke(recents1, recents2)"]
    Merge["Merge both lists"]
    Sort["Sort by accessTime DESC"]
    ForEach["For each recent"]
    ExtractFields["Extract display fields"]
    CreateItem["Create RecentSearchedItem"]
    ReturnList["Return formatted list"]

    Start --> Merge
    Merge --> Sort
    Sort --> ForEach
    ForEach --> ExtractFields
    ExtractFields --> CreateItem
    CreateItem --> ReturnList
```

### Output Format

| Field | Source | Example |
|-------|--------|---------|
| **busNumberOrDestination** | Route name or destination | "Route 123" or "Mumbai Central" |
| **destinationOrStarting** | Starting point or route dest | "From Andheri" or "to Churchgate" |
| **recentsType** | Original model | RecentsType reference |

### Type-Specific Extraction

| Recent Type | Primary Text | Secondary Text |
|-------------|--------------|----------------|
| **Route** | Route name | "From X to Y" |
| **Stop-based Trip** | Destination stop | "From origin stop" |
| **Place-based Trip** | Destination place | "From origin place" |
| **Location Pair** | To location | "From X" |
| **Stop** | Stop name | — |
| **Place** | Place name | — |

---

## Domain Models

### Search Results App Model

| Field | Type | Description |
|-------|------|-------------|
| **routes** | List<UniversalSearchRouteAppModel> | Route results |
| **placesAndStops** | List<PlaceAndStopInfoAppModel> | Place/stop results |

### Universal Search Route App Model

| Field | Type | Description |
|-------|------|-------------|
| **routeId** | String | Route identifier |
| **routeName** | String | Route name/number |
| **transportType** | String? | Transit mode |
| **firstStopName** | String | Origin stop |
| **lastStopName** | String | Destination stop |
| **agencyName** | String | Operating agency |
| **trackingSpecialFeature** | List | Special features |
| **isFreeRide** | Boolean | Free ride flag |
| **resultType** | UniversalSearchResultType | ROUTE |
| **via** | String? | Via text |
| **routeNamingScheme** | RouteNamingSchemeType | Naming convention |

### Place and Stop Info App Model

| Field | Type | Description |
|-------|------|-------------|
| **resultType** | UniversalSearchResultType | PLACE or STOP |
| **description** | String | Display name |
| **placeId** | String | Place API ID |
| **stopId** | String | Stop ID |
| **stopName** | String | Stop name |
| **stopLocation** | LatLng | Coordinates |
| **transitMode** | ChaloTransitMode | Transit type |
| **stopAddress** | String? | Address |
| **searchPartner** | String | API partner (Google, etc.) |

### Recent Place App Model

| Field | Type | Description |
|-------|------|-------------|
| **placeId** | String | Place API ID |
| **searchPartner** | String | API source |
| **locationTitle** | String | Place name |
| **locationDescription** | String? | Address |
| **latLng** | LatLng | Coordinates |
| **label** | String? | Custom label |
| **accessTime** | Long | Last access timestamp |

### Recent Stop App Model

| Field | Type | Description |
|-------|------|-------------|
| **stopId** | String | Stop identifier |
| **stop** | StopAppModel | Full stop model |
| **accessTime** | Long | Last access timestamp |
| **accessCount** | Int | Access count |
| **label** | String? | Custom label |

---

## Business Rules

| Rule | Description | Enforced By |
|------|-------------|-------------|
| **Debounce queries** | 300ms delay before API call | UniversalPickerComponent |
| **City-scoped recents** | Only show recents for current city | FetchRecentSearchItems |
| **Fallback to offline** | Use local data when offline | UniversalSearchManager |
| **Result limits** | Cap results for performance | All fetch use cases |
| **Favorites first** | Show favorites before recents | Universal Picker |
| **Proximity sorting** | Sort by distance to user | FetchRemoteSearchResult |

---

## Sequence Diagrams

### Remote Search Sequence

```mermaid
sequenceDiagram
    participant UI as Universal Picker
    participant UC as FetchRemoteSearchUseCase
    participant City as CityProvider
    participant Loc as LocationManager
    participant Repo as TrackingRepository
    participant API as Search API

    UI->>UC: invoke(query, filters)
    UC->>City: getCurrentCity()
    City-->>UC: CityAppModel
    UC->>Loc: getLastKnownLocation()
    Loc-->>UC: LatLng

    UC->>UC: Build request with context
    UC->>Repo: fetchAutocompleteResults()
    Repo->>API: GET /search/v1/autocomplete
    API-->>Repo: AutoCompleteResponse

    Repo->>Repo: Map to app model
    Repo-->>UC: SearchedResultItemsAppModel
    UC-->>UI: Success(results)
```

### Recent Items Flow

```mermaid
sequenceDiagram
    participant UI as Universal Picker
    participant UC as FetchRecentUseCase
    participant Places as PlaceRecentRepo
    participant Stops as StopRecentRepo
    participant Routes as RouteRecentRepo
    participant Trips as TripRecentRepo

    UI->>UC: invoke()

    par Fetch all recents
        UC->>Places: getRecentForCity()
        UC->>Stops: getRecentForCity()
        UC->>Routes: getRecentForCity()
        UC->>Trips: getRecentForCity()
    end

    Places-->>UC: Flow<List<Place>>
    Stops-->>UC: Flow<List<Stop>>
    Routes-->>UC: Flow<List<Route>>
    Trips-->>UC: Flow<List<Trip>>

    UC->>UC: Combine and sort by time
    UC-->>UI: Flow<List<RecentItem>>
```

---

## Error Handling

### Search Errors

| Error Code | Error Type | Recovery |
|------------|------------|----------|
| 400 | InvalidRequestData | Show validation error |
| 408 | Timeout | Show timeout + retry |
| 500 | API | Show server error + retry |
| — | Local | Show generic error |
| — | ResponseParsing | Show generic error |

### Fallback Strategy

```mermaid
flowchart TD
    Search["User searches"]
    CheckNetwork{Network available?}
    RemoteSearch["Call remote API"]
    OfflineSearch["Search local data"]
    RemoteSuccess{Success?}
    ShowResults["Show results"]
    ShowOfflineResults["Show offline results"]
    ShowError["Show error"]

    Search --> CheckNetwork
    CheckNetwork -->|Yes| RemoteSearch
    CheckNetwork -->|No| OfflineSearch
    RemoteSearch --> RemoteSuccess
    RemoteSuccess -->|Yes| ShowResults
    RemoteSuccess -->|No| OfflineSearch
    OfflineSearch --> ShowOfflineResults
```
