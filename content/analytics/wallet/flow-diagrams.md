# Wallet flow analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- Wallet flow has multiple entry points: direct wallet access, Quick Pay from various screens, and ChaloPayV3 integration.
- Background wallet sync happens independently to keep balance updated.
- KYC flows can be triggered from wallet access checks.

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

## Funnel: Wallet Entry Points (access wallet)

```mermaid
flowchart TD
  ui_homeScreen([Home screen / Menu]) --> ev_chaloWalletClicked["chalo wallet clicked"]
  ui_homeScreen --> ev_walletIconMenuClicked["wallet icon menu clicked"]

  ev_chaloWalletClicked --> ui_onboardingCheck{First time?}
  ev_walletIconMenuClicked --> ui_onboardingCheck

  ui_onboardingCheck -->|Yes| ev_onboardingShown["wallet onBoarding bottom sheet positive button clicked"]
  ui_onboardingCheck -->|No| ev_balanceOpen["wallet balance fragment opened"]

  ev_onboardingShown --> ev_balanceOpen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_chaloWalletClicked,ev_walletIconMenuClicked,ev_onboardingShown,ev_balanceOpen event;
  class ui_homeScreen,ui_onboardingCheck ui;
```

## Entry → Wallet Balance View (main entry point)

```mermaid
flowchart TD
  ui_entry([Wallet opened]) --> ev_balanceOpen["wallet balance fragment opened"]
  ev_balanceOpen --> ev_bannerRendered["wallet banner rendered"]

  ev_balanceOpen --> ev_addMoneyClicked["wallet balance add money clicked"]
  ev_balanceOpen --> ev_seeAllClicked["wallet balance see all transaction clicked"]
  ev_balanceOpen --> ev_transactionClicked["wallet all transaction event clicked"]

  ev_bannerRendered --> ev_bannerClicked["wallet banner clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_balanceOpen,ev_bannerRendered,ev_bannerClicked,ev_addMoneyClicked,ev_seeAllClicked,ev_transactionClicked event;
  class ui_entry ui;
```

## Funnel: Load Money (wallet recharge flow)

```mermaid
flowchart TD
  ev_addMoneyClicked["wallet balance add money clicked"] --> ev_loadBalanceOpen["wallet load balance enter amount fragment opened"]

  ev_loadBalanceOpen --> ev_bannerRendered2["wallet banner rendered"]
  ev_loadBalanceOpen --> ev_suggestedAmountClicked["wallet suggested amount clicked"]

  ev_suggestedAmountClicked --> ev_nextClicked["wallet load balance fragment next button clicked"]

  ev_nextClicked --> ev_orderSuccess["load money wallet recharge order success"]
  ev_nextClicked --> ev_orderFailed["load money wallet recharge order failed"]

  ev_orderSuccess --> ext_checkout[Checkout payment flow]
  ext_checkout --> ev_syncFailed["load money wallet sync failed"]
  ext_checkout --> ev_successContinue["wallet amount added continue clicked event"]

  ev_successContinue --> ui_success([Return to wallet])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_addMoneyClicked,ev_loadBalanceOpen,ev_bannerRendered2,ev_suggestedAmountClicked,ev_nextClicked,ev_orderSuccess,ev_orderFailed,ev_syncFailed,ev_successContinue event;
  class ui_success ui;
  class ext_checkout external;
```

## Funnel: Transaction History View

```mermaid
flowchart TD
  ev_seeAllClicked["wallet balance see all transaction clicked"] --> ev_allTransactionsOpen["wallet all transaction fragment opened"]

  ui_balanceScreen([Wallet balance screen]) --> ev_transactionClicked1["wallet all transaction event clicked"]
  ev_allTransactionsOpen --> ev_transactionClicked2["wallet all transaction event clicked"]

  ev_transactionClicked1 --> ev_summaryOpen["wallet transaction summary fragment opened"]
  ev_transactionClicked2 --> ev_summaryOpen

  ev_summaryOpen --> ev_summaryDataFetched["wallet transaction summary ui model data fetched"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_seeAllClicked,ev_allTransactionsOpen,ev_transactionClicked1,ev_transactionClicked2,ev_summaryOpen,ev_summaryDataFetched event;
  class ui_balanceScreen ui;
```

## Funnel: Wallet Access & KYC

```mermaid
flowchart TD
  ui_accessCheck([Wallet access check]) --> ev_processStatus["process wallet access status"]

  ev_processStatus -->|Status: REQUIRES_KYC| ev_bottomSheetOpen["wallet access bottom sheet opened"]
  ev_processStatus -->|Status: BLOCKED| ev_blockedKnowMore["wallet blocked know more clicked"]
  ev_processStatus -->|Status: ACTIVE| ui_walletActive([Wallet active - allow operations])

  ev_bottomSheetOpen --> ev_activateClicked["activate wallet clicked"]
  ev_bottomSheetOpen --> ev_loadMoneyClicked["wallet load money clicked"]
  ev_bottomSheetOpen --> ev_refreshClicked["refresh wallet clicked"]
  ev_bottomSheetOpen --> ev_fullKycKnowMore["full kyc know more clicked"]

  ev_activateClicked --> ui_minKycFlow([Minimum KYC flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_processStatus,ev_bottomSheetOpen,ev_activateClicked,ev_loadMoneyClicked,ev_refreshClicked,ev_blockedKnowMore,ev_fullKycKnowMore event;
  class ui_accessCheck,ui_walletActive,ui_minKycFlow ui;
```

## Funnel: Minimum KYC Flow

```mermaid
flowchart TD
  ui_kycStart([KYC required - start flow]) --> ev_detailsOpen["min kyc detail opened"]

  ev_detailsOpen --> ev_proceedClicked["min kyc detail proceed button clicked"]
  ev_proceedClicked --> ev_nameEntered["min kyc detail name entered"]
  ev_nameEntered --> ev_radioClicked["min kyc detail radio button clicked"]
  ev_radioClicked --> ev_nextClicked["min kyc detail next button clicked"]

  ev_nextClicked --> ev_otpOpen["min kyc otp fragment opened"]
  ev_nextClicked --> ev_userRegisteredShown["min kyc user registered bottom sheet opened"]

  ev_otpOpen --> ev_otpResend["min kyc otp resend sms clicked"]
  ev_otpOpen --> ev_otpProceed["min kyc otp proceed button clicked"]

  ev_otpProceed --> ev_otpSuccess["min kyc otp success"]
  ev_otpProceed --> ev_otpFailure["min kyc otp failure"]

  ev_otpSuccess --> ui_activated([Wallet activated])
  ev_otpSuccess --> ev_activationFailed["min kyc activation failed"]

  ev_otpFailure --> ev_errorShown["min kyc error bottom sheet opened"]
  ev_activationFailed --> ev_errorShown

  ev_errorShown --> ev_errorCtaClicked["min kyc error bottom sheet cta clicked"]
  ev_errorCtaClicked --> ev_detailsOpen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_detailsOpen,ev_proceedClicked,ev_nameEntered,ev_radioClicked,ev_nextClicked,ev_otpOpen,ev_otpResend,ev_otpProceed,ev_otpSuccess,ev_otpFailure,ev_activationFailed,ev_errorShown,ev_errorCtaClicked,ev_userRegisteredShown event;
  class ui_kycStart,ui_activated ui;
```

## Funnel: Pay For Ticket → Find Fare

```mermaid
flowchart TD
  ui_payForTicket([Pay For Ticket screen]) --> ev_findFareCardClicked["find fare card clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_findFareCardClicked event;
  class ui_payForTicket ui;
```

## Funnel: Quick Pay (ChaloPayV2) - Complete flow

```mermaid
flowchart TD
  ui_quickPayEntry([Quick Pay entry point]) --> ev_tripAmountOpen["chalo pay trip amount fragment opened"]

  ev_tripAmountOpen --> ev_historyClicked["chalo pay trip amount fragment chalo pay history clicked"]
  ev_tripAmountOpen --> ev_tripNextClicked["chalo pay trip amount fragment next button clicked"]
  ev_tripNextClicked --> ev_tripNextFailed["chalo pay trip amount fragment next button clicked failure"]

  ev_tripNextClicked --> ev_bottomSheetOpen["chalo pay bottom sheet fragment opened"]

  ev_bottomSheetOpen --> ev_rechargeClicked["chalo pay bottom sheet recharge button clicked"]
  ev_bottomSheetOpen --> ev_bottomSheetNextClicked["chalo pay bottom sheet fragment next button clicked"]

  ev_bottomSheetNextClicked --> ev_prerequisitesFailed["chalo pay prerequisites failed"]
  ev_bottomSheetNextClicked --> ev_orderCreated["chalo pay order created"]

  ev_orderCreated --> ev_summaryOpen["chalo pay summary screen opened"]

  ev_summaryOpen --> ev_cardClicked["chalo pay card clicked"]
  ev_summaryOpen --> ev_ticketClicked["chalo pay ticket clicked"]

  ev_ticketClicked --> ev_ticketPunched["chalo pay ticket punched"]
  ev_ticketPunched --> ev_punchReceived["chalo pay punch received"]

  ev_summaryOpen --> ev_viewReceiptClicked["chalo pay view receipt clicked"]
  ev_viewReceiptClicked --> ev_receiptShown["chalo pay receipt shown"]
  ev_receiptShown --> ev_receiptOpened["chalo pay receipt opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_tripAmountOpen,ev_historyClicked,ev_tripNextClicked,ev_tripNextFailed,ev_bottomSheetOpen,ev_rechargeClicked,ev_bottomSheetNextClicked,ev_prerequisitesFailed,ev_orderCreated,ev_summaryOpen,ev_cardClicked,ev_ticketClicked,ev_ticketPunched,ev_punchReceived,ev_viewReceiptClicked,ev_receiptShown,ev_receiptOpened event;
  class ui_quickPayEntry ui;
```

## Funnel: ChaloPayV3 (alternative entry point)

```mermaid
flowchart TD
  ui_chaloPayV3Entry([ChaloPayV3 UI]) --> ev_itemRendered["chaloPayItemRendered"]

  ev_itemRendered --> ev_itemClicked["chaloPayItemClicked"]

  ev_itemClicked --> ev_bottomsheetOpened["chaloPayBottomsheetOpened"]

  ev_bottomsheetOpened --> ev_tncClicked["chaloPayBottomsheetTncClicked"]
  ev_bottomsheetOpened --> ev_rechargeClicked["chaloPayBottomsheetRechargeClicked"]
  ev_bottomsheetOpened --> ev_confirmPaymentClicked["chaloPayBottomsheetConfirmPaymentClicked"]

  ev_confirmPaymentClicked --> ev_orderSuccess["chaloPayOrderCreationSuccess"]
  ev_confirmPaymentClicked --> ev_orderFailed["chaloPayOrderCreationFailed"]

  ev_orderSuccess --> ev_paymentSuccess["chaloPayPaymentSuccess"]
  ev_orderSuccess --> ev_paymentFailed["chaloPayPaymentFailed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_itemRendered,ev_itemClicked,ev_bottomsheetOpened,ev_tncClicked,ev_rechargeClicked,ev_confirmPaymentClicked,ev_orderSuccess,ev_orderFailed,ev_paymentSuccess,ev_paymentFailed event;
  class ui_chaloPayV3Entry ui;
```

## Funnel: Wallet Migration (device change)

```mermaid
flowchart TD
  ui_migration([Wallet migration check]) --> ev_postDeviceId["post device id for wallet migration"]

  ev_postDeviceId -->|Success| ev_autoReclaim["auto reclaim for wallet migration"]
  ev_postDeviceId -->|Failed| ui_error([Migration error])

  ev_autoReclaim -->|Success| ui_migrated([Wallet migrated])
  ev_autoReclaim -->|Failed with error name| ui_reclaimError([Reclaim error])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_postDeviceId,ev_autoReclaim event;
  class ui_migration,ui_error,ui_migrated,ui_reclaimError ui;
```

## Background Sync (independent flow)

```mermaid
flowchart TD
  ui_backgroundTrigger([Background sync trigger]) --> ev_workerStarted["wallet sync worker started"]

  ev_workerStarted --> ev_workerResult["wallet sync worker result"]
  ev_workerResult --> ev_syncResult["wallet sync result"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_workerStarted,ev_workerResult,ev_syncResult event;
  class ui_backgroundTrigger ui;
```

## Key Funnel Recommendations

### Wallet Entry & Onboarding Funnel
```
chalo wallet clicked (or) wallet icon menu clicked
  → wallet onBoarding bottom sheet positive button clicked (first time users)
    → wallet balance fragment opened
```

### Core Wallet Usage Funnel
```
wallet balance fragment opened
  → wallet balance add money clicked (or) wallet all transaction event clicked
    → Load money funnel (or) Transaction view funnel
```

### Load Money Conversion Funnel (with success)
```
wallet load balance enter amount fragment opened [with kycDone property]
  → wallet suggested amount clicked
    → wallet load balance fragment next button clicked
      → load money wallet recharge order success
        → [Checkout payment flow]
          → wallet amount added continue clicked event
            → Return to wallet
```

### Quick Pay Ticket Purchase Funnel
```
chalo pay trip amount fragment opened
  → chalo pay trip amount fragment next button clicked
    → chalo pay bottom sheet fragment opened
      → chalo pay bottom sheet fragment next button clicked
        → chalo pay order created
          → chalo pay summary screen opened
            → chalo pay ticket clicked
              → chalo pay ticket punched
```

### Wallet Activation Funnel (with error handling)
```
process wallet access status [walletStatus = REQUIRES_KYC]
  → wallet access bottom sheet opened
    → activate wallet clicked
      → min kyc detail opened
        → min kyc detail next button clicked
          → min kyc otp fragment opened
            → min kyc otp proceed button clicked
              → min kyc otp success (or) min kyc otp failure
                → min kyc error bottom sheet opened (on failure)
                  → min kyc error bottom sheet cta clicked
                    → retry from min kyc detail opened
```

### Transaction Engagement Funnel
```
wallet balance fragment opened
  → wallet all transaction event clicked (or) wallet balance see all transaction clicked
    → wallet transaction summary fragment opened
      → wallet transaction summary ui model data fetched
```

## Property-Based Segmentation

Use these properties to segment funnels:

- **walletStatus** - Filter users by wallet state (ACTIVE, REQUIRES_KYC, BLOCKED, etc.)
- **kycDone** - Segment load money flow by KYC completion status
- **wallet balance transaction type** - Separate QUICK_PAY, LOAD_MONEY, CHALO_PAY transactions
- **wallet balance transaction status** - Track SUCCESS vs FAILED vs PROCESSING transactions
- **walletLoadAmount** - Analyze recharge amount distributions
- **wallet suggested amount** - Track which suggested denominations are most popular
- **is chalo wallet activated** - Binary segmentation for activated vs non-activated users
