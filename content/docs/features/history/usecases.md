---
feature: history
layer: domain
lastUpdated: 2026-01-16
sourceCommit: null
---

# History - UseCase Documentation

## Domain Layer Overview

The History domain layer orchestrates retrieval and management of user booking data across all Chalo product types. The layer employs a unified data aggregation pattern through `GetAllRequestedBookedProductsUseCase` which combines reactive streams from multiple product-specific repositories. Use cases coordinate between presentation components and repositories to aggregate booking history, fetch product details, generate invoices, manage cancellations, and sync product data. The layer handles complex cross-product queries while maintaining clean separation from data access concerns.

```mermaid
flowchart TB
    subgraph Presentation
        MyTickets["MyTicketsComponent"]
        TicketSum["TicketSummaryComponent"]
        PassSum["PassSummaryComponent"]
        RideReceipt["RideReceiptComponent"]
    end

    subgraph Domain["Domain Layer"]
        GetAllProducts["GetAllRequestedBookedProductsUseCase"]
        GetProductData["GetRequestedBookedProductDataUseCase"]
        FetchInvoice["FetchProductInvoiceUseCase"]
        CancelBooking["CancelPremiumReserveTicketUseCase"]
        AckCancel["AcknowledgePremiumReserveTicketCancellationUseCase"]
        FetchHistoryConfig["FetchHistoryScreenConfigDataUseCase"]
        InitSync["InitiateProductHistorySyncCallUseCase"]
        GetProductStatus["GetProductStatusUIUseCase"]
    end

    subgraph Data["Data Layer"]
        TicketRepo["TicketRepository"]
        PassRepo["SuperPassRepository"]
        PremiumRepo["PremiumBusRepository"]
        MetroRepo["MetroRepository"]
        OndcRepo["OndcRepository"]
        InstantRepo["InstantTicketRepository"]
        QuickPayUC["GetAllQuickPaysUseCase"]
        InvoiceRepo["ProductInvoiceGenerationRepository"]
        SyncRepo["IProductDataSyncRepository"]
        DigitalReceipt["DigitalTripReceiptRepository"]
    end

    MyTickets --> GetAllProducts
    MyTickets --> FetchHistoryConfig
    MyTickets --> InitSync
    MyTickets --> GetProductStatus
    TicketSum --> GetProductData
    TicketSum --> FetchInvoice
    PassSum --> GetProductData
    RideReceipt --> GetProductData

    GetAllProducts --> TicketRepo
    GetAllProducts --> PassRepo
    GetAllProducts --> PremiumRepo
    GetAllProducts --> MetroRepo
    GetAllProducts --> OndcRepo
    GetAllProducts --> InstantRepo
    GetAllProducts --> QuickPayUC
    GetProductData --> TicketRepo
    GetProductData --> PassRepo
    GetProductData --> PremiumRepo
    GetProductData --> MetroRepo
    GetProductData --> OndcRepo
    GetProductData --> InstantRepo
    FetchInvoice --> InvoiceRepo
    CancelBooking --> PremiumRepo
    InitSync --> SyncRepo
```

---

## UseCase Inventory

| UseCase | Location | Purpose |
|---------|----------|---------|
| **GetAllRequestedBookedProductsUseCase** | `home/domain/` | Aggregate bookings across all product types into unified Flow |
| **GetRequestedBookedProductDataUseCase** | `productsummary/domain/` | Fetch detailed product data by request type |
| **FetchProductInvoiceUseCase** | `productsummary/domain/` | Generate and fetch invoice PDF as ByteArray |
| **CancelPremiumReserveTicketUseCase** | `premiumbus/prebookedtickets/domain/` | Process premium booking cancellation |
| **AcknowledgePremiumReserveTicketCancellationUseCase** | `premiumbus/prebookedtickets/domain/` | Mark cancellation as acknowledged |
| **FetchHistoryScreenConfigDataUseCase** | `home/domain/` | Fetch city-specific history screen configuration |
| **InitiateProductHistorySyncCallUseCase** | `home/usecase/` | Sync all product data from server |
| **GetProductStatusUIUseCase** | `home/domain/` | Determine product status banner display |

---

## GetAllRequestedBookedProductsUseCase

Aggregates booking data from all product-type repositories into a unified reactive stream for display in the My Tickets screen. This is the central use case for the history feature, combining data from 9 different product tables.

### Location

`shared/home/src/commonMain/kotlin/app/chalo/home/domain/GetAllRequestedBookedProductsUseCase.kt`

### Responsibility

Queries multiple product repositories concurrently using Kotlin Flows and combines results into a single sorted list. The use case validates user login state and city context before initiating queries, applies status filtering for active vs expired segregation, and implements a stabilization mechanism to prevent UI flickering during rapid emissions.

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **SuperPassRepository** | Magic and ride-based passes, pending passes, applications |
| **GetAllQuickPaysUseCase** | QuickPay wallet transactions |
| **InstantTicketRepository** | Instant ticket data |
| **PremiumBusRepository** | Premium bus reserve tickets |
| **OndcRepository** | ONDC bus and metro tickets |
| **MetroRepository** | Metro tickets |
| **TicketRepository** | M-Tickets (single journey) |
| **CityProvider** | Current city context |
| **CheckIsUserLoggedInUseCase** | User authentication state |
| **MTicketUtilsHelper** | M-Ticket expiry calculation |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(requestsList, statusType, stabilizationThreshold)"]
    CheckLogin{User logged in?}
    CheckCity{Valid city?}
    CheckRequests{Requests empty?}

    FailLogin["Failure: USER_NOT_LOGGED_IN"]
    FailCity["Failure: INVALID_CITY"]
    FailEmpty["Failure: EMPTY_REQUEST_LIST"]

    MapRequests["Map requestsList to TableToCollect"]

    subgraph Parallel["Concurrent Flow Collection"]
        InstantFlow["getInstantTicketsFlow()"]
        MTicketFlow["getMobileTicketsFlow()"]
        PremiumFlow["getPremiumReserveTicketsFlow()"]
        QuickPayFlow["getQuickPaysFlow()"]
        MagicPassFlow["getMagicSuperPassFlow()"]
        RidePassFlow["getRideBasedSuperPassFlow()"]
        PendingFlow["getPendingSuperPassFlow()"]
        AppFlow["getSuperPassApplicationsFlow()"]
        OndcFlow["getOndcTicketsFlow()"]
        OndcMetroFlow["getOndcMetroTicketsFlow()"]
        MetroFlow["getMetroTicketsFlow()"]
        PassRideFlow["getPassRidesFlow()"]
    end

    Combine["combine() all flows"]
    Flatten["Flatten and sort by bookingTime"]
    Distinct["distinctUntilChanged()"]
    Stabilize["stabilize(threshold)"]
    Return["Success(Flow<List<ChaloUserBookingType>>)"]

    Start --> CheckLogin
    CheckLogin -->|No| FailLogin
    CheckLogin -->|Yes| CheckCity
    CheckCity -->|Invalid| FailCity
    CheckCity -->|Valid| CheckRequests
    CheckRequests -->|Empty| FailEmpty
    CheckRequests -->|Non-empty| MapRequests
    MapRequests --> Parallel
    Parallel --> Combine
    Combine --> Flatten
    Flatten --> Distinct
    Distinct --> Stabilize
    Stabilize --> Return
```

### Input Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **requestsList** | Set<UserBookingsRequestType> | all() | Product types to include |
| **statusTypeToInclude** | UserBookingsStatusType | ALL | ACTIVE, EXPIRED, or ALL filter |
| **stabilizationThreshold** | Long | 3000L | Debounce time in milliseconds |

### Output

| Type | Description |
|------|-------------|
| **ChaloUseCaseResult<Flow<List<ChaloUserBookingType>>, AllRequestedBookedProductsFailureReason>** | Success with reactive list or failure reason |

### UserBookingsRequestType Variants

| Request Type | Product | Options |
|--------------|---------|---------|
| **MobileTicketType** | M-Ticket | - |
| **SuperPassType** | Super Pass | includeRideBasedPass, includeMagicPass, includePendingPasses, includePassApplications |
| **QuickPayType** | QuickPay | onlyIfWalletActive |
| **InstantTicketType** | Instant Ticket | - |
| **PremiumBusTicketType** | Premium Bus | - |
| **OndcTicketType** | ONDC Bus | - |
| **OndcMetroTicketType** | ONDC Metro | - |
| **MetroTicket** | Metro | - |
| **SuperPassRideType** | Pass Rides | - |

### ChaloUserBookingType Sealed Hierarchy

The use case outputs a unified booking type hierarchy that wraps product-specific models.

```mermaid
classDiagram
    class ChaloUserBookingType {
        +bookingId: String
        +productType: String
        +productSubType: String
        +relevantBookingTimeForSorting: Long
    }

    class TicketBooking {
    }

    class SuperPassBooking {
    }

    class CardBooking {
    }

    ChaloUserBookingType <|-- TicketBooking
    ChaloUserBookingType <|-- SuperPassBooking
    ChaloUserBookingType <|-- CardBooking

    TicketBooking <|-- MobileTicketBooking
    TicketBooking <|-- QuickPayBooking
    TicketBooking <|-- InstantTicketBooking
    TicketBooking <|-- PremiumBusBooking
    TicketBooking <|-- OndcTicketBooking
    TicketBooking <|-- OndcMetroTicketBooking
    TicketBooking <|-- MetroTicketBooking
    TicketBooking <|-- PassRideBooking

    SuperPassBooking <|-- MagicSuperPassBooking
    SuperPassBooking <|-- RideBasedSuperPassBooking
    SuperPassBooking <|-- SuperPassApplicationBooking
    SuperPassBooking <|-- PendingSuperPassBooking

    CardBooking <|-- CardRechargeBooking
    CardBooking <|-- CardTransactionReceiptBooking
```

### Stabilization Logic

The use case implements a stabilization mechanism using `transformLatest` to prevent UI flickering when multiple flows emit in rapid succession.

| Behavior | Description |
|----------|-------------|
| **First emission** | Immediate passthrough |
| **Subsequent emissions** | Delayed by threshold (3 seconds default) |
| **Purpose** | Prevents rapid UI updates during initial data load |

### Error Handling

| Error | Cause | Result |
|-------|-------|--------|
| **USER_NOT_LOGGED_IN** | User not authenticated | Failure returned |
| **INVALID_CITY** | CityProvider returns null | Failure returned |
| **EMPTY_REQUEST_LIST** | No product types requested | Failure returned |

---

## InitiateProductHistorySyncCallUseCase

Triggers a full sync of product history data from the backend server and stores the results locally.

### Location

`shared/home/src/commonMain/kotlin/app/chalo/usecase/InitiateProductHistorySyncCallUseCase.kt`

### Responsibility

Coordinates the sync of all product history data by calling the product data sync repository and processing the response. Updates multiple local tables with the received data.

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **IProductDataSyncRepository** | Server sync API access |
| **CityProvider** | Current city context |
| **SuperPassRepository** | Pass table updates |
| **PremiumBusRepository** | Premium ticket updates |
| **InstantTicketRepository** | Instant ticket updates |
| **TicketRepository** | M-Ticket updates |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(isPremiumBusEnabled)"]
    GetCity["Get current city from CityProvider"]

    CheckCity{Valid city?}
    FailCity["Return failure"]

    CallSync["productDataSyncRepository.initiateProductDataSyncCall()"]

    CheckResponse{Response success?}
    FailSync["Return sync failure"]

    subgraph UpdateLocal["Update Local Databases"]
        UpdatePasses["superPassRepository.updateSuperPassTable()"]
        UpdatePending["superPassRepository.updatePendingSuperPassTable()"]
        UpdateApps["superPassRepository.updateSuperPassApplicationTable()"]
        UpdateBookings["superPassRepository.updateSuperPassBookingsTableSynchronously()"]
        UpdatePremium["premiumBusRepository.clearAndInsertPremiumReserveTickets()"]
        UpdateInstant["instantTicketRepository.updateInstantTicketTable()"]
        UpdateMTicket["ticketRepository.insertOrUpdate()"]
    end

    Return["Return success"]

    Start --> GetCity
    GetCity --> CheckCity
    CheckCity -->|Invalid| FailCity
    CheckCity -->|Valid| CallSync
    CallSync --> CheckResponse
    CheckResponse -->|Failure| FailSync
    CheckResponse -->|Success| UpdateLocal
    UpdateLocal --> Return
```

### Output

| Type | Description |
|------|-------------|
| **ChaloUseCaseResult<HistoryResponseAppModel, SyncFailureReason>** | Sync response or failure |

---

## GetProductStatusUIUseCase

Determines the appropriate status banner and CTA to display on product cards based on product state.

### Location

`shared/home/src/commonMain/kotlin/app/chalo/home/domain/GetProductStatusUIUseCase.kt`

### Responsibility

Analyzes product booking type and returns UI metadata including status icon, background color, info text, and optional CTA text. Handles various states like payment processing, payment failed, expired validity, and product disabled scenarios.

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **StringProvider** | Localized string resolution |
| **BasicInfoContract** | True time for validity checks |
| **BookingHelper** | Pass configuration extraction |

### Status Decision Flow

```mermaid
flowchart TD
    Start["invoke(bookingType)"]

    CheckType{Booking Type?}

    subgraph PassStatus["Super Pass Status"]
        CheckPassPayment{Payment status?}
        PassProcessing["Return payment processing status"]
        PassFailed["Return payment failed status"]
        CheckExpiry{Pass expired?}
        PassExpired["Return expired status"]
        PassActive["Return active status"]
    end

    subgraph TicketStatus["Ticket Status"]
        CheckTicketStatus{Ticket status?}
        TicketExpired["Return expired status"]
        TicketActive["Return active status"]
    end

    subgraph PremiumStatus["Premium Bus Status"]
        CheckPremiumStatus{Booking status?}
        PremiumCancelled["Return cancelled status"]
        PremiumConfirmed["Return confirmed status"]
        PremiumPending["Return pending status"]
    end

    Start --> CheckType
    CheckType -->|SuperPassBooking| PassStatus
    CheckType -->|TicketBooking| TicketStatus
    CheckType -->|PremiumBusBooking| PremiumStatus
```

### Output

| Type | Description |
|------|-------------|
| **ProductStatusUiData** | Icon, background color, info text, and optional CTA |

### ProductStatusUiData Fields

| Field | Type | Description |
|-------|------|-------------|
| `iconType` | IconType? | Status icon |
| `bgColor` | ChaloColorToken | Background color token |
| `infoText` | String | Status message |
| `ctaText` | String? | Optional action button text |

---

## FetchHistoryScreenConfigDataUseCase

Fetches city-specific configuration for the history screen from Firebase Remote Config.

### Location

`shared/home/src/commonMain/kotlin/app/chalo/home/domain/FetchHistoryScreenConfigDataUseCase.kt`

### Responsibility

Retrieves and parses history screen configuration based on build flavor and city context. Falls back to default configuration on errors.

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **ChaloConfigFeature** | Firebase Remote Config access |
| **CityProvider** | Current city name |
| **ChaloBuildConfig** | Product flavor determination |
| **BasicInfoContract** | Debug mode check |
| **ErrorReporterContract** | Exception reporting |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke()"]

    CheckDebug{isLiveDebug()?}
    DebugConfig["getStringAsync(PASS_STATUS_CONFIG_DEV)"]

    CheckFlavor{productFlavor?}
    ProdConfig["getStringAsync(PASS_STATUS_CONFIG_PROD)"]
    BetaConfig["getStringAsync(PASS_STATUS_CONFIG_BETA)"]

    CheckCity{cityName valid?}
    CheckString{configStr empty?}

    Parse["deserializeJson(configStr)"]

    CheckParse{Parse success?}

    FindCity["Find cityWiseConfig for current city"]

    CheckCityConfig{City config found?}

    ReturnCityConfig["Return currCityConfig"]
    ReturnDefaultConfig["Return defaultConfig"]
    ReturnFallback["Return HISTORY_SCREEN_CONFIG fallback"]

    Start --> CheckDebug
    CheckDebug -->|Yes| DebugConfig
    CheckDebug -->|No| CheckFlavor

    CheckFlavor -->|PRIMARY| ProdConfig
    CheckFlavor -->|BETA/ALPHA| BetaConfig

    DebugConfig --> CheckCity
    ProdConfig --> CheckCity
    BetaConfig --> CheckCity

    CheckCity -->|Invalid| ReturnFallback
    CheckCity -->|Valid| CheckString
    CheckString -->|Empty| ReturnFallback
    CheckString -->|Non-empty| Parse

    Parse --> CheckParse
    CheckParse -->|Failure| ReturnFallback
    CheckParse -->|Success| FindCity

    FindCity --> CheckCityConfig
    CheckCityConfig -->|Found| ReturnCityConfig
    CheckCityConfig -->|Not found| ReturnDefaultConfig
```

### Output

| Type | Description |
|------|-------------|
| **HistoryScreenConfigForCity** | City-specific history screen configuration |

---

## FetchProductInvoiceUseCase

Generates or retrieves a PDF invoice for any product type. Returns raw PDF bytes for platform-specific rendering.

### Location

`shared/home/src/commonMain/kotlin/app/chalo/productsummary/domain/FetchProductInvoiceUseCase.kt`

### Responsibility

Coordinates invoice generation by validating request parameters and delegating to the `ProductInvoiceGenerationRepository`. Handles various error scenarios with typed failure reasons.

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **ProductInvoiceGenerationRepository** | PDF generation and retrieval |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(passId?, bookingId?)"]
    ValidateParams{Both params null/empty?}

    InvalidParams["Failure: INVALID_REQUEST_PARAMS"]

    FetchPDF["productInvoiceGenerationRepository.fetchProductInvoiceAsBytes()"]

    CheckException{Exception type?}

    InvoiceException["Failure: SERVER_ERROR"]
    LocalException["Failure: LOCAL_ERROR"]
    ParseException["Failure: PARSE_ERROR"]
    UnknownException["Failure: UNKNOWN_ERROR"]

    Success["Success(ByteArray)"]

    Start --> ValidateParams
    ValidateParams -->|Yes| InvalidParams
    ValidateParams -->|No| FetchPDF
    FetchPDF -->|Success| Success
    FetchPDF -->|Exception| CheckException
    CheckException -->|ProductInvoiceGenerationFailedException| InvoiceException
    CheckException -->|ChaloLocalException| LocalException
    CheckException -->|NetworkSuccessResponseParseException| ParseException
    CheckException -->|Other| UnknownException
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| **passId** | String? | Pass identifier (for Super Pass invoices) |
| **bookingId** | String? | Booking identifier (for ticket invoices) |

At least one parameter must be non-null and non-empty.

### Output

| Type | Description |
|------|-------------|
| **ChaloUseCaseResult<ByteArray, ProductInvoiceFetchFailedError>** | PDF bytes or typed error |

### Error Types

| Reason | Cause | Message |
|--------|-------|---------|
| **INVALID_REQUEST_PARAMS** | Both passId and bookingId null/empty | - |
| **SERVER_ERROR** | Backend PDF generation failed | Exception message |
| **LOCAL_ERROR** | Local operation failed | - |
| **PARSE_ERROR** | Response parsing failed | - |
| **UNKNOWN_ERROR** | Unexpected exception | Exception message |

---

## CancelPremiumReserveTicketUseCase

Processes cancellation requests for premium bus bookings, submitting to server and syncing the updated ticket state locally.

### Location

`shared/home/src/commonMain/kotlin/app/chalo/premiumbus/prebookedtickets/domain/CancelPremiumReserveTicketUseCase.kt`

### Responsibility

Validates cancellation request, submits to server via repository, and triggers local data sync on success. Returns typed result indicating success or specific failure reason.

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **PremiumBusRepository** | Cancellation API call |
| **FetchPremiumReserveTicketAndStoreLocallyUseCase** | Post-cancellation data sync |

### Flow Diagram

```mermaid
flowchart TD
    Start["invoke(bookingId, reason)"]

    CallRepo["premiumBusRepository.cancelPremiumReserveTicket()"]

    CheckStatus{Cancellation status?}

    Success["PbTicketCancellationRequestStatus.SUCCESS"]
    Failed["FAILED or UNKNOWN"]

    SyncTicket["fetchPremiumReserveTicketAndStoreLocallyUseCase.invoke()"]

    CheckSync{Sync result?}

    SyncSuccess["Success(cancellationMessage)"]
    SyncFailed["TicketSyncFailed"]
    UnknownError["UnknownError"]

    CheckException{Exception type?}

    CancellationException["ServerError(message)"]
    LocalException["LocalError"]
    OtherException["UnknownError"]

    Start --> CallRepo
    CallRepo -->|Success| CheckStatus
    CallRepo -->|Exception| CheckException

    CheckStatus -->|SUCCESS| SyncTicket
    CheckStatus -->|FAILED/UNKNOWN| UnknownError

    SyncTicket --> CheckSync
    CheckSync -->|Success| SyncSuccess
    CheckSync -->|Failure| SyncFailed

    CheckException -->|PBTicketUserCancellationFailedException| CancellationException
    CheckException -->|ChaloLocalException| LocalException
    CheckException -->|Other| OtherException
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| **bookingId** | String | Premium booking identifier to cancel |
| **reason** | PremiumBusProductModificationReasonAppModel | User-selected cancellation reason |

### Output

| Type | Description |
|------|-------------|
| **CancelPremiumReserveTicketResult** | Sealed class with success or specific error |

### Result Types

| Result | Description | Error Code |
|--------|-------------|------------|
| **Success** | Cancellation completed | PB_SUCCESS_CODE |
| **ServerError** | API returned error | PB_CANCEL_RIDE_SERVER_ERROR |
| **LocalError** | Local operation failed | PB_CANCEL_RIDE_LOCAL_ERROR |
| **TicketSyncFailed** | Cancellation succeeded but sync failed | PB_CANCEL_RIDE_TICKET_SYNC_FAILED |
| **UnknownError** | Unexpected error | PB_CANCEL_RIDE_UNKNOWN_ERROR |

---

## Sequence Diagrams

### View History Flow

```mermaid
sequenceDiagram
    participant User
    participant Component as MyTicketsComponent
    participant UC as GetAllRequestedBookedProductsUseCase
    participant Repos as Product Repositories
    participant Factory as MyTicketsUiStateFactory

    User->>Component: Open My Tickets tab
    Component->>UC: invoke(requestsList, ACTIVE)

    Note over UC: Validate user login and city

    par Concurrent Flow Setup
        UC->>Repos: ticketRepository.getAllTickets()
        UC->>Repos: superPassRepository.getAllRelevantMagicSuperPassesAsFlow()
        UC->>Repos: premiumBusRepository.getAllPremiumReserveTicketsForCityAsFlow()
        UC->>Repos: instantTicketRepository.getAllInstantTicketsAsFlow()
        UC->>Repos: ondcRepository.getAllOndcTicketsAsFlow()
        UC->>Repos: metroRepository.getAllMetroTicketsAsFlow()
    end

    Repos-->>UC: Flow<List<ProductType>> (each)
    UC->>UC: combine() all flows
    UC->>UC: Sort by relevantBookingTimeForSorting
    UC->>UC: distinctUntilChanged()
    UC->>UC: stabilize(3000ms)
    UC-->>Component: Success(Flow<List<ChaloUserBookingType>>)

    Component->>Component: collect flow emissions
    Component->>Factory: toViewState(dataState)
    Factory-->>Component: MyTicketsViewState
    Component->>User: Display booking grid
```

### Product Detail Navigation Flow

```mermaid
sequenceDiagram
    participant User
    participant MyTickets as MyTicketsComponent
    participant UC as GetRequestedBookedProductDataUseCase
    participant Repo as Respective Repository
    participant Summary as TicketSummaryComponent

    User->>MyTickets: Tap on booking card
    MyTickets->>MyTickets: Determine BookingsRequestType
    MyTickets->>UC: invoke(request)

    UC->>UC: Route to appropriate repository
    UC->>Repo: getProductByIdAsFlow(id)
    Repo-->>UC: Flow<Product?>
    UC->>UC: Map to ChaloUserBookingType
    UC-->>MyTickets: Flow<ChaloUserBookingType?>

    MyTickets->>Summary: Navigate with booking data
    Summary->>Summary: Initialize with product details
    Summary->>User: Display summary screen
```

### Cancellation Flow

```mermaid
sequenceDiagram
    participant User
    participant Component as TicketSummaryComponent
    participant CancelUC as CancelPremiumReserveTicketUseCase
    participant Repo as PremiumBusRepository
    participant SyncUC as FetchPremiumReserveTicketAndStoreLocallyUseCase
    participant API as Backend

    User->>Component: Tap "Cancel Booking"
    Component->>Component: Show cancellation reason sheet
    User->>Component: Select reason and confirm

    Component->>CancelUC: invoke(bookingId, reason)
    CancelUC->>Repo: cancelPremiumReserveTicket()
    Repo->>API: POST cancel request
    API-->>Repo: CancellationResponse

    alt Cancellation Success
        Repo-->>CancelUC: SUCCESS status
        CancelUC->>SyncUC: invoke(bookingId)
        SyncUC->>API: Fetch updated ticket
        API-->>SyncUC: Updated ticket data
        SyncUC->>SyncUC: Store locally
        SyncUC-->>CancelUC: Success
        CancelUC-->>Component: Success(cancellationMessage)
        Component->>User: Show success with refund info
    else Cancellation Failed
        Repo-->>CancelUC: FAILED status
        CancelUC-->>Component: UnknownError
        Component->>User: Show error message
    end
```

### Invoice Download Flow

```mermaid
sequenceDiagram
    participant User
    participant Component as TicketSummaryComponent
    participant UC as FetchProductInvoiceUseCase
    participant Repo as ProductInvoiceGenerationRepository
    participant Remote as ProductInvoiceGenerationRemoteDataSource
    participant API as Backend

    User->>Component: Tap "Download Invoice"
    Component->>Component: Show loading state

    Component->>UC: invoke(passId, bookingId)
    UC->>UC: Validate parameters

    UC->>Repo: fetchProductInvoiceAsBytes(request)
    Repo->>Remote: fetchProductInvoiceAsBytes(apiRequest)
    Remote->>API: GET /mticketing/v1/reserve-ticket/download-invoice
    API-->>Remote: PDF ByteArray
    Remote-->>Repo: ByteArray
    Repo-->>UC: ByteArray
    UC-->>Component: Success(ByteArray)

    Component->>Component: Platform-specific PDF handling
    Component->>User: Open PDF viewer / Share
```

---

## Domain Models

### ChaloUserBookingType Properties

Each booking type exposes common properties for unified handling.

| Property | Source | Description |
|----------|--------|-------------|
| **bookingId** | Varies by type | Unique booking identifier |
| **productType** | Constants | Product type string |
| **productSubType** | Constants | Product subtype string |
| **relevantBookingTimeForSorting** | Computed | Timestamp for sorting |

### relevantBookingTimeForSorting Mapping

| Booking Type | Time Source |
|--------------|-------------|
| **InstantTicketBooking** | instantTicket.bookingTime |
| **MobileTicketBooking** | ticket.bookingTime |
| **PremiumBusBooking** | premiumReserveTicket.bookingProperties.bookingTime |
| **QuickPayBooking** | quickPay.getActivationTimestampMS() |
| **MagicSuperPassBooking** | pass.superPassUIProperties.bookingTime |
| **PendingSuperPassBooking** | pendingPass.pendingSuperPassUIProperties.bookingTime |
| **RideBasedSuperPassBooking** | pass.superPassUIProperties.bookingTime |
| **SuperPassApplicationBooking** | application.passStartDate |
| **OndcTicketBooking** | ondcTicket.bookingTime |
| **OndcMetroTicketBooking** | ticket.bookingTime |
| **MetroTicketBooking** | ticket.bookingTime |
| **PassRideBooking** | max(punchTimeInMillis, activationTimeInMillis) |
| **CardBooking** | Long.MAX_VALUE (not shown in history) |

### toValidationProduct() Mapping

Converts booking types to validation products for QR code display.

| Booking Type | ValidationProduct |
|--------------|-------------------|
| **InstantTicketBooking** | MobileTicketProduct.InstantTicketValidation |
| **MobileTicketBooking** | MobileTicketProduct.SingleJourneyTicketValidation |
| **PremiumBusBooking** | MobileTicketProduct.PremiumReserveTicketValidation |
| **QuickPayBooking** | QuickpayProduct.QuickpayValidation |
| **MagicSuperPassBooking** | SuperPassProduct.MagicPassValidation |
| **RideBasedSuperPassBooking** | SuperPassProduct.RideBasedPassValidation |
| **OndcTicketBooking** | MobileTicketProduct.OndcTicketValidation |
| **OndcMetroTicketBooking** | MobileTicketProduct.OndcMetroTicketValidation |
| **MetroTicketBooking** | MobileTicketProduct.MetroTicketValidation |
| **PendingSuperPassBooking** | null |
| **SuperPassApplicationBooking** | null |
| **PassRideBooking** | null |
| **CardBooking** | null |

---

## Business Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **User authentication required** | Must be logged in to view history | GetAllRequestedBookedProductsUseCase |
| **City context required** | Must have valid city selected | GetAllRequestedBookedProductsUseCase |
| **Active/Expired segregation** | Products filtered by validity state | Status filtering in each flow |
| **Stabilization delay** | 3 second debounce on emissions | GetAllRequestedBookedProductsUseCase |
| **Invoice parameter validation** | Either passId or bookingId required | FetchProductInvoiceUseCase |
| **Post-cancellation sync** | Local data synced after cancellation | CancelPremiumReserveTicketUseCase |
| **Acknowledgment tracking** | Cancellation notifications tracked | AcknowledgePremiumReserveTicketCancellationUseCase |

---

## Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| **USER_NOT_LOGGED_IN** | User not authenticated | Return failure, prompt login |
| **INVALID_CITY** | No city context | Return failure, prompt city selection |
| **EMPTY_REQUEST_LIST** | No products requested | Return failure (developer error) |
| **INVALID_REQUEST_PARAMS** | Missing invoice identifiers | Return failure with reason |
| **SERVER_ERROR** | Backend API failure | Return failure with message |
| **LOCAL_ERROR** | Local operation failure | Return failure |
| **PARSE_ERROR** | Response parsing failed | Return failure |
| **UNKNOWN_ERROR** | Unexpected exception | Return failure with message |
| **TicketSyncFailed** | Sync failed after cancellation | Return specific status |
