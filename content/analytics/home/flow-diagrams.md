# Home Flow Analytics Event Flow Diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The home flow spans **5 main tabs**: Home, Regular Bus, Chalo Bus, Profile, and Tickets
- Location-related events (`gps request on`, `location update received`, etc.) fire across multiple tabs
- Each tab has its own `rendered` event as the entry point

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

## Entry: Bottom Navigation & Tab Selection

Use `bottom nav item clicked` to track which tab the user navigates to.

```mermaid
flowchart TD
  ui_bottomNav([Bottom Navigation Bar]) --> ev_bottomNavItemClicked["bottom nav item clicked"]

  ev_bottomNavItemClicked -->|bottom nav item = home| ui_homeTab([Home Tab])
  ev_bottomNavItemClicked -->|bottom nav item = regular bus| ui_regularBusTab([Regular Bus Tab])
  ev_bottomNavItemClicked -->|bottom nav item = chalo bus| ui_chaloBusTab([Chalo Bus Tab])
  ev_bottomNavItemClicked -->|bottom nav item = profile| ui_profileTab([Profile Tab])
  ev_bottomNavItemClicked -->|bottom nav item = tickets| ui_ticketsTab([Tickets Tab])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bottomNavItemClicked event;
  class ui_bottomNav,ui_homeTab,ui_regularBusTab,ui_chaloBusTab,ui_profileTab,ui_ticketsTab ui;
```

## Tab 1: Home Screen Tab

Main landing screen with premium bus cards, search, and profile access.

```mermaid
flowchart TD
  ui_homeScreen([Home Screen Tab Opens]) --> ui_homeBoot([HomeComponent boot])
  ui_deeplink([Home opened via deeplink]) --> ev_homeViaDeeplink["home screen opened via deeplink"]
  ev_homeViaDeeplink --> ui_homeBoot

  ui_homeBoot --> ev_searchRemovalConfigFetch["home screen search removal config fetch"]
  ui_homeBoot --> ui_cacheCheck{User bookings cache check}
  ui_cacheCheck --> ev_cacheLogger["homescreen user bookings in cache logger"]
  ui_cacheCheck -->|empty| ev_cacheEmpty["user bookings in cache empty"]
  ui_cacheCheck -->|failed| ev_cacheFailed["check user bookings in cache failed"]
  ui_cacheCheck --> ev_homePageRendered["home page rendered"]

  ev_homePageRendered --> ev_homePageCardItemRendered["home page card item rendered"]
  ev_homePageCardItemRendered --> ev_homePageCardItemClicked["home page card item clicked"]

  ev_homePageRendered --> ev_homePageHookRendered["home page hook rendered"]
  ev_homePageHookRendered --> ev_homePageHookClicked["home page hook clicked"]

  ev_homePageRendered --> ev_profileIconClicked["profile icon clicked"]
  ev_homePageRendered --> ev_chaloSearchBarClicked["chalo search bar clicked"]
  ev_homePageRendered --> ev_cityChangeCardClicked["city change card clicked"]

  ev_homePageRendered --> ui_pbBookingCardTap([Premium bus booking card tapped])
  ui_pbBookingCardTap --> ev_pbHomescreenBookTripClicked["pb homescreen book trip clicked"]
  ui_pbBookingCardTap --> ev_premiumServiceBusInteraction["premium service bus interaction"]
  ev_pbHomescreenBookTripClicked --> external_pbFlow[Premium Bus Booking Flow]

  ev_homePageRendered --> ev_pbBookingCardExpired["pb booking card expired"]

  ev_homePageRendered --> ev_premiumReserveTicketAckCtaClicked["premium reserve ticket ack cta clicked"]

  ev_homePageRendered --> ev_ocrHomescreenCardRecharge["ocr homescreen card recharge card"]
  ev_ocrHomescreenCardRecharge --> ev_ocrTutorialBottomsheetDisplayed["ocr tutorial bottomsheet displayed"]
  ev_ocrTutorialBottomsheetDisplayed --> ev_ocrTutorialBottomsheetNextClicked["ocr tutorial bottomsheet next clicked"]

  ev_homePageRendered --> ev_appUpdateInstallClicked["app update install clicked"]
  ev_homePageRendered --> ev_appUpdateCancelClicked["app update cancel clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_homeViaDeeplink,ev_searchRemovalConfigFetch,ev_cacheLogger,ev_cacheEmpty,ev_cacheFailed,ev_homePageRendered,ev_homePageCardItemRendered,ev_homePageCardItemClicked,ev_homePageHookRendered,ev_homePageHookClicked,ev_profileIconClicked,ev_chaloSearchBarClicked,ev_cityChangeCardClicked,ev_pbHomescreenBookTripClicked,ev_premiumServiceBusInteraction,ev_pbBookingCardExpired,ev_premiumReserveTicketAckCtaClicked,ev_ocrHomescreenCardRecharge,ev_ocrTutorialBottomsheetDisplayed,ev_ocrTutorialBottomsheetNextClicked,ev_appUpdateInstallClicked,ev_appUpdateCancelClicked event;
  class ui_homeScreen,ui_deeplink,ui_homeBoot,ui_cacheCheck,ui_pbBookingCardTap ui;
  class external_pbFlow external;
```

## Tab 2: Regular Bus Tab

Nearby stops, passes, map, and bus tracking.

```mermaid
flowchart TD
  ui_regularBusScreen([Regular Bus Tab Opens]) --> ev_regularBusPageRendered["regular bus page rendered"]

  ev_regularBusPageRendered --> ev_regularBusPageCardItemRendered["regular bus page card item rendered"]
  ev_regularBusPageCardItemRendered --> ev_regularBusPageCardItemClicked["regular bus page card item clicked"]
  ev_regularBusPageRendered --> ev_profileIconClicked["profile icon clicked"]
  ev_regularBusPageRendered --> ev_homeScreenBottomNavSearchTabClicked["home screen bottom nav search tab clicked"]

  ev_regularBusPageRendered --> ev_nearbyStopsMoreClicked["nearby stops more clicked"]
  ev_regularBusPageRendered --> ev_nearbyStopsCardStopNameClicked["nearby stops card stop name header clicked"]
  ev_regularBusPageRendered --> ev_nearbyStopsCardMoreTripsClicked["nearby stops card more trips clicked"]
  ev_regularBusPageRendered --> ev_nearbyStopsCardRouteClicked["nearby stops card route clicked"]

  ev_nearbyStopsCardRouteClicked --> external_routeDetails[Route Details Flow]

  ev_regularBusPageRendered --> ev_regularBusPageRecentSearchCardClicked["regular bus page recent search card clicked"]
  ev_regularBusPageRendered --> ev_seeAllPassesClicked["see all passes clicked"]
  ev_regularBusPageRendered --> ev_cityChangeCardClicked["city change card clicked"]
  ev_regularBusPageRendered --> ev_regularBusPageMapThumbnailClicked["regular bus page map thumbnail clicked"]

  ev_regularBusPageRendered --> ev_seatOccupancyBottomsheetRendered["seat occupancy bottomsheet rendered on homescreen"]
  ev_seatOccupancyBottomsheetRendered --> ev_seatOccupancyBottomsheetDismissed["seat occupancy bottomsheet dismissed clicked"]
  ev_seatOccupancyBottomsheetRendered --> ev_seatOccupancyBottomsheetGotIt["seat occupancy bottomsheet got it clicked"]
  ev_seatOccupancyBottomsheetRendered --> ev_seatOccupancyBottomsheetLearnMore["seat occupancy bottomsheet learn more clicked"]

  ev_regularBusPageRendered --> ev_payForTicketClickNavFailed["regular bus tab, pay for ticket click navigation failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_regularBusPageRendered,ev_regularBusPageCardItemRendered,ev_regularBusPageCardItemClicked,ev_profileIconClicked,ev_homeScreenBottomNavSearchTabClicked,ev_nearbyStopsMoreClicked,ev_nearbyStopsCardStopNameClicked,ev_nearbyStopsCardMoreTripsClicked,ev_nearbyStopsCardRouteClicked,ev_regularBusPageRecentSearchCardClicked,ev_seeAllPassesClicked,ev_cityChangeCardClicked,ev_regularBusPageMapThumbnailClicked,ev_seatOccupancyBottomsheetRendered,ev_seatOccupancyBottomsheetDismissed,ev_seatOccupancyBottomsheetGotIt,ev_seatOccupancyBottomsheetLearnMore,ev_payForTicketClickNavFailed event;
  class ui_regularBusScreen ui;
  class external_routeDetails external;
```

## Tab 3: Chalo Bus (Premium Bus) Tab

Premium bus landing with routes, passes, trip submission.

```mermaid
flowchart TD
  ui_chaloBusScreen([Chalo Bus Tab Opens]) --> ev_chaloBusPageRendered["chalo bus page rendered"]

  ev_chaloBusPageRendered --> ev_chaloTabBottomSheetDismissed["chalo tab bottom sheet dismissed"]
  ev_chaloBusPageRendered --> ev_seeAllPassesClicked["see all passes clicked"]
  ev_chaloBusPageRendered --> ev_pbPassSavingsInfoBtnClicked["pb pass savings info btn clicked"]
  ev_chaloBusPageRendered --> ev_pbExploreAvailableRoutesClicked["pb explore available routes button clicked"]
  ev_chaloBusPageRendered --> ev_pbLandingRouteClicked["pb landing route clicked"]

  ev_pbLandingRouteClicked --> ev_pbPreferredTimeBottomsheetOpened["pb preferred time bottomsheet opened"]
  ev_pbPreferredTimeBottomsheetOpened --> ev_pbTripDetailsSubmitted["pb trip details submitted"]
  ev_pbTripDetailsSubmitted --> ev_pbTripDetailsScreenShown["pb trip details screen shown"]

  ev_chaloBusPageRendered --> ev_chaloBusTabNotificationIconClick["chalo bus tab notification icon click"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_chaloBusPageRendered,ev_chaloTabBottomSheetDismissed,ev_seeAllPassesClicked,ev_pbPassSavingsInfoBtnClicked,ev_pbExploreAvailableRoutesClicked,ev_pbLandingRouteClicked,ev_pbPreferredTimeBottomsheetOpened,ev_pbTripDetailsSubmitted,ev_pbTripDetailsScreenShown,ev_chaloBusTabNotificationIconClick event;
  class ui_chaloBusScreen ui;
```

## Tab 4: Profile Tab

User profile with menu options.

```mermaid
flowchart TD
  ui_profileScreen([Profile Tab Opens]) --> ev_profileScreenRendered["profile screen rendered"]

  ev_profileScreenRendered --> ev_profileScreenItemRendered["profile screen item rendered"]
  ev_profileScreenItemRendered --> ev_profileScreenItemClicked["profile screen item clicked"]

  ev_profileScreenRendered --> ev_walletOnBoardingBottomSheetClicked["wallet onBoarding bottom sheet positive button clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_profileScreenRendered,ev_profileScreenItemRendered,ev_profileScreenItemClicked,ev_walletOnBoardingBottomSheetClicked event;
  class ui_profileScreen ui;
```

## Tab 5: Tickets/History Tab

User tickets and booking history.

```mermaid
flowchart TD
  ui_ticketsScreen([Tickets Tab Opens]) --> ev_myTicketsScreenRendered["my tickets screen rendered"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_myTicketsScreenRendered event;
  class ui_ticketsScreen ui;
```

## Shared Flow: Location & GPS (All Tabs)

Location-related events fire across multiple tabs (Home & Regular Bus).

```mermaid
flowchart TD
  ui_anyTab([Home or Regular Bus Tab]) --> ev_locationTooltipTurnOnClicked["location tooltip turn on clicked"]
  ui_anyTab --> ev_locationTooltipCancelClicked["location tooltip cancel clicked"]

  ev_locationTooltipTurnOnClicked --> ev_gpsRequestOn["gps request on"]
  ev_gpsRequestOn --> ev_gpsRequestResultReceived["gps request result received"]

  ev_gpsRequestResultReceived -->|isResultOk = true| ev_locationUpdateReceived["location update received"]
  ev_gpsRequestResultReceived -->|isResultOk = false| ev_locationSettingsUnavailable["location settings unavailable"]

  ui_anyTab --> ui_permissionDialog([Location Permission Dialog])
  ui_permissionDialog --> ev_accessLocationEvent["access location event"]

  ui_anyTab --> ev_cityChangeCardClicked["city change card clicked"]

  ui_regularBusTab([Regular Bus Tab]) --> ev_newGeoQueryManagerDataReceived["new geo query manager data received"]
  ui_regularBusTab --> ev_cityNotSupportedPromptOpen["city not supported prompt open"]
  ui_regularBusTab --> ev_cityChangePromptOpen["city change prompt open"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_locationTooltipTurnOnClicked,ev_locationTooltipCancelClicked,ev_gpsRequestOn,ev_gpsRequestResultReceived,ev_locationUpdateReceived,ev_locationSettingsUnavailable,ev_accessLocationEvent,ev_cityChangeCardClicked,ev_newGeoQueryManagerDataReceived,ev_cityNotSupportedPromptOpen,ev_cityChangePromptOpen event;
  class ui_anyTab,ui_permissionDialog,ui_regularBusTab ui;
```

## Funnel: Nearby Stops Map (From Regular Bus)

The map view has its own event set. This is useful to build a map engagement funnel.

```mermaid
flowchart TD
  ev_regularBusMapThumb["regular bus page map thumbnail clicked"] --> ev_mapOpen["nearby stops map screen open"]
  ev_mapOpen --> ev_markerClick["nearby stops marker click"]
  ev_markerClick --> ui_card([Stop card shown])

  ui_card --> ev_cardRoute["nearby stops activity card route clicked"]
  ui_card --> ev_cardMoreTrips["nearby stops activity card more trips clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_regularBusMapThumb,ev_mapOpen,ev_markerClick,ev_cardRoute,ev_cardMoreTrips event;
  class ui_card ui;
```

## Funnel: Live Vehicles (Home Map)

These events power funnels like “loaded live vehicles → clicked a vehicle”.

```mermaid
flowchart TD
  ui_polling([Geo-spatial polling cycle]) --> ev_geoResponse["geo spatial request response time"]
  ui_polling --> ev_bannerInfo["banner info received"]

  ev_geoResponse --> ui_liveLoaded{Live vehicles loaded?}
  ui_liveLoaded -->|Yes| ev_liveLoaded["home screen live vehicles shown on map"]
  ui_liveLoaded -->|No| ev_noLive["home screen no live vehicles loaded"]

  ev_liveLoaded --> ev_markerShown["home screen live marker shown"]
  ev_markerShown --> ev_markerClick["home screen live vehicles click"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_geoResponse,ev_bannerInfo,ev_liveLoaded,ev_noLive,ev_markerShown,ev_markerClick event;
  class ui_polling,ui_liveLoaded ui;
```

## Funnel: Notification Permission Prompt (Home)

```mermaid
flowchart TD
  ui_trigger([Prompt condition met]) --> ev_promptRendered["notification permission bottomsheet rendered"]
  ev_promptRendered --> ui_choice{User choice}

  ui_choice --> ev_enable["notification permission bottomsheet enable clicked"]
  ui_choice --> ev_skip["notification permission bottomsheet skip clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_promptRendered,ev_enable,ev_skip event;
  class ui_trigger,ui_choice ui;
```

## Funnel: Boost Ratings Prompt (Home)

```mermaid
flowchart TD
  ui_trigger([Prompt condition met]) --> ev_rendered["boost ratings BottomSheet rendered"]
  ev_rendered --> ui_choice{User choice}

  ui_choice --> ev_rate["boost ratings rate button clicked"]
  ui_choice --> ev_remind["boost ratings remind later clicked"]

  ev_rate --> ui_store([System app rating / store flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_rendered,ev_rate,ev_remind event;
  class ui_trigger,ui_choice,ui_store ui;
```

## Funnel: Super Pass Status Prompt (Home)

```mermaid
flowchart TD
  ui_trigger([Super pass application update detected]) --> ev_promptOpen["pass status prompt open"]
  ev_promptOpen --> ui_bottomSheet([Pass status bottom sheet shown])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_promptOpen event;
  class ui_trigger,ui_bottomSheet ui;
```

## WebView Failures

```mermaid
flowchart TD
  ui_webView([WebView screen]) --> ev_webFail["webview url load failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_webFail event;
  class ui_webView ui;
```

## Funnel: Home Screen → Premium Bus Booking

Typical flow for premium bus bookings from home screen.

```mermaid
flowchart TD
  ev_homePageRendered["home page rendered"]
  ev_homePageRendered --> ev_pbHomescreenBookTripClicked["pb homescreen book trip clicked"]
  ev_pbHomescreenBookTripClicked --> ev_pbPreferredTimeBottomsheetOpened["pb preferred time bottomsheet opened"]
  ev_pbPreferredTimeBottomsheetOpened --> ev_pbPreferredTimeSubmitted["pb preferred time submitted"]
  ev_pbPreferredTimeSubmitted --> external_pbBookingFlow[Premium Bus Booking Flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_homePageRendered,ev_pbHomescreenBookTripClicked,ev_pbPreferredTimeBottomsheetOpened,ev_pbPreferredTimeSubmitted event;
  class external_pbBookingFlow external;
```

## Funnel: Regular Bus Tab → Route Details

Typical flow for viewing route details from nearby stops.

```mermaid
flowchart TD
  ev_regularBusPageRendered["regular bus page rendered"]
  ev_regularBusPageRendered --> ev_nearbyStopsCardRouteClicked["nearby stops card route clicked"]
  ev_nearbyStopsCardRouteClicked --> external_routeDetailsActivity[Route Details Activity]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_regularBusPageRendered,ev_nearbyStopsCardRouteClicked event;
  class external_routeDetailsActivity external;
```

## Funnel: Chalo Bus Tab → Trip Details

Premium bus trip details submission flow.

```mermaid
flowchart TD
  ev_chaloBusPageRendered["chalo bus page rendered"]
  ev_chaloBusPageRendered --> ev_pbLandingRouteClicked["pb landing route clicked"]
  ev_pbLandingRouteClicked --> ev_pbPreferredTimeBottomsheetOpened["pb preferred time bottomsheet opened"]
  ev_pbPreferredTimeBottomsheetOpened --> ev_pbTripDetailsSubmitted["pb trip details submitted"]
  ev_pbTripDetailsSubmitted --> ev_pbTripDetailsScreenShown["pb trip details screen shown"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_chaloBusPageRendered,ev_pbLandingRouteClicked,ev_pbPreferredTimeBottomsheetOpened,ev_pbTripDetailsSubmitted,ev_pbTripDetailsScreenShown event;
```
