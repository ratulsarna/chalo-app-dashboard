---
slug: shared-infra
lastUpdated: 2026-01-16
---

# Shared Infrastructure

## Overview

The Chalo App's shared infrastructure provides cross-cutting concerns that all features depend on—networking, analytics, security, persistence, validation, and logging. These modules live in the `shared/` directory and are designed to be feature-agnostic, providing consistent behavior across the entire application.

## Infrastructure Module Landscape

```mermaid
flowchart TB
    subgraph Network["Networking"]
        NetworkMod["network module"]
        RestClient["ChaloRestClient"]
        Auth["Auth Plugin"]
        Socket["ChaloSocket"]
    end

    subgraph Analytics["Analytics & Monitoring"]
        AnalyticsMod["analytics module"]
        Mixpanel["Mixpanel"]
        Firebase["Firebase"]
        Crashlytics["Crashlytics"]
        Plotline["Plotline"]
    end

    subgraph Storage["Data Storage"]
        Core["core module"]
        SQLDelight["SQLDelight DB"]
        DataStore["DataStore Prefs"]
        Vault["vault module"]
    end

    subgraph Security["Security"]
        SecurityMod["security module"]
        Encryption["Encryption"]
        KeyMgmt["Key Management"]
        SSL["SSL Pinning"]
    end

    subgraph Validation["Validation"]
        ValidationSDK["validationsdk module"]
        BLE["BLE Communication"]
        QR["QR Scanning"]
    end

    Features["Feature Modules"] --> Network
    Features --> Analytics
    Features --> Storage
    Features --> Security
    Features --> Validation

    style Network fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Analytics fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Storage fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
    style Security fill:#1e3a5f,stroke:#8b5cf6,color:#f8fafc
    style Validation fill:#1e3a5f,stroke:#ef4444,color:#f8fafc
```

## Networking Layer

The `shared/network` module provides the HTTP client infrastructure used by all features.

### Architecture

```mermaid
flowchart TB
    subgraph Network["network module"]
        direction TB
        Manager["NetworkManager"]
        Client["ChaloRestClient"]
        Auth["ChaloAuthPlugin"]
        Config["NetworkConfig"]
        Exception["Exception Types"]
    end

    subgraph Engines["Platform Engines"]
        OkHttp["OkHttp (Android)"]
        Darwin["Darwin (iOS)"]
    end

    Manager --> Client
    Client --> Auth
    Client --> Engines

    style Network fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Engines fill:#1e3a5f,stroke:#10b981,color:#f8fafc
```

### NetworkManager Interface

The **NetworkManager** provides priority-based request builders, allowing features to specify request importance.

| Priority | Use Case | Characteristics |
|----------|----------|-----------------|
| **Low** | Background sync, prefetching | Longer timeouts, may be delayed |
| **Standard** | Regular API calls | Default configuration |
| **High** | Critical user actions | Shorter timeouts, prioritized |
| **Custom** | Special requirements | Configurable timeout and priority |

### ChaloRestClient

The REST client wraps Ktor's HttpClient with a consistent API for all HTTP operations.

| Operation | Purpose |
|-----------|---------|
| **GET** | Fetch data with query parameters |
| **POST** | Submit data with request body |
| **PUT** | Update existing resources |
| **DELETE** | Remove resources |
| **Multipart** | Upload files with form data |

### Authentication Plugin

The **ChaloAuthPlugin** intercepts all requests to handle authentication transparently.

```mermaid
sequenceDiagram
    participant Feature as Feature
    participant Client as RestClient
    participant Plugin as AuthPlugin
    participant Server as API Server

    Feature->>Client: Make request
    Client->>Plugin: Intercept
    Plugin->>Plugin: Add auth headers
    Plugin->>Server: Request with auth
    Server-->>Plugin: Response
    alt 401 Unauthorized
        Plugin->>Plugin: Refresh token
        Plugin->>Server: Retry with new token
    end
    Plugin-->>Feature: Response
```

| Responsibility | Behavior |
|----------------|----------|
| **Header injection** | Adds authorization token to all requests |
| **Token refresh** | Automatically refreshes expired tokens |
| **Session expiry** | Triggers re-authentication flow when session invalid |

### Platform HTTP Engines

| Platform | Engine | Features |
|----------|--------|----------|
| **Android** | OkHttp | Connection pooling, HTTP/2, interceptors |
| **iOS** | Darwin | URLSession-based, native SSL handling |

Both engines are configured with consistent timeouts (30 seconds default) and JSON content negotiation.

### Error Handling

Network errors are categorized into typed exceptions.

| Exception Type | When Thrown |
|----------------|-------------|
| **NetworkException** | Connection failures, DNS errors |
| **TimeoutException** | Request exceeded timeout |
| **ServerException** | 5xx HTTP responses |
| **AuthException** | 401/403 responses after retry |
| **ChaloLocalException** | Response parsing failures |

### Request Configuration

Each request can be configured with priority, retry strategy, and custom headers.

| Configuration | Options |
|---------------|---------|
| **Priority** | Low, Normal, High, Critical |
| **Retry strategy** | None, Exponential backoff, Linear |
| **Timeout** | Custom duration in seconds |

## Analytics Layer

The `shared/analytics` module provides unified analytics tracking across multiple providers.

### Analytics Architecture

```mermaid
flowchart TB
    subgraph Features["Feature Components"]
        Component1["FeatureComponent"]
        Component2["AnotherComponent"]
    end

    subgraph Contract["AnalyticsContract"]
        Interface["Interface"]
        Impl["Implementation"]
    end

    subgraph Providers["Analytics Providers"]
        direction LR
        Mixpanel["Mixpanel"]
        Firebase["Firebase"]
        Adjust["Adjust"]
        Plotline["Plotline"]
    end

    Features --> Contract
    Contract --> Providers

    style Features fill:#374151,stroke:#6b7280,color:#f8fafc
    style Contract fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Providers fill:#1e3a5f,stroke:#10b981,color:#f8fafc
```

### AnalyticsContract Interface

The analytics contract provides a unified API for all analytics operations.

| Operation | Purpose |
|-----------|---------|
| **raiseAnalyticsEvent** | Fire an analytics event with properties |
| **raiseDebugEvent** | Fire debug-only event (not in production) |
| **addToPeopleProperties** | Set user profile properties |
| **addToSuperProperties** | Set properties attached to all events |
| **sendAnalyticsEventToPlotline** | Specifically target Plotline |
| **setupAnalytics** | Initialize analytics on app launch |
| **incrementProperty** | Increment numeric user property |

### Event Frequency Control

Events can be controlled to prevent over-firing.

| Frequency | Behavior |
|-----------|----------|
| **Always** | Fire on every call |
| **OncePerSession** | Fire only once per app session |
| **OncePerLifetime** | Fire only once ever (persisted) |

### Analytics Providers

| Provider | Platform | Purpose |
|----------|----------|---------|
| **Mixpanel** | Android | User analytics, funnels, retention |
| **Firebase Analytics** | Both | Event tracking, audiences |
| **Adjust** | Android | Attribution, marketing analytics |
| **Plotline** | Both | In-app engagement, messaging |

### Crash Reporting

```mermaid
flowchart LR
    subgraph App["Application"]
        Crash["Exception"]
        Logger["CrashlyticsLogger"]
    end

    subgraph Backend["Crash Services"]
        FirebaseCrash["Firebase Crashlytics"]
        CrashKiOS["CrashKiOS (iOS)"]
    end

    Crash --> Logger
    Logger --> FirebaseCrash
    Logger --> CrashKiOS

    style App fill:#1e3a5f,stroke:#ef4444,color:#f8fafc
    style Backend fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

| Platform | Crash Reporter | Special Handling |
|----------|----------------|------------------|
| **Android** | Firebase Crashlytics | Native integration |
| **iOS** | CrashKiOS | Bridges Kotlin exceptions to iOS crash reports |

The **CrashlyticsLogger** provides a safe wrapper that logs exceptions without crashing the app during non-fatal errors.

## Security Layer

The `shared/security` module handles encryption, key management, and SSL security.

### Security Architecture

```mermaid
flowchart TB
    subgraph Security["security module"]
        direction TB
        Encryption["ChaloEncryption"]
        KeyManager["KeyManager"]
        SSL["CertificatePinning"]
    end

    subgraph Platform["Platform Security"]
        AndroidKeystore["Android Keystore"]
        iOSKeychain["iOS Keychain"]
    end

    Security --> Platform

    style Security fill:#1e3a5f,stroke:#8b5cf6,color:#f8fafc
    style Platform fill:#1e3a5f,stroke:#10b981,color:#f8fafc
```

### Encryption Services

| Operation | Purpose |
|-----------|---------|
| **encrypt** | Encrypt plaintext with default key |
| **decrypt** | Decrypt ciphertext with default key |
| **encryptWithKey** | Encrypt with specific key |
| **decryptWithKey** | Decrypt with specific key |

The encryption implementation uses AES with secure random IVs, ensuring each encryption produces unique ciphertext.

### Key Management

| Platform | Key Storage |
|----------|-------------|
| **Android** | Android Keystore with hardware-backed keys where available |
| **iOS** | Keychain Services with Secure Enclave support |

### Root/Jailbreak Detection

| Platform | Detection |
|----------|-----------|
| **Android** | RootBeer library checks for root indicators |
| **iOS** | Checks for jailbreak artifacts |

The app can restrict functionality or warn users when running on compromised devices.

## Vault (Secure Storage)

The `shared/vault` module provides an abstraction over platform-specific secure storage.

### Vault Architecture

```mermaid
flowchart TB
    subgraph Common["commonMain"]
        Interface["SecureVault Interface"]
    end

    subgraph Android["androidMain"]
        AndroidImpl["EncryptedSharedPreferences"]
    end

    subgraph iOS["iosMain"]
        iOSImpl["Keychain + SQLCipher"]
    end

    Interface -.-> AndroidImpl
    Interface -.-> iOSImpl

    style Common fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Android fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style iOS fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### SecureVault Operations

| Operation | Purpose |
|-----------|---------|
| **store** | Save sensitive value by key |
| **retrieve** | Get sensitive value by key |
| **delete** | Remove specific key |
| **clear** | Remove all vault contents |

### Platform Implementations

| Platform | Implementation | Encryption |
|----------|----------------|------------|
| **Android** | EncryptedSharedPreferences | AndroidX Security Crypto |
| **iOS** | SQLCipher database | AES-256 encryption |

## Data Persistence

### SQLDelight Database

The `shared/core` module hosts the main SQLDelight database schema.

```mermaid
flowchart TB
    subgraph Schema["SQLDelight Schema"]
        direction LR
        SQ["*.sq files"]
        Migrations["*.sqm migrations"]
        Adapters["Column Adapters"]
    end

    subgraph Generated["Generated Code"]
        Queries["Type-safe Queries"]
        Models["Data Classes"]
    end

    subgraph Drivers["Platform Drivers"]
        AndroidDriver["AndroidSqliteDriver"]
        NativeDriver["NativeSqliteDriver"]
    end

    Schema --> Generated
    Generated --> Drivers

    style Schema fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Generated fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Drivers fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### Database Features

| Feature | Description |
|---------|-------------|
| **Type-safe queries** | Compile-time verified SQL |
| **Migrations** | Versioned schema changes |
| **Flow integration** | Reactive queries via SQLDelight Coroutines |
| **Encryption** | SQLCipher support for sensitive data |

### Column Adapters

Custom adapters handle complex types that don't map directly to SQLite.

| Adapter Type | Converts |
|--------------|----------|
| **JSON adapter** | Complex objects ↔ JSON strings |
| **Enum adapter** | Enum values ↔ String/Int |
| **Date adapter** | DateTime ↔ Long timestamps |

### DataStore Preferences

Type-safe key-value storage using Jetpack DataStore.

| Aspect | Description |
|--------|-------------|
| **Type safety** | Keys define their value types |
| **Coroutines** | All operations are suspend functions |
| **Flow observation** | Changes emit to collectors |
| **Multiplatform** | Works on both Android and iOS |

### Preference Key Categories

| Category | Examples |
|----------|----------|
| **User identity** | User ID, auth token, city ID |
| **App state** | Last sync time, onboarding complete |
| **Cached data** | Frequently accessed values |

## Validation SDK

The `shared/validationsdk` module handles ticket validation across multiple methods.

### Validation Architecture

```mermaid
flowchart TB
    subgraph Entry["Validation Entry"]
        ValidationParent["ValidationParentComponent"]
    end

    subgraph Methods["Validation Methods"]
        direction LR
        BLE["BLE Validation"]
        QR["QR Validation"]
        NFC["NFC Tap-In/Out"]
    end

    subgraph Flow["Validation Flow"]
        Scan["Scan/Connect"]
        Validate["Send Ticket"]
        Result["Process Result"]
    end

    Entry --> Methods
    Methods --> Flow

    style Entry fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Methods fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Flow fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### Validation Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| **BLE** | Bluetooth Low Energy to conductor device | Bus validation |
| **QR** | Scan QR code for verification | Metro entry/exit |
| **NFC** | Tap card for entry/exit | Metro gates |

### BLE Validation Flow

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Scanning: Start
    Scanning --> Connecting: Device found
    Connecting --> Connected: GATT connected
    Connected --> Validating: Send ticket
    Validating --> Success: Valid response
    Validating --> Failure: Invalid/timeout
    Success --> [*]
    Failure --> [*]
```

### BLE Connection States

| State | Description |
|-------|-------------|
| **Disconnected** | No active connection |
| **Scanning** | Searching for conductor device |
| **Connecting** | Establishing GATT connection |
| **Connected** | Ready to send validation request |
| **Validating** | Ticket sent, awaiting response |
| **Success** | Validation approved |
| **Failure** | Validation rejected or timed out |

### Validation Result Types

| Result | Contains |
|--------|----------|
| **Success** | Validation receipt with timestamp |
| **Failure** | Failure reason (expired, invalid, network error) |

## Logging Infrastructure

### ChaloLog

Centralized logging utility replacing platform-specific loggers.

| Level | Purpose |
|-------|---------|
| **debug** | Development information, stripped in release |
| **info** | General information messages |
| **warn** | Warning conditions |
| **error** | Error conditions with optional throwable |

### Network Logging

In debug builds, network requests are logged via Chucker (Android) for inspection.

| Logged Data | Visibility |
|-------------|------------|
| **Request URL** | Debug only |
| **Headers** | Debug only (sensitive masked) |
| **Body** | Debug only |
| **Response** | Debug only |

## Network State Management

### NetworkStateManager

Monitors device connectivity and exposes it as observable state.

| State | Description |
|-------|-------------|
| **Connected** | Device has internet access |
| **Disconnected** | No internet connectivity |
| **Metered** | Connected via metered connection (cellular) |
| **Unknown** | State cannot be determined |

### Component Integration

Components observe network state to update UI and behavior.

```mermaid
flowchart LR
    Manager["NetworkStateManager"]
    StateFlow["StateFlow<NetworkConnectionType>"]
    Component["FeatureComponent"]
    UI["Show offline banner"]

    Manager --> StateFlow
    StateFlow -->|"collect"| Component
    Component -->|"update state"| UI

    style Manager fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Component fill:#1e3a5f,stroke:#10b981,color:#f8fafc
```

## Feature Flags & Remote Config

### Remote Config Integration

Firebase Remote Config (Android) provides runtime configuration.

| Capability | Description |
|------------|-------------|
| **Feature toggles** | Enable/disable features remotely |
| **Config values** | String, boolean, long values |
| **Fetch & activate** | Pull latest values from server |

### Common Feature Flags

| Flag | Type | Purpose |
|------|------|---------|
| **enable_quick_pay** | Boolean | Toggle Quick Pay feature |
| **min_app_version** | String | Force update threshold |
| **payment_providers** | JSON | Configure available payment methods |
| **cities_config** | JSON | City-specific settings |

## Cross-Cutting Utilities

### String Provider

Abstraction over platform-specific string resources.

| Capability | Description |
|------------|-------------|
| **String lookup** | Get localized string by enum key |
| **String formatting** | Insert arguments into format strings |
| **Multiplatform** | Works identically on Android and iOS |

### Date/Time Utilities

Using **kotlinx-datetime** for multiplatform date handling.

| Utility | Purpose |
|---------|---------|
| **TimeUtilsContract** | Centralized time operations |
| **Clock.System.now()** | Current instant |
| **TimeZone handling** | Convert between timezones |

### Image Loading

**Coil 3** provides multiplatform image loading.

| Feature | Description |
|---------|-------------|
| **Disk caching** | Persistent cache across sessions |
| **Memory caching** | Fast access for visible images |
| **Transformations** | Resize, crop, round corners |
| **Compose integration** | AsyncImage composable |

## Dependency Injection Modules

### Core Infrastructure Modules

| Module | Contents |
|--------|----------|
| **sharedCoreModule** | NavigationManager, AppComponentFactory, Database |
| **sharedNetworkModule** | RestClient, NetworkManager, AuthPlugin |
| **analyticsModule** | AnalyticsContract implementation |
| **securityModule** | Encryption services, KeyManager |
| **vaultModule** | SecureVault implementation |

### Module Registration

All infrastructure modules are registered during application startup before any feature modules. This ensures infrastructure dependencies are available when features initialize.

```mermaid
flowchart LR
    StartKoin["startKoin { }"]
    Core["Core Modules"]
    Infra["Infrastructure Modules"]
    Features["Feature Modules"]

    StartKoin --> Core
    Core --> Infra
    Infra --> Features

    style StartKoin fill:#374151,stroke:#6b7280,color:#f8fafc
    style Core fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Infra fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Features fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

## Platform Abstraction Patterns

### PlatformDependencyFactory

For complex platform-specific code that can't use simple expect/actual.

| Request Type | Creates |
|--------------|---------|
| **ChaloHttpClientRequest** | Configured Ktor HttpClient |
| **ChaloSocketRequest** | Platform-specific WebSocket |
| **MapUtilsRequest** | Platform map utilities |

The factory is injected at app startup, then shared code uses it to obtain platform implementations without direct platform dependencies.

### Provider/Setter Pattern

For features requiring Activity or ActivityResultContract.

| Provider | Purpose |
|----------|---------|
| **PermissionHandlerProvider** | Runtime permissions |
| **ImagePickerProvider** | Gallery/camera access |
| **PhoneNumberHintProvider** | Phone number suggestions |
| **TruecallerSetupHandler** | Truecaller SDK |
| **InstalledUpiAppsHelper** | UPI app detection |
| **AppRatingProcessManager** | In-app ratings |

Providers are lazy-initialized and setters are called from MainActivity/AppDelegate, bridging platform-specific Activity/UIViewController requirements to shared code.
