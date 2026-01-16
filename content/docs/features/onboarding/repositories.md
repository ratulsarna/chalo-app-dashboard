---
feature: onboarding
layer: data
lastUpdated: 2026-01-16
sourceCommit: null
---

# Onboarding — Repository Documentation

## Data Layer Overview

The data layer handles city metadata storage, language preferences, and location-based city detection. It follows the **Repository Pattern** with DataStore for local persistence and HTTP endpoints for city data.

```mermaid
flowchart TB
    subgraph Domain["Domain Layer"]
        FetchMeta["FetchCityMetaDataUseCase"]
        FetchList["FetchBasicCityInfoListUseCase"]
        MetaManager["CityMetaDataManagerImpl"]
        CityProvider["CityProviderImpl"]
    end

    subgraph DataSources["Data Sources"]
        LocalDS["CityMetaPropsLocalDataSource"]
        RemoteDS["Network API"]
    end

    subgraph Storage["Storage"]
        DataStore["Preferences DataStore"]
        API["Scheduler API"]
    end

    FetchMeta --> MetaManager
    FetchList --> MetaManager
    MetaManager --> LocalDS
    MetaManager --> RemoteDS
    CityProvider --> LocalDS
    LocalDS --> DataStore
    RemoteDS --> API
```

---

## Repository Operations

| Operation | Description | Data Flow |
|-----------|-------------|-----------|
| **getCurrentSelectedCityId** | Get stored city ID | Local → Return |
| **markAsSelectedCity** | Save city as current | Transform → Local |
| **updateCityMetaDataCacheIfPossible** | Parse and cache city metadata | Transform → Local |
| **updateBasicCityInfoCacheIfPossible** | Parse and cache city list | Transform → Local |
| **getCachedCityMetaPropsFromId** | Retrieve cached city | Local → Transform → Return |
| **getBasicCityInfoList** | Retrieve cached city list | Local → Transform → Return |
| **markCityMetaPropsUpdated** | Set metadata updated flag | Local |
| **isMetaUpdated** | Check if metadata current | Local → Return |

---

## API Endpoints

### Fetch City Metadata

Retrieves complete metadata for a specific city.

| Property | Value |
|----------|-------|
| **Endpoint** | `scheduler_v4/v1/{cityId}/metadataprops` |
| **Method** | GET |
| **Auth** | Not required |
| **Base URL** | MetaPropsUrl from ChaloUrlProvider |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| **appVer** | Int | Yes | App version code |
| **meta** | String (JSON) | Yes | User properties JSON |

**Meta Properties JSON:**

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier (or empty) |
| **city** | String | Current city ID |
| **model** | String | Device model |
| **osVersion** | String | OS version |
| **language** | String | Current language code |
| **platform** | String | "android" or "ios" |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **cityName** | String | City identifier |
| **cityDisplayName** | String | User-facing name |
| **bound** | Object | Geographic bounds |
| **cityCentre** | Object | Center coordinates |
| **stationType** | List<String> | Transit modes |
| **lineMaps** | List<Object> | Map resources |
| **busMapsUrl** | String? | Bus map URL |
| **isBetaCity** | Boolean | Beta flag |
| **isComingSoonCity** | Boolean | Coming soon flag |
| **isCityDiscontinued** | Boolean | Discontinued flag |
| **timezoneId** | String | Timezone identifier |
| **countryId** | String | Country ID |
| **countryName** | String | Country name |
| **countryCallingCode** | String | Phone code |
| **phoneNumberPossibleLengths** | List<Int> | Valid phone lengths |
| **currency** | String | Currency code |
| **currencySymbol** | String | Currency symbol |
| **currencyFactor** | Long | Currency multiplier |
| **chaloBaseDomain** | String | City-specific API domain |
| **modesMap** | List<Object> | Agencies per mode |
| **polyBound** | List<List<Double>> | Service area polygon |
| **minAppVersionForLogin** | Int | Required app version |

**Bound Object:**

| Field | Type | Description |
|-------|------|-------------|
| **southWestLat** | Double | SW latitude |
| **southWestLng** | Double | SW longitude |
| **northEastLat** | Double | NE latitude |
| **northEastLng** | Double | NE longitude |

**City Centre Object:**

| Field | Type | Description |
|-------|------|-------------|
| **lat** | Double | Center latitude |
| **lng** | Double | Center longitude |

**Line Map Object:**

| Field | Type | Description |
|-------|------|-------------|
| **name** | String | Map name |
| **url** | String | Map URL |

**Mode Map Object:**

| Field | Type | Description |
|-------|------|-------------|
| **mode** | String | Transit mode |
| **agencies** | List<Object> | Agencies for mode |

---

### Fetch City List

Retrieves lightweight list of all cities.

| Property | Value |
|----------|-------|
| **Endpoint** | `scheduler_v4/cityList` |
| **Method** | GET |
| **Auth** | Not required |
| **Base URL** | MetaPropsUrl from ChaloUrlProvider |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **data** | List<Object> | City list |

**City Object:**

| Field | Type | Description |
|-------|------|-------------|
| **cityId** | String | City identifier |
| **cityDisplayName** | String | User-facing name |
| **isBetaMode** | Boolean? | Beta flag |
| **isComingSoon** | Boolean? | Coming soon flag |
| **isDisabled** | Boolean? | Disabled flag |
| **polyBound** | List<List<Double>>? | Service area polygon |

---

## Data Flow

### City Selection Flow

```mermaid
sequenceDiagram
    participant UI as CityLocationSelection
    participant Meta as CityMetaDataManager
    participant Remote as Network API
    participant Local as LocalDataSource
    participant DataStore

    UI->>Meta: fetchAndCacheCityMetaData(cityId)
    Meta->>Remote: GET /scheduler_v4/v1/{cityId}/metadataprops
    Remote-->>Meta: MetaDataPropsResponse

    Meta->>Meta: Parse JSON to CityAppModel
    Meta->>Local: updateCityMetaDataCacheIfPossible()
    Local->>DataStore: Store metadata JSON
    Local->>DataStore: Store city list JSON
    Local-->>Meta: CityAppModel

    Meta-->>UI: CityAppModel

    UI->>Local: markAsSelectedCity(cityId)
    Local->>DataStore: Store current city ID
    Local-->>UI: Done
```

### City Resolution Flow

```mermaid
sequenceDiagram
    participant Provider as CityProviderImpl
    participant Local as LocalDataSource
    participant DataStore

    Note over Provider: App starts or city changes

    Provider->>Local: getCurrentSelectedCityId()
    Local->>DataStore: Read KEY_CURRENT_CITY_NAME
    DataStore-->>Local: cityId (flow)
    Local-->>Provider: cityId

    Provider->>Local: getCachedCityMetaPropsFromId(cityId)
    Local->>DataStore: Read KEY_CITY_META_PROPS
    DataStore-->>Local: metadataJSON
    Local->>Local: Parse JSON to CityAppModel
    Local-->>Provider: CityAppModel?

    Provider->>Provider: Emit via StateFlow
```

### Location-Based Detection Flow

```mermaid
sequenceDiagram
    participant UI as CityLocationSelection
    participant Meta as CityMetaDataManager
    participant Local as LocalDataSource
    participant Remote as Network API

    UI->>Meta: fetchCityIdAndCityNameForLocation(latLng)

    Meta->>Local: getBasicCityInfoList()

    alt List cached
        Local-->>Meta: List<BasicCityInfoAppModel>
    else List not cached
        Meta->>Remote: GET /scheduler_v4/cityList
        Remote-->>Meta: City list JSON
        Meta->>Local: updateBasicCityInfoCacheIfPossible()
        Local-->>Meta: List<BasicCityInfoAppModel>
    end

    loop For each city
        Meta->>Meta: Check if latLng in polyBound
        Note over Meta: Ray casting algorithm
    end

    alt City found
        Meta-->>UI: CityIdAndName(cityId, cityName)
    else No match
        Meta-->>UI: null
    end
```

---

## Data Transformations

### API Response to App Model

**City Metadata:**

| API Field | App Field | Transformation |
|-----------|-----------|----------------|
| cityName | name | Direct |
| cityDisplayName | displayName | Direct |
| bound.* | bounds | Convert to LatLngBounds |
| cityCentre.* | cityCenter | Convert to LatLng |
| stationType | modes | Map via ChaloTransitMode.fromString() |
| lineMaps | lineMaps | Map to LineMap objects |
| busMapsUrl | busMapUrl | Direct |
| modesMap | modeAndAgencyList | Complex mapping with agencies |
| isBetaCity | isBetaCity | Direct |
| isComingSoonCity | isComingSoonCity | Direct |
| isCityDiscontinued | isCityDiscontinued | Direct |
| timezoneId | timezoneId | Direct |
| countryId, countryName, countryCallingCode | countryInfo | Group into CountryInfo |
| currency, currencySymbol, currencyFactor | currencyInfo | Group into CurrencyInfo |
| polyBound | polyBounds | Convert to List<LatLng> |
| minAppVersionForLogin | minAppVersionForLogin | Direct |

**LatLngBounds Conversion:**

| API Fields | App Field | Formula |
|------------|-----------|---------|
| southWestLat, southWestLng | southwest | LatLng(lat, lng) |
| northEastLat, northEastLng | northeast | LatLng(lat, lng) |

**PolyBound Conversion:**

| API Format | App Format | Notes |
|------------|------------|-------|
| List<List<Double>> | List<LatLng> | [lat, lng] pairs |

### Basic City Info Mapping

| API Field | App Field | Transformation |
|-----------|-----------|----------------|
| cityId | cityId | Direct |
| cityDisplayName | cityName | Direct |
| isBetaMode | isBetaCity | Null coalesce to false |
| isComingSoon | isComingSoonCity | Null coalesce to false |
| isDisabled | isCityDiscontinued | Null coalesce to false |

---

## Local Storage

### Storage Mechanism

City data stored using Android DataStore (Preferences) wrapped by `CityMetaPropsLocalDataSource`.

### DataStore Keys

| Key | Type | Description |
|-----|------|-------------|
| **KEY_CURRENT_CITY_NAME** | String | Currently selected city ID |
| **KEY_CITY_META_PROPS** | String | Full metadata JSON |
| **KEY_BASIC_CITY_INFO_LIST** | String | City list JSON |
| **KEY_IS_META_UPDATED** | Boolean | Metadata freshness flag |

### Storage Schema

```mermaid
flowchart TB
    subgraph DataStore["Preferences DataStore"]
        CurrentCity["KEY_CURRENT_CITY_NAME<br/>→ 'mumbai'"]
        MetaProps["KEY_CITY_META_PROPS<br/>→ '{...full JSON...}'"]
        CityList["KEY_BASIC_CITY_INFO_LIST<br/>→ '[{cityId:...},...]'"]
        MetaFlag["KEY_IS_META_UPDATED<br/>→ true/false"]
    end
```

### Reactive Access

City ID is exposed as a Flow for reactive updates:

```mermaid
flowchart TD
    DataStore["DataStore"]
    CityIdFlow["getCurrentSelectedCityId(): Flow<String>"]
    Provider["CityProviderImpl"]
    StateFlow["currentCity: StateFlow<CityAppModel?>"]

    DataStore --> CityIdFlow
    CityIdFlow --> Provider
    Provider --> StateFlow
```

### Cache Strategy

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| **City Metadata** | Until city change | New city selected |
| **City List** | App session | App restart or force refresh |
| **Selected City** | Persistent | User changes city |

---

## Language Storage

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| **KEY_SELECTED_LANGUAGE** | String | Current language code |
| **KEY_IS_LANGUAGE_SELECTED** | Boolean | Selection completed flag |

### Split Install State (Android)

The `SplitInstallHandler` tracks installed language modules via Play Core API:

| Property | Type | Description |
|----------|------|-------------|
| **installedLanguages** | Set<String> | Currently installed module codes |

---

## Exception Handling

### Error Types

| Error | Cause | Response |
|-------|-------|----------|
| **CityNotServiceable** | City discontinued in response | Show discontinued screen |
| **CityIdNotAvailable** | Invalid city ID | Show error with search |
| **CityMetaDataFetchError** | Network or parse failure | Show retry option |
| **FetchBasicCityInfoListError** | City list fetch failed | Show retry option |

### Error Mapping Flow

```mermaid
flowchart TD
    Response["API Response"]
    Check1{HTTP 200?}
    Check2{Valid JSON?}
    Check3{Required fields?}
    Check4{City active?}
    Success["Return CityAppModel"]
    NetworkError["CityMetaDataFetchError"]
    ParseError["CityMetaDataFetchError"]
    ValidationError["CityIdNotAvailable"]
    DiscontinuedError["CityNotServiceable"]

    Response --> Check1
    Check1 -->|No| NetworkError
    Check1 -->|Yes| Check2
    Check2 -->|No| ParseError
    Check2 -->|Yes| Check3
    Check3 -->|No| ValidationError
    Check3 -->|Yes| Check4
    Check4 -->|No (discontinued)| DiscontinuedError
    Check4 -->|Yes| Success
```

---

## Polygon Bounds Check

### Ray Casting Algorithm

To determine if a GPS location is within a city's service area:

```mermaid
flowchart TD
    Start["isPointInPolygon(point, polygon)"]
    Init["crossings = 0"]
    Loop["For each edge (p1, p2)"]
    CheckY{point.y between p1.y and p2.y?}
    CalcX["Calculate intersection X"]
    CheckX{point.x < intersectionX?}
    Increment["crossings++"]
    Continue["Next edge"]
    Done{crossings odd?}
    Inside["Return true"]
    Outside["Return false"]

    Start --> Init
    Init --> Loop
    Loop --> CheckY
    CheckY -->|Yes| CalcX
    CheckY -->|No| Continue
    CalcX --> CheckX
    CheckX -->|Yes| Increment
    CheckX -->|No| Continue
    Increment --> Continue
    Continue --> Loop
    Loop -->|Done| Done
    Done -->|Yes| Inside
    Done -->|No| Outside
```

### Implementation Notes

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Ray casting (point-in-polygon) |
| **Edge handling** | Horizontal rays from point |
| **Boundary points** | Considered inside |
| **Complex polygons** | Handles concave shapes |

---

## Dependency Injection

### Koin Bindings

| Interface/Class | Implementation | Scope |
|-----------------|----------------|-------|
| CityMetaPropsLocalDataSource | CityMetaPropsLocalDataSourceImpl | Factory |
| CityMetaDataManager | CityMetaDataManagerImpl | Singleton |
| CityProvider | CityProviderImpl | Singleton (createdAtStart) |
| SplitInstallHandler | AndroidSplitInstallHandler | Factory |
| LanguageFeature | LanguageFeatureImpl | Singleton |

### Dependency Graph

```mermaid
flowchart TB
    subgraph Koin["Koin Module"]
        LocalDSBinding["CityMetaPropsLocalDataSource"]
        MetaMgrBinding["CityMetaDataManager"]
        ProviderBinding["CityProvider"]
        SplitBinding["SplitInstallHandler"]
    end

    subgraph Impl["Implementations"]
        LocalDSImpl["LocalDataSourceImpl"]
        MetaMgrImpl["CityMetaDataManagerImpl"]
        ProviderImpl["CityProviderImpl"]
        SplitImpl["AndroidSplitInstallHandler"]
    end

    subgraph Deps["Dependencies"]
        DataStore["DataStoreManager"]
        Network["NetworkManager"]
        PlayCore["SplitInstallManager"]
    end

    LocalDSBinding -.-> LocalDSImpl
    MetaMgrBinding -.-> MetaMgrImpl
    ProviderBinding -.-> ProviderImpl
    SplitBinding -.-> SplitImpl

    LocalDSImpl --> DataStore
    MetaMgrImpl --> LocalDSBinding
    MetaMgrImpl --> Network
    ProviderImpl --> LocalDSBinding
    SplitImpl --> PlayCore
```

---

## Platform Implementations

### Android

| Component | Implementation |
|-----------|----------------|
| **DataStore** | Jetpack DataStore Preferences |
| **Split Install** | Google Play Core SplitInstallManager |
| **Network** | Ktor with OkHttp engine |

### iOS

| Component | Implementation |
|-----------|----------------|
| **DataStore** | NSUserDefaults |
| **Split Install** | No-op (all languages bundled) |
| **Network** | Ktor with Darwin engine |

### Split Install States (Android)

| State | Description | UI Response |
|-------|-------------|-------------|
| **PENDING** | Request queued | Show loading |
| **DOWNLOADING** | Download in progress | Show progress |
| **DOWNLOADED** | Download complete | Continue install |
| **INSTALLING** | Installing module | Show loading |
| **INSTALLED** | Module ready | Update locale |
| **FAILED** | Installation failed | Show error |
| **CANCELED** | User cancelled | Return to selection |
| **REQUIRES_USER_CONFIRMATION** | Large download needs approval | Show dialog |

---

## Security

### Data Protection

| Data | Protection |
|------|------------|
| **City Metadata** | Plain text (non-sensitive) |
| **City List** | Plain text (non-sensitive) |
| **Selected City** | Plain text (non-sensitive) |
| **Language Preference** | Plain text (non-sensitive) |

### API Security

| Aspect | Implementation |
|--------|----------------|
| **Transport** | HTTPS only |
| **Authentication** | Not required for city data |
| **Rate Limiting** | Server-side |

---

## Error Handling Summary

| Scenario | Exception | User Impact |
|----------|-----------|-------------|
| Network failure | CityMetaDataFetchError | Show retry option |
| Invalid JSON | CityMetaDataFetchError | Show retry option |
| City discontinued | CityNotServiceable | Show discontinued screen |
| Invalid city ID | CityIdNotAvailable | Show search option |
| Split install failure | SplitInstallException | Show error, keep current |
| DataStore error | IOException | Retry or default |
