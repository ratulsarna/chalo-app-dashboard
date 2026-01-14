---
feature: bills
lastUpdated: 2026-01-14
sourceCommit: 6367036fc1357bc5a7cc3444ad82157094ecfda7
---

# Bills — Repository Documentation


## Repositories

### ElectricityBillRepository

- **Interface**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/repository/ElectricityBillRepository.kt`
- **Implementation**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/repository/ElectricityBillRepositoryImpl.kt`
- **Data Sources**:
  - Remote: `ElectricityBillRemoteDataSource`

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `fetchElectricityBill(userId, consumerNumber)` | `ElectricityBillAppModel` | Fetches bill details from BEST API |
| `createElectricityBillPaymentOrder(...)` | `CreateOrderResponseAppModel` | Creates payment order for checkout |
| `getPaymentHistory()` | `List<ElectricityBillPaymentHistoryAppModel>` | Retrieves historical payments |

#### Interface Definition
```kotlin
interface ElectricityBillRepository {

    @Throws(ElectricityBillConsumerNotFoundException::class, CancellationException::class)
    suspend fun fetchElectricityBill(
        userId: String,
        consumerNumber: String
    ): ElectricityBillAppModel

    @Throws(ElectricityBillPaymentOrderCreationException::class, CancellationException::class)
    suspend fun createElectricityBillPaymentOrder(
        userId: String,
        cityId: String,
        amount: Int,
        configId: String,
        dueDate: Long,
        billDate: Long,
        accountNumber: String,
        customerName: String
    ): CreateOrderResponseAppModel

    suspend fun getPaymentHistory(): List<ElectricityBillPaymentHistoryAppModel>
}
```

#### Implementation Details

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

    override suspend fun createElectricityBillPaymentOrder(...): CreateOrderResponseAppModel {
        val reqApiModel = getElectricityBillPaymentCreateOrderRequestApiModel(...)
        return remoteDataSource.createElectricityBillPaymentOrder(reqApiModel).toAppModel()
    }

    override suspend fun getPaymentHistory(): List<ElectricityBillPaymentHistoryAppModel> {
        return remoteDataSource.getPaymentHistory().payments?.map {
            it.toAppModel()
        } ?: emptyList()
    }
}
```

#### Caching Strategy
- **Strategy**: Network-only (no local caching)
- **Rationale**: Bill data must be fresh from BEST API; payment history fetched on-demand

---

## Data Sources

### ElectricityBillRemoteDataSource

- **Interface**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/remote/ElectricityBillRemoteDataSource.kt`
- **Implementation**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/remote/ElectricityBillRemoteDataSourceImpl.kt`

#### Methods

| Method | HTTP | Description |
|--------|------|-------------|
| `fetchElectricityBill(consumerNumber)` | GET | Fetches bill from BEST API |
| `createElectricityBillPaymentOrder(request)` | POST | Creates payment order |
| `getPaymentHistory()` | GET | Fetches payment history |

---

## API Endpoints

### Bill Fetch

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/v1/ebill/fetch` | GET | Required | `consumerNumber` query param | `FetchElectricityBillResponseApiModel` |

### Payment Order Creation

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/v1/ebill/order/create` | POST | Required | `ElectricityBillPaymentCreateOrderRequestApiModel` | `CreateOrderResponseApiModel` |

### Payment History

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/v1/ebill/history` | GET | Required | — | `ElectricityBillPaymentHistoryResponseApiModel` |

---

## Request/Response Models

### FetchElectricityBillResponseApiModel

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/apimodel/response/FetchElectricityBillResponseApiModel.kt`

```kotlin
@Serializable
data class FetchElectricityBillResponseApiModel(
    val consumerNumber: String?,
    val customerName: String?,
    val dueAmount: Int?,         // Amount in paisa
    val dueDate: Long?,          // Unix timestamp
    val billDate: Long?,         // Unix timestamp
    // ... additional fields
)
```

### ElectricityBillPaymentCreateOrderRequestApiModel

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/apimodel/request/ElectricityBillPaymentCreateOrderRequestApiModel.kt`

```kotlin
@Serializable
data class ElectricityBillPaymentCreateOrderRequestApiModel(
    val cityId: String,
    val appVer: Int,
    val userId: String,
    val deviceId: String,
    val billProps: EbillProps
)

@Serializable
data class EbillProps(
    val amount: Int,             // Amount in paisa
    val configId: String,
    val billDate: Long,
    val dueDate: Long,
    val accountNumber: String,   // Consumer number
    val customerName: String
)
```

### ElectricityBillPaymentHistoryResponseApiModel

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/apimodel/response/ElectricityBillPaymentHistoryResponseApiModel.kt`

```kotlin
@Serializable
data class ElectricityBillPaymentHistoryResponseApiModel(
    val payments: List<ElectricityBillPaymentHistoryApiModel>?
)

@Serializable
data class ElectricityBillPaymentHistoryApiModel(
    val transactionId: String?,
    val amount: Int?,
    val status: String?,
    val date: Long?,
    val consumerNumber: String?,
    // ... additional fields
)
```

---

## Data Mappers

### API → App Model Mappers

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/apimodel/response/FetchElectricityBillResponseApiModel.kt`

```kotlin
fun FetchElectricityBillResponseApiModel.toElectricityBillAppModel(): ElectricityBillAppModel {
    return ElectricityBillAppModel(
        consumerNumber = this.consumerNumber ?: "",
        customerName = this.customerName ?: "",
        dueBillAmountInPaisa = this.dueAmount ?: 0,
        userEnteredAmountInPaisa = 0,
        dueDate = this.dueDate ?: 0L,
        billDate = this.billDate ?: 0L
    )
}
```

### Payment History Mapper

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/appmodel/ElectricityBillPaymentHistoryAppModel.kt`

```kotlin
fun ElectricityBillPaymentHistoryApiModel.toAppModel(): ElectricityBillPaymentHistoryAppModel {
    return ElectricityBillPaymentHistoryAppModel(
        transactionId = this.transactionId ?: "",
        amount = this.amount ?: 0,
        status = this.status ?: "",
        date = this.date ?: 0L,
        consumerNumber = this.consumerNumber ?: ""
    )
}
```

---

## Exception Mappers

### Network Error Mappers

| Mapper | Source Exception | Target Exception |
|--------|-----------------|------------------|
| `NetworkResponseToElectricityBillConsumerNotFoundExceptionMapper` | Network response errors | `ElectricityBillConsumerNotFoundException` |
| `NetworkResponseToEBillOrderCreationExceptionMapper` | Network response errors | `ElectricityBillPaymentOrderCreationException` |
| `NetworkResponseToElectricityBillGetPaymentHistoryExceptionMapper` | Network response errors | `ElectricityBillGetPaymentHistoryException` |

---

## Local Storage

This feature does not use local storage. All data is fetched fresh from the API:
- Bill details are always current from BEST
- Payment history is fetched on-demand
- No offline support required

---

## Dependencies

### Repository Dependencies

| Dependency | Purpose |
|------------|---------|
| `ElectricityBillRemoteDataSource` | API calls to BEST backend |
| `BasicInfoContract` | App version and device ID for requests |

### DI Module

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/di/ElectricityBillModule.kt`

```kotlin
val electricityBillModule = module {
    single<ElectricityBillRemoteDataSource> { ElectricityBillRemoteDataSourceImpl(get()) }
    single<ElectricityBillRepository> { ElectricityBillRepositoryImpl(get(), get()) }
    factory { EBillFetchUseCase(get(), get()) }
    factory { EBillAmountUseCase(get()) }
    factory { EBillCreateOrderUseCase(get(), get(), get()) }
    factory { EBillFetchPaymentHistoryUseCase(get()) }
}
```
