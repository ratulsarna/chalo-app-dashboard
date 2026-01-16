---
feature: trip-planner
layer: data
lastUpdated: 2026-01-16
sourceCommit: null
---

# Trip Planner — Repository Documentation

## Data Layer Overview

The Trip Planner feature follows a clean data layer architecture with clear separation between repository interfaces, implementations, remote data sources, and data models. The data flow supports two primary API endpoints: the standard trip planner API (v5) for location-based searches, and a bus-wise arrival API (v6) for stop-based searches with embedded live arrival information.

```mermaid
flowchart TB
    subgraph Domain["Domain Layer"]
        UC1["MakeTripPlannerCallUseCase"]
        UC2["MakeTripPlannerWithBusArrivalCallUseCase"]
    end

    subgraph Repository["Repository Layer"]
        RepoInterface["TripPlannerRepository"]
        RepoImpl["TripPlannerRepositoryImpl"]
    end

    subgraph DataSource["Data Source Layer"]
        DSInterface["TripPlannerRemoteDataSource"]
        DSImpl["TripPlannerRemoteDataSourceImpl"]
    end

    subgraph Network["Network Layer"]
        NetworkManager["NetworkManager"]
        V5API["scheduler_v4/v5/{CITY}/tripplanner"]
        V6API["scheduler_v4/v6/{CITY}/tripplanner/bus-wise"]
    end

    subgraph Models["Model Layer"]
        APIReq["TripPlannerRequestApiModel"]
        APIResp["TripPlannerResultApiResponseModel"]
        AppResp["TripPlannerResultAppResponseModel"]
        Mappers["toAppModel() mappers"]
    end

    UC1 --> RepoInterface
    UC2 --> RepoInterface
    RepoInterface -.-> RepoImpl
    RepoImpl --> DSInterface
    DSInterface -.-> DSImpl
    DSImpl --> NetworkManager
    NetworkManager --> V5API
    NetworkManager --> V6API

    V5API --> APIResp
    V6API --> APIResp
    APIResp --> Mappers
    Mappers --> AppResp
```

---

## Repository Interfaces

### TripPlannerRepository

The main repository interface defines two methods for trip planning searches, supporting both location-based and stop-based flows.

**File Path:** `tripplanner/data/repository/TripPlannerRepository.kt`

| Method | Parameters | Return Type | Throws |
|--------|------------|-------------|--------|
| **makeTripPlannerCall** | `MakeTripPlannerRequestData` | `TripPlannerResultAppResponseModel` | `TripPlannerCallFailedException`, `CancellationException` |
| **makeTripPlannerCallWithArrival** | `TripPlannerRequestAppModel` | `TripPlannerResultAppResponseModel` | `TripPlannerCallFailedException`, `CancellationException` |

The dual-method design supports:
1. **Location-based searches** via `makeTripPlannerCall` - Uses GET with query parameters (v5 endpoint)
2. **Stop-based searches with arrivals** via `makeTripPlannerCallWithArrival` - Uses POST with request body (v6 endpoint)

---

## Repository Implementation

### TripPlannerRepositoryImpl

**File Path:** `tripplanner/data/repository/TripPlannerRepositoryImpl.kt`

**Dependencies:**

| Dependency | Type | Purpose |
|------------|------|---------|
| **remoteDataSource** | `TripPlannerRemoteDataSource` | Network communication |
| **basicInfoContract** | `BasicInfoContract` | Device ID for meta information |

### Method: makeTripPlannerCall

Handles location-based trip planning with extensive query parameters.

```mermaid
sequenceDiagram
    participant UC as UseCase
    participant Repo as TripPlannerRepositoryImpl
    participant DS as RemoteDataSource
    participant API as TripPlanner API

    UC->>Repo: makeTripPlannerCall(requestData)
    Repo->>Repo: Build meta JSON string
    Repo->>Repo: Convert transitMode to API string
    Repo->>DS: makeTripPlannerCall(params)
    DS->>API: GET /scheduler_v4/v5/{CITY}/tripplanner
    API-->>DS: TripPlannerResultApiResponseModel
    DS-->>Repo: API Response
    Repo->>Repo: response.toAppModel()
    Repo-->>UC: TripPlannerResultAppResponseModel
```

**Meta String Construction:**

The repository constructs a JSON meta string using `TrackingUtils.userPropJsonObjectForTripPlanner()` containing:

| Field | Source |
|-------|--------|
| **userId** | Request data |
| **deviceId** | BasicInfoContract.getDeviceId() |
| **currentLanguage** | Request data |
| **versionCode** | Request data |
| **city** | Request data |
| **androidModel** | Request data |
| **osVersion** | Request data |

### Method: makeTripPlannerCallWithArrival

Handles stop-based searches with bus arrival information embedded in the response.

```mermaid
sequenceDiagram
    participant UC as UseCase
    participant Repo as TripPlannerRepositoryImpl
    participant DS as RemoteDataSource
    participant API as Bus-Wise API

    UC->>Repo: makeTripPlannerCallWithArrival(requestData)
    Repo->>Repo: requestData.toApiModel()
    Repo->>DS: makeTripPlannerCallWithArrival(apiModel)
    DS->>API: POST /scheduler_v4/v6/{CITY}/tripplanner/bus-wise
    Note over API: Response includes arrivalInfo for bus legs
    API-->>DS: TripPlannerResultApiResponseModel
    DS-->>Repo: API Response
    Repo->>Repo: response.toAppModel()
    Repo-->>UC: TripPlannerResultAppResponseModel
```

---

## Data Sources

### TripPlannerRemoteDataSource Interface

**File Path:** `tripplanner/data/remote/TripPlannerRemoteDataSource.kt`

| Method | HTTP Method | Parameters |
|--------|-------------|------------|
| **makeTripPlannerCall** | GET | Location coords, time, mode, meta, itinerary type, optional stop IDs |
| **makeTripPlannerCallWithArrival** | POST | Request API model |

### TripPlannerRemoteDataSourceImpl

**File Path:** `tripplanner/data/remote/TripPlannerRemoteDataSourceImpl.kt`

**Dependencies:**

| Dependency | Type | Purpose |
|------------|------|---------|
| **networkManager** | `NetworkManager` | HTTP request execution |
| **genericNetworkExceptionMapper** | `GenericNetworkExceptionMapper` | Error transformation |
| **cityProvider** | `CityProvider` | Current city name for URL path |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `scheduler_v4/v5/{CITY}/tripplanner` | GET | Standard trip planner |
| `scheduler_v4/v6/{CITY}/tripplanner/bus-wise` | POST | Trip planner with bus arrivals |

The `{CITY}` placeholder is replaced with the uppercase city name from `CityProvider`.

### GET Endpoint Query Parameters

| Parameter | Query Key | Type | Description |
|-----------|-----------|------|-------------|
| **fromLatLng** | `from_lat`, `from_lon` | Double | Origin coordinates |
| **toLatLng** | `to_lat`, `to_lon` | Double | Destination coordinates |
| **mode** | `mode` | String | Transit mode (BUS, METRO, TRANSIT) |
| **startTimeElapsedFromMidnight** | `start_time` | Long | Departure time offset in seconds |
| **day** | `day` | String | Day of week identifier |
| **meta** | `meta` | String | JSON metadata string |
| **startTimeMillis** | `startTimeMillis` | Long | Absolute departure timestamp |
| **itineraryType** | `itinerary_type` | String | DIRECT, HOP, etc. |
| **startStopId** | `from_stop_id` | String? | Optional origin stop ID |
| **endStopId** | `to_stop_id` | String? | Optional destination stop ID |
| **skipWalkAndAutoLegs** | - | - | When true, sets `max_walk_distance=0` and `max_taxi_distance=0` |

### POST Endpoint Request Body

The `TripPlannerRequestApiModel` contains all parameters in a structured JSON body rather than query parameters, used for the bus-wise endpoint.

### Response Processing Flow

```mermaid
flowchart TD
    Response["Network Response"]
    CheckSuccess{"isSuccess?"}
    Parse["getSuccessResponseOrThrowParseException"]
    CheckStatus{"status == OK?"}
    ReturnResult["Return Response"]
    MapNetworkError["genericNetworkExceptionMapper.invoke"]
    ThrowStatusFailed["Throw TripPlannerCallFailedException"]
    ThrowMappedError["Throw Mapped Exception"]

    Response --> CheckSuccess
    CheckSuccess -->|Yes| Parse
    CheckSuccess -->|No| MapNetworkError
    Parse --> CheckStatus
    CheckStatus -->|Yes| ReturnResult
    CheckStatus -->|No| ThrowStatusFailed
    MapNetworkError --> ThrowMappedError
```

---

## Data Models

### Request Models

#### MakeTripPlannerRequestData

Used for location-based trip planner calls via the v5 GET endpoint.

| Field | Type | Description |
|-------|------|-------------|
| **fromLatLng** | `LatLng` | Origin coordinates |
| **toLatLng** | `LatLng` | Destination coordinates |
| **day** | `String` | Day of week identifier |
| **transitMode** | `ChaloTransitMode` | BUS, METRO, or ALL |
| **startTimeElapsedFromMidnight** | `Long` | Time offset in seconds from midnight |
| **startTimeMillis** | `Long` | Absolute timestamp for departure |
| **itineraryType** | `TripPlannerItineraryType` | DIRECT, HOP, BUS_WISE |
| **startStopId** | `String?` | Optional origin stop ID |
| **endStopId** | `String?` | Optional destination stop ID |
| **skipWalkAndAutoLegs** | `Boolean` | Exclude walk/auto segments |
| **userId** | `String?` | User identifier for tracking |
| **currentLanguage** | `String` | App language |
| **versionCode** | `Int` | App version code |
| **city** | `String` | City name |
| **androidModel** | `String` | Device model |
| **osVersion** | `String` | OS version string |

#### TripPlannerRequestAppModel

Used for POST requests to the bus-wise v6 endpoint. Contains similar fields structured for JSON body.

#### TripPlannerItineraryType Enum

| Value | API String | Description |
|-------|------------|-------------|
| `DIRECT` | `"direct"` | Single-leg routes only |
| `HOP` | `"hop"` | Multi-leg connecting routes |
| `BUS_WISE` | `"bus_wise"` | Routes with embedded arrival times |

### Response Models

#### TripPlannerResultAppResponseModel

| Field | Type | Description |
|-------|------|-------------|
| **itineraries** | `List<TripPlannerItineraryAppResponseModel>` | Primary search results |
| **nearbyStopsAvailable** | `Boolean?` | Indicates if nearby alternatives exist |
| **fromNearbyStopsResult** | `List<TripPlannerItineraryAppResponseModel>?` | Results from nearby origin stops |
| **toNearbyStopsResult** | `List<TripPlannerItineraryAppResponseModel>?` | Results from nearby destination stops |

#### TripPlannerItineraryAppResponseModel

| Field | Type | Description |
|-------|------|-------------|
| **localId** | `String` | Unique itinerary identifier |
| **legs** | `List<TripPlannerLegAppModel>` | Journey segments |
| **travelTimeInSeconds** | `Double?` | Total journey duration |
| **totalFare** | `Double?` | Combined fare in rupees |
| **incompleteFare** | `Boolean` | True if fare calculation is incomplete |
| **rank** | `Int` | Sorting rank from API |

### Leg Models

The `TripPlannerLegAppModel` is a sealed class with variants for each transport mode.

```mermaid
classDiagram
    class TripPlannerLegAppModel {
        <<sealed>>
        +polyline: String?
        +fromLatLng: LatLng?
        +toLatLng: LatLng?
        +travelTimeInSeconds: Double?
        +isRelevantPrimaryLeg() Boolean
    }

    class Bus {
        +routeId: String
        +routeName: String
        +firstStop: StopAppModel
        +lastStop: StopAppModel
        +intermediateStopsInfo: List~IntermediateStopInfo~
        +routeSchemeType: RouteSchemeType
        +via: String?
        +fare: Double?
        +scheduledTimeInfo: ScheduledTimeInfo?
        +frequencyInfo: FrequencyInfo?
        +routeType: RouteServiceType
        +tags: List~String~
        +arrivalInfo: BusArrivalInfo?
    }

    class Metro {
        +routeId: String
        +routeName: String
        +firstStop: StopAppModel
        +lastStop: StopAppModel
        +intermediateStopsInfo: List~IntermediateStopInfo~
        +routeColorName: String?
        +routeColourHex: String?
        +scheduledTimeInfo: ScheduledTimeInfo?
        +frequencyInfo: FrequencyInfo?
    }

    class Walk {
        +distanceInMetres: Double?
    }

    class Auto {
        +distanceInMetres: Double?
        +fare: Double?
    }

    class Taxi {
        +distanceInMetres: Double?
        +fare: Double?
    }

    class Railway
    class Ferry
    class MonoRail

    TripPlannerLegAppModel <|-- Bus
    TripPlannerLegAppModel <|-- Metro
    TripPlannerLegAppModel <|-- Walk
    TripPlannerLegAppModel <|-- Auto
    TripPlannerLegAppModel <|-- Taxi
    TripPlannerLegAppModel <|-- Railway
    TripPlannerLegAppModel <|-- Ferry
    TripPlannerLegAppModel <|-- MonoRail
```

#### Bus Leg Details

| Field | Type | Description |
|-------|------|-------------|
| **routeId** | `String` | Unique route identifier |
| **routeName** | `String` | Display route number |
| **firstStop** | `StopAppModel` | Boarding stop details |
| **lastStop** | `StopAppModel` | Alighting stop details |
| **intermediateStopsInfo** | `List<IntermediateStopInfo>` | All stops on this leg |
| **routeSchemeType** | `RouteSchemeType` | Badge styling type |
| **via** | `String?` | Via location text |
| **fare** | `Double?` | Leg fare in rupees |
| **scheduledTimeInfo** | `ScheduledTimeInfo?` | Scheduled departure time |
| **frequencyInfo** | `FrequencyInfo?` | Service frequency |
| **routeType** | `RouteServiceType` | PREMIUM or REGULAR |
| **tags** | `List<String>` | Route tags (AC, EXPRESS) |
| **arrivalInfo** | `BusArrivalInfo?` | Live arrival data (v6 only) |

#### Bus Arrival Information

When using the bus-wise API (v6), bus legs include `BusArrivalInfo`:

| Field | Type | Description |
|-------|------|-------------|
| **vehicleNumber** | `String` | Bus identifier for tracking |
| **arrivalTimeInSeconds** | `Long` | ETA at boarding stop |
| **arrivalTimeStamp** | `Long` | Timestamp of ETA calculation |

#### Metro Leg Details

| Field | Type | Description |
|-------|------|-------------|
| **routeId** | `String` | Metro line route ID |
| **routeName** | `String` | Line display name |
| **firstStop** | `StopAppModel` | Boarding station |
| **lastStop** | `StopAppModel` | Alighting station |
| **intermediateStopsInfo** | `List<IntermediateStopInfo>` | All stations on leg |
| **routeColorName** | `String?` | Metro line color name |
| **routeColourHex** | `String?` | Hex color for UI styling |
| **scheduledTimeInfo** | `ScheduledTimeInfo?` | Scheduled time |
| **frequencyInfo** | `FrequencyInfo?` | Service frequency |

### Stop Information

#### StopAppModel

| Field | Type | Description |
|-------|------|-------------|
| **stopId** | `String` | Stop identifier |
| **stopName** | `String` | Display name |
| **stopLocation** | `LatLng` | Geographic coordinates |

#### IntermediateStopInfo

| Field | Type | Description |
|-------|------|-------------|
| **stopId** | `String` | Stop identifier |
| **stopName** | `String` | Display name |
| **stopLocation** | `LatLng` | Geographic coordinates |

### Schedule Information

#### ScheduledTimeInfo

| Field | Type | Description |
|-------|------|-------------|
| **scheduledTime** | `String` | Formatted departure time |
| **disclaimer** | `String?` | Timetable note/disclaimer |

#### FrequencyInfo

| Field | Type | Description |
|-------|------|-------------|
| **frequency** | `String` | Formatted frequency string (e.g., "Every 15 mins") |
| **disclaimer** | `String?` | Timetable note/disclaimer |

---

## Model Transformations

### API to App Model Mapping

The transformation layer uses extension functions (`toAppModel()`) to convert network response models to domain-friendly app models.

```mermaid
flowchart LR
    subgraph API["API Models"]
        APIResp["TripPlannerResultApiResponseModel"]
        APIItin["TripPlannerItineraryApiModel"]
        APILeg["TripPlannerLegApiModel"]
    end

    subgraph Mappers["Mapper Extensions"]
        RespMapper["toAppModel()"]
        ItinMapper["toAppModel()"]
        LegMapper["toAppModel()"]
    end

    subgraph App["App Models"]
        AppResp["TripPlannerResultAppResponseModel"]
        AppItin["TripPlannerItineraryAppResponseModel"]
        AppLeg["TripPlannerLegAppModel"]
    end

    APIResp --> RespMapper --> AppResp
    APIItin --> ItinMapper --> AppItin
    APILeg --> LegMapper --> AppLeg
```

### Leg Type Resolution

The mapper resolves leg types based on the `mode` field in the API response:

| API Mode | App Model Type |
|----------|---------------|
| `BUS` | `TripPlannerLegAppModel.Bus` |
| `METRO` | `TripPlannerLegAppModel.Metro` |
| `WALK` | `TripPlannerLegAppModel.Walk` |
| `AUTO`, `AUTO_RICKSHAW` | `TripPlannerLegAppModel.Auto` |
| `TAXI`, `CAB` | `TripPlannerLegAppModel.Taxi` |
| `TRAIN`, `RAILWAY` | `TripPlannerLegAppModel.Railway` |
| `FERRY` | `TripPlannerLegAppModel.Ferry` |
| `MONORAIL` | `TripPlannerLegAppModel.MonoRail` |

### Transit Mode Conversion

The repository converts `ChaloTransitMode` to API string format via `getTransitModeForTripPlannerApiCall()`:

| ChaloTransitMode | API String |
|------------------|------------|
| `BUS` | `"BUS"` |
| `METRO` | `"METRO"` |
| `ALL` | `"TRANSIT"` |

---

## Configuration Models

### TripPlannerConfigModel

City-specific configuration retrieved via `GetTripPlannerConfigForCityUseCase` from city data.

| Field | Type | Description |
|-------|------|-------------|
| **isTripPlannerEnabled** | `Boolean` | Feature toggle for city |
| **enabledTabs** | `List<TripPlannerTabConfig>` | Available filter tabs |
| **defaultTab** | `TripPlannerTabType` | Initial selected tab |
| **hopThresholdForFetch** | `Int?` | Scroll threshold for HOP fetch |
| **showChaloBusTabTooltip** | `Boolean` | Show premium bus tooltip |

### TripPlannerTabConfig

| Field | Type | Description |
|-------|------|-------------|
| **type** | `TripPlannerTabType` | Tab identifier enum |
| **makesApiCall** | `Boolean` | Whether selecting tab triggers API |
| **mode** | `ChaloTransitMode` | Filter mode |
| **numberOfLegs** | `Int` | Leg count filter (-1 for any) |
| **serviceType** | `RouteServiceType` | REGULAR, PREMIUM, or ALL |

### TripPlannerTabType Enum

| Value | Description |
|-------|-------------|
| `ALL` | Show all results |
| `DIRECT` | Single-leg routes only |
| `BUS` | Bus mode only |
| `METRO` | Metro mode only |
| `CHALO_BUS` | Premium bus only |

---

## Error Handling

### TripPlannerCallFailedException

Custom exception thrown when API calls fail:

| Field | Type | Description |
|-------|------|-------------|
| **message** | `String?` | Error description |
| **cause** | `Throwable?` | Underlying exception |

### Error Scenarios

```mermaid
flowchart TD
    subgraph NetworkErrors["Network Errors"]
        Timeout["Request Timeout"]
        NoNetwork["No Network"]
        ServerError["5xx Error"]
    end

    subgraph APIErrors["API Errors"]
        StatusNotOK["Status != OK"]
        ParseFailed["JSON Parse Failed"]
    end

    subgraph Handling["Error Handling"]
        MapException["genericNetworkExceptionMapper.invoke"]
        ThrowTripPlanner["TripPlannerCallFailedException"]
    end

    NetworkErrors --> MapException
    MapException --> ThrowTripPlanner
    APIErrors --> ThrowTripPlanner
```

| Scenario | Detection | Response |
|----------|-----------|----------|
| **Network timeout** | Network response failure | Map via genericNetworkExceptionMapper |
| **No connectivity** | Network response failure | Map via genericNetworkExceptionMapper |
| **Server error (5xx)** | `!isSuccess` | Map via genericNetworkExceptionMapper |
| **API status not OK** | `!status.equals("OK", ignoreCase=true)` | Throw TripPlannerCallFailedException directly |
| **Parse failure** | Exception during JSON parsing | Throw parse exception |

---

## Data Flow Examples

### Location-Based Search (v5 GET)

```mermaid
sequenceDiagram
    participant UI as Component
    participant UC as MakeTripPlannerCallUseCase
    participant Repo as TripPlannerRepositoryImpl
    participant DS as TripPlannerRemoteDataSourceImpl
    participant Net as NetworkManager
    participant API as Trip Planner API

    UI->>UC: invoke(from, to, mode, time)
    UC->>UC: Build MakeTripPlannerRequestData
    UC->>Repo: makeTripPlannerCall(requestData)
    Repo->>Repo: Build meta JSON via TrackingUtils
    Repo->>Repo: Convert transitMode via getTransitModeForTripPlannerApiCall()
    Repo->>DS: makeTripPlannerCall(params...)
    DS->>DS: Build query params map
    DS->>DS: Replace {CITY} in URL
    DS->>Net: GET request with query params
    Net->>API: GET /scheduler_v4/v5/{CITY}/tripplanner?...
    API-->>Net: JSON Response
    Net-->>DS: NetworkResponse
    DS->>DS: Validate isSuccess && status == OK
    DS-->>Repo: TripPlannerResultApiResponseModel
    Repo->>Repo: response.toAppModel()
    Repo-->>UC: TripPlannerResultAppResponseModel
    UC-->>UI: ChaloUseCaseResult.Success
```

### Stop-Based Search with Arrivals (v6 POST)

```mermaid
sequenceDiagram
    participant UI as Component
    participant UC as MakeTripPlannerWithBusArrivalCallUseCase
    participant Repo as TripPlannerRepositoryImpl
    participant DS as TripPlannerRemoteDataSourceImpl
    participant Net as NetworkManager
    participant API as Bus-Wise API

    UI->>UC: invoke(fromStop, toStop, time)
    UC->>UC: Build TripPlannerRequestAppModel
    UC->>Repo: makeTripPlannerCallWithArrival(requestData)
    Repo->>Repo: requestData.toApiModel()
    Repo->>DS: makeTripPlannerCallWithArrival(apiModel)
    DS->>DS: Replace {CITY} in URL
    DS->>Net: POST request with JSON body
    Net->>API: POST /scheduler_v4/v6/{CITY}/tripplanner/bus-wise
    Note over API: Response includes arrivalInfo for bus legs
    API-->>Net: JSON Response with arrivals
    Net-->>DS: NetworkResponse
    DS->>DS: Validate isSuccess && status == OK
    DS-->>Repo: TripPlannerResultApiResponseModel
    Repo->>Repo: response.toAppModel()
    Note over Repo: Bus legs now have vehicleNumber, arrivalTimeInSeconds
    Repo-->>UC: TripPlannerResultAppResponseModel
    UC-->>UI: ChaloUseCaseResult.Success
```

---

## Caching Strategy

The Trip Planner data layer does not implement local caching for search results due to the time-sensitive nature of transit schedules and live arrival data. However, related data is cached through other repositories:

| Data | Cache Location | TTL |
|------|----------------|-----|
| **Trip search results** | None | Real-time only |
| **City config** | CityDataManager | Session |
| **Route info/polylines** | CityDataManager | Session |
| **Recent trips** | RecentTripsRepository | Persistent |

---

## Thread Safety

| Component | Threading Model |
|-----------|-----------------|
| **Repository** | Suspend functions, safe for concurrent calls |
| **Data Source** | Suspend functions, uses NetworkManager's threading |
| **Mappers** | Pure extension functions, thread-safe |

All repository methods are `suspend` functions designed to be called from coroutines, typically dispatched to the IO dispatcher by the use case layer.

---

## Related Repositories

The Trip Planner feature interacts with several other repositories:

| Repository | Module | Purpose |
|------------|--------|---------|
| **CityDataManagerKotlin** | citydata | Route info, polylines, stop data |
| **RecentTripsRepository** | recent | Recent trip history |
| **LiveTrackingDataManager** | livetracking | Real-time bus ETA via CRTS |
