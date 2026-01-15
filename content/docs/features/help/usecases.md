---
feature: help
layer: domain
lastUpdated: 2026-01-15
sourceCommit: null
---

# Help — UseCase Documentation

## Domain Layer Overview

The domain layer encapsulates business logic for the Help feature. Use cases handle booking cancellation and FAQ retrieval with proper error mapping.

```mermaid
flowchart TB
    subgraph UI["Presentation Layer"]
        HelpComponent["Help Screen Component"]
        SummaryComponent["Ticket Summary Component"]
    end

    subgraph Domain["Domain Layer"]
        CancelUC["Cancel Booking"]
        FaqsUC["Get FAQs"]
        ConfigUC["Get Remote Config"]
    end

    subgraph Data["Data Layer"]
        Repo["BookingHelpRepository"]
        ConfigFeature["ChaloConfigFeature"]
    end

    HelpComponent --> CancelUC
    SummaryComponent --> FaqsUC
    FaqsUC --> ConfigUC
    CancelUC --> Repo
    ConfigUC --> ConfigFeature
```

---

## Use Case Inventory

| Use Case | Purpose | Called From |
|----------|---------|-------------|
| **Cancel Booking** | Execute booking cancellation with error handling | Help Screen |
| **Get FAQs** | Fetch and filter FAQs for current city/group | Ticket Summary |
| **Get Remote Config** | Load city-specific FAQ configuration | Get FAQs UseCase |

---

## Cancel Booking

**Responsibility:** Executes booking cancellation API call and maps all possible errors to typed results.

### Cancellation Flow

```mermaid
flowchart TD
    Start["invoke(bookingId)"]
    CallRepo["Repository.cancelBooking()"]

    subgraph Success["Success Path"]
        SuccessResult["Return Success with status"]
    end

    subgraph Errors["Error Paths"]
        LocalErr["Network/connectivity error"]
        APIErr["Server returned error"]
        ParseErr["Response parsing failed"]
        UnknownErr["Unexpected exception"]
    end

    Start --> CallRepo
    CallRepo -->|Success| SuccessResult
    CallRepo -->|ChaloLocalException| LocalErr
    CallRepo -->|BookingHelpRemoteException| APIErr
    CallRepo -->|NetworkSuccessResponseParseException| ParseErr
    CallRepo -->|Other Exception| UnknownErr
```

### Error Type Mapping

| Exception Caught | Error Type | Information Extracted |
|------------------|------------|----------------------|
| Local Exception | Local Error | Exception message |
| Remote Exception | API Error | Server message + error code |
| Parse Exception | Response Parsing | Static error indicator |
| Any Other | Unknown Error | Exception message |

### Cancellation Response

The cancellation result contains:

| Field | Description |
|-------|-------------|
| **Status** | Success, Failed, or Error |
| **Message** | Optional message from server |

### Status Values

| Status | Meaning | UI Treatment |
|--------|---------|--------------|
| **Success** | Booking was cancelled | Show success bottom sheet |
| **Failed** | Server rejected cancellation | Show error with message |
| **Error** | Unexpected server error | Show generic error with retry |

---

## Get FAQs

**Responsibility:** Fetches FAQ configuration and filters it for the current city and group type.

### FAQ Loading Flow

```mermaid
flowchart TD
    Start["invoke(groupType)"]
    FetchConfig["Get Remote Config"]
    CheckCity{FAQs for City?}
    FilterGroup["Filter by Group Type"]
    CheckEmpty{List Empty?}
    SortOrder["Sort by Order"]
    Success["Return FAQ List"]
    NoCity["Error: Not Available for City"]
    NoFaqs["Error: No FAQs for Group"]
    GenericError["Error: Generic Failure"]

    Start --> FetchConfig
    FetchConfig -->|Success| CheckCity
    FetchConfig -->|Exception| GenericError
    CheckCity -->|No| NoCity
    CheckCity -->|Yes| FilterGroup
    FilterGroup --> CheckEmpty
    CheckEmpty -->|Yes| NoFaqs
    CheckEmpty -->|No| SortOrder
    SortOrder --> Success
```

### Filtering Logic

1. **City Filter:** Match config's city name against user's current city
2. **Group Filter:** Match FAQ's group type against requested group
3. **Version Filter:** Ensure current app version is within min/max range
4. **Order Sort:** Sort remaining FAQs by their order field (ascending)

### Error Types

| Error | Cause | Handling |
|-------|-------|----------|
| **Not Available for City** | No FAQ config exists for user's city | Show empty state |
| **No FAQs for Group** | City has FAQs, but none for requested group | Show empty state |
| **Generic** | Config fetch or parsing failed | Show error state |

---

## Get Remote Config

**Responsibility:** Loads city-specific FAQ configuration from Firebase Remote Config with in-memory caching.

### Config Loading Flow

```mermaid
flowchart TD
    Start["invoke()"]
    CheckCache{City Changed?}
    ReturnCached["Return Cached Config"]
    SelectKey["Select Config Key"]
    FetchFirebase["Fetch from Firebase"]
    ParseJSON["Parse JSON"]
    FilterCity["Find City Config"]
    ValidateVersion{Version in Range?}
    ConvertModel["Convert to App Model"]
    SaveCache["Cache Result"]
    ReturnConfig["Return Config"]
    ReturnDefault["Return Default (Empty)"]

    Start --> CheckCache
    CheckCache -->|No Change| ReturnCached
    CheckCache -->|Changed| SelectKey
    SelectKey --> FetchFirebase
    FetchFirebase --> ParseJSON
    ParseJSON --> FilterCity
    FilterCity --> ValidateVersion
    ValidateVersion -->|Yes| ConvertModel
    ValidateVersion -->|No| ReturnDefault
    ConvertModel --> SaveCache
    SaveCache --> ReturnConfig
    FetchFirebase -->|Error| ReturnDefault
```

### Config Key Selection

| Build Flavor | Config Key |
|--------------|------------|
| Debug | `bookingHelpConfigDev` |
| Beta/Alpha | `bookingHelpConfigBeta` |
| Production | `bookingHelpConfigProd` |

### Version Validation

Each city's config includes version bounds:

| Field | Purpose |
|-------|---------|
| **minVer** | Minimum app version (inclusive) |
| **maxVer** | Maximum app version (inclusive) |

A config is valid only if the current app version falls within this range. This allows gradual rollout of FAQ changes.

### Caching Behavior

- Config is cached in memory per city
- Cache invalidated when user changes city
- Cache cleared on app restart
- Failed fetches return empty default (graceful degradation)

---

## Domain Models

### FAQ Item

| Field | Type | Description |
|-------|------|-------------|
| **Question** | String | The FAQ question text |
| **Answer** | String | The detailed answer |
| **Action Type** | Enum | None or Cancel Booking |
| **Order** | Integer | Display order (ascending) |
| **Group Type** | Enum | Category for filtering |
| **Is Expanded** | Boolean | Default expansion state |

### FAQ Action Types

| Type | Description |
|------|-------------|
| **None** | Informational FAQ — no action available |
| **Cancel Booking** | FAQ that enables booking cancellation |

### FAQ Group Types

| Type | Description |
|------|-------------|
| **Generic** | General help questions |

Currently only one group type exists, but the architecture supports adding more (e.g., Payment, Refund, Schedule).

### Cancel Booking Result

| Field | Type | Description |
|-------|------|-------------|
| **Status** | Enum | Success, Failed, or Error |
| **Message** | String? | Optional message from API |

---

## Business Rules

| Rule | Description | Enforced By |
|------|-------------|-------------|
| **City filtering** | FAQs filtered by user's current city | Get Remote Config |
| **Version range** | Config valid only within minVer–maxVer | Get Remote Config |
| **Group filtering** | FAQs filtered by requested group type | Get FAQs |
| **Order sorting** | FAQs sorted by order field | Get FAQs |
| **Graceful degradation** | Returns empty list on failure | All use cases |

---

## UseCase Interaction

### FAQ Fetch Sequence

```mermaid
sequenceDiagram
    participant UI as Ticket Summary
    participant FaqsUC as Get FAQs
    participant ConfigUC as Get Remote Config
    participant Firebase as Firebase Remote Config

    UI->>FaqsUC: invoke(groupType)
    FaqsUC->>ConfigUC: invoke()
    ConfigUC->>Firebase: Fetch config string
    Firebase-->>ConfigUC: JSON config
    ConfigUC->>ConfigUC: Parse, filter by city
    ConfigUC-->>FaqsUC: Config App Model
    FaqsUC->>FaqsUC: Filter by group, sort
    FaqsUC-->>UI: List of FAQs
```

### Cancellation Sequence

```mermaid
sequenceDiagram
    participant UI as Help Component
    participant CancelUC as Cancel Booking
    participant Repo as Repository
    participant API as Backend API

    UI->>CancelUC: invoke(bookingId)
    CancelUC->>Repo: cancelBooking(bookingId)
    Repo->>API: POST /booking-cancel

    alt Success
        API-->>Repo: Status: SUCCESS
        Repo-->>CancelUC: App Model
        CancelUC-->>UI: Result.Success
    else Failure
        API-->>Repo: Error Response
        Repo-->>CancelUC: Exception
        CancelUC->>CancelUC: Map to Error Type
        CancelUC-->>UI: Result.Failure
    end
```
