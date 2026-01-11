# Super Pass purchase analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- `confirm payment screen open` is **not emitted** in flows where verification is required (unless it’s the post‑verification payment or renew flow). Don’t use it as a universal funnel start.
- The actual payment processing UI lives in the Checkout module; this doc only shows the super pass purchase side of the instrumentation.

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

## Pre-entry: Product Selection → Pass Selection → Book Pass

This funnel helps PMs build “selection → purchase” funnels (everything before `superPassPurchaseActivity open`).

```mermaid
flowchart TD
  %%chalo:diagram-link ev_purchaseActivityOpen -> title:Entry → start destination (what funnel should branch on)
  ui_productSelection([Product selection]) --> ev_productSelectionOpen["product selection activity open"]
  ev_productSelectionOpen --> ev_configFetched["configuration fetched"]

  ev_productSelectionOpen --> ev_recentSuperPass["recent product super pass clicked"]
  ev_recentSuperPass --> ev_purchaseActivityOpen["superPassPurchaseActivity open"]

  ev_configFetched --> ev_productSelected["product selected"]
  ev_productSelected --> ui_passSelection([Pass selection])
  ui_passSelection --> ev_passSelectionOpen["pass selection screen opened"]
  ui_passSelection --> ev_bookPass["book pass screen opened"]

  ev_passSelectionOpen -->|if sub-category flow| ev_subCategoryOpen["subCategory selection screen opened"]
  ev_subCategoryOpen --> ev_subCategorySelected["subCategory selected"]

  ev_passSelectionOpen -->|category tab change| ev_categorySelected["category selected"]
  ev_subCategorySelected --> ev_categorySelected
  ev_categorySelected --> ev_pageSelected["page selected"]
  ev_pageSelected --> ev_duration["duration selection"]
  ev_duration --> ev_passDetails["pass details selected"]

  ev_passDetails --> ev_purchaseActivityOpen

  ev_recentSuperPass -->|renew blocked| ev_renewError["renew error dialog shown"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_productSelectionOpen,ev_configFetched,ev_recentSuperPass,ev_productSelected,ev_passSelectionOpen,ev_bookPass,ev_subCategoryOpen,ev_subCategorySelected,ev_categorySelected,ev_pageSelected,ev_duration,ev_passDetails,ev_purchaseActivityOpen,ev_renewError event;
  class ui_productSelection,ui_passSelection ui;
```

## Entry → start destination (what funnel should branch on)
Use `superPassPurchase startDestination assigned` and its `start destination` property to decide which funnel applies.

```mermaid
flowchart TD
  %%chalo:diagram-link ui_confirmationBranch -> title:Funnel: confirmation → order creation → success (no verification required)
  %%chalo:diagram-link ui_userDetailsBranch -> title:Funnel: proof submission → verification status (verification required)
  %%chalo:diagram-link ui_passengerSelectionBranch -> title:Funnel: smart passenger selection (optional entry path)
  %%chalo:diagram-link ui_proofsOverviewBranch -> title:Proof upload instrumentation (granular funnel)
  ui_boot([Shared view model boots]) --> ev_activityOpen["superPassPurchaseActivity open"]
  ev_activityOpen --> ev_startDestinationAssigned["superPassPurchase startDestination assigned"]

  ev_startDestinationAssigned -->|start destination = confirmation screen| ui_confirmationBranch([Confirmation funnel])
  ev_startDestinationAssigned -->|start destination = basicUserDetails screen| ui_userDetailsBranch([User details funnel])
  ev_startDestinationAssigned -->|start destination = smartPassengerSelection screen| ui_passengerSelectionBranch([Passenger selection funnel])
  ev_startDestinationAssigned -->|start destination = userProofsOverview screen| ui_proofsOverviewBranch([Proofs overview funnel])

  ev_startDestinationAssigned -->|no agency| ev_noAgency["agency not available for purchase"]
  ui_anyScreen([Any screen in this flow]) -->|help icon| ev_reportProblem["report problem clicked v2"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_activityOpen,ev_startDestinationAssigned,ev_noAgency,ev_reportProblem event;
  class ui_boot,ui_confirmationBranch,ui_userDetailsBranch,ui_passengerSelectionBranch,ui_proofsOverviewBranch,ui_anyScreen ui;
```

## Funnel: confirmation → order creation → success (no verification required)
```mermaid
flowchart TD
  %%chalo:diagram-link ui_confirmation -> title:Confirmation screen side-paths (optional instrumentation)
  ui_confirmation([Confirmation screen]) --> ev_confirmPaymentOpen["confirm payment screen open"]
  ev_confirmPaymentOpen --> ev_confirmPayClicked["mPass confirm purchase pay btn clicked"]
  ev_confirmPayClicked --> ev_makePaymentClicked["make payment clicked"]

  ev_makePaymentClicked --> ev_orderCreated["mPass order created"]
  ev_makePaymentClicked --> ev_orderCreateFailed["mPass order creation failed"]

  ev_orderCreated --> external_checkout[Checkout flow]
  external_checkout --> ev_bookingSuccessOpen["booking success screen open"]

  ev_bookingSuccessOpen --> ev_bookingSuccessUseNow["booking success use now clicked"]
  ev_bookingSuccessOpen --> ev_bookingSuccessUseLater["booking success use later clicked"]
  ev_bookingSuccessOpen --> ev_bookingSuccessViewDetails["booking success view booking details clicked"]
  ev_bookingSuccessOpen --> ev_bookingSuccessBack["booking success back btn clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_confirmPaymentOpen,ev_confirmPayClicked,ev_makePaymentClicked,ev_orderCreated,ev_orderCreateFailed,ev_bookingSuccessOpen,ev_bookingSuccessUseNow,ev_bookingSuccessUseLater,ev_bookingSuccessViewDetails,ev_bookingSuccessBack event;
  class ui_confirmation ui;
  class external_checkout external;
```

## Funnel: proof submission → verification status (verification required)
```mermaid
flowchart TD
  %%chalo:diagram-link ev_proofsOverviewOpen -> title:Proof upload instrumentation (granular funnel)
  %%chalo:diagram-link ui_confirmationVerification -> title:Confirmation screen side-paths (optional instrumentation)
  ui_userDetails([User details, if required]) --> ev_basicUserDetailsOpen["basic user details screen open"]
  ui_userDetails --> ev_nameOpen["superPass enter user name screen open"]
  ev_basicUserDetailsOpen --> ev_basicNext["basic user details next clicked"]
  ev_nameOpen --> ev_nameNext["superPass enter user name next clicked"]
  ev_basicNext --> ev_proofsOverviewOpen["proofs overview screen open"]
  ev_nameNext --> ev_proofsOverviewOpen

  ev_proofsOverviewOpen --> ev_proofsNext["userProofsOverview next clicked"]
  ev_proofsNext --> ui_confirmationVerification([Confirmation screen, verification required])
  ui_confirmationVerification --> ev_proofSubmitClicked["mPass proof submit button clicked"]
  ev_proofSubmitClicked --> ev_submitOk["application submit success"]
  ev_proofSubmitClicked --> ev_submitFail["application submit failure"]

  ev_submitOk --> ev_verificationStatusOpen["mPass verification status activity open"]
  ev_verificationStatusOpen --> ev_statusViewDetails["mPass verification status view details clicked"]
  ev_verificationStatusOpen --> ev_statusOk["mPass verification status ok clicked"]
  ev_verificationStatusOpen --> ev_statusBack["superPass verification status back btn clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_basicUserDetailsOpen,ev_nameOpen,ev_basicNext,ev_nameNext,ev_proofsOverviewOpen,ev_proofsNext,ev_proofSubmitClicked,ev_submitOk,ev_submitFail,ev_verificationStatusOpen,ev_statusViewDetails,ev_statusOk,ev_statusBack event;
  class ui_userDetails,ui_confirmationVerification ui;
```

## Funnel: smart passenger selection (optional entry path)
```mermaid
flowchart TD
  %%chalo:diagram-link ui_userDetails -> title:Funnel: proof submission → verification status (verification required)
  ui_passengerSelection([Passenger selection screen]) --> ev_smartSelectionOpen["smart passenger selection screen open"]
  ev_smartSelectionOpen --> ev_newPassengerSelected["smartPassengerSelection screen new passenger selected"]
  ev_smartSelectionOpen --> ev_existingPassengerSelected["smartPassengerSelection screen passenger selected"]
  ev_newPassengerSelected --> ui_userDetails([User details, if required])
  ev_existingPassengerSelected --> ui_userDetails

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_smartSelectionOpen,ev_newPassengerSelected,ev_existingPassengerSelected event;
  class ui_passengerSelection,ui_userDetails ui;
```

## Proof upload instrumentation (granular funnel)
```mermaid
flowchart TD
  ev_proofsOverviewOpen["proofs overview screen open"] --> ev_addPhotoClicked["add photo btn clicked"]
  ev_proofsOverviewOpen -->|overview| ev_downloadSampleFormClicked["download sample form clicked"]

  ev_addPhotoClicked --> ui_proofUpload([Proof upload screen])
  ui_proofUpload --> ev_sampleZoomed["sample proof image zoomed"]
  ui_proofUpload --> ev_uploadProofClicked["upload proof button clicked"]
  ev_uploadProofClicked --> ev_permissionRequested["camera permission requested"]
  ev_permissionRequested --> ev_photoChooser["photo chooser launched"]
  ui_proofUpload --> ev_watchTutorial["watch tutorial video clicked"]

  ev_proofsOverviewOpen -->|overview| ev_permissionDeniedDialog["camera permission denied dialog displayed"]
  ev_uploadProofClicked -->|permission denied| ev_permissionDeniedDialog

  ev_proofsOverviewOpen --> ev_uploadedZoomed["uploaded proof zoomed"]
  ev_proofsOverviewOpen --> ev_cancelUpload["cancel proof image upload clicked"]
  ev_proofsOverviewOpen --> ev_editUploaded["edit uploaded proof image clicked"]
  ev_proofsOverviewOpen --> ev_guidelines["proof guidelines btn clicked"]
  ev_proofsOverviewOpen --> ev_reapply["userProofsOverview reapply clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_proofsOverviewOpen,ev_addPhotoClicked,ev_downloadSampleFormClicked,ev_sampleZoomed,ev_uploadProofClicked,ev_permissionRequested,ev_photoChooser,ev_watchTutorial,ev_permissionDeniedDialog,ev_uploadedZoomed,ev_cancelUpload,ev_editUploaded,ev_guidelines,ev_reapply event;
  class ui_proofUpload ui;
```

## Confirmation screen side-paths (optional instrumentation)
```mermaid
flowchart TD
  ui_confirmation([Confirmation screen]) --> ev_changeStartDate["change pass start date clicked"]
  ev_changeStartDate --> ev_startDateCta["pass start date change CTA clicked"]

  ui_confirmation --> ev_offerShown["offer availed bottom sheet shown"]
  ev_offerShown --> ev_explorePlans["explore available plans clicked"]

  ui_confirmation --> ev_cashSelected["mPass cash payment option selected"]
  ev_cashSelected --> ev_cashWeb["open super pass cash payment web page"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_changeStartDate,ev_startDateCta,ev_offerShown,ev_explorePlans,ev_cashSelected,ev_cashWeb event;
  class ui_confirmation ui;
```

## Post-purchase: Fetch, Receipt Payload, Trip Receipt History

```mermaid
flowchart TD
  ui_postPurchase([Post purchase background work]) --> ev_superPassFetched["super pass fetched"]

  ui_receiptPayload([Receipt payload emitted]) --> ev_payload["superPass receipt payload"]

  ui_tripReceiptHistory([Trip receipt history fetch]) --> ui_tripReceiptResult{Result}
  ui_tripReceiptResult -->|Success| ev_historyOk["superPass trip receipt history fetched"]
  ui_tripReceiptResult -->|Failure| ev_historyFail["superPass trip receipt history fetch failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_superPassFetched,ev_payload,ev_historyOk,ev_historyFail event;
  class ui_postPurchase,ui_receiptPayload,ui_tripReceiptHistory,ui_tripReceiptResult ui;
```

## Post-purchase: Activation Timestamp & Sync Reliability

```mermaid
flowchart TD
  ui_sync([Activation sync attempt]) --> ui_syncResult{Sync result}

  ui_syncResult -->|Success| ev_syncSuperPass["sync superPass activation timeStamp with backend"]
  ui_syncResult -->|Success (mTicket)| ev_syncMTicket["sync mTicket activation timeStamp with backend"]
  ui_syncResult -->|Failure| ev_syncFailed["product activation sync failed"]
  ui_syncResult -->|Exception| ev_syncException["product activation sync exception occurred"]
  ui_syncResult -->|Punch sync failure| ev_punchSyncFail["product activation pass punch sync failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_syncSuperPass,ev_syncMTicket,ev_syncFailed,ev_syncException,ev_punchSyncFail event;
  class ui_sync,ui_syncResult ui;
```
