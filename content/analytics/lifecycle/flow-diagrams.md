# App Lifecycle analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

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

## App Launch & Session Flow

```mermaid
flowchart TD
  ui_appStarts([App starts]) --> ev_appOpen["app open"]
  ev_appOpen --> ev_firstScreenOpen["first screen open"]

  ev_appOpen -->|No cached version| ev_freshInstall["chalo app updated or installed"]
  ev_appOpen -->|Version changed| ev_appUpdated["chalo app updated"]

  ev_appOpen -->|ChaloTime available| ev_chaloTimeAvailable["chaloTime available"]
  ev_appOpen -->|ChaloTime failed| ev_chaloTimeNotAvailable["chaloTime not available"]

  ev_firstScreenOpen --> ui_splashChecks([Splash screen checks])

  ui_splashChecks -->|Language not selected| ext_language[Language selection flow]
  ui_splashChecks -->|Not logged in| ext_login[Login flow]
  ui_splashChecks -->|DPDPA consent required| ext_consent[User consent flow]
  ui_splashChecks -->|City not selected| ext_citySelection[City selection flow]
  ui_splashChecks -->|Rooted device detected| ev_rootDetected["root detected"]
  ui_splashChecks -->|City discontinued| ui_cityDiscontinued([City discontinued screen])
  ui_splashChecks -->|Migration required| ui_appMigration([App migration screen])
  ui_splashChecks -->|Ready for home| ui_homeNavigation([Navigate to home])

  ev_rootDetected --> ui_exit([App exits])

  ui_homeNavigation --> ev_newHomeRendered["new home screen rendered"]
  ui_homeNavigation --> ev_tabHomeRendered["tab based homescreen rendered"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_appOpen,ev_firstScreenOpen,ev_freshInstall,ev_appUpdated,ev_chaloTimeAvailable,ev_chaloTimeNotAvailable,ev_rootDetected,ev_newHomeRendered,ev_tabHomeRendered event;
  class ui_appStarts,ui_splashChecks,ui_exit,ui_homeNavigation,ui_cityDiscontinued,ui_appMigration ui;
  class ext_language,ext_login,ext_consent,ext_citySelection external;

  %%chalo:diagram-link ext_login -> flow:authentication
  %%chalo:diagram-link ext_language -> flow:onboarding title:Funnel: Language Selection
  %%chalo:diagram-link ext_citySelection -> flow:onboarding title:Funnel: City Selection (New Flow) - Device Location Path
  %%chalo:diagram-link ext_consent -> flow:onboarding
```

## AB Experiment Exposure (Dynamic Event Name Family)

These events are emitted as a dynamic event-name family: the exact event name is `Exp: ` + the experiment name.

```mermaid
flowchart TD
  ui_experiment([Experiment evaluated / user assigned]) --> ev_exp["Exp: {experimentName}"]
  ev_exp --> ui_properties([Properties: experimentId, variant])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_exp event;
  class ui_experiment,ui_properties ui;
```

## Force Update Flow

```mermaid
flowchart TD
  ui_updateCheck([App update check]) --> ui_updateRequired{Update required?}

  ui_updateRequired -->|Force update| ev_screenShownForce["app update screen shown"]
  ui_updateRequired -->|Recommended update| ev_screenShownRec["app update screen shown"]
  ui_updateRequired -->|No update needed| ui_proceedToApp([Proceed to app])

  ev_screenShownForce --> ui_forceUpdateScreen([Force update screen<br/>no dismiss option])
  ev_screenShownRec --> ui_recUpdateScreen([Recommended update screen<br/>with Remind Later])

  ui_forceUpdateScreen -->|Update button clicked| ev_updateBtnClicked["app update button clicked"]
  ui_recUpdateScreen -->|Update button clicked| ev_updateBtnClicked
  ui_recUpdateScreen -->|Remind Later clicked| ev_updatePostponed["app update postponed"]

  ui_forceUpdateScreen -->|Back pressed| ev_backPressed["force app update back pressed"]
  ui_recUpdateScreen -->|Back pressed| ev_backPressed

  ev_updateBtnClicked -->|Store launch success| ui_playStore([Play Store opens])
  ev_updateBtnClicked -->|Store launch failed| ev_launchFailed["force app update failed to launch store app"]

  ev_updatePostponed --> ui_dismiss([Dialog dismissed])
  ev_backPressed -->|isForceUpdate=false| ui_dismiss
  ev_backPressed -->|isForceUpdate=true| ui_forceUpdateScreen

  ev_launchFailed --> ui_errorToast([Error toast shown])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_screenShownForce,ev_screenShownRec,ev_updateBtnClicked,ev_updatePostponed,ev_backPressed,ev_launchFailed event;
  class ui_updateCheck,ui_updateRequired,ui_forceUpdateScreen,ui_recUpdateScreen,ui_proceedToApp,ui_playStore,ui_dismiss,ui_errorToast ui;
```

## Boost Ratings Flow (In-App Rating)

```mermaid
flowchart TD
  ui_homeLoaded([Home screen loaded]) --> ui_loyaltyCheck{Loyal user check}

  ui_loyaltyCheck -->|Not loyal or already asked or reminder pending| ui_noRatings([No ratings shown])
  ui_loyaltyCheck -->|Session threshold met OR transaction threshold met| ev_bottomSheetRendered["boost ratings BottomSheet rendered"]

  ev_bottomSheetRendered --> ui_bottomSheet([Boost ratings bottom sheet])

  ui_bottomSheet -->|Rate button clicked| ev_rateClicked["boost ratings rate button clicked"]
  ui_bottomSheet -->|Remind Later clicked| ev_remindLaterClicked["boost ratings remind later clicked"]

  ev_rateClicked --> ui_inAppRatingCheck{In-app rating enabled?}

  ui_inAppRatingCheck -->|Disabled via config| ev_ratingsTurnedOff["in app ratings turned off"]
  ui_inAppRatingCheck -->|Enabled| ui_requestReview([Request review flow])

  ui_requestReview -->|Review API success| ev_ratingsOpened["in app ratings opened successfully"]
  ui_requestReview -->|Review API failed| ev_ratingsFailed["in app ratings failed"]
  ui_requestReview -->|Rating manager not setup| ev_ratingMgrNotSetup["AppRatingProcessManager not setup"]

  ev_ratingsTurnedOff --> ev_redirectToPlayStore["redirected to play store"]
  ev_ratingsFailed --> ev_redirectToPlayStore
  ev_ratingMgrNotSetup --> ev_redirectToPlayStore

  ev_ratingsOpened --> ui_inAppDialog([In-app review dialog shown])
  ev_redirectToPlayStore --> ui_playStore{Play Store opens?}
  ui_playStore -->|Success| ui_playStoreOk([Play Store opens])
  ui_playStore -->|Failed| ev_playStoreOpenFailed["app play store open failed"]

  ev_remindLaterClicked --> ui_reminderSet([Reminder timestamp set])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_bottomSheetRendered,ev_rateClicked,ev_remindLaterClicked,ev_ratingsTurnedOff,ev_ratingsOpened,ev_ratingsFailed,ev_ratingMgrNotSetup,ev_redirectToPlayStore,ev_playStoreOpenFailed event;
  class ui_homeLoaded,ui_loyaltyCheck,ui_noRatings,ui_bottomSheet,ui_inAppRatingCheck,ui_requestReview,ui_inAppDialog,ui_playStore,ui_playStoreOk,ui_reminderSet ui;
```

## City Discontinued Flow

```mermaid
flowchart TD
  ui_splashCheck([Splash screen checks]) --> ui_cityCheck{City discontinued?}

  ui_cityCheck -->|Not discontinued| ui_proceedHome([Proceed to home])
  ui_cityCheck -->|Discontinued| ev_cityDiscontinuedShown["city discontinued screen displayed"]

  ev_cityDiscontinuedShown --> ui_cityDiscontinuedScreen([City discontinued screen])

  ui_cityDiscontinuedScreen -->|Change City clicked| ev_changeCityClicked["city discontinued change city clicked"]

  ev_changeCityClicked --> ext_citySelection[City selection flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_cityDiscontinuedShown,ev_changeCityClicked event;
  class ui_splashCheck,ui_cityCheck,ui_proceedHome,ui_cityDiscontinuedScreen ui;
  class ext_citySelection external;
```

## App Migration Flow

```mermaid
flowchart TD
  ui_splashCheck([Splash screen checks]) --> ui_migrationCheck{Migration required?}

  ui_migrationCheck -->|Not required| ui_proceedHome([Proceed to home])
  ui_migrationCheck -->|Required| ev_migrationScreenOpened["app migration screen opened"]

  ev_migrationScreenOpened --> ui_migrationScreen([App migration screen])

  ui_migrationScreen --> ev_migrationKvToDb["app migration kv to db result"]
  ui_migrationScreen --> ui_historyCall([History sync API call])

  ui_historyCall -->|Success| ev_historyCallSuccess["app migration history call success"]
  ui_historyCall -->|Failed| ev_historyCallFailed["app migration history call failed"]

  ev_historyCallSuccess --> ui_proceedHome

  ev_historyCallFailed --> ui_retryOption([Retry option shown])
  ui_retryOption -->|Retry clicked| ev_retryClicked["app migration retry clicked"]

  ev_retryClicked --> ui_historyCall

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_migrationScreenOpened,ev_migrationKvToDb,ev_historyCallSuccess,ev_historyCallFailed,ev_retryClicked event;
  class ui_splashCheck,ui_migrationCheck,ui_proceedHome,ui_migrationScreen,ui_historyCall,ui_retryOption ui;
```

## Terms & Conditions Flow

```mermaid
flowchart TD
  ui_trigger([Terms dialog trigger]) --> ev_termsOpen["terms and conditions open"]

  ev_termsOpen --> ui_termsDialog([Terms and conditions dialog])

  ui_termsDialog -->|Accept clicked| ev_termsAccept["terms accept"]
  ui_termsDialog -->|Cancel/dismiss| ev_termsCancel["terms cancel"]
  ui_termsDialog -->|Terms link clicked| ev_termsClicked["terms and conditions clicked"]

  ev_termsAccept --> ui_proceed([Proceed with flow])
  ev_termsCancel --> ui_dismiss([Dialog dismissed])
  ev_termsClicked --> ui_termsDocument([Terms document/page opens])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_termsOpen,ev_termsAccept,ev_termsCancel,ev_termsClicked event;
  class ui_trigger,ui_termsDialog,ui_proceed,ui_dismiss,ui_termsDocument ui;
```

## App Sharing Flow

```mermaid
flowchart TD
  ui_shareAction([User initiates app sharing]) --> ev_invite["invite"]

  ev_invite --> ui_shareSheet([System share sheet opens])

  ui_shareSheet --> ui_shareTo([User shares to platform/contact])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_invite event;
  class ui_shareAction,ui_shareSheet,ui_shareTo ui;
```

## Funnel Recommendations

### App Launch Funnel
Track app initialization and first screen rendering:
```
app open → first screen open → [new home screen rendered OR language selection OR login options]
```
This helps measure:
- App initialization success rate
- Percentage of users reaching home vs needing onboarding

### Force Update Funnel (Blocking)
Track forced update completion:
```
app update screen shown (isForceUpdate=true) → app update button clicked → [Play Store launch]
```
Drop-off analysis:
- Users who see force update but don't click update
- Store launch failures

### Recommended Update Funnel
Track update adoption rate:
```
app update screen shown (isForceUpdate=false) → [app update button clicked OR app update postponed]
```
Metrics:
- Update acceptance rate
- Postponement rate

### Boost Ratings Funnel
Track rating prompt effectiveness:
```
boost ratings BottomSheet rendered → [boost ratings rate button clicked OR boost ratings remind later clicked]
→ [in app ratings opened successfully OR redirected to play store]
```
Conversion metrics:
- Prompt → Rate button click rate
- Rate button → Successful in-app rating rate
- Remind later usage rate

### App Migration Funnel
Track migration success:
```
app migration screen opened → [app migration history call success OR app migration history call failed]
→ [app migration retry clicked if failed]
```
Critical metrics:
- First-attempt success rate
- Retry success rate
- Total migration completion rate

### City Discontinued Funnel
Track city change flow:
```
city discontinued screen displayed → city discontinued change city clicked → [city selection flow]
```

### Terms Acceptance Funnel
Track terms acceptance:
```
terms and conditions open → [terms accept OR terms cancel]
```
Acceptance rate metric
