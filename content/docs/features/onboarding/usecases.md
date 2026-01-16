---
feature: onboarding
layer: domain
lastUpdated: 2026-01-16
sourceCommit: null
---

# Onboarding — UseCase Documentation

## Domain Layer Overview

The domain layer orchestrates city selection, language configuration, and location-based city detection. Use cases coordinate repository operations, manage city state transitions, and handle post-city-change side effects.

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer"]
        Language["Language Selection"]
        CityLoc["City Location Selection"]
        CitySelect["City Selection"]
    end

    subgraph Domain["Domain Layer"]
        UpdateCity["UpdateCurrentCityUseCase"]
        ProcessCity["ProcessCityChangeUseCase"]
        FetchMeta["FetchCityMetaDataUseCase"]
        FetchList["FetchBasicCityInfoListUseCase"]
        CityProvider["CityProviderImpl"]
        MetaManager["CityMetaDataManagerImpl"]
        PostChange["PostCityChangeOperationExecutor"]
    end

    subgraph Data["Data Layer"]
        LocalDS["CityMetaPropsLocalDataSource"]
        RemoteDS["CityMetaPropsRemoteDataSource"]
    end

    Language --> CityLoc
    CityLoc --> UpdateCity
    CityLoc --> FetchMeta
    CitySelect --> UpdateCity
    UpdateCity --> CityProvider
    ProcessCity --> CityProvider
    ProcessCity --> PostChange
    FetchMeta --> MetaManager
    FetchList --> MetaManager
    MetaManager --> LocalDS
    MetaManager --> RemoteDS
    CityProvider --> LocalDS
```

---

## Use Case Inventory

| Use Case | Purpose | Called From |
|----------|---------|-------------|
| **UpdateCurrentCity** | Mark city as selected in local storage | City Location, City Selection |
| **ProcessCityChange** | Execute post-city-change operations | After city selection |
| **FetchCityMetaData** | Fetch full city metadata from server | City Location, City Selection |
| **FetchBasicCityInfoList** | Fetch lightweight city list | City Selection |
| **GetLocationDisclaimerStepsAndLottieType** | Get location education content | Location Disclaimer |

---

## Update Current City

**Responsibility:** Marks a city as the currently selected city in local storage, triggering the city provider to emit the new city.

### Update Flow

```mermaid
flowchart TD
    Start["invoke(city: CityAppModel)"]
    MarkSelected["LocalDataSource.markAsSelectedCity()"]
    EmitChange["CityProvider emits new city"]
    TriggerProcess["ProcessCityChangeUseCase triggered"]
    Complete["City update complete"]

    Start --> MarkSelected
    MarkSelected --> EmitChange
    EmitChange --> TriggerProcess
    TriggerProcess --> Complete
```

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| **city** | CityAppModel | Yes | City to set as current |

### City Provider Reaction

When a city is marked as selected, the CityProvider:
1. Reads the new city ID from DataStore flow
2. Retrieves cached CityAppModel for that ID
3. Emits the new city via StateFlow
4. ProcessCityChangeUseCase observes the change

---

## Process City Change

**Responsibility:** Orchestrates all side effects that must occur when the user's city changes, including API base URL updates, cache clearing, and analytics setup.

### Process Flow

```mermaid
flowchart TD
    Start["invoke(targetCity: CityAppModel)"]
    RecordStart["Record city change start"]
    MonitorFlow["Monitor CityProvider.currentCity"]
    WaitMatch{Current matches target?}
    EmitProgress["Emit InProgress"]
    ExecuteOps["Execute post-change operations"]
    EmitComplete["Emit CityUpdated"]
    Return["Return Flow<CityChangeProcessResult>"]

    Start --> RecordStart
    RecordStart --> MonitorFlow
    MonitorFlow --> WaitMatch
    WaitMatch -->|No| EmitProgress
    EmitProgress --> WaitMatch
    WaitMatch -->|Yes| ExecuteOps
    ExecuteOps --> EmitComplete
    EmitComplete --> Return
```

### Output Types

| Result | Meaning | Contains |
|--------|---------|----------|
| **InProgress** | City change in progress | — |
| **CityUpdated** | City successfully changed | CityAppModel |

### Post-Change Operations

The `PostCityChangeOperationExecutor` runs these operations in sequence:

```mermaid
flowchart TD
    Start["Post-Change Operations"]
    Op1["BASE_URL_UPDATE<br/>Update API base URL"]
    Op2["CLEAR_PRODUCTS_DATA<br/>Clear cached products"]
    Op3["SETUP_ANALYTICS<br/>Refresh analytics context"]
    Op4["SETUP_CRASHLYTICS<br/>Update crash reporting"]
    Complete["Operations Complete"]

    Start --> Op1
    Op1 --> Op2
    Op2 --> Op3
    Op3 --> Op4
    Op4 --> Complete
```

### Operation Details

| Operation | Purpose | Impact |
|-----------|---------|--------|
| **BASE_URL_UPDATE** | Switch API endpoints to city-specific domain | All future API calls use new domain |
| **CLEAR_PRODUCTS_DATA** | Remove cached tickets, passes, wallet data | User sees fresh product data |
| **SETUP_ANALYTICS** | Update analytics with city context | Events tagged with new city |
| **SETUP_CRASHLYTICS_PROPERTIES** | Update crash reporting metadata | Crashes include city info |

### City Change Tracking

The `CityChangeOperationTracker` records:

| Field | Description |
|-------|-------------|
| **startTime** | When city change initiated |
| **targetCityId** | City being changed to |
| **operationsCompleted** | List of completed operations |
| **endTime** | When all operations finished |

---

## Fetch City Meta Data

**Responsibility:** Fetches complete city metadata from server and caches it locally.

### Fetch Flow

```mermaid
flowchart TD
    Start["invoke(cityId: String)"]
    BuildRequest["Build request with user properties"]
    CallAPI["GET /scheduler_v4/v1/{city}/metadataprops"]
    CheckResponse{Response valid?}
    ParseJSON["Parse metadata JSON"]
    CacheData["Cache in local storage"]
    ReturnSuccess["Return Success(cityMeta, cityList)"]
    MapError["Map to error type"]
    ReturnError["Return Failure(error)"]

    Start --> BuildRequest
    BuildRequest --> CallAPI
    CallAPI --> CheckResponse
    CheckResponse -->|Yes| ParseJSON
    CheckResponse -->|No| MapError
    ParseJSON --> CacheData
    CacheData --> ReturnSuccess
    MapError --> ReturnError
```

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| **cityId** | String | Yes | City identifier |

### Request Properties

The request includes user metadata:

| Property | Source | Purpose |
|----------|--------|---------|
| **appVer** | Build config | Version compatibility |
| **userId** | Session | User-specific config |
| **city** | Previous city | Migration context |
| **model** | Device info | Device-specific config |
| **osVersion** | System | OS compatibility |
| **language** | Settings | Localized content |
| **platform** | System | Android/iOS |

### Output Types

| Result | Meaning | Contains |
|--------|---------|----------|
| **Success** | Metadata fetched | (cityMetaJSON, cityListJSON) |
| **CityNotServiceable** | City no longer available | — |
| **CityIdNotAvailable** | Invalid city ID | — |
| **CityMetaDataFetchError** | Network or parse error | Error message |

### Error Mapping

```mermaid
flowchart TD
    Response["API Response"]
    Check1{Status 200?}
    Check2{Valid JSON?}
    Check3{City active?}
    Success["Return Success"]
    NotServiceable["CityNotServiceable"]
    ParseError["CityMetaDataFetchError"]
    NetworkError["CityMetaDataFetchError"]

    Response --> Check1
    Check1 -->|No| NetworkError
    Check1 -->|Yes| Check2
    Check2 -->|No| ParseError
    Check2 -->|Yes| Check3
    Check3 -->|Yes| Success
    Check3 -->|No (discontinued)| NotServiceable
```

---

## Fetch Basic City Info List

**Responsibility:** Fetches lightweight city list for city selection screen.

### Fetch Flow

```mermaid
flowchart TD
    Start["invoke()"]
    CallAPI["GET /scheduler_v4/cityList"]
    CheckResponse{Response valid?}
    ParseJSON["Parse city list JSON"]
    CacheData["Cache in local storage"]
    ReturnSuccess["Return Success(jsonString)"]
    MapError["Map to error type"]
    ReturnError["Return Failure(error)"]

    Start --> CallAPI
    CallAPI --> CheckResponse
    CheckResponse -->|Yes| ParseJSON
    CheckResponse -->|No| MapError
    ParseJSON --> CacheData
    CacheData --> ReturnSuccess
    MapError --> ReturnError
```

### Output Types

| Result | Meaning | Contains |
|--------|---------|----------|
| **Success** | List fetched | JSON string |
| **FetchBasicCityInfoListError** | Fetch failed | Error message |

---

## City Meta Data Manager

**Responsibility:** Coordinates fetching, caching, and location-based city detection. Acts as the primary interface for city data operations.

### Manager Operations

| Method | Purpose | Returns |
|--------|---------|---------|
| **fetchCityIdAndCityNameForLocation** | Find city from GPS coordinates | CityIdAndName or null |
| **fetchAndCacheCityMetaData** | Fetch and store city metadata | CityAppModel or error |
| **fetchAndCacheBasicCityInfoList** | Fetch and store city list | List or error |

### Location-Based City Detection

```mermaid
flowchart TD
    Start["fetchCityIdAndCityNameForLocation(latLng)"]
    GetCachedList["Get cached city list"]
    HasList{List available?}
    FetchList["Fetch city list from server"]
    IterateCities["For each city"]
    CheckBounds{Location in polyBound?}
    FoundCity["Return cityId + cityName"]
    NextCity["Try next city"]
    NoMatch["Return null"]

    Start --> GetCachedList
    GetCachedList --> HasList
    HasList -->|No| FetchList
    FetchList --> IterateCities
    HasList -->|Yes| IterateCities
    IterateCities --> CheckBounds
    CheckBounds -->|Yes| FoundCity
    CheckBounds -->|No| NextCity
    NextCity --> IterateCities
    NextCity -->|No more| NoMatch
```

### Polygon Bounds Check

Cities have `polyBound` - a list of coordinates defining the city's service area:

| Check | Method |
|-------|--------|
| **Point in polygon** | Ray casting algorithm |
| **Boundary check** | Coordinate comparison |
| **Multiple polygons** | Check each until match |

---

## City Provider

**Responsibility:** Manages current city state as a reactive StateFlow, providing the single source of truth for the app's current city.

### Provider Interface

| Property/Method | Type | Description |
|-----------------|------|-------------|
| **currentCity** | StateFlow<CityAppModel?> | Current city stream |
| **getCityId()** | String? | Synchronous city ID access |
| **setCityChangePromptCurrentSession()** | Unit | Mark city change shown |

### State Flow

```mermaid
flowchart TD
    LocalDS["LocalDataSource<br/>(cityId flow)"]
    CityProvider["CityProviderImpl"]
    StateFlow["currentCity: StateFlow"]
    Observers["All city-dependent components"]

    LocalDS -->|"cityId changes"| CityProvider
    CityProvider -->|"lookup CityAppModel"| StateFlow
    StateFlow -->|"emit"| Observers
```

### City Resolution

When city ID changes in storage:
1. Provider observes the DataStore flow
2. Retrieves cached CityAppModel for ID
3. If found, emits the model
4. If not found, emits null (triggers re-fetch)

---

## Language Feature

**Responsibility:** Manages language selection state, available languages, and locale updates.

### Feature Interface

| Property/Method | Type | Description |
|-----------------|------|-------------|
| **currentLanguage** | StateFlow<Language> | Current language |
| **availableLanguages** | List<Language> | All languages |
| **getLanguageName(language)** | String | Display name |
| **updateCurrentLanguage(language)** | Unit | Change language |
| **setLanguageSelected(selected)** | Unit | Mark selection done |
| **isLanguageSelected()** | Flow<Boolean> | Selection state |

### Language Update Flow

```mermaid
flowchart TD
    Select["User selects language"]
    CheckInstalled{Module installed?}
    StartInstall["SplitInstallHandler.startInstall()"]
    WaitInstall["Wait for installation"]
    InstallResult{Installed?}
    UpdateLocale["Update device locale"]
    SavePref["Save language preference"]
    MarkSelected["setLanguageSelected(true)"]
    RefreshConfig["Refresh Chalo config"]
    Complete["Language change complete"]
    KeepCurrent["Keep current language"]

    Select --> CheckInstalled
    CheckInstalled -->|Yes| UpdateLocale
    CheckInstalled -->|No| StartInstall
    StartInstall --> WaitInstall
    WaitInstall --> InstallResult
    InstallResult -->|Yes| UpdateLocale
    InstallResult -->|No| KeepCurrent
    UpdateLocale --> SavePref
    SavePref --> MarkSelected
    MarkSelected --> RefreshConfig
    RefreshConfig --> Complete
```

---

## Get Location Disclaimer Steps

**Responsibility:** Provides step-by-step instructions and Lottie animation for location permission education.

### Output Structure

| Field | Type | Description |
|-------|------|-------------|
| **steps** | List<StepUIState> | Instruction steps |
| **lottieResource** | LottieResource | Animation resource |

### Step UI State

| Field | Type | Description |
|-------|------|-------------|
| **stepNumber** | Int | Step order |
| **title** | String | Step title |
| **description** | String | Step instructions |
| **icon** | IconResource | Step icon |

---

## Domain Models

### City App Model

| Field | Type | Description |
|-------|------|-------------|
| **name** | String | City identifier |
| **displayName** | String | User-facing name |
| **bounds** | LatLngBounds | Geographic boundaries |
| **cityCenter** | LatLng | Center coordinates |
| **modes** | List<ChaloTransitMode> | Available transit types |
| **lineMaps** | List<LineMap> | Map resources |
| **busMapUrl** | String? | Bus network map |
| **modeAndAgencyList** | List<ModeMapInfoAppModel> | Agencies per mode |
| **isBetaCity** | Boolean | Beta status |
| **isComingSoonCity** | Boolean | Coming soon flag |
| **isCityDiscontinued** | Boolean | Discontinued flag |
| **timezoneId** | String | City timezone |
| **countryInfo** | CountryInfo | Country details |
| **currencyInfo** | CurrencyInfo | Currency details |
| **polyBounds** | List<LatLng> | Service area polygon |
| **minAppVersionForLogin** | Int | Required app version |

### City App Model Helpers

| Method | Returns | Purpose |
|--------|---------|---------|
| **agencyListWithActiveProducts** | List<Agency> | Agencies with products |
| **agencyListForMode(mode)** | List<Agency> | Agencies for transit mode |
| **containsLocation(latLng)** | Boolean | Check if in service area |
| **isOndcProductAvailableForTransitMode(mode)** | Boolean | ONDC availability |

### Basic City Info App Model

| Field | Type | Description |
|-------|------|-------------|
| **cityId** | String | City identifier |
| **cityName** | String | Display name |
| **isBetaCity** | Boolean | Beta status |
| **isComingSoonCity** | Boolean | Coming soon flag |
| **isCityDiscontinued** | Boolean | Discontinued flag |

### Language Details

| Field | Type | Description |
|-------|------|-------------|
| **code** | String | Language code (en, hi, etc.) |
| **name** | String | English name |
| **nativeName** | String | Name in native script |
| **isInstalled** | Boolean | Module installed (Android) |

---

## Business Rules

| Rule | Description | Enforced By |
|------|-------------|-------------|
| **City must be active** | Discontinued cities cannot be selected | FetchCityMetaData |
| **Language selection required** | Must select before city selection | Splash routing |
| **Post-change operations required** | Must execute all operations on city change | ProcessCityChange |
| **Polygon bounds check** | GPS location must be in city polygon | CityMetaDataManager |
| **Welcome screen duration** | Minimum 2 seconds display | CityLocationSelection |
| **Search debounce** | 300ms delay on city search | CitySelection |

---

## Sequence Diagrams

### GPS-Based City Selection

```mermaid
sequenceDiagram
    participant UI as CityLocationSelection
    participant Loc as LocationManager
    participant Meta as CityMetaDataManager
    participant Fetch as FetchCityMetaDataUseCase
    participant Update as UpdateCurrentCityUseCase
    participant Process as ProcessCityChangeUseCase

    UI->>Loc: getLocationUpdates()
    Loc-->>UI: LocationReceived(latLng)

    UI->>Meta: fetchCityIdAndCityNameForLocation(latLng)
    Meta->>Meta: Check polyBounds for each city
    Meta-->>UI: CityIdAndName(cityId, cityName)

    UI->>Fetch: invoke(cityId)
    Fetch-->>UI: Success(metadata)

    UI->>Update: invoke(cityAppModel)
    Update-->>UI: City marked selected

    UI->>Process: invoke(cityAppModel)
    Process-->>UI: InProgress
    Note over Process: Execute post-change ops
    Process-->>UI: CityUpdated(city)

    UI->>UI: Navigate to Home
```

### Language Installation (Android)

```mermaid
sequenceDiagram
    participant UI as LanguageSelection
    participant Split as SplitInstallHandler
    participant Lang as LanguageFeature
    participant Config as ChaloConfigManager

    UI->>Split: startInstall([languageCode])
    Split-->>UI: Installation started

    loop Monitor Progress
        Split-->>UI: SplitInstallResult
        Note over UI: Update loading dialog
    end

    alt Installation Success
        Split-->>UI: Installed
        UI->>Lang: updateCurrentLanguage(language)
        Lang->>Lang: Update device locale
        UI->>Lang: setLanguageSelected(true)
        UI->>Config: refreshConfig()
        Config-->>UI: Config refreshed
        UI->>UI: Navigate to next screen
    else Installation Failed
        Split-->>UI: Failed(error)
        UI->>UI: Show error snackbar
    end
```

---

## Error Handling

### City Fetch Errors

| Error | Cause | User Impact |
|-------|-------|-------------|
| **CityNotServiceable** | City discontinued | Show discontinued screen |
| **CityIdNotAvailable** | Invalid city ID | Show error, suggest search |
| **CityMetaDataFetchError** | Network/parse error | Show retry option |

### Language Errors

| Error | Cause | User Impact |
|-------|-------|-------------|
| **LanguageDownloadFailed** | Split install failure | Snackbar, keep current |
| **ChaloConfigFetchFailed** | Config refresh failure | Snackbar, allow retry |

### Location Errors

| Error | Cause | User Impact |
|-------|-------|-------------|
| **Permission denied** | User rejected | Show manual selection |
| **GPS disabled** | Device GPS off | Show enable GPS dialog |
| **Location timeout** | GPS couldn't get fix | Show manual selection |
| **No city match** | Outside service area | Show "not available" screen |
