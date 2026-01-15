---
slug: shared-infra
lastUpdated: 2026-01-14
---

# Shared Infrastructure

## Overview

The `chalo-app-kmp` codebase has shared infrastructure modules that provide cross-cutting concerns like networking, analytics, security, and validation across all features.

## Networking (`shared/network`)

### Architecture

```
shared/network/
├── rest/
│   ├── ChaloRestClient.kt          # HTTP client wrapper
│   ├── ChaloRestClientManager.kt   # Client lifecycle
│   └── generic/
│       └── ChaloAuthPlugin.kt      # Auth interceptor
├── config/
│   ├── NetworkConfig.kt            # Base URLs, timeouts
│   └── ChaloJson.kt                # JSON serialization
├── exception/
│   ├── BaseNetworkException.kt
│   └── ChaloLocalException.kt
└── di/
    └── SharedNetworkModule.kt
```

### ChaloRestClient

Wraps Ktor `HttpClient` with consistent API:

```kotlin
class ChaloRestClient(
    private val httpClient: HttpClient
) {
    suspend fun makeGetRequest(
        url: String,
        headerMap: Map<String, String>,
        queryMap: Map<String, String>
    ): HttpResponse

    suspend fun makePostRequest(
        url: String,
        headerMap: Map<String, String>,
        queryMap: Map<String, String>,
        body: Any?
    ): HttpResponse

    suspend fun makeMultipartPostRequest(
        url: String,
        headerMap: Map<String, String>,
        fileItem: MultipartRequestFormDataType?,
        additionalInfo: MultipartRequestFormDataType?
    ): HttpResponse

    suspend fun makeDeleteRequest(...)
    suspend fun makePutRequest(...)
}
```

### Platform HTTP Engines

```kotlin
// Android: OkHttp engine
HttpClient(OkHttp) {
    engine {
        config {
            connectTimeout(30, TimeUnit.SECONDS)
            readTimeout(30, TimeUnit.SECONDS)
        }
    }
    install(ContentNegotiation) {
        json(ChaloJson.Json)
    }
}

// iOS: Darwin engine
HttpClient(Darwin) {
    engine {
        configureRequest {
            setTimeoutInterval(30.0)
        }
    }
}
```

### Authentication Plugin

`ChaloAuthPlugin` adds auth headers and handles token refresh:

```kotlin
class ChaloAuthPlugin {
    // Intercepts requests to add auth headers
    // Handles 401 responses for token refresh
    // Manages session expiry
}
```

### Request Configuration

```kotlin
data class ChaloRequest(
    val url: String,
    val requestType: HttpRequestType,
    val headers: Map<String, String>,
    val queryParams: Map<String, String>,
    val body: Any?,
    val priority: PriorityLevel,
    val retryStrategy: RetryStrategyType
)

enum class HttpRequestType {
    GET, POST, PUT, DELETE, MULTIPART
}

enum class PriorityLevel {
    LOW, NORMAL, HIGH, CRITICAL
}
```

### Error Handling

```kotlin
sealed class NetworkResponse<out T> {
    data class Success<T>(val data: T) : NetworkResponse<T>()
    data class Error(val errorType: ErrorType, val message: String) : NetworkResponse<Nothing>()
}

enum class ErrorType {
    NETWORK_ERROR,
    TIMEOUT,
    SERVER_ERROR,
    PARSE_ERROR,
    AUTH_ERROR
}
```

## Analytics (`shared/analytics`)

### AnalyticsContract

Core interface for all analytics operations:

```kotlin
interface AnalyticsContract {
    fun raiseAnalyticsEvent(
        name: String,
        source: String,
        eventProperties: Map<String, Any>? = null,
        frequency: AnalyticsFrequency = AnalyticsFrequency.Always,
        sendToPlotline: Boolean = true
    )

    fun raiseDebugEvent(
        name: String,
        source: String,
        eventProperties: Map<String, Any>? = null
    )

    fun addToPeopleProperties(properties: Map<String, String>)
    fun addToSuperProperties(properties: Map<String, String>)
    fun addEmail(emailId: String)
    fun addUsername(username: String)

    fun sendAnalyticsEventToPlotline(eventName: String, source: String, properties: Map<String, Any>?)
    fun setUserPropertiesForPlotline(properties: Map<String, String>)

    fun setupAnalytics()
    fun sendLatLongToAnalytics(latitude: Double, longitude: Double)
    fun incrementProperty(property: String, increment: Double)
}
```

### Event Frequency

```kotlin
enum class AnalyticsFrequency {
    Always,           // Fire every time
    OncePerSession,   // Fire once per app session
    OncePerLifetime   // Fire only once ever
}
```

### Analytics Providers

| Provider | Platform | Purpose |
|----------|----------|---------|
| Mixpanel | Android | User analytics, funnels |
| Firebase | Android | Events, crashes |
| Plotline | Shared | In-app engagement |
| Adjust | Android | Attribution |

### Usage in Components

```kotlin
class EBillFetchComponent(
    private val analyticsContract: AnalyticsContract
) {
    private fun raiseScreenOpenedEvent() {
        analyticsContract.raiseAnalyticsEvent(
            name = "ebill_fetch_screen_opened",
            source = "",
            eventProperties = mapOf(
                "consumer_number" to consumerNumber
            )
        )
    }
}
```

## Security (`shared/security`)

### Encryption

```
shared/security/
├── encryption/
│   ├── ChaloEncryption.kt         # Encryption interface
│   ├── ChaloEncryptionImpl.kt     # AES implementation
│   └── KeyManager.kt              # Key storage
└── ssl/
    └── CertificatePinning.kt      # SSL pinning
```

### Encryption Contract

```kotlin
interface ChaloEncryption {
    fun encrypt(plainText: String): String
    fun decrypt(cipherText: String): String
    fun encryptWithKey(plainText: String, key: String): String
    fun decryptWithKey(cipherText: String, key: String): String
}
```

### Secure Storage

| Platform | Implementation |
|----------|----------------|
| Android | EncryptedSharedPreferences |
| iOS | Keychain Services |

### Root Detection (Android)

```kotlin
// Uses RootBeer library
class RootDetector {
    fun isDeviceRooted(): Boolean
}
```

## Vault (`shared/vault`)

Secure storage abstraction:

```kotlin
interface SecureVault {
    suspend fun store(key: String, value: String)
    suspend fun retrieve(key: String): String?
    suspend fun delete(key: String)
    suspend fun clear()
}
```

### Platform Implementations

```kotlin
// Android
class AndroidSecureVault(
    context: Context
) : SecureVault {
    private val encryptedPrefs = EncryptedSharedPreferences.create(...)
}

// iOS
class IOSSecureVault : SecureVault {
    // Uses Keychain
}
```

## BLE Communication (`shared/ble-communication`)

### BLE Validation Flow

```
shared/ble-communication/
├── scanner/
│   └── BleScanner.kt              # Device discovery
├── connection/
│   └── BleConnectionManager.kt    # GATT connections
├── protocol/
│   └── ValidationProtocol.kt      # Message format
└── validation/
    └── BleValidationHandler.kt    # Validation logic
```

### BLE States

```kotlin
enum class BleConnectionState {
    DISCONNECTED,
    SCANNING,
    CONNECTING,
    CONNECTED,
    VALIDATING,
    SUCCESS,
    FAILURE
}
```

### Validation Protocol

```kotlin
interface ValidationProtocol {
    fun createValidationRequest(ticket: TicketData): ByteArray
    fun parseValidationResponse(response: ByteArray): ValidationResult
}

sealed class ValidationResult {
    data class Success(val receipt: ValidationReceipt) : ValidationResult()
    data class Failure(val reason: ValidationFailureReason) : ValidationResult()
}
```

## Validation SDK (`shared/validationsdk`)

### Architecture

```
shared/validationsdk/
├── blevalidation/
│   ├── ui/
│   │   └── BleValidationComponent.kt
│   ├── domain/
│   │   └── ValidateTicketUseCase.kt
│   └── config/
│       └── ProductValidationAnalyticManager.kt
└── qrvalidation/
    ├── ui/
    │   └── QrScannerComponent.kt
    └── domain/
        └── ProcessQrUseCase.kt
```

### Validation Modes

| Mode | Description |
|------|-------------|
| BLE | Bluetooth Low Energy validation via conductor device |
| QR | QR code scanning for ticket verification |
| Tap-In/Tap-Out | NFC-based entry/exit tracking |

## DataStore (`shared/chalo-base`)

### Preferences DataStore

```kotlin
// Type-safe preference keys
object PreferenceKeys {
    val CITY_ID = stringPreferencesKey("city_id")
    val USER_ID = stringPreferencesKey("user_id")
    val AUTH_TOKEN = stringPreferencesKey("auth_token")
    val LAST_SYNC = longPreferencesKey("last_sync")
}
```

### Usage

```kotlin
class UserPreferencesDataSource(
    private val dataStore: DataStore<Preferences>
) {
    val cityId: Flow<String?> = dataStore.data.map { it[PreferenceKeys.CITY_ID] }

    suspend fun setCityId(cityId: String) {
        dataStore.edit { it[PreferenceKeys.CITY_ID] = cityId }
    }
}
```

## SQLDelight (`shared/*/data/db`)

### Database Setup

```kotlin
// Schema definition
// shared/wallet/src/commonMain/sqldelight/app/chalo/wallet/data/db/Wallet.sq

CREATE TABLE wallet_transaction (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    description TEXT
);

selectAll:
SELECT * FROM wallet_transaction ORDER BY timestamp DESC;

insertTransaction:
INSERT INTO wallet_transaction VALUES (?, ?, ?, ?, ?);
```

### Driver Configuration

```kotlin
// Android
val driver = AndroidSqliteDriver(
    schema = ChaloDatabase.Schema,
    context = context,
    name = "chalo.db",
    factory = SupportSQLiteOpenHelper.Factory(
        SQLCipherOpenHelperFactory("encryption_key".toByteArray())
    )
)

// iOS
val driver = NativeSqliteDriver(
    schema = ChaloDatabase.Schema,
    name = "chalo.db"
)
```

## Logging (`shared/chalo-base`)

### ChaloLog

```kotlin
object ChaloLog {
    fun debug(tag: String, message: String)
    fun info(tag: String, message: String)
    fun warn(tag: String, message: String)
    fun error(tag: String, message: String, throwable: Throwable? = null)
}
```

### Crashlytics Integration

```kotlin
class NetworkCrashlyticsLogger {
    fun logNetworkError(url: String, error: Throwable)
    fun logNetworkSuccess(url: String, responseTime: Long)
}
```

## Feature Flags & Remote Config

### Firebase Remote Config (Android)

```kotlin
interface RemoteConfigContract {
    fun getString(key: String): String
    fun getBoolean(key: String): Boolean
    fun getLong(key: String): Long
    suspend fun fetchAndActivate()
}
```

### Common Feature Flags

| Flag | Type | Purpose |
|------|------|---------|
| `enable_quick_pay` | Boolean | Toggle Quick Pay feature |
| `min_app_version` | String | Force update threshold |
| `payment_providers` | JSON | Enabled payment methods |
| `cities_config` | JSON | City-specific settings |

## Network State Management

### NetworkStateManager

```kotlin
interface NetworkStateManager {
    val networkState: StateFlow<NetworkConnectionType>
}

enum class NetworkConnectionType {
    CONNECTED,
    DISCONNECTED,
    METERED,
    UNKNOWN
}
```

### Usage in Components

```kotlin
init {
    repeatOnStarted {
        networkStateManager.networkState.collect { state ->
            processIntent(InternetConnectionIntent(state))
        }
    }
}
```

## Dependency Injection Modules

### Core Modules

```kotlin
// shared/core/src/commonMain/.../di/SharedCoreModule.kt
val sharedCoreModule = module {
    single<ChaloNavigationManager> { ChaloNavigationManagerImpl(get(), get()) }
    single<AppComponentFactory> { AppComponentFactory }
}

// shared/network/src/commonMain/.../di/SharedNetworkModule.kt
val sharedNetworkModule = module {
    single { ChaloRestClient(get()) }
    single { ChaloRestClientManager(get(), get()) }
}

// shared/analytics/src/commonMain/.../di/AnalyticsModule.kt
val analyticsModule = module {
    single<AnalyticsContract> { AnalyticsContractImpl(get(), get()) }
}
```

### Module Registration

```kotlin
// Application startup
startKoin {
    modules(
        sharedCoreModule,
        sharedNetworkModule,
        analyticsModule,
        electricityBillModule,
        walletModule,
        // ... feature modules
    )
}
```

## Cross-Cutting Concerns

### String Provider

```kotlin
interface StringProvider {
    fun getString(stringEnum: StringEnum): String
    fun getString(stringEnum: StringEnum, vararg args: Any): String
}
```

### Date/Time Utilities

```kotlin
// Using kotlinx-datetime
val now = Clock.System.now()
val localDate = now.toLocalDateTime(TimeZone.currentSystemDefault())
```

### Image Loading (Coil 3)

```kotlin
// Compose Multiplatform
AsyncImage(
    model = ImageRequest.Builder(LocalPlatformContext.current)
        .data(imageUrl)
        .crossfade(true)
        .build(),
    contentDescription = null,
    modifier = Modifier.fillMaxWidth()
)
```
