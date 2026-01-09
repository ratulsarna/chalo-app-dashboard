# Onboarding analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The onboarding flow branches based on user state: first-time users go through language + city selection, returning users may skip directly to home
- There are two city selection implementations: old flow (CitySelectionComponent) and new flow (CityLocationSelectionComponent) - both emit some events with the same name but different source values
- User properties (deviceId, isNotifPermGranted, migrationRequired, firstSeen) are set during splash screen but are not analytics events

Visual key:
- Green solid boxes: analytics events (exact strings from `events.json`)
- Grey dashed pills: screens/states/branches (not analytics events)
- Grey dotted boxes: external flows instrumented elsewhere

```mermaid
flowchart LR
  ui([Screen / state / branch]) --> ev["analytics event name"]
  ext[External module flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev event;
  class ui ui;
  class ext external;
```

## Complete onboarding journey (high-level overview)

This diagram shows the complete onboarding flow from app launch to home screen.

```mermaid
flowchart TD
  ui_appLaunch([App Launch]) --> ev_firstScreen["first screen open"]
  ev_firstScreen --> ev_appOpen["app open"]

  ev_appOpen --> ui_checkLanguage([Check language selected?])
  ui_checkLanguage -->|Not selected| ui_languageFlow([Language Selection Flow])
  ui_checkLanguage -->|Already selected| ui_checkLogin([Check login status])

  ui_languageFlow --> ev_langScreenDisplay["language selection screen displayed"]
  ev_langScreenDisplay --> ev_langContinue["language screen continue clicked"]
  ev_langContinue --> ev_langChanged["language changed"]
  ev_langChanged --> ui_checkLogin

  ui_checkLogin -->|Not logged in| ext_loginFlow[Login Flow]
  ui_checkLogin -->|Logged in| ui_checkCity([Check city selected?])

  ext_loginFlow --> ui_checkCity

  ui_checkCity -->|Not selected| ui_cityFlow([City Selection Flow])
  ui_checkCity -->|Already selected| ui_checkDiscontinued([Check city discontinued?])

  ui_cityFlow --> ui_newOrOld([New or old flow?])
  ui_newOrOld -->|New flow| ui_newCityFlow([New City Selection])
  ui_newOrOld -->|Old flow| ui_oldCityFlow([Old City Selection])

  ui_newCityFlow --> ev_cityLocScreenOpen["city location selection screen opened"]
  ui_oldCityFlow --> ev_cityScreenDisplay["city selection screen displayed"]

  ev_cityLocScreenOpen --> ev_citySelected1["city selected"]
  ev_cityScreenDisplay --> ev_citySelected2["city selected"]

  ev_citySelected1 --> ui_checkDiscontinued
  ev_citySelected2 --> ui_checkDiscontinued

  ui_checkDiscontinued -->|Discontinued| ui_discontinuedFlow([City Discontinued Flow])
  ui_checkDiscontinued -->|Active| ui_homeScreen([Navigate to Home])

  ui_discontinuedFlow --> ev_cityDiscontinued["city discontinued screen displayed"]
  ev_cityDiscontinued --> ev_changeCity["city discontinued change city clicked"]
  ev_changeCity --> ui_cityFlow

  ui_homeScreen --> ev_newHome["new home screen rendered"]
  ui_homeScreen --> ev_tabHome["tab based homescreen rendered"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_firstScreen,ev_appOpen,ev_langScreenDisplay,ev_langContinue,ev_langChanged,ev_cityLocScreenOpen,ev_cityScreenDisplay,ev_citySelected1,ev_citySelected2,ev_cityDiscontinued,ev_changeCity,ev_newHome,ev_tabHome event;
  class ui_appLaunch,ui_checkLanguage,ui_languageFlow,ui_checkLogin,ui_checkCity,ui_cityFlow,ui_newOrOld,ui_newCityFlow,ui_oldCityFlow,ui_checkDiscontinued,ui_discontinuedFlow,ui_homeScreen ui;
  class ext_loginFlow external;
```

## Funnel: Splash Screen → App Initialization

This is the entry point for all users. These events fire on every app launch.

```mermaid
flowchart TD
  ui_splashScreen([Splash Screen Component]) --> ev_firstScreen["first screen open"]
  ev_firstScreen --> ev_appOpen["app open"]

  ev_appOpen --> ui_setupAnalytics([Setup Analytics])
  ui_setupAnalytics --> ui_initUserProps([Initialize User Properties])

  ui_initUserProps --> ui_setUserProps([Set User Properties])
  ui_setUserProps -.->|deviceId| ui_peopleProps([People Properties])
  ui_setUserProps -.->|isNotifPermGranted| ui_peopleProps
  ui_setUserProps -.->|migrationRequired| ui_superProps([Super Properties])
  ui_setUserProps -.->|firstSeen| ui_superProps

  ui_peopleProps --> ui_decideNext([Decide Next Screen])
  ui_superProps --> ui_decideNext

  ui_decideNext -->|Go to home| ev_newHome["new home screen rendered"]
  ui_decideNext -->|Go to home| ev_tabHome["tab based homescreen rendered"]
  ui_decideNext -->|Need language| ui_languageScreen([Language Selection])
  ui_decideNext -->|Need city| ui_cityScreen([City Selection])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_firstScreen,ev_appOpen,ev_newHome,ev_tabHome event;
  class ui_splashScreen,ui_setupAnalytics,ui_initUserProps,ui_setUserProps,ui_peopleProps,ui_superProps,ui_decideNext,ui_languageScreen,ui_cityScreen ui;
```

## Funnel: Language Selection

This flow occurs when the user has not previously selected a language.

```mermaid
flowchart TD
  ui_needLanguage([Language Not Set]) --> ev_langDisplay["language selection screen displayed"]

  ev_langDisplay --> ui_userSelectsLang([User Selects Language])
  ui_userSelectsLang --> ev_langChanged["language changed"]

  ev_langChanged --> ui_clickContinue([User Clicks Continue])
  ui_clickContinue --> ev_langContinue["language screen continue clicked"]

  ev_langContinue --> ui_nextScreen([Next: Login or City Selection])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_langDisplay,ev_langChanged,ev_langContinue event;
  class ui_needLanguage,ui_userSelectsLang,ui_clickContinue,ui_nextScreen ui;
```

## Funnel: City Selection (New Flow) - Device Location Path

This is the primary city selection flow using device location.

```mermaid
flowchart TD
  ui_needCity([City Not Set]) --> ev_screenOpen["city location selection screen opened"]

  ev_screenOpen --> ui_showLocationOptions([Show Location Options])
  ui_showLocationOptions --> ui_userEnableLocation([User Clicks Enable Location])
  ui_userEnableLocation --> ev_enableLocation["enable device location clicked"]

  ev_enableLocation --> ui_checkPermission([Check Location Permission])

  ui_checkPermission -->|Permission granted| ui_fetchCity([Fetch City from Location])
  ui_checkPermission -->|Permission denied| ev_refusedPerm["user refused location permission"]
  ui_checkPermission -->|Settings denied| ev_refusedSettings["user refused location permission via settings"]

  ui_fetchCity -->|Success| ui_showCity([Display Detected City])
  ui_fetchCity -->|Failure| ev_fetchFailed["city fetch from location failed"]

  ev_fetchFailed --> ui_showRetry([Show Retry Option])
  ui_showRetry --> ui_userRetry([User Clicks Retry])
  ui_userRetry --> ev_retryFetch["retry city fetch clicked"]
  ev_retryFetch --> ui_fetchCity

  ui_showCity --> ui_userConfirm([User Confirms City])
  ui_userConfirm --> ev_citySelected["city selected"]

  ui_showCity --> ui_userChange([User Clicks Change])
  ui_userChange --> ev_changeLocation["change location clicked"]
  ev_changeLocation --> ui_showManualEntry([Manual Entry Screen])

  ev_refusedPerm --> ui_showManualOption([Show Manual Entry Option])
  ev_refusedSettings --> ui_showManualOption

  ui_showManualOption --> ui_userManual([User Clicks Manual Entry])
  ui_userManual --> ev_manualEntry["enter location manually clicked"]
  ev_manualEntry --> ui_showManualEntry

  ev_citySelected --> ui_checkServiceable([Check City Serviceable])
  ui_checkServiceable -->|Serviceable| ui_home([Navigate to Home])
  ui_checkServiceable -->|Not serviceable| ev_notServiceable["city not serviceable screen"]

  ev_notServiceable --> ui_userExploreCities([User Clicks Explore Cities])
  ui_userExploreCities --> ev_exploreCities["explore chalo cities clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_screenOpen,ev_enableLocation,ev_refusedPerm,ev_refusedSettings,ev_fetchFailed,ev_retryFetch,ev_citySelected,ev_changeLocation,ev_manualEntry,ev_notServiceable,ev_exploreCities event;
  class ui_needCity,ui_showLocationOptions,ui_userEnableLocation,ui_checkPermission,ui_fetchCity,ui_showCity,ui_showRetry,ui_userRetry,ui_userConfirm,ui_userChange,ui_showManualEntry,ui_showManualOption,ui_userManual,ui_checkServiceable,ui_home,ui_userExploreCities ui;
```

## Funnel: City Selection (New Flow) - GPS Permission Refusals

This diagram shows the permission-related events in detail.

```mermaid
flowchart TD
  ui_requestPerm([Location Permission Requested]) --> ui_userResponse([User Response])

  ui_userResponse -->|Denied first time| ev_refused["user refused location permission"]
  ui_userResponse -->|Denied via settings| ev_refusedSettings["user refused location permission via settings"]
  ui_userResponse -->|GPS off| ui_gpsPrompt([Prompt to Turn on GPS])

  ui_gpsPrompt --> ui_userGpsResponse([User Response])
  ui_userGpsResponse -->|Refused| ev_refusedGps["user refused to turn gps on"]
  ui_userGpsResponse -->|Accepted| ui_gpsEnabled([GPS Enabled])

  ev_refused --> ui_fallback([Fallback to Manual Entry])
  ev_refusedSettings --> ui_fallback
  ev_refusedGps --> ui_fallback

  ui_fallback --> ev_manualEntry["enter location manually clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_refused,ev_refusedSettings,ev_refusedGps,ev_manualEntry event;
  class ui_requestPerm,ui_userResponse,ui_gpsPrompt,ui_userGpsResponse,ui_gpsEnabled,ui_fallback ui;
```

## Location Disclaimer (Post-Onboarding / Recovery)

Some cities require location to proceed. When location is mandatory but missing, the app can route the user through the Location Disclaimer screen.

```mermaid
flowchart TD
  ui_entry([Location mandatory, not granted]) --> ev_open["location disclaimer activity opened"]
  ev_open --> ui_disclaimer([Location Disclaimer screen])

  ui_disclaimer --> ui_userChoice{User choice}
  ui_userChoice -->|Enable| ev_enabled["location successfully enabled"]
  ui_userChoice -->|Deny| ev_denied["location denied event"]
  ui_userChoice -->|Open settings| ev_settings["go to settings btn clicked"]

  ui_disclaimer --> ev_permResult["location permission result event"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_open,ev_enabled,ev_denied,ev_settings,ev_permResult event;
  class ui_entry,ui_disclaimer,ui_userChoice ui;
```

## Funnel: City Selection (Old Flow)

This is the legacy city selection implementation, still present in the codebase.

```mermaid
flowchart TD
  ui_oldFlow([Old City Selection Flow]) --> ev_screenDisplay["city selection screen displayed"]

  ev_screenDisplay --> ui_showCityList([Display City List])

  ui_showCityList --> ui_userSearches([User Clicks Search Icon])
  ui_userSearches --> ev_searchClick["city selection search icon clicked"]

  ui_showCityList --> ui_needLocation([Need Location Permission])
  ui_needLocation --> ev_permPopup["permission_popup"]

  ev_searchClick --> ui_searchScreen([Search Screen])
  ui_searchScreen --> ui_userSelectsCity([User Selects City])

  ui_showCityList --> ui_userSelectsCity

  ui_userSelectsCity --> ev_citySelected["city selected"]

  ev_citySelected --> ui_home([Navigate to Home])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_screenDisplay,ev_searchClick,ev_permPopup,ev_citySelected event;
  class ui_oldFlow,ui_showCityList,ui_userSearches,ui_needLocation,ui_searchScreen,ui_userSelectsCity,ui_home ui;
```

## Funnel: City Discontinued Flow

This flow handles users who have selected a discontinued city.

```mermaid
flowchart TD
  ui_checkCity([Check Selected City Status]) --> ui_isDiscontinued([City Discontinued?])

  ui_isDiscontinued -->|Yes| ev_discontinuedDisplay["city discontinued screen displayed"]
  ui_isDiscontinued -->|No| ui_home([Navigate to Home])

  ev_discontinuedDisplay --> ui_showChangeOption([Show Change City Option])

  ui_showChangeOption --> ui_userChange([User Clicks Change City])
  ui_userChange --> ev_changeCity["city discontinued change city clicked"]

  ev_changeCity --> ui_citySelection([Navigate to City Selection])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_discontinuedDisplay,ev_changeCity event;
  class ui_checkCity,ui_isDiscontinued,ui_home,ui_showChangeOption,ui_userChange,ui_citySelection ui;
```

## Event Source Comparison: Old vs New City Selection

This table helps identify which city selection flow is being used based on the source property:

| Event Name | Old Flow Source | New Flow Source | Notes |
|------------|----------------|-----------------|-------|
| city selection screen displayed | CITY_SELECTION_FRAGMENT | (not used) | Old flow only |
| city selection search icon clicked | CITY_SELECTION_FRAGMENT | (not used) | Old flow only |
| permission_popup | CITY_SELECTION_FRAGMENT | (not used) | Old flow only |
| city selected | CITY_SELECTION_FRAGMENT_SPACED | CITY_SELECTION_SCREEN | Used in both flows |
| city location selection screen opened | (not used) | CITY_SELECTION_SCREEN | New flow only |
| enable device location clicked | (not used) | CITY_SELECTION_SCREEN | New flow only |
| enter location manually clicked | (not used) | CITY_SELECTION_SCREEN | New flow only |
| retry city fetch clicked | (not used) | CITY_SELECTION_SCREEN | New flow only |
| change location clicked | (not used) | CITY_SELECTION_SCREEN | New flow only |
| explore chalo cities clicked | (not used) | CITY_SELECTION_SCREEN | New flow only |
| user refused location permission | (not used) | CITY_SELECTION_SCREEN | New flow only |
| user refused location permission via settings | (not used) | CITY_SELECTION_SCREEN | New flow only |
| user refused to turn gps on | (not used) | CITY_SELECTION_SCREEN | New flow only |
| city not serviceable screen | (not used) | CITY_SELECTION_SCREEN | New flow only |
| city fetch from location failed | (not used) | CITY_SELECTION_SCREEN | New flow only |

## User Properties Set During Onboarding

These are not events but user-level properties set during the onboarding flow:

```mermaid
flowchart LR
  ui_splash([Splash Screen Initialization]) --> ui_setupProps([Setup User Properties])

  ui_setupProps --> prop_deviceId["deviceId (People Property)"]
  ui_setupProps --> prop_notif["isNotifPermGranted (People Property)"]
  ui_setupProps --> prop_migration["migrationRequired (Super Property)"]
  ui_setupProps --> prop_firstSeen["firstSeen (Super Property, first app open only)"]

  prop_deviceId --> ui_analytics([Analytics System])
  prop_notif --> ui_analytics
  prop_migration --> ui_analytics
  prop_firstSeen --> ui_analytics

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;
  classDef property fill:#fef3c7,stroke:#f59e0b,color:#78350f;

  class ui_splash,ui_setupProps,ui_analytics ui;
  class prop_deviceId,prop_notif,prop_migration,prop_firstSeen property;
```

## Key Insights for Funnel Building

1. **Entry Point Detection**: Use `first screen open` as the universal entry point for all users
2. **Flow Branching**:
   - Language selection occurs only for first-time users or users who haven't set language
   - City selection has two implementations - filter by `source` property to identify which flow
3. **Permission Funnels**: Track the new flow's permission journey using the three refusal events
4. **Completion Markers**:
   - Language selection completes with `language screen continue clicked`
   - City selection completes with `city selected` (check source to identify flow)
   - Onboarding completes with `new home screen rendered` or `tab based homescreen rendered`
5. **Error Tracking**: Use `city fetch from location failed` with `reason` property to diagnose city detection issues
6. **Deprecated Flow Detection**: Events with `CITY_SELECTION_FRAGMENT` source indicate old flow usage
