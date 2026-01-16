---
feature: onboarding
layer: presentation
lastUpdated: 2026-01-16
sourceCommit: null
---

# Onboarding — Component Documentation

## Architecture Overview

The Onboarding feature follows the **Decompose + MVI** pattern across five main screens: Splash (orchestration), Language Selection, City Location Selection (GPS-based), City Selection (manual list), and City Discontinued. The feature spans `shared/onboarding` and `shared/home` modules.

```mermaid
flowchart TB
    subgraph Onboarding["Onboarding Module"]
        Splash["SplashScreenComponent"]
        Language["LanguageSelectionComponent"]
        CityLocation["CityLocationSelectionComponent"]
        CitySelect["CitySelectionComponent"]
        CityDisc["CityDiscontinuedComponent"]
    end

    subgraph Home["Home Module"]
        Disclaimer["LocationDisclaimerComponent"]
    end

    subgraph Platform["Platform Services"]
        SplitInstall["SplitInstallHandler"]
        LocationMgr["ChaloLocationManager"]
        PermHandler["PermissionHandler"]
    end

    subgraph Domain["Domain Layer"]
        CityProvider["CityProviderImpl"]
        ProcessCity["ProcessCityChangeUseCase"]
        FetchMeta["FetchCityMetaDataUseCase"]
    end

    Splash --> Language
    Language --> SplitInstall
    Language --> CityLocation
    CityLocation --> Disclaimer
    CityLocation --> LocationMgr
    CityLocation --> CitySelect
    CityLocation --> CityProvider
    CityDisc --> CitySelect
    CityLocation --> FetchMeta
    ProcessCity --> CityProvider
```

---

## Screen Inventory

| Screen | Component | Purpose | Entry From |
|--------|-----------|---------|------------|
| **Splash** | SplashScreenComponent | App initialization and routing | App launch |
| **Language Selection** | LanguageSelectionComponent | Language picker with download | Splash, Settings |
| **City Location Selection** | CityLocationSelectionComponent | GPS-based city detection | Splash, Login, Home |
| **City Selection** | CitySelectionComponent | Manual city search/selection | City Location, City Discontinued |
| **City Discontinued** | CityDiscontinuedComponent | Discontinued city notification | Splash |
| **Location Disclaimer** | LocationDisclaimerComponent | Permission education | City Location |

---

## Splash Screen

**Purpose:** Entry point for the app; orchestrates initialization and determines the appropriate navigation path based on user state.

### User Journey

1. App launches and splash screen displays
2. Background initialization tasks execute
3. System checks user state (language, login, consent, city)
4. Navigates to appropriate screen based on state

### Initialization Tasks

| Task | Description | Order |
|------|-------------|-------|
| **Config cache check** | Verify Chalo config availability | 1 |
| **User properties init** | Device ID, notification status, migration flags | 2 |
| **Analytics setup** | Initialize analytics with user properties | 3 |
| **App open event** | Fire analytics event | 4 |
| **Activation sync** | Send unsynced activation timestamps | 5 |
| **Update app open time** | Record last app open | 6 |

### Navigation Decision Flow

```mermaid
flowchart TD
    Splash["SplashScreen"]
    CheckLang{Language selected?}
    Language["LanguageSelection"]
    CheckLogin{User logged in?}
    Login["LoginOptions"]
    CheckConsent{Consent required?}
    Consent["UserConsent"]
    CheckCity{City selected?}
    CityLoc["CityLocationSelection"]
    CheckDisc{City discontinued?}
    CityDisc["CityDiscontinued"]
    CheckMigration{Migration needed?}
    Migration["AppMigrationPreconditions"]
    Home["HomeScreen"]

    Splash --> CheckLang
    CheckLang -->|No| Language
    CheckLang -->|Yes| CheckLogin
    Language --> CheckLogin
    CheckLogin -->|No| Login
    CheckLogin -->|Yes| CheckConsent
    Login --> CheckConsent
    CheckConsent -->|Yes| Consent
    CheckConsent -->|No| CheckCity
    Consent --> CheckCity
    CheckCity -->|No| CityLoc
    CheckCity -->|Yes| CheckDisc
    CheckDisc -->|Yes| CityDisc
    CheckDisc -->|No| CheckMigration
    CityDisc --> CityLoc
    CheckMigration -->|Yes| Migration
    CheckMigration -->|No| Home
```

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: App Launch

    state Initializing {
        [*] --> CheckingConfig
        CheckingConfig --> InitializingProperties
        InitializingProperties --> SettingUpAnalytics
        SettingUpAnalytics --> FiringAppOpen
        FiringAppOpen --> SyncingActivations
        SyncingActivations --> Complete
    }

    Complete --> Routing: Init Complete
    Routing --> LanguageSelection: No language
    Routing --> LoginOptions: Not logged in
    Routing --> UserConsent: Consent needed
    Routing --> CityLocationSelection: No city
    Routing --> CityDiscontinued: City discontinued
    Routing --> HomeScreen: Ready
```

---

## Language Selection Screen

**Purpose:** Displays available languages in a grid layout with support for dynamic language pack download on Android.

### User Journey

1. User sees language grid with available options
2. Currently selected language is highlighted
3. User taps a language to preview selection
4. Continue button triggers language installation (Android) or locale update
5. On success, navigates to next onboarding step or home

### Screen Layout

```mermaid
flowchart TB
    subgraph LanguageScreen["Language Selection Screen"]
        Toolbar["Toolbar (conditional)"]
        Grid["Language Grid<br/>(2 columns)"]
        TnC["Terms & Conditions Link"]
        Continue["Continue Button"]
        Loading["Loading Dialog"]
        Snackbar["Error Snackbar"]
    end
```

### Language Grid

| Item | Content | Interaction |
|------|---------|-------------|
| **Language Card** | Language name + native script | Tap to select |
| **Selection Indicator** | Checkmark on selected | Visual only |
| **Grid Layout** | 2-column responsive grid | Scrollable |

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Loading: Screen Opens

    Loading --> GridDisplayed: Languages Loaded

    state GridDisplayed {
        [*] --> Browsing
        Browsing --> Selected: Language Tapped
        Selected --> Browsing: Different Language Tapped
    }

    Selected --> Installing: Continue Clicked

    state Installing {
        [*] --> CheckInstalled
        CheckInstalled --> AlreadyInstalled: Language available
        CheckInstalled --> Downloading: Need download
        Downloading --> Downloaded: Download complete
        Downloaded --> InstallingModule: Install module
        InstallingModule --> Installed: Module ready
        Downloading --> DownloadFailed: Error
        InstallingModule --> InstallFailed: Error
    }

    AlreadyInstalled --> UpdatingLocale
    Installed --> UpdatingLocale

    UpdatingLocale --> FetchingConfig: Locale updated
    FetchingConfig --> NavigateNext: Config loaded
    FetchingConfig --> ConfigError: Config failed

    DownloadFailed --> GridDisplayed: Show error snackbar
    InstallFailed --> GridDisplayed: Show error snackbar
    ConfigError --> GridDisplayed: Show error snackbar
```

### Split Install States (Android)

| State | UI Response |
|-------|-------------|
| **Pending** | Show loading dialog |
| **Downloading** | Show loading dialog with progress |
| **Downloaded** | Continue installation |
| **Installing** | Show loading dialog |
| **Installed** | Proceed to locale update |
| **Failed** | Show error snackbar, keep current language |
| **Canceled** | Return to grid |
| **RequiresUserConfirmation** | Show confirmation dialog |

### Snackbar Types

| Type | Message | Action |
|------|---------|--------|
| **LanguageDownloadFailed** | "Language download failed" | Retry |
| **ChaloConfigFetchFailed** | "Configuration update failed" | Retry |

---

## City Location Selection Screen

**Purpose:** Primary city selection screen that uses GPS to detect user's city or allows manual selection via universal search.

### User Journey

1. Screen checks if city is pre-saved (from previous session)
2. If no saved city, requests location permission
3. On permission granted, activates GPS and fetches location
4. Location matched to city via geolocation service
5. City metadata fetched and cached
6. Welcome screen displayed (minimum 2 seconds)
7. Navigate to home

### Screen Layout Types

```mermaid
flowchart TB
    subgraph Layouts["Layout Types"]
        Permission["LocationPermission<br/>(Request permission)"]
        NoCity["NoCityAvailable<br/>(City not serviceable)"]
        FetchError["FetchError<br/>(API error with retry)"]
        Welcome["CityWelcome<br/>(City logo + animation)"]
        ConfigFailed["ConfigFetchFailed<br/>(Config error)"]
    end
```

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: Screen Opens

    state Initializing {
        [*] --> CheckSource
        CheckSource --> CheckSavedCity: Source identified
        CheckSavedCity --> StartLocationFlow: No saved city
        CheckSavedCity --> FetchConfig: Has saved city
    }

    state LocationFlow {
        [*] --> CheckPermission
        CheckPermission --> RequestPermission: Not granted
        CheckPermission --> GetLocation: Granted

        RequestPermission --> PermissionLayout: Waiting
        PermissionLayout --> GetLocation: Permission granted
        PermissionLayout --> ManualEntry: Permission denied

        GetLocation --> CheckGPS: Permission OK
        CheckGPS --> EnableGPS: GPS disabled
        CheckGPS --> FetchLocation: GPS enabled
        EnableGPS --> FetchLocation: GPS enabled
        EnableGPS --> ManualEntry: GPS denied

        FetchLocation --> LocationReceived: Success
        FetchLocation --> FetchFailed: Error
        LocationReceived --> DetectCity: Has coordinates
        FetchFailed --> ManualEntry: No location

        DetectCity --> CityFound: City matched
        DetectCity --> NoCityLayout: No match
        CityFound --> FetchMetadata: City ID received
    }

    StartLocationFlow --> LocationFlow
    FetchConfig --> FetchMetadata: Has city ID

    FetchMetadata --> Welcome: Metadata loaded
    FetchMetadata --> ErrorLayout: Fetch failed
    FetchMetadata --> DiscontinuedFlow: City discontinued

    Welcome --> WelcomeTimer: Show animation
    WelcomeTimer --> NavigateHome: Timer complete

    ManualEntry --> UniversalSearch: Open search
    UniversalSearch --> FetchMetadata: City selected

    ErrorLayout --> FetchMetadata: Retry clicked
    NoCityLayout --> ManualEntry: Change location clicked
    DiscontinuedFlow --> CityDiscontinued: Navigate
```

### Source Types

| Source | Context | Behavior |
|--------|---------|----------|
| **SplashScreen** | First launch flow | Full location flow |
| **LoginScreen** | Post-login city selection | Full location flow |
| **HomeScreen** | City change from home | Skip permission if granted |
| **RegularBusScreen** | City change from booking | Skip permission if granted |
| **CityDiscontinuedScreen** | City no longer available | Full location flow |
| **OldCitySelectionScreen** | Legacy migration | Full location flow |

### GPS Request Flow

```mermaid
sequenceDiagram
    participant Screen as CityLocationSelection
    participant Perm as PermissionHandler
    participant GPS as GpsRequestHandler
    participant Loc as ChaloLocationManager

    Screen->>Perm: Request location permission

    alt Permission Granted
        Perm-->>Screen: FINE or COARSE granted
        Screen->>Loc: isGpsEnabled()

        alt GPS Enabled
            Loc-->>Screen: ENABLED
            Screen->>Loc: getLocationUpdates()
            Loc-->>Screen: LocationReceived
        else GPS Disabled
            Loc-->>Screen: DISABLED
            Screen->>GPS: requestGpsPermission()
            GPS-->>Screen: Result
        end
    else Permission Denied
        Perm-->>Screen: NO_PERMISSION
        Screen->>Screen: Show manual selection
    end
```

### Welcome Screen Configuration

| Element | Content |
|---------|---------|
| **City Logo** | City-specific logo image |
| **Animation** | Lottie animation (city theme) |
| **Display Duration** | Minimum 2 seconds |
| **City Name** | Large display text |
| **Description** | City tagline or info |

---

## City Selection Screen (Manual)

**Purpose:** Displays searchable list of all available cities when GPS detection fails or user chooses manual selection.

### User Journey

1. Screen loads list of available cities
2. User can tap search to filter by city name
3. Cities sorted: Live cities first, then Beta, Discontinued excluded
4. User taps a city to select it
5. City metadata fetched and selection confirmed
6. Navigate back to city location flow or home

### Screen Layout

```mermaid
flowchart TB
    subgraph CitySelectionScreen["City Selection Screen"]
        Toolbar["Toolbar with Back"]
        SearchPanel["Search Panel<br/>(Tap to expand)"]
        CityList["Scrollable City List"]
        VoteBtn["Vote for City Button"]
        Loading["Loading Spinner"]
        Error["Error State"]
    end
```

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Loading: Screen Opens

    Loading --> FetchingCities: Initialize
    FetchingCities --> ListDisplayed: Cities loaded
    FetchingCities --> ErrorState: Fetch failed

    state ListDisplayed {
        [*] --> Browsing
        Browsing --> Searching: Search clicked
        Searching --> Filtering: Query entered
        Filtering --> Searching: Query cleared
        Searching --> Browsing: Search closed
    }

    Browsing --> CitySelected: City tapped
    Filtering --> CitySelected: City tapped

    CitySelected --> ProcessingCity: Fetch metadata
    ProcessingCity --> NavigateBack: Success
    ProcessingCity --> ListDisplayed: Failed

    ErrorState --> FetchingCities: Retry clicked

    Browsing --> WebView: Vote for city clicked
```

### City Sorting Order

| Priority | City Type | Display |
|----------|-----------|---------|
| 1 | **Live Cities** | Normal display |
| 2 | **Beta Cities** | Beta badge |
| Hidden | **Coming Soon** | Not shown |
| Hidden | **Discontinued** | Not shown |

### Search Behavior

| Feature | Implementation |
|---------|----------------|
| **Debounce** | 300ms delay before filtering |
| **State Retention** | Query preserved on configuration change |
| **Empty State** | "No cities found" message |
| **Clear** | X button to clear query |

---

## City Discontinued Screen

**Purpose:** Informs user that their previously selected city is no longer serviceable and prompts them to select a new city.

### User Journey

1. User had a city selected previously
2. City configuration indicates discontinued
3. Screen shows explanation message
4. User can view supported cities list
5. Navigate to city selection

### Screen Layout

```mermaid
flowchart TB
    subgraph DiscontinuedScreen["City Discontinued Screen"]
        Icon["Warning Icon"]
        Message["Discontinued Message<br/>(City name mentioned)"]
        SupportedBtn["View Supported Cities"]
        BackBtn["Back Button"]
    end
```

### State

| State Field | Description |
|-------------|-------------|
| **selectedCity** | Name of discontinued city |

### Navigation

| Action | Destination |
|--------|-------------|
| **View Supported Cities** | CitySelectionScreen |
| **Back Pressed** | CitySelectionScreen |

---

## Location Disclaimer Screen

**Purpose:** Educational screen showing step-by-step instructions for enabling location permission and GPS.

### User Journey

1. User denied location permission or GPS is disabled
2. Screen shows animated instructions
3. Steps explain how to enable location in settings
4. User can tap to open settings
5. On return, permission/GPS status checked
6. If enabled, proceed with location flow

### Screen Layout

```mermaid
flowchart TB
    subgraph DisclaimerScreen["Location Disclaimer Screen"]
        Animation["Lottie Animation"]
        Steps["Step-by-Step Instructions"]
        SettingsBtn["Go to Settings Button"]
        GpsDialog["Enable GPS Dialog"]
    end
```

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Loading: Screen Opens

    Loading --> Displaying: Steps loaded

    state Displaying {
        [*] --> ShowingInstructions
        ShowingInstructions --> SettingsRedirect: Settings button clicked
        SettingsRedirect --> CheckingStatus: Returned from settings
        CheckingStatus --> ShowingInstructions: Still disabled
        CheckingStatus --> PermissionEnabled: Now enabled
    }

    PermissionEnabled --> [*]: Return to caller

    Displaying --> GpsPrompt: GPS disable detected
    GpsPrompt --> Displaying: Dismissed
    GpsPrompt --> PermissionEnabled: GPS enabled
```

### Instruction Steps

| Step | Android | iOS |
|------|---------|-----|
| 1 | Open Settings | Open Settings |
| 2 | Tap Permissions | Tap Location |
| 3 | Select Location | Choose "While Using" |
| 4 | Allow "While using app" | — |

---

## State Management

All screens follow the MVI pattern with DataState to ViewState transformation.

### Language Selection State

| State Field | Description |
|-------------|-------------|
| **showLoadingDialogue** | Installation in progress |
| **snackBarType** | Current error snackbar type |
| **showTncText** | Show terms link |
| **showToolbar** | Show navigation toolbar |
| **sourceType** | Splash or Home |
| **localeList** | Available languages |
| **currentLanguageSelected** | Preview selection |

### City Location Selection State

| State Field | Description |
|-------------|-------------|
| **showLoadingDialog** | Operation in progress |
| **source** | Entry source type |
| **layoutType** | Current layout variant |
| **selectedCityId** | Selected city ID |
| **selectedCityName** | City display name |
| **selectedCityDescription** | City description |
| **welcomeScreenConfig** | Welcome screen customization |
| **showLocationSettingsDialog** | GPS settings dialog visible |

### City Selection State

| State Field | Description |
|-------------|-------------|
| **cities** | Full city list |
| **filteredCities** | Search-filtered list |
| **searchQuery** | Current search text |
| **showLoadingSpinner** | Loading indicator |
| **shouldShowSearchPanel** | Search panel expanded |
| **shouldShowError** | Error state |
| **currentlySelectedCityId** | Previously selected city |

### Intent Types

| Screen | Key Intents |
|--------|-------------|
| **Splash** | Initialization, ProceedToApp |
| **Language** | InitializationIntent, LanguageSelected, ContinueClicked, SnackbarRetryClicked |
| **City Location** | InitializationIntent, OnLocationPermissionGranted, OnEnterManuallyClicked, RetryCityFetch, UniversalSearchResultReceived |
| **City Selection** | InitialisationIntent, SearchQueryEnteredIntent, CityClickedIntent, VoteForCityClickedIntent |
| **City Discontinued** | InitializationIntent, OnSupportedCitiesButtonClicked |

---

## Navigation

### Entry Points

| Source | Destination | Args |
|--------|-------------|------|
| App Launch | Splash | — |
| Settings | Language Selection | LanguageSelectionSourceType.HOME_SCREEN |
| Home Header | City Location Selection | CityLocationSelectionSource.HomeScreen |

### Screen Transitions

```mermaid
flowchart TD
    AppLaunch["App Launch"]
    Splash["Splash"]
    Language["Language Selection"]
    Login["Login"]
    Consent["User Consent"]
    CityLoc["City Location Selection"]
    CitySelect["City Selection"]
    CityDisc["City Discontinued"]
    Disclaimer["Location Disclaimer"]
    Home["Home"]

    AppLaunch --> Splash
    Splash --> Language
    Splash --> Login
    Splash --> Consent
    Splash --> CityLoc
    Splash --> CityDisc
    Splash --> Home

    Language --> Login
    Language --> CityLoc
    Language --> Home

    CityLoc --> Disclaimer
    CityLoc --> CitySelect
    CityLoc --> Home

    CityDisc --> CitySelect
    CitySelect --> Home
    Disclaimer --> CityLoc
```

---

## Analytics Events

### Splash Events

| Event | Trigger |
|-------|---------|
| `splash_screen_shown` | Screen displayed |
| `app_open` | App launch recorded |

### Language Selection Events

| Event | Properties | Trigger |
|-------|------------|---------|
| `language_selection_screen_shown` | source | Screen displayed |
| `language_selected` | locale, previous_locale | Language tapped |
| `language_continue_clicked` | locale | Continue button tapped |
| `language_download_started` | locale | Download begins |
| `language_download_completed` | locale | Download succeeds |
| `language_download_failed` | locale, error | Download fails |

### City Selection Events

| Event | Properties | Trigger |
|-------|------------|---------|
| `city_location_selection_screen_shown` | source | Screen displayed |
| `location_permission_requested` | — | Permission dialog shown |
| `location_permission_granted` | permission_type | Permission granted |
| `location_permission_denied` | — | Permission denied |
| `city_detected_from_gps` | city_id, city_name | GPS detection success |
| `city_selected_manually` | city_id, city_name | Manual selection |
| `city_not_serviceable` | latitude, longitude | Location outside service area |

---

## Platform Differences

### Android-Specific

| Feature | Implementation |
|---------|----------------|
| **Split Install** | Google Play Core for language modules |
| **Location Permission** | ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION |
| **GPS Settings** | LocationSettingsRequest with resolution |
| **Language Packs** | Dynamic download via SplitInstallManager |

### iOS-Specific

| Feature | Implementation |
|---------|----------------|
| **Language Packs** | All languages bundled in app |
| **Location Permission** | NSLocationWhenInUseUsageDescription |
| **GPS Settings** | Direct to Settings app |
| **Locale** | NSLocale for configuration |

---

## Error Handling

| Scenario | UI Response |
|----------|-------------|
| **Language download failed** | Snackbar with retry action |
| **Config fetch failed** | Snackbar with retry action |
| **Location permission denied** | Show manual selection option |
| **GPS disabled** | Show enable GPS dialog |
| **City not serviceable** | Show "not available" layout |
| **City metadata fetch failed** | Error layout with retry |
| **City discontinued** | Navigate to discontinued screen |
| **Network failure** | Error layout with retry |
