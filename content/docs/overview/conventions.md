---
slug: conventions
lastUpdated: 2026-01-14
---

# Coding Conventions

## Naming Conventions

### Classes

| Type | Pattern | Example |
|------|---------|---------|
| Component (Screen ViewModel) | `{Feature}Component` | `EBillFetchComponent` |
| Parent Component | `{Feature}ParentComponent` | `CheckoutParentComponent` |
| UseCase | `{Action}UseCase` | `EBillFetchUseCase` |
| Repository Interface | `{Entity}Repository` | `ElectricityBillRepository` |
| Repository Implementation | `{Entity}RepositoryImpl` | `ElectricityBillRepositoryImpl` |
| Remote Data Source | `{Entity}RemoteDataSource` | `ElectricityBillRemoteDataSource` |
| Local Data Source | `{Entity}LocalDataSource` | `WalletLocalDataSource` |
| API Model | `{Name}ApiModel` | `FetchElectricityBillResponseApiModel` |
| App Model | `{Name}AppModel` | `ElectricityBillAppModel` |
| Screen Args | `{Scene}Args` | `EBillFetchScreenArgs` |
| ViewState | `{Feature}ViewState` | `EBillFetchViewState` |
| DataState | `{Feature}DataState` | `EBillFetchDataState` |
| Intent | `{Feature}Intent` | `EBillFetchIntent` |
| Side Effect | `{Feature}SideEffect` | `EBillFetchSideEffect` |
| Exception | `{Entity}{Action}Exception` | `ElectricityBillConsumerNotFoundException` |
| Mapper | `{Entity}Mapper` | `ElectricityBillMapper` |
| DI Module | `{feature}Module` (camelCase) | `electricityBillModule` |

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Component | `{Feature}Component.kt` | `EBillFetchComponent.kt` |
| Screen (Composable) | `{Feature}Screen.kt` | `EBillFetchScreen.kt` |
| ViewState/Intent | `{Feature}ViewState.kt` | `EBillFetchViewState.kt` |
| UseCase | `{Action}UseCase.kt` | `EBillFetchUseCase.kt` |
| Repository | `{Entity}Repository.kt` | `ElectricityBillRepository.kt` |
| API Model | `{Name}ApiModel.kt` | `FetchElectricityBillResponseApiModel.kt` |
| DI Module | `{Feature}Module.kt` | `ElectricityBillModule.kt` |

### Packages

Package names use lowercase without underscores:

```
app.chalo.{module}.{layer}.{sublayer}

Examples:
app.chalo.electricitybill.ui.ebillfetch
app.chalo.electricitybill.domain
app.chalo.electricitybill.data.repository
app.chalo.electricitybill.data.model.apimodel
app.chalo.electricitybill.data.model.appmodel
```

## Package Structure

### Feature Package Layout

```
app/chalo/{feature}/
├── di/
│   └── {Feature}Module.kt
├── domain/
│   ├── {Action}UseCase.kt
│   ├── model/
│   │   └── {DomainModel}.kt
│   └── repository/
│       └── {Entity}Repository.kt       # Interface only
├── data/
│   ├── repository/
│   │   └── {Entity}RepositoryImpl.kt   # Implementation
│   ├── remote/
│   │   ├── {Entity}RemoteDataSource.kt
│   │   └── {Entity}RemoteDataSourceImpl.kt
│   ├── local/
│   │   └── {Entity}LocalDataSource.kt
│   ├── model/
│   │   ├── apimodel/
│   │   │   ├── request/
│   │   │   │   └── {Request}ApiModel.kt
│   │   │   └── response/
│   │   │       └── {Response}ApiModel.kt
│   │   └── appmodel/
│   │       └── {Name}AppModel.kt
│   └── mapper/
│       └── {Entity}Mapper.kt
├── ui/
│   └── {screen}/
│       ├── {Screen}Component.kt
│       ├── {Screen}Screen.kt           # Compose UI
│       ├── {Screen}ViewState.kt
│       └── {Screen}Intent.kt
└── exception/
    └── {Feature}Exceptions.kt
```

### Source Sets

```
src/
├── commonMain/kotlin/       # Shared code (all platforms)
├── androidMain/kotlin/      # Android-specific
├── iosMain/kotlin/          # iOS-specific
├── androidUnitTest/kotlin/  # Android unit tests
└── commonTest/kotlin/       # Shared tests
```

## MVI Conventions

### Intent Pattern

```kotlin
sealed interface EBillFetchIntent {
    // User actions (from UI)
    data class NumberEnteredIntent(val currentlyEnteredNumber: String) : EBillFetchIntent
    data class NextClickIntent(val currentlyEnteredNumber: String) : EBillFetchIntent
    data object ViewPaymentHistoryIntent : EBillFetchIntent

    // System events
    data class InternetConnectionIntent(val currentNetworkConnectionType: NetworkConnectionType) : EBillFetchIntent
}
```

### DataState Pattern

```kotlin
data class EBillFetchDataState(
    val isLoading: Boolean = false,
    val currentlyEnteredNumber: String = "",
    val customerNoError: String? = null,
    val isNextBtnClickable: Boolean = false,
    val showEBillPaymentDialog: Boolean = false,
    val electricityBillAppModel: ElectricityBillAppModel? = null
)
```

### ViewState Pattern

```kotlin
data class EBillFetchViewState(
    val specs: EBillFetchUISpecs,
    val toolbarUIState: ToolbarUIState,
    val loader: DialogUIState?,
    val title: ChaloTextUIState,
    val subTitle: ChaloTextUIState,
    val textFieldUIState: TextFieldUIState,
    val errorText: ChaloTextUIState?,
    val proceedButton: ButtonUIState,
    val paymentDialogUIState: DialogUIState?,
    val snackbarUIState: SnackbarUIState?
)
```

### Side Effect Pattern

```kotlin
sealed interface EBillFetchSideEffect {
    data class ShowToast(val message: String) : EBillFetchSideEffect
    data object NavigateBack : EBillFetchSideEffect
}
```

## UseCase Conventions

### Naming

- Use action-oriented names: `FetchXxxUseCase`, `CreateXxxUseCase`, `ValidateXxxUseCase`
- Single responsibility: one use case = one action

### Structure

```kotlin
class EBillFetchUseCase(
    private val repository: ElectricityBillRepository,
    private val userInfoContract: UserInfoContract
) {
    suspend fun fetchEBillOnline(
        consumerNumber: String
    ): ChaloUseCaseResult<ElectricityBillAppModel, EBillError> {
        // Validation
        if (!isConsumerNoLengthValid(consumerNumber)) {
            return ChaloUseCaseResult.Failure(EBillError.InvalidLength)
        }

        // Get required data
        val userId = userInfoContract.getUserId()
            ?: return ChaloUseCaseResult.Failure(EBillError.NotLoggedIn)

        // Execute
        return try {
            val result = repository.fetchElectricityBill(userId, consumerNumber)
            ChaloUseCaseResult.Success(result)
        } catch (e: Exception) {
            ChaloUseCaseResult.Failure(EBillError.ApiFailed(e.message))
        }
    }

    // Validation helpers exposed for UI
    fun isConsumerNoLengthValid(number: String): Boolean =
        number.length == CONSUMER_NUMBER_LENGTH

    companion object {
        private const val CONSUMER_NUMBER_LENGTH = 9
    }
}
```

## Repository Conventions

### Interface (Domain Layer)

```kotlin
interface ElectricityBillRepository {
    @Throws(ElectricityBillConsumerNotFoundException::class, CancellationException::class)
    suspend fun fetchElectricityBill(
        userId: String,
        consumerNumber: String
    ): ElectricityBillAppModel

    suspend fun getPaymentHistory(): List<ElectricityBillPaymentHistoryAppModel>
}
```

### Implementation (Data Layer)

```kotlin
class ElectricityBillRepositoryImpl(
    private val remoteDataSource: ElectricityBillRemoteDataSource,
    private val basicInfoContract: BasicInfoContract
) : ElectricityBillRepository {

    override suspend fun fetchElectricityBill(
        userId: String,
        consumerNumber: String
    ): ElectricityBillAppModel {
        return remoteDataSource.fetchElectricityBill(consumerNumber)
            .toElectricityBillAppModel()
    }
}
```

## API Model Conventions

### Request Models

```kotlin
@Serializable
data class ElectricityBillPaymentCreateOrderRequestApiModel(
    val cityId: String,
    val appVer: Int,
    val userId: String,
    val deviceId: String,
    val billProps: EbillProps
)
```

### Response Models

```kotlin
@Serializable
data class FetchElectricityBillResponseApiModel(
    val consumerNumber: String?,    // Nullable for safety
    val customerName: String?,
    val dueAmount: Int?,
    val dueDate: Long?,
    val billDate: Long?
)
```

### Mapper Extensions

```kotlin
fun FetchElectricityBillResponseApiModel.toElectricityBillAppModel(): ElectricityBillAppModel {
    return ElectricityBillAppModel(
        consumerNumber = consumerNumber ?: "",
        customerName = customerName ?: "",
        dueBillAmountInPaisa = dueAmount ?: 0,
        dueDate = dueDate ?: 0L,
        billDate = billDate ?: 0L
    )
}
```

## Dependency Injection Conventions

### Module Definition

```kotlin
val electricityBillModule = module {
    // Data layer - single instances
    single<ElectricityBillRemoteDataSource> { ElectricityBillRemoteDataSourceImpl(get()) }
    single<ElectricityBillRepository> { ElectricityBillRepositoryImpl(get(), get()) }

    // Domain layer - factory (new instance each time)
    factory { EBillFetchUseCase(get(), get()) }
    factory { EBillAmountUseCase(get()) }
    factory { EBillCreateOrderUseCase(get(), get(), get()) }
}
```

### Scope Guidelines

| Scope | Use For |
|-------|---------|
| `single` | Repositories, DataSources, Singletons |
| `factory` | UseCases, Components (screen-specific) |

## Analytics Conventions

### Event Naming

```kotlin
object AnalyticsEventConstants {
    // Pattern: {SCREEN}_{ACTION}
    const val EBILL_FETCH_SCREEN_OPENED = "ebill_fetch_screen_opened"
    const val EBILL_FETCH_SCREEN_NEXT_BTN_CLICKED = "ebill_fetch_screen_next_btn_clicked"
    const val EBILL_FETCH_SCREEN_SHOW_PAYMENT_HISTORY_BTN_CLICKED = "ebill_fetch_screen_show_payment_history_btn_clicked"
}
```

### Raising Events

```kotlin
private fun raiseEBillScreenOpenedEvent() {
    analyticsContract.raiseAnalyticsEvent(
        name = AnalyticsEventConstants.EBILL_FETCH_SCREEN_OPENED,
        source = "",
        eventProperties = mutableMapOf()
    )
}
```

## Error Handling Conventions

### Error Types

```kotlin
enum class EBillFetchErrorType {
    CONSUMER_NUM_LENGTH_TOO_SHORT,
    CONSUMER_NUM_LENGTH_TOO_LONG,
    CONSUMER_NOT_FOUND,
    API_RESPONSE_FAILED,
    USER_NOT_LOGGED_IN
}
```

### Custom Exceptions

```kotlin
class ElectricityBillConsumerNotFoundException(
    override val message: String
) : Exception(message)

class ElectricityBillPaymentOrderCreationException(
    override val message: String
) : Exception(message)
```

## iOS Interop Conventions

### SKIE Annotations

```kotlin
// For sealed classes exposed to Swift
@SealedInterop.Enabled
sealed class ChaloNavigationRequest { ... }

// For enums exposed to Swift
@EnumInterop.Enabled
enum class ChaloScenes { ... }

// For Flow properties exposed to Swift
@FlowInterop.Enabled
val navStream: SharedFlow<ChaloNavigationRequest>
```

## Testing Conventions

### Test File Location

```
src/androidUnitTest/kotlin/
    app/chalo/{feature}/ui/{screen}/
        {Screen}ComponentTest.kt

src/commonTest/kotlin/
    app/chalo/{feature}/domain/
        {Action}UseCaseTest.kt
```

### Test Naming

```kotlin
class EBillFetchComponentTest {
    @Test
    fun `processIntent NumberEntered updates currentlyEnteredNumber`() { }

    @Test
    fun `processIntent NextClick with valid number fetches bill`() { }

    @Test
    fun `processIntent NextClick with invalid number shows error`() { }
}
```

## Code Style Guidelines

### Null Safety

```kotlin
// Prefer safe calls
val result = someNullable?.property ?: defaultValue

// Use requireNotNull for assertions
val userId = requireNotNull(userInfoContract.getUserId()) {
    "User must be logged in"
}
```

### Coroutines

```kotlin
// Launch in component scope
componentScope.launch {
    val result = useCase.execute()
    updateState { it.copy(data = result) }
}

// Use repeatOnStarted for collecting flows
repeatOnStarted {
    networkStateManager.networkState.collect { state ->
        processIntent(InternetConnectionIntent(state))
    }
}
```

### State Updates

```kotlin
// Always use updateState for immutable state updates
updateState { currentState ->
    currentState.copy(
        isLoading = true,
        error = null
    )
}
```
