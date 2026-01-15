---
slug: navigation-guide
lastUpdated: 2026-01-14
---

# Navigation Guide

## Overview

Navigation in `chalo-app-kmp` uses Decompose's `ChildStack` for managing screen stacks. All navigation flows through `ChaloNavigationManager`, which emits navigation requests to the `RootComponent`.

## ChaloScenes Enum

All navigable destinations are defined in `ChaloScenes`:

```kotlin
// shared/chalo-base/src/commonMain/kotlin/app/chalo/scenes/ChaloScenes.kt

@EnumInterop.Enabled
enum class ChaloScenes(val baseRoute: String) {
    // Authentication
    SplashScreen("/splashScreen"),
    LoginOptions("/loginOptions"),
    LoginOtp("/loginOtp"),
    UserConsent("/userConsent"),

    // Onboarding
    LanguageSelection("/languageSelection"),
    CitySelection("/oldCitySelection"),
    CityLocationSelection("/cityLocationSelection"),
    LocationDisclaimer("/locationDisclaimer"),

    // Home & Core
    Home("/home"),
    ForceAppUpdate("/forceAppUpdate"),
    WebViewScene("/webView"),

    // Tickets
    FareDetails("/fareDetails"),
    InstantTicket("/instantTicket"),
    MTicketSelection("/mticketSelection"),
    MTicketTripInfo("/mticketTripInfo"),
    TicketSummaryScreen("/ticketSummaryScreen"),

    // Passes (Super Pass)
    PassSelectionScreen("/passSelection"),
    PassPassengerSelectionScreen("/passPassengerSelectionScreen"),
    PassUserEnterDetailsScreen("/passBasicUserDetailsScreen"),
    PassUserProofsOverviewScreen("/passUserProofsOverviewScreen"),
    ConfirmSuperPassScreen("/confirmSuperPassScreen"),
    SuperPassBookingSuccessScreen("/superPassBookingSuccess"),
    SuperPassVerificationStatusScreen("/superPassVerificationStatus"),
    PassSummaryScreen("/passSummaryScreen"),

    // Premium Bus
    PremiumBus("/premiumBus"),
    PremiumBusActivation("/premiumBusActivation"),
    PremiumBusSeatSelectionScreen("/premiumBusSeatSelection"),
    PremiumBusSlotSelection("/pbSlotSelection"),
    PremiumBusStopSelection("/pbStopSelection"),
    PremiumBusAllRoutes("/pbAllRoutes"),
    PBBulkBooking("/premiumBusBulkBooking"),
    PBPreBookingDetails("/pbPreBookingDetails"),
    PBPreBookingSlotSelection("/pbPreBookingSlotSelection"),
    PBPreBookingRideConfirmation("/pbPreBookingRideConfirmation"),

    // Metro
    MetroLandingScreen("/metroLandingScreen"),
    StopBasedMetroLandingScreen("/stopBasedMetroLandingScreen"),
    ConfirmBookingScreen("/confirmBookingScreen"),

    // Checkout / Payment
    CheckoutPaymentMain("/checkoutPaymentMain"),
    CheckoutUpi("/checkoutUpi"),
    CheckoutAddUpi("/checkoutAddUpi"),
    CheckoutCard("/checkoutCard"),
    CheckoutNetBanking("/checkoutNetBanking"),
    CheckoutWallet("/checkoutWallet"),
    CheckoutRazorpay("/checkoutRazorpay"),
    CheckoutInai("/checkoutInai"),
    CheckoutPostPayment("/checkoutPostPayment"),

    // Wallet
    WalletBalance("/walletBalance"),
    WalletLoadMoney("/walletLoadMoney"),
    WalletLoadBalanceSuccess("/walletLoadBalanceSuccess"),
    WalletAllTransactions("/walletAllTransactions"),
    WalletTransactionSummary("/walletTransactionSummary"),

    // Card (NCMC)
    ChaloCardLandingScreen("/chaloCardLandingScreen"),
    ChaloCardEnterDetails("/chaloCardEnterDetails"),
    CardLinkingScreen("/cardLinkingScreen"),
    CardRechargeEnterAmount("/cardRechargeEnterAmount"),
    CardTransactionHistory("/cardTransactionHistory"),
    CardTransactionDetailScreen("/cardTransactionDetailScreen"),
    NcmcOnlineRecharge("/ncmcOnlineRecharge"),
    NcmcOfflineRecharge("/ncmcOfflineRecharge"),

    // Bills
    EBillFetchScreen("/eBillFetchScreen"),
    EBillAmountScreen("/eBillAmountScreen"),
    EBillPaymentConfirmation("/eBillPaymentConfirmation"),
    EBillPaymentSuccess("/eBillPaymentSuccess"),
    EBillPaymentInvoiceScreen("/eBillPaymentInvoiceScreen"),
    EBillHistoryScreen("/eBillHistoryScreen"),

    // Live Tracking
    RouteDetails("/routeDetails"),
    StopTripDetails("/stopTripDetails"),
    UniversalPicker("/universalPicker"),
    TripPlannerResultsScreen("/tripPlannerResultsScreen"),
    TripPlannerDetailsScreen("/tripPlannerDetailsScreen"),

    // Validation
    BleValidation("/bleValidation"),
    QrScanner("/qrScanner"),
    QrValidation("/qrValidation"),

    // Quick Pay
    QuickPay("/quickFlow"),
    PayForTicket("/payForTicket"),

    // User Profile
    UserProfileDisplay("/userProfile"),
    UserProfileEdit("/editUserProfile"),

    // KYC
    MinKycDetails("/minKycDetails"),
    MinKycOtp("/minKycOtp"),

    // Misc
    ProductActivation("/productActivation"),
    ProductSelection("/productSelection"),
    ProductBookingSuccessScreen("/productBookingSuccessScreen"),
    BookingHelpScreen("/bookingHelpScreen"),
    ReportProblem("/reportProblem"),
    Sos("/sos"),
    // ... and more
}
```

## Scene Arguments

Each scene has a corresponding `SceneArgs` class that carries navigation parameters:

```kotlin
// Base interface
@Serializable
sealed interface SceneArgs {
    fun resolveChaloScene(): ChaloScenes
}

// Example: Simple args
@Serializable
data object SplashArgs : SceneArgs {
    override fun resolveChaloScene() = ChaloScenes.SplashScreen
}

// Example: Args with data
@Serializable
data class EBillAmountScreenArgs(
    val electricityBillJson: String
) : SceneArgs {
    override fun resolveChaloScene() = ChaloScenes.EBillAmountScreen
}

// Example: Parent flow args
@Serializable
data class CheckoutArgs(
    val checkoutDataJson: String,
    override val componentInstanceId: String = uuid4().toString()
) : SceneArgs, ParentArgs {
    override fun resolveChaloScene() = ChaloScenes.CheckoutPaymentMain
}
```

## ChaloNavigationManager

All navigation goes through `ChaloNavigationManager`:

```kotlin
interface ChaloNavigationManager {
    val navStream: SharedFlow<ChaloNavigationRequest>
    fun postNavigationRequest(navRequest: ChaloNavigationRequest)
}
```

### Navigation Requests

```kotlin
sealed class ChaloNavigationRequest {
    // Navigate to a new screen
    data class Navigate(
        val args: SceneArgs,
        val navOptions: ChaloNavOptions? = null
    ) : ChaloNavigationRequest()

    // Go back (optional pop configuration)
    data class GoBack(
        val popUpToConfig: PopUpToConfig? = null
    ) : ChaloNavigationRequest()

    // Replace entire stack
    data class BuildStack(
        val args: List<SceneArgs>
    ) : ChaloNavigationRequest()
}
```

## Common Navigation Patterns

### Simple Navigation

```kotlin
// Navigate to a screen
navigationManager.postNavigationRequest(
    ChaloNavigationRequest.Navigate(
        args = EBillAmountScreenArgs(billJson)
    )
)

// Or use the extension
navigationManager.navigate(
    args = EBillAmountScreenArgs(billJson)
)
```

### Go Back

```kotlin
// Simple back
navigationManager.goBack()

// Go back to specific screen
navigationManager.goBack(
    popUpToConfig = PopUpToConfig.Scene(
        scene = ChaloScenes.Home,
        inclusive = false
    )
)
```

### Clear Stack and Navigate

```kotlin
// Navigate and clear all history (e.g., after logout)
navigationManager.navigateAndClearBackStack(
    args = LoginOptionsArgs
)

// Or explicitly
navigationManager.postNavigationRequest(
    ChaloNavigationRequest.Navigate(
        args = HomeArgs(),
        navOptions = ChaloNavOptions(
            popUpToConfig = PopUpToConfig.ClearAll()
        )
    )
)
```

### Build Stack (Deep Link)

```kotlin
// Build a complete navigation stack (e.g., for deep links)
navigationManager.buildStack(
    SplashArgs,
    HomeArgs(),
    RouteDetailsArgs(routeId = "R123")
)
```

### Pop Up To

```kotlin
// Navigate and pop everything up to (but not including) Home
navigationManager.navigate(
    args = ProductBookingSuccessScreenArgs(...),
    navOptions = ChaloNavOptions(
        popUpToConfig = PopUpToConfig.Scene(
            scene = ChaloScenes.Home,
            inclusive = false  // Keep Home in stack
        )
    )
)

// Navigate and pop including the target screen
navigationManager.navigate(
    args = HomeArgs(),
    navOptions = ChaloNavOptions(
        popUpToConfig = PopUpToConfig.Scene(
            scene = ChaloScenes.CheckoutPaymentMain,
            inclusive = true  // Remove Checkout from stack
        )
    )
)
```

### Finish Parent Flow

```kotlin
// From within a nested flow, finish and return to parent
navigationManager.goBack(
    popUpToConfig = PopUpToConfig.Finish(
        parentArgs = checkoutArgs
    )
)
```

## PopUpToConfig Options

| Config | Behavior |
|--------|----------|
| `None` | No pop, just push new screen |
| `Prev` | Pop the previous screen (replace) |
| `Scene(scene, inclusive)` | Pop to specified scene |
| `ClearAll(inclusive)` | Clear entire navigation stack |
| `Finish(parentArgs)` | Finish a nested parent flow |

## Navigation Options

```kotlin
data class ChaloNavOptions(
    val launchSingleTop: Boolean = false,  // Prevent duplicate on top
    val includePath: Boolean = false,       // Compare full path for single-top
    val popUpToConfig: PopUpToConfig = PopUpToConfig.None
)
```

### Single Top

```kotlin
// Prevent duplicate Home screens on top
navigationManager.navigate(
    args = HomeArgs(),
    navOptions = ChaloNavOptions(launchSingleTop = true)
)
```

## Finding Code by Navigation

### From Screen Name to Code

1. **Find the scene**: Search `ChaloScenes` for the screen name
2. **Find the args**: Search for `{SceneName}Args` (e.g., `EBillFetchScreenArgs`)
3. **Find the component**: Search for classes that use those args

```
Screen Name → ChaloScenes.EBillFetchScreen
           → EBillFetchScreenArgs
           → EBillFetchComponent
           → EBillFetchScreen (Composable)
```

### From Feature to Screens

1. **Find the feature module**: Look in `shared/<feature>/`
2. **Find UI components**: Look in `src/commonMain/kotlin/app/chalo/<feature>/ui/`
3. **Find screens**: Components ending with `Component`

### Mapping Table

| Feature | Module Path | Key Scenes |
|---------|-------------|------------|
| Bills | `shared/home/.../electricitybill/` | `EBillFetch`, `EBillAmount`, `EBillPaymentSuccess` |
| Instant Ticket | `shared/productbooking/.../instantticket/` | `FareDetails`, `InstantTicket` |
| Super Pass | `shared/home/.../superpass/` | `PassSelection`, `ConfirmSuperPass`, `SuperPassBookingSuccess` |
| Premium Bus | `shared/home/.../premiumbus/` | `PremiumBus`, `PremiumBusActivation`, `PBSlotSelection` |
| Checkout | `shared/checkout/` | `CheckoutPaymentMain`, `CheckoutUpi`, `CheckoutPostPayment` |
| Wallet | `shared/wallet/` | `WalletBalance`, `WalletLoadMoney`, `WalletTransactionSummary` |
| Card | `shared/home/.../ncmc/` | `ChaloCardLanding`, `CardLinking`, `NcmcOnlineRecharge` |
| Live Tracking | `shared/livetracking/` | `RouteDetails`, `StopTripDetails`, `TripPlannerResults` |
| Login | `shared/login/` | `LoginOptions`, `LoginOtp`, `UserConsent` |
| Onboarding | `shared/onboarding/` | `LanguageSelection`, `CitySelection`, `LocationDisclaimer` |

## Parent Components (Nested Navigation)

Complex flows use `ParentComponent` for internal navigation stacks:

### Parent Components in Codebase

| Parent | Entry Scene | Internal Screens |
|--------|-------------|------------------|
| `CheckoutParentComponent` | `CheckoutPaymentMain` | UPI, Card, NetBanking, Wallet, PostPayment |
| `SuperPassParentComponent` | `PassSelection` | PassengerSelection, UserDetails, ProofUpload |
| `PremiumBusParentComponent` | `PremiumBus` | StopSelection, SlotSelection, SeatSelection |
| `WalletParentComponent` | `WalletBalance` | LoadMoney, Transactions, TransactionSummary |
| `ValidationParentComponent` | `BleValidation` | QrScanner, QrValidation |
| `CitySelectionParentComponent` | `CitySelection` | CityLocationSelection |

### Navigation Within Parent Flow

When inside a parent flow:

```kotlin
// Navigate within the parent's internal stack
navigationManager.navigate(args = CheckoutUpiArgs(...))

// Finish the entire parent flow
navigationManager.goBack(
    popUpToConfig = PopUpToConfig.Finish(parentArgs = checkoutArgs)
)
```

## Deep Links

Deep links are handled by building a complete navigation stack:

```kotlin
// When receiving a deep link to route details
val deepLinkStack = listOf(
    SplashArgs,
    HomeArgs(),
    RouteDetailsArgs(routeId = deepLinkRouteId)
)
navigationManager.buildStack(deepLinkStack)
```

### Deep Link Format

```
chalo://{scene-route}?args={encoded-args-json}

// Example
chalo://routeDetails?args={"routeId":"R123","source":"deeplink"}
```

## iOS Navigation (Swift)

Thanks to SKIE annotations, Swift code uses the same navigation patterns:

```swift
// Navigate from SwiftUI
navigationManager.postNavigationRequest(
    ChaloNavigationRequest.Navigate(
        args: EBillAmountScreenArgs(electricityBillJson: billJson),
        navOptions: nil
    )
)

// Handle back button
navigationManager.goBack(popUpToConfig: nil)
```

## Debugging Navigation

### Enable Logging

Navigation events are logged via `ChaloLog`:

```kotlin
ChaloLog.info("ChaloNavigationManager", "Navigate to: ${args.resolveChaloScene()}")
```

### Inspect Stack

```kotlin
// In RootComponent
val currentStack = childStack.value.items.map {
    (it.configuration as? SceneArgs)?.resolveChaloScene()
}
println("Current stack: $currentStack")
```
