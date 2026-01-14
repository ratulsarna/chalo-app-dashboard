---
feature: bills
lastUpdated: 2026-01-14
sourceCommit: 6367036fc1357bc5a7cc3444ad82157094ecfda7
---

# Bills — UseCase Documentation


## Use Cases

### EBillFetchUseCase

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/domain/EBillFetchUseCase.kt`
- **Input**: `consumerNum: String`
- **Output**: `ChaloUseCaseResult<ElectricityBillAppModel, EBillFetchException>`
- **Dependencies**:
  - `ElectricityBillRepository`
  - `UserProfileDetailsProvider`

#### Purpose
Validates consumer number format and fetches electricity bill details from the BEST API.

#### Business Logic
1. **Validation**: Consumer number must be exactly 9 digits
2. **Fetch**: Calls repository with user ID and consumer number
3. **Error mapping**: Converts `ElectricityBillConsumerNotFoundException` to `EBillFetchException`

#### Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `isConsumerNoLengthValid()` | `consumerNo: String?` | `Boolean` | Validates exactly 9 digits |
| `fetchEBillOnline()` | `consumerNum: String` | `ChaloUseCaseResult<ElectricityBillAppModel, EBillFetchException>` | Fetches bill from API |

#### Error Handling
- `ElectricityBillConsumerNotFoundException` → `EBillFetchException` (consumer not found in BEST system)
- `CancellationException` → Propagated (coroutine cancellation)

#### Example Usage
```kotlin
class EBillFetchUseCase(
    private val repository: ElectricityBillRepository,
    private val profileFeature: UserProfileDetailsProvider
) {
    fun isConsumerNoLengthValid(consumerNo: String?): Boolean {
        return consumerNo != null && consumerNo.length == 9
    }

    suspend fun fetchEBillOnline(consumerNum: String): ChaloUseCaseResult<ElectricityBillAppModel, EBillFetchException> {
        return try {
            ChaloUseCaseResult.Success(
                repository.fetchElectricityBill(profileFeature.getUserId() ?: "", consumerNum)
            )
        } catch (exception: ElectricityBillConsumerNotFoundException) {
            ChaloUseCaseResult.Failure(exception.toEBillFetchException())
        }
    }
}
```

---

### EBillAmountUseCase

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/domain/EBillAmountUseCase.kt`
- **Input**: `ElectricityBillAppModel`, `enteredAmountString: String`
- **Output**: `ChaloUseCaseResult<String, EBillAmountException>`
- **Dependencies**:
  - `CurrencyFeature`

#### Purpose
Validates user-entered payment amount against business rules and updates the app model with the entered amount.

#### Business Logic
1. **Minimum check**: Amount must be greater than 0
2. **Due amount check**: Amount must be at least the due bill amount
3. **Maximum check**: Amount cannot exceed Rs 17,000 (1,700,000 paisa)
4. **Currency conversion**: Converts currency string to paisa using `CurrencyFeature`

#### Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `validateEnteredAmount()` | `model: ElectricityBillAppModel?, enteredAmountString: String` | `ChaloUseCaseResult<String, EBillAmountException>` | Validates amount against rules |
| `getStartingEBillAppModel()` | `model: ElectricityBillAppModel` | `ElectricityBillAppModel` | Initializes model with due amount |
| `getUpdatedAppModelWithEnteredAmount()` | `model: ElectricityBillAppModel, enteredAmountString: String` | `ElectricityBillAppModel` | Updates model with user entry |

#### Validation Rules

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Minimum | `amount <= 0` | "Amount should be more than 0" |
| Due amount | `amount < dueBillAmountInPaisa` | "Amount should be more than due amount" |
| Maximum | `amount > 1700000` | "Amount cannot be greater than Rs 17000" |

#### Example Usage
```kotlin
class EBillAmountUseCase(
    private val currencyFeature: CurrencyFeature
) {
    fun validateEnteredAmount(
        electricityBillAppModel: ElectricityBillAppModel?,
        enteredAmountString: String
    ): ChaloUseCaseResult<String, EBillAmountException> {
        val enteredAmount = getEnteredAmountInPaisaFromAmountString(enteredAmountString)

        return when {
            enteredAmount <= 0 ->
                ChaloUseCaseResult.Failure(EBillAmountException("Amount should be more than 0"))
            enteredAmount < model.dueBillAmountInPaisa ->
                ChaloUseCaseResult.Failure(EBillAmountException("Amount should be more than due amount"))
            enteredAmount > 1700000 ->
                ChaloUseCaseResult.Failure(EBillAmountException("Amount cannot be greater than Rs 17000"))
            else ->
                ChaloUseCaseResult.Success(enteredAmountString)
        }
    }
}
```

---

### EBillCreateOrderUseCase

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/domain/EBillCreateOrderUseCase.kt`
- **Input**: `model: ElectricityBillAppModel`
- **Output**: `ChaloUseCaseResult<CreateOrderResponseAppModel, EBillPaymentException>`
- **Dependencies**:
  - `ElectricityBillRepository`
  - `UserProfileDetailsProvider`
  - `CityProvider`

#### Purpose
Creates a payment order for electricity bill payment, preparing the checkout flow.

#### Business Logic
1. **Get user context**: Retrieves user ID and current city
2. **Create order**: Calls repository with bill details and amount
3. **Error mapping**: Converts repository exceptions to domain exceptions

#### Error Handling
- `ElectricityBillPaymentOrderCreationException` → `EBillPaymentException`
- Generic `Exception` → `EBillPaymentException` with message

#### Example Usage
```kotlin
class EBillCreateOrderUseCase(
    private val repository: ElectricityBillRepository,
    private val profileFeature: UserProfileDetailsProvider,
    private val cityProvider: CityProvider
) {
    suspend fun createOrder(model: ElectricityBillAppModel): ChaloUseCaseResult<CreateOrderResponseAppModel, EBillPaymentException> {
        return try {
            ChaloUseCaseResult.Success(
                repository.createElectricityBillPaymentOrder(
                    profileFeature.getUserId() ?: "",
                    cityProvider.getCurrentCityName() ?: "",
                    model.userEnteredAmountInPaisa,
                    "ebill_dakjh", // Config ID
                    model.dueDate,
                    model.billDate,
                    model.consumerNumber,
                    model.customerName
                )
            )
        } catch (exception: ElectricityBillPaymentOrderCreationException) {
            ChaloUseCaseResult.Failure(exception.toEBillPaymentException())
        }
    }
}
```

---

### EBillFetchPaymentHistoryUseCase

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/domain/EBillFetchPaymentHistoryUseCase.kt`
- **Input**: None
- **Output**: `List<ElectricityBillPaymentHistoryAppModel>`
- **Dependencies**:
  - `ElectricityBillRepository`

#### Purpose
Retrieves the user's electricity bill payment history.

#### Business Logic
1. Fetches payment history from repository
2. Returns list of historical payments (or empty list)

---

## Domain Models

### ElectricityBillAppModel

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/appmodel/ElectricityBillAppModel.kt`
- **Used by**: `EBillFetchUseCase`, `EBillAmountUseCase`, `EBillCreateOrderUseCase`

```kotlin
data class ElectricityBillAppModel(
    val consumerNumber: String,
    val customerName: String,
    val dueBillAmountInPaisa: Int,
    val userEnteredAmountInPaisa: Int,
    val dueDate: Long,
    val billDate: Long,
    // ... additional fields
)
```

### ElectricityBillPaymentHistoryAppModel

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/data/model/appmodel/ElectricityBillPaymentHistoryAppModel.kt`
- **Used by**: `EBillFetchPaymentHistoryUseCase`

---

## Domain Exceptions

### EBillFetchException

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/exception/EBillFetchException.kt`
- **Error Types**: `EBillFetchErrorType` enum (consumer not found, network error, etc.)

### EBillAmountException

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/exception/EBillAmountException.kt`
- **Purpose**: Validation errors for amount entry

### EBillPaymentException

- **File**: `shared/home/src/commonMain/kotlin/app/chalo/electricitybill/exception/EBillPaymentException.kt`
- **Purpose**: Payment order creation failures

---

## Business Rules

| Rule | Description | Enforced In |
|------|-------------|-------------|
| Consumer number format | Must be exactly 9 digits | `EBillFetchUseCase` |
| Minimum payment | Amount must be > 0 | `EBillAmountUseCase` |
| Due amount minimum | Amount must be >= due bill amount | `EBillAmountUseCase` |
| Maximum payment | Amount cannot exceed Rs 17,000 | `EBillAmountUseCase` |
| User authentication | User must be logged in | All use cases (via `UserProfileDetailsProvider`) |
