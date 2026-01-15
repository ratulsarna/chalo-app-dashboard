---
feature: profile
layer: data
lastUpdated: 2026-01-15
sourceCommit: null
---

# Profile — Repository Documentation

## Data Layer Overview

The data layer handles profile data persistence and synchronization. It follows the **Repository Pattern** with separate remote and local data sources.

```mermaid
flowchart TB
    subgraph Domain["Domain Layer"]
        UpdateUC["UpdateUserProfileUseCase"]
        LogoutUC["LogoutUserUseCase"]
    end

    subgraph Repository["Repository Layer"]
        Repo["UserProfileRepository"]
    end

    subgraph DataSources["Data Sources"]
        Remote["RemoteDataSource"]
        Local["LocalDataSource"]
    end

    subgraph Storage["Storage"]
        DataStore["DataStore"]
        API["Chaukidar API"]
    end

    UpdateUC --> Repo
    LogoutUC --> Repo
    Repo --> Remote
    Repo --> Local
    Remote --> API
    Local --> DataStore
```

---

## Repository Operations

| Operation | Description | Data Flow |
|-----------|-------------|-----------|
| **updateUserProfileOnServer** | Sync profile changes to server | Remote → Transform → Return |
| **updateUserProfileLocally** | Persist profile to local storage | Transform → Local |
| **getUserProfileDetails** | Read profile from local storage | Local → Transform → Return |
| **clearStoredUserProfileAndAuthTokensDetails** | Wipe all auth data | Local |
| **isUserLoggedIn** | Stream login state | Local → Flow |

---

## API Endpoints

### Update Profile

Updates user profile on the server.

| Property | Value |
|----------|-------|
| **Endpoint** | `chaukidar/v1/app/user/update-profile` |
| **Method** | POST |
| **Auth** | Required (Secure API Headers) |
| **Content-Type** | application/json |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **userId** | String | Yes | User identifier |
| **firstName** | String | Yes | First name |
| **lastName** | String | Yes | Last name |
| **profilePhoto** | String | No | Photo URL |
| **gender** | String | No | "male", "female", "other" |
| **dateOfBirth** | Long | No | Epoch milliseconds |
| **emailId** | String | No | Email address |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **firstName** | String? | Updated first name |
| **lastName** | String? | Updated last name |
| **profilePhoto** | String? | Photo URL |
| **gender** | String? | Gender string |
| **mobileNumber** | String? | Phone number |
| **countryCode** | String? | Country code |
| **dateOfBirth** | Long? | DOB in milliseconds |
| **emailId** | String? | Email address |
| **userId** | String? | User identifier |

---

## Data Flow

### Update Profile Flow

```mermaid
sequenceDiagram
    participant UC as UseCase
    participant Repo as Repository
    participant Remote as RemoteDataSource
    participant Local as LocalDataSource
    participant API as Server

    UC->>Repo: updateOnServer(fields)
    Repo->>Remote: updateProfile(request)
    Remote->>API: POST /update-profile

    alt Success
        API-->>Remote: UserProfileResponse
        Remote-->>Repo: Response Model
        Repo->>Repo: Map to AppModel
        Repo-->>UC: UserProfileAppModel
        UC->>Repo: updateLocally(appModel)
        Repo->>Repo: Map to LocalModel
        Repo->>Local: save(localModel)
    else Server Error
        API-->>Remote: Error Response
        Remote->>Remote: Map to Exception
        Remote-->>Repo: Throw UpdateFailed
        Repo-->>UC: Propagate Exception
    end
```

### Read Profile Flow

```mermaid
sequenceDiagram
    participant UI as Component
    participant Provider as ProfileDetailsProvider
    participant Local as LocalDataSource
    participant Store as DataStore

    UI->>Provider: getUserProfileDetailsAsFlow()
    Provider->>Local: getUserProfileDetailsAsFlow()
    Local->>Store: profile data flow
    Store-->>Local: LocalInfoModel
    Local-->>Provider: LocalInfoModel
    Provider->>Provider: Map to AppModel
    Provider-->>UI: Flow<AppModel>
```

---

## Data Transformations

### API Response → App Model

| API Field | App Field | Transformation |
|-----------|-----------|----------------|
| `firstName` | firstName | Direct (empty if null) |
| `lastName` | lastName | Direct (empty if null) |
| `profilePhoto` | profilePhoto | Direct (empty if null) |
| `gender` | gender | Parse string to Gender enum |
| `mobileNumber` | mobileNumber | Direct (empty if null) |
| `countryCode` | countryCode | Direct (empty if null) |
| `dateOfBirth` | dobInMillis | Direct |
| `emailId` | emailId | Direct (empty if null) |
| `userId` | userId | Direct (empty if null) |

### App Model → Local Model

| App Field | Local Field | Transformation |
|-----------|-------------|----------------|
| userId | userId | Direct |
| firstName | firstName | Direct |
| lastName | lastName | Direct |
| gender | gender | Gender.value string |
| dobInMillis | dobInMillis | Direct |
| dobInMillis | dateOfBirth | Format via TimeUtilsContract |
| emailId | mailId | Direct |
| mobileNumber | mobileNumber | Direct |
| profilePhoto | profilePhoto | Direct |
| countryCode | countryCallingCode | Direct |

### Local Model → App Model

| Local Field | App Field | Transformation |
|-------------|-----------|----------------|
| userId | userId | Direct |
| firstName | firstName | Null coalesce to empty |
| lastName | lastName | Null coalesce to empty |
| gender | gender | Parse via Gender.fromString() |
| dobInMillis | dobInMillis | Direct |
| mailId | emailId | Null coalesce to empty |
| mobileNumber | mobileNumber | Direct |
| profilePhoto | profilePhoto | Null coalesce to empty |
| countryCallingCode | countryCode | Null coalesce to empty |

---

## Local Storage

### Storage Mechanism

Profile data is stored using Android DataStore (key-value) wrapped by `UserProfileAndAuthStoreManager`.

### Stored Data

| Data | Description |
|------|-------------|
| **User Profile** | All profile fields |
| **Auth Tokens** | Access and refresh tokens |
| **Country Config** | Phone number format config |

### Reactive Access

Local storage provides Flow-based access:

```mermaid
flowchart TD
    Store["DataStore"]
    Flow["profileFlow"]
    Filter["Filter Valid States"]
    Map["Map to AppModel"]
    Collect["UI Collects"]

    Store --> Flow
    Flow --> Filter
    Filter --> Map
    Map --> Collect
```

### Login State

Login state is derived from stored profile:

| Check | Result |
|-------|--------|
| userId != null | Logged in |
| userId == null | Logged out |

---

## Exception Handling

### Error Mapping Flow

```mermaid
flowchart TD
    Response["API Response"]
    Check{isSuccess?}
    Parse["Parse to Model"]
    MapError["genericNetworkExceptionMapper"]
    CreateEx["UpdateUserProfileFailedException"]
    Return["Return Model"]
    Throw["Throw Exception"]

    Response --> Check
    Check -->|Yes| Parse
    Check -->|No| MapError
    Parse --> Return
    MapError --> CreateEx
    CreateEx --> Throw
```

### Exception Types

| Exception | Cause | Contains |
|-----------|-------|----------|
| **UpdateUserProfileFailedException** | Server returned error | Error code + message |
| **ChaloLocalException** | Local storage error | Exception details |
| **NetworkSuccessResponseParseException** | Invalid JSON | Parse error |
| **InvalidProfileDetails** | Response missing required fields | — |

### Server Error Codes

| Code | Meaning |
|------|---------|
| 1004 | Invalid date of birth |
| 3000 | User does not exist |
| 3105 | User ID mismatch |

---

## Logout Cleanup

### Data Cleared on Logout

| Data | Method |
|------|--------|
| User profile | clearStoredUserProfileAndAuthTokensDetails() |
| Auth tokens | Same method |
| FCM tokens | Separate FCM feature |
| Product data | ClearProductStoresAndDatabaseUseCase |

### Cleanup Sequence

```mermaid
sequenceDiagram
    participant Logout as LogoutUseCase
    participant Profile as ProfileRepository
    participant Products as ProductsUseCase
    participant Store as DataStore

    Logout->>Products: invoke()
    Note over Products: Clear tickets, passes, cards
    Products-->>Logout: Done

    Logout->>Profile: clearStoredDetails()
    Profile->>Store: clear profile
    Profile->>Store: clear tokens
    Profile-->>Logout: Done
```

---

## User Profile Details Provider

A shared provider gives reactive access to profile data across the app.

### Provider Interface

| Method | Return | Description |
|--------|--------|-------------|
| **getUserProfileDetailsAsFlow** | Flow<Pair<AppModel?, Boolean>> | Profile with validity flag |
| **getUserIdAsync** | String? | Synchronous user ID |
| **isLoggedIn** | StateFlow<Boolean> | Login state stream |

### Usage Pattern

```mermaid
flowchart TD
    Component["Screen Component"]
    Provider["UserProfileDetailsProvider"]
    Local["LocalDataSource"]
    Flow["Profile Flow"]
    State["Update State"]

    Component --> Provider
    Provider --> Local
    Local --> Flow
    Flow --> State
    State --> Component
```

---

## Dependency Injection

### Koin Bindings

| Interface | Implementation |
|-----------|----------------|
| UserProfileRepository | UserProfileRepositoryImpl |
| UserProfileRemoteDataSource | UserProfileRemoteDataSourceImpl |
| UserProfileLocalDataSource | UserProfileLocalDataSourceImpl |
| UserProfileDetailsProvider | UserProfileDetailsProviderImpl |

### Dependency Graph

```mermaid
flowchart TB
    subgraph Koin["Koin Module"]
        RepoBinding["UserProfileRepository"]
        RemoteBinding["RemoteDataSource"]
        LocalBinding["LocalDataSource"]
        ProviderBinding["DetailsProvider"]
    end

    subgraph Impl["Implementations"]
        RepoImpl["RepositoryImpl"]
        RemoteImpl["RemoteDataSourceImpl"]
        LocalImpl["LocalDataSourceImpl"]
        ProviderImpl["ProviderImpl"]
    end

    subgraph Deps["Dependencies"]
        NetworkMgr["NetworkManager"]
        ExMapper["GenericNetworkExceptionMapper"]
        StoreMgr["UserProfileAndAuthStoreManager"]
        TimeUtils["TimeUtilsContract"]
    end

    RepoBinding -.-> RepoImpl
    RemoteBinding -.-> RemoteImpl
    LocalBinding -.-> LocalImpl
    ProviderBinding -.-> ProviderImpl
    RepoImpl --> RemoteBinding
    RepoImpl --> LocalBinding
    RemoteImpl --> NetworkMgr
    RemoteImpl --> ExMapper
    LocalImpl --> StoreMgr
    RepoImpl --> TimeUtils
```

---

## Security

### Data Protection

| Aspect | Implementation |
|--------|----------------|
| **Token Storage** | Encrypted via Vault |
| **Profile Storage** | DataStore with encryption |
| **Transport** | HTTPS only |
| **Headers** | Secure API headers on all requests |

### Logout Security

- All auth tokens cleared
- Profile data wiped
- FCM tokens invalidated
- Server notified (best effort)

---

## Error Handling Summary

| Scenario | Exception | User Impact |
|----------|-----------|-------------|
| Network failure | ChaloLocalException | "Check connection" |
| Server error (4xx/5xx) | UpdateUserProfileFailedException | Error message shown |
| Invalid JSON | NetworkSuccessResponseParseException | "Something went wrong" |
| Invalid profile response | InvalidProfileDetails | "Something went wrong" |
| Storage failure | ChaloLocalException | Retry or re-login |
