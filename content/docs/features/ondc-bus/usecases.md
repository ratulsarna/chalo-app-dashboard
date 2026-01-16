---
feature: ondc-bus
layer: domain
lastUpdated: 2026-01-16
sourceCommit: null
---

# ONDC Bus -- UseCase Documentation

## Domain Layer Overview

The ONDC Bus domain layer implements a streamlined booking and ticket lifecycle through focused use cases. Unlike the HLD's conceptual ONDC protocol phases (search, select, init, confirm, status), the actual implementation consolidates these into practical operations: configuration fetching, booking creation, order creation, ticket fetching, and purchase completion. The use cases coordinate between the repository layer and presentation layer, handling error mapping and data transformation.

```mermaid
flowchart TB
    subgraph Presentation
        BookingUI["Booking UI"]
        ValidationUI["Validation UI"]
        ReceiptUI["Receipt UI"]
    end

    subgraph Domain["Domain Layer"]
        subgraph Config["Configuration"]
            FetchConfigUC["FetchOndcConfigUseCase"]
        end

        subgraph Booking["Booking Flow"]
            CreateBookingUC["CreateOndcBookingUseCase"]
            CreateOrderUC["CreateOndcOrderUseCase"]
            CompletePurchaseUC["CompleteOndcPurchaseAndStoreTicketUseCase"]
        end

        subgraph Ticket["Ticket Operations"]
            FetchTicketUC["FetchOndcTicketUseCase"]
            FetchAndStoreTicketUC["FetchAndStoreOndcTicketUseCase"]
            GetTicketUC["GetOndcTicketUseCase"]
            GetTicketByIdUC["GetOndcTicketByIdUseCase"]
            GetTicketFromApiUC["GetOndcTicketAppModelFromApiUseCase"]
        end

        subgraph Receipt["Receipt Operations"]
            FetchReceiptUC["FetchAndStoreOndcReceiptUseCase"]
        end

        subgraph Metro["Metro Specific"]
            FetchMetroLinesUC["FetchOndcMetroLinesUseCase"]
            FetchMetroStopsUC["FetchOndcMetroLineStopsUseCase"]
            FetchMetroTicketUC["FetchOndcMetroTicketUseCase"]
            GetMetroTicketByIdUC["GetOndcMetroTicketByIdUseCase"]
            GetMetroTicketFromApiUC["GetOndcMetroTicketAppModelFromApiUseCase"]
        end
    end

    subgraph Data["Data Layer"]
        Repo["OndcRepository"]
        ProductConfig["ProductBookingDataStore"]
        CityProvider["CityProvider"]
    end

    BookingUI --> FetchConfigUC
    BookingUI --> CreateBookingUC
    BookingUI --> CreateOrderUC
    BookingUI --> CompletePurchaseUC

    ValidationUI --> GetTicketUC
    ValidationUI --> GetTicketByIdUC

    ReceiptUI --> FetchReceiptUC

    FetchConfigUC --> Repo
    FetchConfigUC --> ProductConfig
    CreateBookingUC --> Repo
    CreateBookingUC --> CityProvider
    CreateOrderUC --> Repo
    CreateOrderUC --> CityProvider
    FetchTicketUC --> Repo
    FetchAndStoreTicketUC --> Repo
    GetTicketUC --> Repo
    GetTicketByIdUC --> Repo
    CompletePurchaseUC --> Repo
    FetchReceiptUC --> Repo
```

---

## UseCase Inventory

| UseCase | Module | File Path | Purpose |
|---------|--------|-----------|---------|
| `FetchOndcConfigUseCase` | productbooking | `domain/FetchOndcConfigUseCase.kt` | Retrieve ONDC product configuration |
| `CreateOndcBookingUseCase` | productbooking | `domain/CreateOndcBookingUseCase.kt` | Create ONDC booking with passenger details |
| `CreateOndcOrderUseCase` | productbooking | `domain/CreateOndcOrderUseCase.kt` | Create payment order for booking |
| `FetchOndcTicketUseCase` | productbooking | `domain/FetchOndcTicketUseCase.kt` | Fetch ticket by booking ID from API |
| `FetchAndStoreOndcTicketUseCase` | productbooking | `domain/FetchAndStoreOndcTicketUseCase.kt` | Fetch and cache ticket locally |
| `GetOndcTicketUseCase` | productbooking | `domain/GetOndcTicketUseCase.kt` | Get ticket from local storage |
| `GetOndcTicketByIdUseCase` | productbooking | `domain/GetOndcTicketByIdUseCase.kt` | Get ticket as Flow for reactive updates |
| `GetOndcTicketAppModelFromApiUseCase` | productbooking | `domain/GetOndcTicketAppModelFromApiUseCase.kt` | Transform API response to app model |
| `CompleteOndcPurchaseAndStoreTicketUseCase` | productbooking | `domain/CompleteOndcPurchaseAndStoreTicketUseCase.kt` | Finalize purchase and store ticket |
| `FetchAndStoreOndcReceiptUseCase` | productbooking | `domain/FetchAndStoreOndcReceiptUseCase.kt` | Fetch and cache ticket receipt |

---

## FetchOndcConfigUseCase

Retrieves the ONDC ticket product configuration from the product configs API and caches it locally for subsequent use. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/FetchOndcConfigUseCase.kt`.

### Responsibility

Fetches product configurations filtered by ONDC ticket product subtype, validates that the configuration is active and visible, transforms it to the ONDC-specific configuration model, and persists it to the product booking datastore.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `fetchProductConfigsForUiUseCase` | `FetchProductConfigsForUiUseCase` | Fetches raw product configs |
| `productBookingDataStore` | `ProductBookingDataStore` | Local config persistence |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(productSubType)"]
    FetchConfigs["fetchProductConfigsForUiUseCase.invoke()"]
    CheckResult{Result type?}

    Failure["Return failure with error reason"]

    FilterConfigs["Filter by productType, productSubType, isActive, isVisible"]
    ConfigFound{Config found?}

    NotFound["Return USER_DATA_NOT_AVAILABLE"]

    Transform["toOndcTicketConfig()"]
    Cache["productBookingDataStore.setONDCProductConfig()"]
    CacheError["Log exception, continue"]
    Success["Return Success(OndcTicketConfiguration)"]

    Start --> FetchConfigs
    FetchConfigs --> CheckResult

    CheckResult -->|Failure| Failure
    CheckResult -->|Success| FilterConfigs

    FilterConfigs --> ConfigFound
    ConfigFound -->|No| NotFound
    ConfigFound -->|Yes| Transform

    Transform --> Cache
    Cache -->|Exception| CacheError
    Cache -->|Success| Success
    CacheError --> Success
```

### Input Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `productSubType` | String | `OndcTicketConstants.PRODUCT_SUB_TYPE` | Product subtype filter ("ondcTicket") |

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<OndcTicketConfiguration, FetchProductConfigForUiErrorReason>` | Configuration or error |

### Configuration Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Configuration identifier |
| `city` | String | City name |
| `name` | String | Product display name |
| `agency` | String | Transit agency name |
| `isActive` | Boolean | Whether product is active |
| `isVisible` | Boolean? | Whether product is visible in UI |
| `minAppVer` | Int? | Minimum app version required |
| `productType` | String | "mobileTicket" |
| `productSubType` | String | "ondcTicket" |
| `branding` | BrandingDetails | Branding configuration |
| `productValidationType` | ProductValidationType | Validation method type |

### Filter Criteria

The use case filters configurations with these conditions:
- `productType == "mobileTicket"`
- `productSubType == "ondcTicket"` (or specified)
- `isActive == true`
- `isVisible == true`

---

## CreateOndcBookingUseCase

Creates an ONDC booking by submitting passenger details, trip information, and customer contact to the booking API. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/CreateOndcBookingUseCase.kt`.

### Responsibility

Constructs the booking request from app models, retrieves the current city context, submits to the repository, and handles error mapping for various exception types.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Remote booking API access |
| `cityProvider` | `CityProvider` | Current city retrieval |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(configId, providerId, passengerDetails, tripDetails, userName, mobileNumber, email, transactionId)"]
    GetCity["cityProvider.currentCity.firstOrNull()"]
    CityCheck{City available?}

    NoCityError["Return UnavailableCityDetails"]

    BuildRequest["Build OndcBookingRequestAppModel"]
    CallRepo["ondcRepository.createBooking()"]
    Success["Return Success(OndcBookingAppModel)"]

    CatchException{Exception type?}
    LocalError["Return Local error"]
    APIError["Return API error with code"]
    ParseError["Return ResponseParsing"]
    InvalidError["Return InvalidData"]
    UnknownError["Return Unknown error"]

    Start --> GetCity
    GetCity --> CityCheck
    CityCheck -->|No| NoCityError
    CityCheck -->|Yes| BuildRequest

    BuildRequest --> CallRepo
    CallRepo -->|Success| Success
    CallRepo -->|Exception| CatchException

    CatchException -->|ChaloLocalException| LocalError
    CatchException -->|ProductBookingRemoteDataException| APIError
    CatchException -->|NetworkSuccessResponseParseException| ParseError
    CatchException -->|InvalidFareResponseDataException| InvalidError
    CatchException -->|Other| UnknownError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `configId` | String | ONDC product configuration ID |
| `providerId` | String | BPP provider identifier |
| `passengerDetails` | `List<PassengerDetailData>` | Passenger information list |
| `tripDetails` | `OndcTicketTripDetails` | Trip route and stop details |
| `userName` | String | Customer full name |
| `mobileNumber` | String | Customer phone number |
| `email` | String? | Optional customer email |
| `transactionId` | String | ONDC transaction identifier from route search |

### Trip Details Structure

| Field | Type | Description |
|-------|------|-------------|
| `startStopId` | String | Origin stop identifier |
| `endStopId` | String | Destination stop identifier |
| `routeId` | String? | Route identifier (optional) |
| `routeName` | String? | Route display name |
| `startStopName` | String? | Origin stop name |
| `endStopName` | String? | Destination stop name |
| `tripFulfillmentId` | String | ONDC fulfillment identifier |

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<OndcBookingAppModel, ProductBookingDataSourceError>` | Booking response or error |

### Booking Response

| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | String | Created booking identifier |
| `fareBreakup` | `List<FareBreakupAppModel>?` | Fare breakdown components |
| `finalFare` | Int | Total fare amount |
| `termsAndConditions` | `List<String>` | T&C text list |

---

## CreateOndcOrderUseCase

Creates a payment order for an existing ONDC booking, enabling the checkout flow to proceed with payment processing. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/CreateOndcOrderUseCase.kt`.

### Responsibility

Builds the order request with booking ID and total fare, submits to the repository, and returns the order creation response with payment details.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Remote order API access |
| `cityProvider` | `CityProvider` | Current city retrieval |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(ondcBookingId, totalFare)"]
    GetCity["cityProvider.currentCity.firstOrNull()"]
    CityCheck{City available?}

    NoCityError["Return UnavailableCityDetails"]

    BuildRequest["Build OndcOrderRequestAppModel"]
    CallRepo["ondcRepository.createOrder()"]
    Success["Return Success(CreateOrderResponseAppModel)"]

    CatchException{Exception type?}
    LocalError["Return Local error"]
    APIError["Return API error with code"]
    ParseError["Return ResponseParsing"]
    InvalidError["Return InvalidData"]
    UnknownError["Return Unknown error"]

    Start --> GetCity
    GetCity --> CityCheck
    CityCheck -->|No| NoCityError
    CityCheck -->|Yes| BuildRequest

    BuildRequest --> CallRepo
    CallRepo -->|Success| Success
    CallRepo -->|Exception| CatchException

    CatchException -->|ChaloLocalException| LocalError
    CatchException -->|ProductBookingRemoteDataException| APIError
    CatchException -->|NetworkSuccessResponseParseException| ParseError
    CatchException -->|InvalidFareResponseDataException| InvalidError
    CatchException -->|Other| UnknownError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ondcBookingId` | String | Booking ID from CreateOndcBookingUseCase |
| `totalFare` | Long | Total amount in subcurrency (paise) |

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<CreateOrderResponseAppModel, ProductBookingDataSourceError>` | Order response or error |

---

## CompleteOndcPurchaseAndStoreTicketUseCase

Finalizes an ONDC purchase after payment confirmation, fetches the generated ticket, and stores it locally for offline access. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/CompleteOndcPurchaseAndStoreTicketUseCase.kt`.

### Responsibility

Calls the purchase completion endpoint, transforms the generic ticket response to ONDC-specific model, validates the ticket data, and persists to local storage.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Remote and local data operations |
| `getOndcTicketAppModelFromApiUseCase` | `GetOndcTicketAppModelFromApiUseCase` | API response transformation |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(bookingId)"]
    CallComplete["ondcRepository.completeOndcPurchase(bookingId)"]
    Transform["getOndcTicketAppModelFromApiUseCase.invoke(genericTicket)"]
    CheckTicket{Ticket valid?}

    InvalidTicket["Return Failure(InvalidTicket)"]
    InsertTicket["ondcRepository.insertOndcTicket(ondcTicket)"]
    Success["Return Success(Unit)"]

    CatchException{Exception type?}
    LocalError["Return LocalError"]
    APIError["Return ApiError"]
    ParseError["Return ResponseParsing"]
    UnknownError["Return UnknownError"]

    Start --> CallComplete
    CallComplete -->|Success| Transform
    CallComplete -->|Exception| CatchException

    Transform --> CheckTicket
    CheckTicket -->|null| InvalidTicket
    CheckTicket -->|Valid| InsertTicket
    InsertTicket --> Success

    CatchException -->|ChaloLocalException| LocalError
    CatchException -->|ProductBookingRemoteDataException| APIError
    CatchException -->|NetworkSuccessResponseParseException| ParseError
    CatchException -->|Other| UnknownError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `bookingId` | String | Booking ID to complete purchase |

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<Unit, CompleteOndcPurchaseFailureReason>` | Success or failure reason |

### Failure Reasons

| Reason | Description |
|--------|-------------|
| `InvalidTicket` | Ticket transformation returned null |
| `ResponseParsing` | Failed to parse API response |
| `LocalError(msg)` | Local storage or network failure |
| `ApiError(msg)` | Remote API returned error |
| `UnknownError(msg)` | Unexpected exception |

---

## FetchOndcTicketUseCase

Fetches an ONDC ticket by booking ID from the remote API, validating the product type and subtype. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/FetchOndcTicketUseCase.kt`.

### Responsibility

Calls the repository to fetch ticket data, validates that the returned ticket matches the requested booking ID, and returns the generic mobile ticket model for further processing.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Remote ticket fetch |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(bookingId, productType, productSubType)"]
    CallRepo["ondcRepository.fetchOndcTicketProductById()"]
    GetTicket["response.mobileTicket"]
    CheckTicket{Ticket present and ID matches?}

    NoTicket["Return Failure(NO_PRODUCT_RECEIVED)"]
    Success["Return Success(GenericMobileTicketProductApiResponseModel)"]

    CatchException{Exception type?}
    ServerError["Return SERVER_ERROR"]
    LocalError["Return LOCAL_ERROR"]
    ParseError["Return PARSE_ERROR"]
    UnknownError["Return UNKNOWN_ERROR"]

    Start --> CallRepo
    CallRepo -->|Success| GetTicket
    CallRepo -->|Exception| CatchException

    GetTicket --> CheckTicket
    CheckTicket -->|No| NoTicket
    CheckTicket -->|Yes| Success

    CatchException -->|MobileTicketProductFetchFailedException| ServerError
    CatchException -->|ChaloLocalException| LocalError
    CatchException -->|NetworkSuccessResponseParseException| ParseError
    CatchException -->|Other| UnknownError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `bookingId` | String | Booking ID to fetch |
| `productType` | String | Expected product type ("mobileTicket") |
| `productSubType` | String | Expected product subtype ("ondcTicket") |

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<GenericMobileTicketProductApiResponseModel, MobileTicketByIdFetchFailedReason>` | Ticket or failure |

---

## FetchAndStoreOndcTicketUseCase

Orchestrates ticket fetching and local storage by combining FetchOndcTicketUseCase with ticket transformation and persistence. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/FetchAndStoreOndcTicketUseCase.kt`.

### Responsibility

Fetches ticket using the fetch use case, transforms to app model using the transformation use case, inserts into local storage via repository, and maps fetch errors to storage-specific error types.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `fetchOndcTicketUseCase` | `FetchOndcTicketUseCase` | Remote ticket fetch |
| `ondcRepository` | `OndcRepository` | Local ticket storage |
| `getOndcTicketAppModelFromApiUseCase` | `GetOndcTicketAppModelFromApiUseCase` | API to app model transformation |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(bookingId)"]
    FetchTicket["fetchOndcTicketUseCase.invoke(bookingId, PRODUCT_TYPE, PRODUCT_SUB_TYPE)"]
    CheckFetch{Fetch result?}

    FetchFailed["Map error to FetchOndcTicketFailureReason"]
    Transform["getOndcTicketAppModelFromApiUseCase.invoke(fetchResult.data)"]
    CheckTransform{Transform result?}

    InvalidTicket["Return Failure(INVALID_TICKET_RECEIVED)"]
    InsertTicket["ondcRepository.insertOndcTicket(ondcTicket)"]
    Success["Return Success(Unit)"]

    Start --> FetchTicket
    FetchTicket --> CheckFetch

    CheckFetch -->|Failure| FetchFailed
    CheckFetch -->|Success| Transform

    Transform --> CheckTransform
    CheckTransform -->|null| InvalidTicket
    CheckTransform -->|Valid| InsertTicket
    InsertTicket --> Success
```

### Error Mapping

| Fetch Error | Storage Error |
|-------------|---------------|
| `NO_PRODUCT_RECEIVED` | `NO_TICKET_RECEIVED` |
| `SERVER_ERROR` | `SERVER_ERROR` |
| `LOCAL_ERROR` | `LOCAL_ERROR` |
| `UNKNOWN_ERROR` | `UNKNOWN_ERROR` |
| `PARSE_ERROR` | `PARSE_ERROR` |

---

## GetOndcTicketUseCase

Retrieves an ONDC ticket from local storage by booking ID, used for validation and display when offline. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/GetOndcTicketUseCase.kt`.

### Responsibility

Queries the repository for locally cached ticket data and returns it wrapped in a result type.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Local ticket query |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(bookingId)"]
    QueryRepo["ondcRepository.getOndcTicket(bookingId)"]
    CheckResult{Ticket found?}

    NotFound["Return Failure(NOT_FOUND)"]
    Success["Return Success(OndcTicketAppModel)"]

    Start --> QueryRepo
    QueryRepo --> CheckResult
    CheckResult -->|null| NotFound
    CheckResult -->|Present| Success
```

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<OndcTicketAppModel, OndcTicketStatus>` | Ticket or NOT_FOUND |

---

## GetOndcTicketByIdUseCase

Provides a reactive Flow of ticket data for a specific booking ID, enabling UI to observe ticket changes. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/GetOndcTicketByIdUseCase.kt`.

### Responsibility

Returns a Flow from the repository that emits ticket updates, useful for real-time UI updates during validation when ticket state changes (e.g., from ACTIVE to PUNCHED).

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Reactive ticket query |

### Implementation

The use case is minimal, delegating directly to the repository:

```kotlin
class GetOndcTicketByIdUseCase(private val ondcRepository: OndcRepository) {
    operator fun invoke(bookingId: String): Flow<OndcTicketAppModel?> {
        return ondcRepository.getOndcTicketAsFlow(bookingId)
    }
}
```

### Output

| Type | Description |
|------|-------------|
| `Flow<OndcTicketAppModel?>` | Reactive ticket stream, emits null if not found |

---

## GetOndcTicketAppModelFromApiUseCase

Transforms generic mobile ticket API responses to ONDC-specific app models with validation. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/GetOndcTicketAppModelFromApiUseCase.kt`.

### Responsibility

Validates that the API response matches ONDC ticket product type and subtype, then transforms to the typed app model or returns null if invalid.

### Transformation Flow

```mermaid
flowchart TD
    Start["invoke(genericMobileTicketModel)"]
    ValidateType["isValidOndcTicketType()"]
    TypeCheck{Type valid?}

    Invalid["Return null"]
    Transform["toOndcTicketAppModelOrNullIfInvalid()"]
    TransformCheck{Transform valid?}

    TransformNull["Return null"]
    Success["Return OndcTicketAppModel"]

    Start --> ValidateType
    ValidateType --> TypeCheck
    TypeCheck -->|No| Invalid
    TypeCheck -->|Yes| Transform

    Transform --> TransformCheck
    TransformCheck -->|null| TransformNull
    TransformCheck -->|Valid| Success
```

### Type Validation

| Field | Expected Value |
|-------|----------------|
| `productType` | `"mobileTicket"` (OndcTicketConstants.PRODUCT_TYPE) |
| `productSubType` | `"ondcTicket"` (OndcTicketConstants.PRODUCT_SUB_TYPE) |

### Transformation Mapping

| API Field | App Model Field | Required |
|-----------|-----------------|----------|
| `bookingId` | `bookingId` | Yes |
| `userId` | `userId` | Yes |
| `bookingTime` | `bookingTime` | Yes |
| `amount` | `amount` | Yes |
| `status` | `status` (enum conversion) | Yes |
| `punchTime` | `punchTime` | No |
| `city` | `city` (lowercased) | Yes |
| `qrCode` | `qrCode` | No |
| `tone` | `tone` | No |
| `expiryTime` | `activationExpiryTime` | Yes |
| `passengerDetails` | `passengerDetails` (map) | No |
| `routeName` | `routeName` | No |
| `fromStopDetails.name` | `startStopName` | No |
| `toStopDetails.name` | `endStopName` | No |
| `refundInfo` | `refundInfo` | No |
| `validationEntities` | `validationInfoList` | No |
| `fareBreakup` | `fareBreakup` | No |
| `ticketColorSchemeHex` | `ticketColorHex` | No |

---

## FetchAndStoreOndcReceiptUseCase

Retrieves ticket receipt data, checking local cache first then fetching from API if needed. Located at `shared/productbooking/src/commonMain/kotlin/app/chalo/ondc/domain/FetchAndStoreOndcReceiptUseCase.kt`.

### Responsibility

Queries local cache for receipt, fetches from remote if not cached, validates receipt matches booking ID, caches fetched receipt, and returns receipt data for display.

### Constructor Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `ondcRepository` | `OndcRepository` | Local and remote receipt access |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(bookingId)"]
    QueryCache["ondcRepository.getOndcTicketReceiptFlow(bookingId).firstOrNull()"]
    CacheCheck{Receipt cached?}

    CacheHit["Return Success(receipt.toValidationReceiptData())"]

    FetchRemote["ondcRepository.fetchOndcTicketReceipt(bookingId)"]
    FetchCheck{Fetch successful and ID matches?}

    FetchFail["Return Failure(OndcTicketReceiptFetchFailed)"]
    CacheReceipt["ondcRepository.insertOndcTicketReceipt(receipt)"]
    Success["Return Success(receipt.toValidationReceiptData())"]

    CatchException["Return Failure with error message"]

    Start --> QueryCache
    QueryCache --> CacheCheck
    CacheCheck -->|Yes| CacheHit
    CacheCheck -->|No| FetchRemote

    FetchRemote -->|Exception| CatchException
    FetchRemote -->|Success| FetchCheck

    FetchCheck -->|No| FetchFail
    FetchCheck -->|Yes| CacheReceipt
    CacheReceipt --> Success
```

### Exception Handling

| Exception Type | Handling |
|----------------|----------|
| `OndcBookingReceiptInvalidResponseException` | Return failure with message |
| `ChaloLocalException` | Return failure with message |
| `NetworkSuccessResponseParseException` | Return failure with message |
| `Exception` (generic) | Return failure with message |

### Receipt Validation

The use case includes a private helper method `isRelevantReceipt()` that validates:
- `bookingId` matches the requested booking
- `productType` equals `OndcTicketConstants.PRODUCT_TYPE`
- `productSubType` equals `OndcTicketConstants.PRODUCT_SUB_TYPE`

### Output

| Type | Description |
|------|-------------|
| `ChaloUseCaseResult<ProductReceiptData, ReceiptFetchError>` | Receipt or error |

### Error Class

```kotlin
class OndcTicketReceiptFetchFailed(val msg: String) : ReceiptFetchError
```

---

## Metro-Specific Use Cases

The ONDC module includes dedicated use cases for metro ticket operations with similar patterns but metro-specific constants.

### FetchOndcMetroLinesUseCase

Fetches available metro lines for the current city.

```mermaid
flowchart TD
    Start["invoke()"]
    GetCity["cityProvider.currentCity.value?.name"]
    CityCheck{City available?}

    NoCityError["Return UnavailableCityDetails"]
    FetchLines["ondcRepository.fetchMetroLines(cityName, METRO)"]
    Success["Return Success(OndcMetroRouteSearchResultAppModel)"]
    HandleError["Map exception to error type"]

    Start --> GetCity
    GetCity --> CityCheck
    CityCheck -->|No| NoCityError
    CityCheck -->|Yes| FetchLines
    FetchLines -->|Success| Success
    FetchLines -->|Exception| HandleError
```

### FetchOndcMetroLineStopsUseCase

Fetches stops for a specific metro line.

| Parameter | Type | Description |
|-----------|------|-------------|
| `routeId` | String | Metro line route identifier |

| Output | Description |
|--------|-------------|
| `ChaloUseCaseResult<List<StopAppModel>, ProductBookingDataSourceError>` | Stop list or error |

### GetOndcMetroTicketByIdUseCase

Similar to `GetOndcTicketByIdUseCase` but for metro tickets.

| Output | Description |
|--------|-------------|
| `Flow<OndcMetroTicketAppModel?>` | Reactive metro ticket stream |

### GetOndcMetroTicketAppModelFromApiUseCase

Transforms generic API response to metro-specific app model with metro product type validation.

| Type Validation | Value |
|-----------------|-------|
| `productType` | `"mobileTicket"` |
| `productSubType` | `"ondcMetroTicket"` |

---

## Error Handling Strategy

### Exception to Error Mapping

All use cases follow a consistent error mapping pattern.

```mermaid
flowchart TB
    subgraph Exceptions["Exception Types"]
        ChaloLocal["ChaloLocalException"]
        ProductRemote["ProductBookingRemoteDataException"]
        ParseException["NetworkSuccessResponseParseException"]
        InvalidFare["InvalidFareResponseDataException"]
        MetroFetch["MetroLineStopListFetchFailedException"]
        Other["Exception"]
    end

    subgraph Errors["ProductBookingDataSourceError"]
        LocalError["Local(message)"]
        APIError["API(message, errorCode)"]
        ResponseParsing["ResponseParsing"]
        InvalidData["InvalidData"]
        UnknownError["Unknown(message)"]
        UnavailableCity["UnavailableCityDetails"]
    end

    ChaloLocal --> LocalError
    ProductRemote --> APIError
    ParseException --> ResponseParsing
    InvalidFare --> InvalidData
    MetroFetch --> APIError
    Other --> UnknownError
```

### Error Categories

| Category | Cause | Recovery |
|----------|-------|----------|
| `UnavailableCityDetails` | No city in context | Prompt user to select city |
| `Local` | Device storage/network issue | Retry or go offline |
| `API` | Server returned error | Show error message, retry |
| `ResponseParsing` | Malformed server response | Retry or report issue |
| `InvalidData` | Data validation failed | Retry with different parameters |
| `Unknown` | Unexpected error | Log and show generic message |

---

## Sequence Diagrams

### Complete Booking Flow

```mermaid
sequenceDiagram
    participant UI as Booking UI
    participant ConfigUC as FetchOndcConfigUseCase
    participant BookingUC as CreateOndcBookingUseCase
    participant OrderUC as CreateOndcOrderUseCase
    participant CompleteUC as CompleteOndcPurchaseUseCase
    participant Repo as OndcRepository
    participant API as ONDC API

    UI->>ConfigUC: invoke()
    ConfigUC->>Repo: fetchProductConfigsForUi()
    Repo->>API: GET /product-configs
    API-->>Repo: Configuration list
    Repo-->>ConfigUC: OndcTicketConfiguration
    ConfigUC-->>UI: Configuration ready

    UI->>BookingUC: invoke(configId, passengers, trip)
    BookingUC->>Repo: createBooking(request)
    Repo->>API: POST /ondc/buyer/v1/booking
    API-->>Repo: OndcBookingAppModel
    Repo-->>BookingUC: Booking created
    BookingUC-->>UI: bookingId, fareBreakup

    UI->>OrderUC: invoke(bookingId, totalFare)
    OrderUC->>Repo: createOrder(request)
    Repo->>API: POST /ondc/buyer/v1/mobile-ticket/order
    API-->>Repo: CreateOrderResponseAppModel
    Repo-->>OrderUC: Order created
    OrderUC-->>UI: Order for payment

    Note over UI: Payment processing...

    UI->>CompleteUC: invoke(bookingId)
    CompleteUC->>Repo: completeOndcPurchase(bookingId)
    Repo->>API: GET /ondc/buyer/v1/confirm-purchase
    API-->>Repo: GenericMobileTicketProduct
    CompleteUC->>CompleteUC: Transform to OndcTicketAppModel
    CompleteUC->>Repo: insertOndcTicket(ticket)
    Repo-->>CompleteUC: Cached
    CompleteUC-->>UI: Purchase complete
```

### Ticket Retrieval Flow

```mermaid
sequenceDiagram
    participant UI as Validation UI
    participant GetUC as GetOndcTicketUseCase
    participant FetchStoreUC as FetchAndStoreOndcTicketUseCase
    participant FetchUC as FetchOndcTicketUseCase
    participant TransformUC as GetOndcTicketAppModelFromApiUseCase
    participant Repo as OndcRepository

    UI->>GetUC: invoke(bookingId)
    GetUC->>Repo: getOndcTicket(bookingId)

    alt Ticket cached
        Repo-->>GetUC: OndcTicketAppModel
        GetUC-->>UI: Success(ticket)
    else Not cached
        Repo-->>GetUC: null
        GetUC-->>UI: Failure(NOT_FOUND)

        UI->>FetchStoreUC: invoke(bookingId)
        FetchStoreUC->>FetchUC: invoke(bookingId, type, subtype)
        FetchUC->>Repo: fetchOndcTicketProductById()
        Repo-->>FetchUC: GenericMobileTicketProduct
        FetchUC-->>FetchStoreUC: Success(apiModel)

        FetchStoreUC->>TransformUC: invoke(apiModel)
        TransformUC-->>FetchStoreUC: OndcTicketAppModel

        FetchStoreUC->>Repo: insertOndcTicket(ticket)
        FetchStoreUC-->>UI: Success(Unit)
    end
```

### Receipt Fetch Flow

```mermaid
sequenceDiagram
    participant UI as Receipt UI
    participant ReceiptUC as FetchAndStoreOndcReceiptUseCase
    participant Repo as OndcRepository
    participant API as ONDC API

    UI->>ReceiptUC: invoke(bookingId)
    ReceiptUC->>Repo: getOndcTicketReceiptFlow(bookingId)

    alt Receipt cached
        Repo-->>ReceiptUC: OndcTicketReceiptAppModel
        ReceiptUC->>ReceiptUC: toValidationReceiptData()
        ReceiptUC-->>UI: Success(ProductReceiptData)
    else Not cached
        Repo-->>ReceiptUC: null
        ReceiptUC->>Repo: fetchOndcTicketReceipt(bookingId)
        Repo->>API: GET /ondc/buyer/v1/receipt
        API-->>Repo: OndcTicketReceiptApiModel
        Repo-->>ReceiptUC: OndcTicketReceiptAppModel

        alt Valid receipt
            ReceiptUC->>Repo: insertOndcTicketReceipt(receipt)
            ReceiptUC->>ReceiptUC: toValidationReceiptData()
            ReceiptUC-->>UI: Success(ProductReceiptData)
        else Invalid
            ReceiptUC-->>UI: Failure(OndcTicketReceiptFetchFailed)
        end
    end
```

---

## Business Rules

| Rule | Use Case | Enforcement |
|------|----------|-------------|
| **City required** | CreateOndcBookingUseCase, CreateOndcOrderUseCase | Check city provider before API call |
| **Config active and visible** | FetchOndcConfigUseCase | Filter inactive/hidden configs |
| **Product type validation** | GetOndcTicketAppModelFromApiUseCase | Reject mismatched product types |
| **Booking ID match** | FetchOndcTicketUseCase, FetchAndStoreOndcReceiptUseCase | Validate response ID matches request |
| **Cache-first receipts** | FetchAndStoreOndcReceiptUseCase | Query cache before network |
| **Transit mode filter** | FetchOndcMetroLinesUseCase | Always use METRO mode for metro calls |
| **Transform validation** | CompleteOndcPurchaseAndStoreTicketUseCase | Fail if transformation returns null |

---

## Dependencies

### Common Dependencies

| Dependency | Purpose |
|------------|---------|
| `OndcRepository` | Data access abstraction |
| `CityProvider` | Current city context via `currentCity` Flow |
| `ChaloUseCaseResult` | Standardized result wrapper with Success/Failure |

### Use Case Specific

| Use Case | Additional Dependencies |
|----------|------------------------|
| `FetchOndcConfigUseCase` | `FetchProductConfigsForUiUseCase`, `ProductBookingDataStore` |
| `FetchAndStoreOndcTicketUseCase` | `FetchOndcTicketUseCase`, `GetOndcTicketAppModelFromApiUseCase` |
| `CompleteOndcPurchaseAndStoreTicketUseCase` | `GetOndcTicketAppModelFromApiUseCase` |

---

## ChaloUseCaseResult Pattern

All use cases return `ChaloUseCaseResult<T, E>` which is a sealed class with two variants:

| Variant | Description |
|---------|-------------|
| `Success<T>` | Contains the successful result data |
| `Failure<E>` | Contains the error reason |

This pattern enables exhaustive handling in calling code via when expressions and ensures errors are always explicitly handled rather than thrown as exceptions.
