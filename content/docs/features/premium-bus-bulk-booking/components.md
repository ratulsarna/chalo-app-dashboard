---
feature: premium-bus-bulk-booking
type: lld-components
lastUpdated: 2026-01-16
---

# Premium Bus Bulk Booking - Component Architecture

This document describes the UI components that power the Premium Bus Bulk Booking feature, which enables SuperPass holders to pre-book multiple rides across a date range with specific weekday and time slot selections.

## Architecture Overview

The bulk booking feature spans two KMP shared modules following the MVI (Model-View-Intent) architecture pattern with Decompose for lifecycle management. Each component extends `ChaloBaseStateMviComponent`, managing its own view state through intent processing and orchestrating domain use cases.

```mermaid
flowchart TB
    subgraph "shared/home"
        RideDetailsComp["PbBulkBookingRideDetailsComponent"]
        RideDetailsScreen["PbBulkBookingRideDetailsScreen"]
    end

    subgraph "shared/productbooking"
        DetailsComp["PBPreBookingDetailsComponent"]
        SlotComp["PBPreBookingSlotSelectionComponent"]
        ConfirmComp["PBPreBookingConfirmationComponent"]
    end

    subgraph "Shared Components"
        SeatSelection["PremiumBusSeatSelectionComponent"]
    end

    RideDetailsComp -->|BookMultipleRideClick| DetailsComp
    DetailsComp -->|Proceed| SlotComp
    SlotComp -->|SelectSeats| SeatSelection
    SeatSelection -->|SeatSelectionResult| SlotComp
    SlotComp -->|AllTripsComplete| ConfirmComp
    ConfirmComp -->|BookingSuccess| RideDetailsComp
```

## Screen Inventory

| Screen | Component | Module | Purpose |
|--------|-----------|--------|---------|
| Ride Details | PbBulkBookingRideDetailsComponent | home | View booked rides, manage pass, initiate bookings |
| Pre-Booking Details | PBPreBookingDetailsComponent | productbooking | Configure date range, weekdays, trips per day |
| Slot Selection | PBPreBookingSlotSelectionComponent | productbooking | Select O-D pairs and time slots for each trip |
| Rides Confirmation | PBPreBookingConfirmationComponent | productbooking | Review and submit bulk booking request |

---

## PbBulkBookingRideDetailsComponent

The primary entry point for managing rides booked through a SuperPass. This component orchestrates the complete lifecycle of pass-based ride management including viewing tickets categorized as upcoming or past, initiating new bookings, and modifying pass start dates.

### Source Location

```
shared/home/src/commonMain/kotlin/app/chalo/premiumbus/bulkbookingridedetails/ui/
├── PbBulkBookingRideDetailsComponent.kt
├── PbBulkBookingRideDetailsViewState.kt
└── PbBulkBookingRideDetailsScreen.kt
```

### Component Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| FetchFailedAndUnderProcessBookingsAndUpdateAllBookingsInDBUseCase | Domain | Sync remote tickets to local DB |
| FetchAllPremiumReserveTicketsBookedThroughPassUseCase | Domain | Stream all tickets for pass |
| UpdatePassStartDateChangesUseCase | Domain | Modify pass validity period |
| CheckIfContinueWithBulkBookingFlowUseCase | Domain | Validate booking eligibility |
| SuperPassDataWrapper | Data | Access SuperPass properties |
| ActivePremiumBusTicketsHelper | Helper | Polling for active ticket ETAs |
| ChaloNavigationManager | Navigation | Screen transitions |
| AnalyticsContract | Analytics | Event tracking |

### View State Structure

The component maintains comprehensive state encompassing pass details, ride categorization, and UI configuration.

```mermaid
classDiagram
    class PbBulkBookingRideDetailsViewState {
        +List~PremiumBusBulkBookingUpcomingRidesCardData~ pbBulkBookingUpcomingRideDetailList
        +List~PremiumBusBulkBookingPastRidesCardData~ pbBulkBookingPastRideDetailList
        +SuperPassResponseAppModel? superPassResponseAppModel
        +Int? remainingTrips
        +PbBulkBookingRideDetailsTabType currentlySelectedTab
        +Boolean isBulkBookingPass
        +PbBulkBookingRideDetailsDialogType? dialogType
        +PremiumBusMeta? premiumBusMeta
        +Boolean isDateChangeAllowed
    }

    class PremiumBusBulkBookingUpcomingRidesCardData {
        +String bookingId
        +String configurationId
        +PremiumReserveTicketStatus ticketStatus
        +Long tripSlotStartTime
        +String? fromStopName
        +String? toStopName
    }

    class PremiumBusBulkBookingPastRidesCardData {
        +String bookingId
        +String configurationId
        +PremiumReserveTicketStatus ticketStatus
        +Long tripSlotStartTime
        +Long validOrExpiryTime
    }
```

### Intent Processing Flow

```mermaid
sequenceDiagram
    participant UI as Compose UI
    participant Comp as Component
    participant UseCase as Domain UseCase
    participant Repo as Repository

    UI->>Comp: ViewCreatedIntent(passId, subType, isNewPurchase)
    Comp->>UseCase: FetchFailedAndUnderProcess...UseCase(passId)
    UseCase->>Repo: fetchPbTripBookingDetails(passId)
    Repo-->>UseCase: PbTripBookingResponseAppModel
    UseCase->>Repo: clearExistingDataAndInsert...
    UseCase-->>Comp: Filtered bookings

    Comp->>UseCase: FetchAllPremiumReserveTickets...(passId)
    UseCase-->>Comp: Flow~List~PremiumReserveTicketAppModel~~
    Comp->>Comp: Separate into upcoming/past lists
    Comp-->>UI: Emit updated ViewState
```

### Key Intents

| Intent | Trigger | Handler |
|--------|---------|---------|
| ViewCreatedIntent | Screen load | Initialize state, fetch tickets |
| BookSingleRideClickIntent | Single ride CTA | Navigate to single booking flow |
| BookMultipleRideClickIntent | Multiple rides CTA | Validate eligibility, navigate to pre-booking |
| DateChangeOptionClickIntent | Change date CTA | Show date picker dialog |
| PassDateChangeConfirmationDialog | Date selected | Call UpdatePassStartDateChangesUseCase |
| OnRidesCardCtaClickIntent | Ride card tap | Navigate to tracking or details |
| BookAgainClickedIntent | Book again CTA | Pre-fill booking with previous route |

### Active Ticket Polling

The component implements real-time polling for active rides using `ActivePremiumBusTicketsHelper`. This maintains live ETA updates for up to three concurrent active tickets.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> PollingActive: Has active tickets
    PollingActive --> Polling: Every 1 second
    Polling --> UpdateState: Fetch vehicle info, ETA
    UpdateState --> PollingActive: Continue
    PollingActive --> Idle: No active tickets
    Idle --> [*]: Screen destroyed

    note right of Polling
        Max 3 concurrent active tickets
        Mutex-protected state updates
    end note
```

The polling system uses mutex locks (`pollingActiveTicketMutex`, `pbActiveBookingsPollingMutex`, `clearResourcesMutex`) to ensure thread-safe updates across concurrent coroutines. The `activeCardBufferCardList` serves as a buffer that the polling job reads from every second to emit updated state.

### Dialog Types

| Dialog | Trigger | Purpose |
|--------|---------|---------|
| ChaloDatePicker | Date change banner tap | Select new pass start date |
| PassDateChangeConfirmationDialog | Date selected | Confirm validity change |
| PassDateChangeFailureDialog | API error | Show error with retry option |
| ChaloConfirmationDialog | Product disabled | Inform user of disabled product |

---

## PBPreBookingDetailsComponent

Configures bulk booking parameters including date range, weekday selection, and trips per day. Validates selections against pass ride balance before proceeding to slot selection.

### Source Location

```
shared/productbooking/src/commonMain/kotlin/app/chalo/premiumbus/ui/pbprebooking/bookingdetails/
├── PBPreBookingDetailsComponent.kt
└── PBPreBookingDetailsContract.kt
```

### Component Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| FetchPBODPairsForGivenLocationsUseCase | Domain | Validate O-D pair availability |
| SuperPassDataWrapper | Data | Pass validation and trip preferences |
| TimeUtilsContract | Utility | Timezone handling |
| StringProvider | Utility | Localized strings |
| ChaloNavigationManager | Navigation | Screen transitions |
| AnalyticsContract | Analytics | Event tracking |

### View State Structure

```mermaid
classDiagram
    class PreBookingDetailsViewState {
        +PassMetaData passMetaData
        +Int tripsPerDay
        +SelectedDateRange? selectedDateRange
        +Map~WeekDays, Boolean~ weekDayMap
        +Boolean isProceedBtnEnabled
        +Boolean isLoading
        +Boolean showFullScreenLoader
        +ErrorInfo? errorInfo
        +PBPreBookingTimeEditRange? timeEditRange
        +SuperPassTripPreferencesAppModel? tripPreferenceProperties
        +Double? maxFarePerTrip
        +PBPreBookingDetailsScreenDialogType? dialogType
    }

    class PassMetaData {
        +String passId
        +SuperPassSubTypes passSubType
        +String passType
        +String configId
    }

    class SelectedDateRange {
        +Long selectedStartDate
        +Long selectedEndDate
        +String selectedStartDateFormatted
        +String selectedEndDateFormatted
    }

    class WeekDays {
        <<enumeration>>
        MONDAY
        TUESDAY
        WEDNESDAY
        THURSDAY
        FRIDAY
        SATURDAY
    }
```

### Proceed Button Validation Flow

The component implements sophisticated validation before enabling the proceed action.

```mermaid
flowchart TD
    Start([ProceedButtonClickedIntent])
    CalcTrips[Calculate total required trips]
    ZeroCheck{totalTrips = 0?}
    InvalidDialog[Show Invalid Date Range Dialog]
    FetchBalance[Fetch current balance]
    ZeroBalance{balance = 0?}
    ZeroDialog[Show No Rides Remaining Dialog]
    SufficientCheck{balance >= required?}
    FetchODPairs[Fetch O-D pairs for preferences]
    InsufficientDialog[Show Insufficient Balance Dialog]
    ODPairCheck{O-D pairs found?}
    Navigate[Navigate to SlotSelection]
    NoStops[Navigate with NoStopPointsAvailable]

    Start --> CalcTrips
    CalcTrips --> ZeroCheck
    ZeroCheck -->|Yes| InvalidDialog
    ZeroCheck -->|No| FetchBalance
    FetchBalance --> ZeroBalance
    ZeroBalance -->|Yes| ZeroDialog
    ZeroBalance -->|No| SufficientCheck
    SufficientCheck -->|Yes| FetchODPairs
    SufficientCheck -->|No| InsufficientDialog
    InsufficientDialog -->|Continue anyway| FetchODPairs
    FetchODPairs --> ODPairCheck
    ODPairCheck -->|Yes| Navigate
    ODPairCheck -->|No| NoStops
```

### Key Intents

| Intent | Purpose |
|--------|---------|
| ViewCreatedIntent(passId, passSubType) | Initialize with pass data |
| SelectedNumberOfTripIntent(tripsPerDay) | Set 1 or 2 trips per day |
| DayItemClicked(day) | Toggle weekday selection |
| ChangeDatesClickedIntent | Open date range picker |
| UpdateSelectedDateIntent(start, end) | Update selected dates |
| ProceedButtonClickedIntent(isComingFromDialog) | Validate and navigate forward |
| DismissDialogIntent | Close error dialog |
| ConfirmationDialogPositiveBtnClicked | Handle dialog confirmation |

### Error Dialog Types

| Dialog Action Type | Trigger | Actions |
|-------------------|---------|---------|
| DATE_RANGE_INVALID | Zero total trips calculated | Dismiss |
| ZERO_CURRENT_BALANCE | Pass balance is zero | Navigate to pass details |
| RIDE_BALANCE_INSUFFICIENT | Balance less than required trips | Continue with available, Change Dates |

---

## PBPreBookingSlotSelectionComponent

The most complex component in the flow, managing multi-trip slot selection with support for O-D pair selection, time slot selection, and optional seat selection per trip. This component coordinates the configuration of multiple trip cards sequentially.

### Source Location

```
shared/productbooking/src/commonMain/kotlin/app/chalo/premiumbus/ui/pbprebooking/slotselection/
├── PBPreBookingSlotSelectionComponent.kt
└── PBPreBookingSlotSelectionContract.kt
```

### Component Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| FetchPBODPairsForGivenLocationsUseCase | Domain | O-D pair options |
| FetchAvailableSlotsForPreBookingUseCase | Domain | Time slot availability |
| SeatSelectionResultStateManager | State | Seat selection coordination |
| UniversalSearchResultStateManager | State | Stop search coordination |
| GetPremiumBusCurrentCityConfigUseCase | Domain | City configuration |
| TimeUtilsContract | Utility | Timezone handling |
| BasicInfoContract | Utility | True time access |
| ChaloNavigationManager | Navigation | Screen transitions |
| AnalyticsContract | Analytics | Event tracking |

### View State Structure

```mermaid
classDiagram
    class PBPreBookingSlotSelectionViewState {
        +PassMetaData passMetaData
        +List~TripSlotCardUiData~ tripSlotUiDetailsList
        +SlotScreenType slotScreenType
        +Boolean isProceedBtnVisible
        +Boolean isLoading
        +PBPreBookingScreenSlotSelectionBottomSheetType? bottomSheetType
        +Int tripsPerDay
        +List~WeekDays~ weekdayList
        +SelectedDateRange? selectedDateRange
        +Int totalRequiredTrips
        +Double? maxFarePerTrip
        +PBStopPlaceSelectedAppModel? originallySelectedFromStop
        +PBStopPlaceSelectedAppModel? originallySelectedToStop
        +PBStopPlaceSelectedAppModel? currentlySelectedFromStop
        +PBStopPlaceSelectedAppModel? currentlySelectedToStop
    }

    class TripSlotCardUiData {
        +String tripId
        +Long? fromStopTime
        +Long? tripStartTime
        +String routeId
        +PremiumBusSeatAssignmentType seatAssignmentType
        +String? fromStopId
        +String? toStopId
        +Boolean isSlotSelectionComplete
        +Boolean isSeatSelectionAllowed
        +Boolean isSeatSelectionCompleted
        +PBOriginDestinationAppModel? originDestinationInfo
        +List~SeatInfoAppModel~ selectedSeat
        +Boolean isEnabled
    }

    class SlotScreenType {
        <<sealed>>
        Unknown
        ValidODPair(tripPreferences)
        NoStopPointsAvailable
    }

    class SlotUiData {
        +Long fromStopTime
        +Long toStopTime
        +String? message
        +Long tripStartTime
        +String routeId
        +List~String~ specialFeature
        +PremiumBusSeatAssignmentType seatAssignmentType
        +String fromStopId
        +String toStopId
    }
```

### Trip Card Initialization

On component creation, trip cards are initialized based on `tripsPerDay`. The first trip is pre-filled with saved trip preferences if available, while subsequent trips start empty.

```mermaid
sequenceDiagram
    participant Args as SlotSelectionScreenArgs
    participant Comp as Component
    participant State as ViewState

    Args->>Comp: ViewCreatedIntent(args)
    Note over Comp: tripsPerDay = 2

    Comp->>Comp: Create TripSlotCardUiData for Trip 1
    Note over Comp: Trip 1: enabled=true, prefilled O-D from preferences

    Comp->>Comp: Create TripSlotCardUiData for Trip 2
    Note over Comp: Trip 2: enabled=false, no O-D (swapped direction expected)

    Comp->>State: Update tripSlotUiDetailsList
```

### Bottom Sheet Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| MultipleOriginDestinationSelection | O-D pair picker | options, tripId, from/to stops |
| SlotSelection | Time slot picker | SlotUiData list, tripId |
| NewRouteSuggestion | Suggest new route | fromStop, toStop |
| NewSlotSuggestion | Suggest new time | hour, minute, amPm, tripId |
| NewRouteSuggestionSubmitSuccess | Route suggestion confirmation | - |
| NewSlotSuggestionSubmitSuccess | Slot suggestion confirmation | - |
| ErrorInfo | Error display | title, msg, positiveBtnText, tripId |
| NoOriginDestinationPairsAvailable | No routes message | - |

### Seat Selection Integration

The component integrates with the shared seat selection flow for trips where `seatAssignmentType == PremiumBusSeatAssignmentType.SELECTION`.

```mermaid
sequenceDiagram
    participant User
    participant Comp as SlotSelectionComponent
    participant Manager as SeatSelectionResultStateManager
    participant SeatScreen as SeatSelectionScreen

    User->>Comp: SelectSeatCtaClickIntent(tripSlotCardData)
    Comp->>Comp: Store tripIdForSeatSelection
    Comp->>Comp: Build PremiumBusSeatSelectionFlowType.BulkBooking

    Comp->>Manager: Create resultFlowFor(requestId)

    Comp->>SeatScreen: Navigate with PremiumBusSeatSelectionArgs
    Note over SeatScreen: User selects seats

    SeatScreen->>Manager: Post result (selectedSeats)
    Manager->>Comp: ResultStateData.Success

    Comp->>Comp: SeatSelectionResultIntent(selectedSeats)
    Comp->>Comp: Update TripSlotCardUiData with seats
```

The `BulkBooking` flow type includes parameters for aggregated seat availability:

| Parameter | Purpose |
|-----------|---------|
| tripId | Trip identifier (1, 2) |
| fromStopId, toStopId | Selected O-D pair stops |
| routeId | Route serving these stops |
| days | List of selected weekday names |
| slotFromStopTime, slotTripStartTime | Selected time slot |
| startTimeInMillis, endTimeInMillis | Date range boundaries |

### Proceed Button Validation

The proceed button only becomes visible when all trips are fully configured.

```mermaid
flowchart TD
    AllTrips[Check all tripSlotUiDetailsList]
    ForEach[For each TripSlotCardUiData]
    SeatAllowed{isSeatSelectionAllowed?}
    SeatComplete{isSeatSelectionCompleted?}
    SlotComplete{isSlotSelectionComplete?}
    HasTime{fromStopTime && tripStartTime?}
    HasOD{originDestinationInfo?}
    AllPass[All conditions pass]
    Enable[isProceedBtnVisible = true]
    Disable[isProceedBtnVisible = false]

    AllTrips --> ForEach
    ForEach --> SeatAllowed
    SeatAllowed -->|Yes| SeatComplete
    SeatAllowed -->|No| SlotComplete
    SeatComplete -->|Yes| SlotComplete
    SeatComplete -->|No| Disable
    SlotComplete -->|Yes| HasTime
    SlotComplete -->|No| Disable
    HasTime -->|Yes| HasOD
    HasTime -->|No| Disable
    HasOD -->|Yes| AllPass
    HasOD -->|No| Disable
    AllPass --> Enable
```

### Ride Count Calculation

The component calculates the actual number of rides that will be booked, accounting for slots that may have already passed on the first day of the range.

```mermaid
flowchart TD
    Start[getNumberOfRides called]
    GetCurrTime[Get current time since midnight]
    CheckStartDate{selectedStartDate == today?}
    ReturnTotal[Return totalRequiredTrips]
    CheckTrips{How many trips per day?}

    OneTrip[1 trip per day]
    TwoTrips[2 trips per day]

    CheckSlot1{currTime > slot1Time?}
    Subtract1[totalRequiredTrips - 1]

    CheckBothSlots{currTime > both slots?}
    Subtract2[totalRequiredTrips - 2]
    CheckOneSlot{currTime > one slot?}
    SubtractOne[totalRequiredTrips - 1]

    Start --> GetCurrTime
    GetCurrTime --> CheckStartDate
    CheckStartDate -->|No| ReturnTotal
    CheckStartDate -->|Yes| CheckTrips
    CheckTrips -->|1| OneTrip
    CheckTrips -->|2| TwoTrips

    OneTrip --> CheckSlot1
    CheckSlot1 -->|Yes| Subtract1
    CheckSlot1 -->|No| ReturnTotal

    TwoTrips --> CheckBothSlots
    CheckBothSlots -->|Yes| Subtract2
    CheckBothSlots -->|No| CheckOneSlot
    CheckOneSlot -->|Yes| SubtractOne
    CheckOneSlot -->|No| ReturnTotal
```

---

## PBPreBookingConfirmationComponent

Final confirmation screen before booking submission. Displays the summary of all selected rides and handles the bulk pre-book API call through `BulkPreBookUseCase`.

### Source Location

```
shared/productbooking/src/commonMain/kotlin/app/chalo/premiumbus/ui/pbprebooking/confirmation/
├── PBPreBookingConfirmationComponent.kt
└── PBPreBookingConfirmationContract.kt
```

### Component Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| BulkPreBookUseCase | Domain | Submit bulk booking request |
| SuperPassDataWrapper | Data | Pass details lookup |
| StringProvider | Utility | Localized strings |
| ChaloNavigationManager | Navigation | Post-booking navigation |
| AnalyticsContract | Analytics | Event tracking |

### View State Structure

```mermaid
classDiagram
    class PBPreBookingConfirmationViewState {
        +PassMetaData passMetaData
        +Int numberOfRides
        +List~WeekDays~ weekdaysList
        +Boolean isLoading
        +SelectedDateRange? selectedDateRange
        +Int tripsPerDay
        +Int numberOfDaysInRange
        +List~TripSlotCardData~ tripSlotDataList
        +List~TripSlotCardData~ tripSlotCardDataList
        +PBPreBookingConfirmationLayoutType layoutType
    }

    class TripSlotCardData {
        +Long tripStartTime
        +String startStopId
        +String endStopId
        +String routeId
        +Long fromStopTime
        +String fromStopName
        +String toStopName
        +List~SeatInfoAppModel~ selectedSeats
    }

    class PBPreBookingConfirmationLayoutType {
        <<sealed>>
        RidesConfirmationScreen
        BookingStatusScreen(isSuccess, title, msg, positiveCta, negativeCta)
    }

    class BookingStatusCtaType {
        <<enumeration>>
        VIEW_RIDES
        RETRY
        HOMEPAGE
        PASS_DETAILS_PAGE
        UNKNOWN
    }
```

### Booking Flow

```mermaid
stateDiagram-v2
    [*] --> RidesConfirmationScreen: Component created
    RidesConfirmationScreen --> Loading: ProceedButtonClickedIntent

    Loading --> BuildRequest: Create RequestedTripAppModel list
    BuildRequest --> CallAPI: BulkPreBookUseCase.invoke()

    CallAPI --> BookingStatusSuccess: ChaloUseCaseResult.Success
    CallAPI --> BookingStatusFailure: ChaloUseCaseResult.Failure

    BookingStatusSuccess --> ViewRides: VIEW_RIDES clicked
    ViewRides --> RideDetails: Navigate with buildStack

    BookingStatusFailure --> Retry: RETRY clicked
    BookingStatusFailure --> PassDetails: PASS_DETAILS_PAGE clicked
    Retry --> Loading
    PassDetails --> RideDetails: Navigate with buildStack
```

### Request Transformation

The component transforms the `TripSlotCardData` list into the API request format.

| TripSlotCardData Field | RequestedTripAppModel Field |
|------------------------|----------------------------|
| startStopId | startStopId |
| endStopId | endStopId |
| routeId | routeId |
| fromStopTime | slotInfo.fromStopTime |
| tripStartTime | slotInfo.tripStartTime |
| selectedSeats | seatPreference |

### Error Handling

The component handles failure scenarios through `BulkPreBookRequestFailedReason`.

| Error Type | UI Response | CTA Options |
|------------|-------------|-------------|
| NO_INTERNET_ERROR | "Booking failed" | Retry, Go back to pass details |
| SERVER_ERROR | "Booking failed" | Retry, Go back to pass details |
| CITY_NOT_FOUND | "Booking failed" | Retry, Go back to pass details |
| INTERNAL_SERVER_ERROR | "Booking failed" | Retry, Go back to pass details |
| PRODUCT_DISABLED_ERROR | "Booking failed" with server message | View pass details |
| PASS_VALIDATION_ERROR | "Booking failed" with server message | View pass details |

### Post-Booking Navigation

On successful booking or navigation to pass details, the component uses `buildStack` to reset navigation.

```mermaid
flowchart LR
    BuildStack["chaloNavigationManager.buildStack()"]
    HomeArgs["HomeArgs()"]
    RideDetailsArgs["PbBulkBookingRideDetailsArgs"]
    Stack["Navigation Stack"]

    BuildStack --> HomeArgs
    BuildStack --> RideDetailsArgs
    HomeArgs --> Stack
    RideDetailsArgs --> Stack
```

---

## Navigation Arguments

### Argument Classes

| Class | Module | Key Fields |
|-------|--------|------------|
| PbBulkBookingRideDetailsArgs | chalo-base | passId, superPassSubType, isNewPurchaseFlow, configId, fareMappingId |
| PBPreBookingArgs.PreBookingDetails | productbooking | passId, superPassSubTypes |
| PBPreBookingArgs.PreBookingSlotSelection | productbooking | data (JSON: SlotSelectionScreenArgs) |
| PBPreBookingArgs.PreBookingRideConfirmation | productbooking | data (JSON: RidesConfirmationScreenArgs) |

### SlotSelectionScreenArgs Structure

| Field | Type | Description |
|-------|------|-------------|
| passId | String | SuperPass identifier |
| passType | SuperPassSubTypes | Pass type enum |
| tripsPerDay | Int | Number of trips per day (1 or 2) |
| weekdayList | List<WeekDays> | Selected weekdays |
| selectedDateRange | SelectedDateRange? | Start and end dates |
| slotScreenType | SlotScreenType | Valid O-D pair or no stops available |
| totalRequiredTrips | Int | Total rides to be booked |
| maxFarePerTrip | Double? | Maximum fare constraint |
| configId | String | Configuration identifier |

### RidesConfirmationScreenArgs Structure

| Field | Type | Description |
|-------|------|-------------|
| passId | String | SuperPass identifier |
| passSuperType | SuperPassSubTypes | Pass type enum |
| tripsPerDay | Int | Number of trips per day |
| numberOfRides | Int | Actual rides to be booked |
| weekdayList | List<WeekDays> | Selected weekdays |
| selectedDateRange | SelectedDateRange? | Start and end dates |
| tripSlotCardDataList | List<TripSlotCardData> | Complete trip configurations |
| numberOfDaysInRange | Int | Total days in date range |
| configId | String | Configuration identifier |

---

## Analytics Events

Each component raises analytics events at key interaction points. All events include common properties: `passId`, `configId`.

| Component | Event | Trigger |
|-----------|-------|---------|
| RideDetails | BULK_BOOK_STOP_SELECTION_SCREEN_OPENED | Screen with valid O-D |
| RideDetails | BULK_BOOK_STOP_SELECTION_SCREEN_NO_STOPS_AVAILABLE_OPENED | Screen with no O-D |
| SlotSelection | BULK_BOOKING_STOP_SELECTED | O-D pair selected |
| SlotSelection | BULK_BOOKING_STOP_EDIT_CLICKED | Change stops CTA |
| SlotSelection | BULK_BOOKING_SLOT_EDIT_CLICKED | Change slot CTA |
| SlotSelection | BULK_BOOKING_SLOT_LIST_OPENED | Slot picker shown |
| SlotSelection | BULK_BOOKING_SLOT_SELECTED | Time slot selected |
| SlotSelection | BULK_BOOKING_NO_SLOTS_AVAILABLE_BOTTOMSHEET_SHOWN | No slots available |
| SlotSelection | BULK_BOOKING_SLOTS_FETCH_ERROR_BOTTOMSHEET_SHOWN | Slot fetch error |
| SlotSelection | PB_EVENT_NEW_SLOT_SUGGESTION | New slot suggested |
| SlotSelection | PREMIUM_BUS_SUGGESTED_STOPS | New route suggested |
| Confirmation | BULK_BOOKING_CONFIRM_RIDES_PAGE_SHOWN | Screen displayed |
| Confirmation | BULK_BOOKING_CONFIRM_DETAILS_CLICKED | Proceed clicked |
| Confirmation | BULK_BOOKING_CONFIRMATION_SUCCESSFUL | Booking succeeded |
| Confirmation | BULK_BOOKING_CONFIRMATION_FAILED | Booking failed |
| Confirmation | BULK_BOOKING_CONFIRMATION_VIEW_RIDES_CLICKED | View rides CTA |
| Confirmation | BULK_BOOKING_CONFIRMATION_RETRY_CLICKED | Retry CTA |
| Confirmation | BULK_BOOKING_CONFIRMATION_NAVIGATE_TO_HOMEPAGE_CLICKED | Homepage CTA |
| Confirmation | BULK_BOOKING_CONFIRMATION_NAVIGATE_TO_PASS_DETAILS_PAGE | Pass details CTA |

---

## Error Handling Patterns

All components implement structured error handling through sealed class hierarchies using `UseCaseOperationError`.

```mermaid
flowchart TD
    Error[Error Occurs]
    Type{Error Type}
    DataFetch[DataFetchOperationFailure]
    UseCaseSpecific[UseCaseSpecificError]

    Error --> Type
    Type --> DataFetch
    Type --> UseCaseSpecific

    DataFetch --> NetworkErrors[NO_INTERNET, SERVER_ERROR, etc.]
    UseCaseSpecific --> BusinessErrors[CITY_NOT_FOUND, PASS_VALIDATION_ERROR, etc.]

    NetworkErrors --> ShowRetry[Show Retry + Go Back]
    BusinessErrors --> ShowMessage[Show Error Message + Navigate]
```

### Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| Network | NO_INTERNET_ERROR, SERVER_ERROR | Retry option, go back option |
| Parsing | SUCCESS_RESPONSE_PARSING_ERROR | Generic error, retry |
| Business | CITY_NOT_FOUND, PRODUCT_DISABLED_ERROR | Specific message, navigate |
| Validation | PASS_VALIDATION_ERROR | Server message, view pass details |
