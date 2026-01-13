# Chalo Wallet & Quick Pay (Chalo Pay) analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- This flow consolidates Wallet + Quick Pay (Chalo Pay) events across balance view, recharge, KYC, transactions, and bus fare validation.
- Quick Pay (Chalo Pay V2) is the standalone on-bus fare flow.
- Chalo Pay checkout (V3) is the payment method in checkout for other products.
- Validation events are shared with other products but tagged with `isChaloPay=true`.

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

## Funnel: Chalo Wallet overview (entry → balance → actions)

```mermaid
flowchart TD
  %%chalo:diagram-link ui_walletBalance -> title:Funnel: Wallet Balance View & Actions
  %%chalo:diagram-link ui_loadMoney -> title:Funnel: Load Money (wallet recharge flow)
  %%chalo:diagram-link ui_transactions -> title:Funnel: Transaction History View
  %%chalo:diagram-link ui_walletAccess -> title:Funnel: Wallet Access & KYC
  %%chalo:diagram-link ui_quickPay -> title:Funnel: Quick Pay (Chalo Pay V2) - purchase
  %%chalo:diagram-link ui_checkoutChaloPay -> title:Funnel: Chalo Pay checkout (payment method)
  %%chalo:diagram-link ui_migration -> title:Funnel: Wallet Migration (device change)
  %%chalo:diagram-link ui_backgroundSync -> title:Background Sync (independent flow)

  ui_entry([Wallet entry]) --> ev_balanceOpened["wallet balance fragment opened"]
  ui_entry --> ev_onboardingCta["wallet onBoarding bottom sheet positive button clicked"]
  ev_onboardingCta --> ev_balanceOpened

  ev_balanceOpened --> ui_walletBalance([Wallet balance view])
  ui_walletBalance --> ev_addMoneyClicked["wallet balance add money clicked"]
  ui_walletBalance --> ev_seeAllClicked["wallet balance see all transaction clicked"]
  ui_walletBalance --> ev_transactionClicked["wallet all transaction event clicked"]

  ev_addMoneyClicked --> ui_loadMoney([Load money flow])
  ev_seeAllClicked --> ui_transactions([Transaction history])
  ev_transactionClicked --> ui_transactions

  ui_walletBalance --> ui_walletAccess([Wallet access / KYC checks])
  ui_walletBalance --> ui_quickPay([Quick Pay purchase flow])
  ui_walletBalance --> ui_checkoutChaloPay([Chalo Pay checkout])
  ui_walletBalance --> ui_migration([Wallet migration])
  ui_walletBalance --> ui_backgroundSync([Background sync])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_balanceOpened,ev_onboardingCta,ev_addMoneyClicked,ev_seeAllClicked,ev_transactionClicked event;
  class ui_entry,ui_walletBalance,ui_loadMoney,ui_transactions,ui_walletAccess,ui_quickPay,ui_checkoutChaloPay,ui_migration,ui_backgroundSync ui;
```

## Funnel: Wallet Balance View & Actions

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

## Funnel: Wallet Onboarding (Profile → Wallet)

```mermaid
flowchart TD
  ui_profile([Profile screen]) --> ui_intro([ChaloPay intro bottom sheet])
  ui_intro --> ev_onboardingCta["wallet onBoarding bottom sheet positive button clicked"]
  ev_onboardingCta --> ev_balanceOpen["wallet balance fragment opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_onboardingCta,ev_balanceOpen event;
  class ui_profile,ui_intro ui;
```

## Funnel: Load Money (wallet recharge flow)

```mermaid
flowchart TD
  ev_addMoneyClicked["wallet balance add money clicked"] --> ev_loadBalanceOpen["wallet load balance enter amount fragment opened"]

  ev_loadBalanceOpen --> ev_bannerRendered2["wallet banner rendered"]
  ev_loadBalanceOpen --> ev_suggestedAmountClicked["wallet suggested amount clicked"]

  ev_suggestedAmountClicked --> ev_nextClicked["wallet load balance fragment next button clicked"]

  ev_nextClicked --> ev_syncFailed["load money wallet sync failed"]
  ev_nextClicked --> ev_orderSuccess["load money wallet recharge order success"]
  ev_nextClicked --> ev_orderFailed["load money wallet recharge order failed"]

  ev_orderSuccess --> ext_checkout[Checkout payment flow]
  ext_checkout --> ui_success([Return to wallet])

  %%chalo:diagram-link ext_checkout -> flow:payment

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_addMoneyClicked,ev_loadBalanceOpen,ev_bannerRendered2,ev_suggestedAmountClicked,ev_nextClicked,ev_syncFailed,ev_orderSuccess,ev_orderFailed event;
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
  %%chalo:diagram-link ui_minKycFlow -> title:Funnel: Minimum KYC Flow
  ui_accessCheck([Wallet access check]) --> ev_processStatus["process wallet access status"]

  ev_processStatus -->|Status: REQUIRES_KYC| ui_bottomSheet([Wallet access bottom sheet])
  ev_processStatus -->|Status: BLOCKED| ev_blockedKnowMore["wallet blocked know more clicked"]
  ev_processStatus -->|Status: ACTIVE| ui_walletActive([Wallet active - allow operations])

  ui_bottomSheet --> ev_activateClicked["activate wallet clicked"]
  ui_bottomSheet --> ev_loadMoneyClicked["wallet load money clicked"]
  ui_bottomSheet --> ev_refreshClicked["refresh wallet clicked"]
  ui_bottomSheet --> ev_fullKycKnowMore["full kyc know more clicked"]

  ev_activateClicked --> ui_minKycFlow([Minimum KYC flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_processStatus,ev_activateClicked,ev_loadMoneyClicked,ev_refreshClicked,ev_blockedKnowMore,ev_fullKycKnowMore event;
  class ui_accessCheck,ui_walletActive,ui_minKycFlow,ui_bottomSheet ui;
```

## Funnel: Minimum KYC Flow

```mermaid
flowchart TD
  ui_kycStart([KYC required - start flow]) --> ev_detailsOpen["min kyc detail opened"]

  ev_detailsOpen --> ev_proceedClicked["min kyc detail proceed button clicked"]
  ev_proceedClicked --> ev_otpOpen["min kyc otp fragment opened"]

  ev_otpOpen --> ev_otpResend["min kyc otp resend sms clicked"]
  ev_otpOpen --> ev_otpProceed["min kyc otp proceed button clicked"]
  ev_otpOpen --> ev_userRegisteredShown["min kyc user registered bottom sheet opened"]

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

  class ev_detailsOpen,ev_proceedClicked,ev_otpOpen,ev_otpResend,ev_otpProceed,ev_otpSuccess,ev_otpFailure,ev_activationFailed,ev_errorShown,ev_errorCtaClicked,ev_userRegisteredShown event;
  class ui_kycStart,ui_activated ui;
```

## Funnel: Quick Pay (Chalo Pay V2) - purchase

```mermaid
flowchart TD
  %%chalo:diagram-link ui_validation -> title:Funnel: Quick Pay validation screen (BLE/QR)
  ui_payForTicket([Pay For Ticket screen]) --> ev_payForTicketOpen["pay for ticket screen opened"]
  ev_payForTicketOpen --> ev_quickPayCardClicked["chalo pay card clicked"]
  ev_payForTicketOpen --> ev_findFareClicked["find fare card clicked"]

  ev_quickPayCardClicked --> ui_quickPayEntry([Quick Pay entry point])
  ui_quickPayEntry --> ev_tripAmountOpen["chalo pay trip amount fragment opened"]

  ev_tripAmountOpen --> ev_historyClicked["chalo pay trip amount fragment chalo pay history clicked"]
  ev_tripAmountOpen --> ev_tripNextClicked["chalo pay trip amount fragment next button clicked"]
  ev_tripNextClicked --> ev_tripNextFailed["chalo pay trip amount fragment next button clicked failure"]
  ev_tripNextClicked --> ev_prerequisitesFailed["chalo pay prerequisites failed"]

  ev_tripNextClicked --> ev_bottomSheetOpen["chalo pay bottom sheet fragment opened"]

  ev_bottomSheetOpen --> ev_rechargeClicked["chalo pay bottom sheet recharge button clicked"]
  ev_bottomSheetOpen --> ev_bottomSheetNextClicked["chalo pay bottom sheet fragment next button clicked"]

  ev_bottomSheetNextClicked --> ev_orderCreated["chalo pay order created"]
  ev_orderCreated --> ui_validation([Validation flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_payForTicketOpen,ev_quickPayCardClicked,ev_findFareClicked,ev_tripAmountOpen,ev_historyClicked,ev_tripNextClicked,ev_tripNextFailed,ev_prerequisitesFailed,ev_bottomSheetOpen,ev_rechargeClicked,ev_bottomSheetNextClicked,ev_orderCreated event;
  class ui_payForTicket,ui_quickPayEntry,ui_validation ui;
```

## Funnel: Quick Pay validation screen (BLE/QR)

```mermaid
flowchart TD
  %%chalo:diagram-link ui_ack -> title:Funnel: Validation acknowledgment → post validation
  ui_validationEntry([Validation screen entry]) --> ev_bleScreenOpen["ble screen open"]
  ui_validationEntry --> ev_qrScreenOpen["qr screen open"]

  ev_bleScreenOpen --> ev_permissionCheck["BLE permission check on validation initialization"]
  ev_permissionCheck -->|Granted| ev_permissionGranted["BLE permission granted"]
  ev_permissionCheck -->|Denied| ev_permissionDenied["BLE permission denied"]

  ev_permissionDenied --> ev_rationaleOpened["BLE validation permission rationale screen opened"]
  ev_rationaleOpened --> ev_rationaleAccepted["BLE permission rationale accepted"]
  ev_rationaleOpened --> ev_settingsOpened["BLE validation permission settings screen opened"]

  ev_permissionDenied --> ev_qrOptionShown["BLE denial qr option shown"]
  ev_qrOptionShown --> ev_useQrClicked["BLE denial use qr clicked"]

  ev_bleScreenOpen -->|Manual QR| ev_openQrClicked["BLE validation open qr btn clicked"]
  ev_bleScreenOpen --> ev_switchToQr["BLE validation switch to qr got it clicked"]

  ev_qrScreenOpen --> ev_qrZoomClicked["simple qr validation zoom qr clicked"]

  ev_bleScreenOpen --> ev_helpClicked["BLE validation help btn clicked"]
  ev_bleScreenOpen --> ev_bottomSheetClicked["ble bottom sheet clicked"]

  ev_bleScreenOpen --> ev_exitConfirmShown["exit chalo pay confirmation shown"]
  ev_exitConfirmShown --> ev_exitYes["exit chalo pay confirmation yes clicked"]
  ev_exitConfirmShown --> ev_exitNo["exit chalo pay confirmation no clicked"]

  ev_bleScreenOpen --> ui_ack([Validation acknowledgment])
  ev_qrScreenOpen --> ui_ack

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_bleScreenOpen,ev_qrScreenOpen,ev_permissionCheck,ev_permissionGranted,ev_permissionDenied,ev_rationaleOpened,ev_rationaleAccepted,ev_settingsOpened,ev_qrOptionShown,ev_useQrClicked,ev_openQrClicked,ev_switchToQr,ev_qrZoomClicked,ev_helpClicked,ev_bottomSheetClicked,ev_exitConfirmShown,ev_exitYes,ev_exitNo event;
  class ui_validationEntry,ui_ack ui;
```

## Funnel: Validation acknowledgment → post validation

```mermaid
flowchart TD
  %%chalo:diagram-link ui_receipt -> title:Funnel: Receipt viewing
  ui_conductorScan([Conductor scans ticket]) --> ui_ackReceived([Validation ack received])

  ui_ackReceived -->|Conductor validation| ev_ticketPunched["chalo pay ticket punched"]
  ui_ackReceived -->|TITO validation| ev_titoNotificationReceived["tito tapIn notif recv on conductor flow"]

  ui_ackReceived -->|Invalid data| ev_invalidAckData["invalid ble validation ack data received"]
  ui_ackReceived -->|Polling stopped| ev_pollingStoppedTito["tito tapin polling stopped due to notification received"]

  ui_ackReceived -->|Valid polling| ev_validTitoPolling["valid tito tap in data received in polling"]
  ui_ackReceived -->|Invalid polling| ev_invalidTitoPolling["invalid tito tap in data received in polling"]

  ui_ackReceived --> ev_receiptPayload["quickpay receipt payload"]
  ev_ticketPunched --> ev_ackConsumed["ble validation ack data consumed"]
  ev_titoNotificationReceived --> ev_ackConsumed

  ev_ackConsumed -->|Sync fails| ev_syncFailed["syncing post ble validation failed"]
  ev_ackConsumed -->|Success| ev_postValidationOpened["Post validation screen opened"]

  ev_postValidationOpened --> ev_viewReceiptClicked["view receipt post validation clicked"]
  ev_postValidationOpened --> ev_exitClicked["view receipt post validation clicked"]
  ev_postValidationOpened --> ui_receipt([Receipt viewing])

  ui_notification([Punch notification received]) --> ev_punchReceived["chalo pay punch received"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_ticketPunched,ev_punchReceived,ev_titoNotificationReceived,ev_invalidAckData,ev_pollingStoppedTito,ev_validTitoPolling,ev_invalidTitoPolling,ev_receiptPayload,ev_ackConsumed,ev_syncFailed,ev_postValidationOpened,ev_viewReceiptClicked,ev_exitClicked event;
  class ui_conductorScan,ui_ackReceived,ui_receipt,ui_notification ui;
```

## Funnel: Receipt viewing

```mermaid
flowchart TD
  ui_postValidation([Post validation screen]) --> ev_viewReceiptClicked["view receipt post validation clicked"]
  ui_ticketList([My Tickets / Validation screen]) --> ev_viewReceiptMenuClicked["view trip receipt from menu clicked"]
  ui_ticketList --> ev_chaloPayViewReceiptClicked["chalo pay view receipt clicked"]

  ev_viewReceiptClicked --> ev_receiptShown["chalo pay receipt shown"]
  ev_viewReceiptMenuClicked --> ev_receiptShown
  ev_chaloPayViewReceiptClicked --> ev_receiptShown

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_viewReceiptClicked,ev_viewReceiptMenuClicked,ev_chaloPayViewReceiptClicked,ev_receiptShown event;
  class ui_postValidation,ui_ticketList ui;
```

## Funnel: Chalo Pay checkout (payment method)

```mermaid
flowchart TD
  ui_checkout([Checkout / Payment method selection]) --> ui_chaloPayItem([Chalo Pay payment option shown])
  ui_chaloPayItem --> ev_itemClicked["chaloPayItemClicked"]

  ev_itemClicked -->|Wallet prerequisites| ui_walletAccess([Navigate to KYC/Wallet activation])
  ev_itemClicked -->|Wallet usable + CTA=RECHARGE| ev_bottomsheetOpened["chaloPayBottomsheetOpened"]
  ev_itemClicked -->|Wallet usable + CTA!=RECHARGE| ev_confirmClicked["chaloPayBottomsheetConfirmPaymentClicked"]

  ev_bottomsheetOpened --> ev_tncClicked["chaloPayBottomsheetTncClicked"]
  ev_bottomsheetOpened --> ev_confirmClicked["chaloPayBottomsheetConfirmPaymentClicked"]
  ev_bottomsheetOpened -->|Insufficient balance| ev_rechargeClickedCheckout["chaloPayBottomsheetRechargeClicked"]

  ev_rechargeClickedCheckout --> ui_loadMoney([Navigate to load money])

  ev_confirmClicked --> ev_orderCreationSuccess["chaloPayOrderCreationSuccess"]
  ev_confirmClicked --> ev_orderCreationFailed["chaloPayOrderCreationFailed"]

  ev_orderCreationSuccess --> ev_paymentSuccess["chaloPayPaymentSuccess"]
  ev_orderCreationSuccess --> ev_paymentFailed["chaloPayPaymentFailed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_itemClicked,ev_bottomsheetOpened,ev_tncClicked,ev_confirmClicked,ev_rechargeClickedCheckout,ev_orderCreationSuccess,ev_orderCreationFailed,ev_paymentSuccess,ev_paymentFailed event;
  class ui_checkout,ui_walletAccess,ui_loadMoney,ui_chaloPayItem ui;
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

## Validation screen side-paths (support + diagnostics)

```mermaid
flowchart TD
  ui_validation([Validation screen]) --> ev_reportProblem["report problem clicked v2"]
  ui_validation --> ev_quickpayFetched["chalo pay order fetched"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_reportProblem,ev_quickpayFetched event;
  class ui_validation ui;
```

## Key funnel segments for PMs

### Funnel 1: Quick Pay purchase completion rate
Tracks users from amount entry to successful order creation.

**Events:**
1. `chalo pay trip amount fragment opened` (start)
2. `chalo pay trip amount fragment next button clicked` (intent)
3. `chalo pay bottom sheet fragment opened` (confirmation view)
4. `chalo pay bottom sheet fragment next button clicked` (confirmation intent)
5. `chalo pay order created` (conversion)

**Failure exit points:**
- `chalo pay trip amount fragment next button clicked failure` (amount validation)
- `chalo pay prerequisites failed` (KYC/wallet not ready)
- `chalo pay bottom sheet recharge button clicked` (insufficient balance)

### Funnel 2: Validation success rate
Tracks validation screen to successful ticket punch.

**Events:**
1. `ble screen open` or `qr screen open` (start)
2. `chalo pay ticket punched` (conversion)

**Permission sub-funnel:**
- `BLE permission check on validation initialization` → `BLE permission granted` vs `BLE permission denied`

### Funnel 3: Receipt viewing engagement
Tracks post-validation receipt views.

**Events:**
1. `Post validation screen opened` (start)
2. `view receipt post validation clicked` (intent)
3. `chalo pay receipt shown` (view)

### Funnel 4: Wallet recharge conversion
Tracks from load money screen to successful recharge order.

**Events:**
1. `wallet load balance enter amount fragment opened` (start)
2. `wallet suggested amount clicked` (denomination intent)
3. `wallet load balance fragment next button clicked` (submit)
4. `load money wallet recharge order success` (conversion)

### Funnel 5: Chalo Pay checkout adoption
Tracks Chalo Pay usage as payment method for other products.

**Events:**
1. `chaloPayItemClicked` (selection)
2. `chaloPayBottomsheetOpened` (confirmation view)
3. `chaloPayBottomsheetConfirmPaymentClicked` (confirmation intent)
4. `chaloPayOrderCreationSuccess` + `chaloPayPaymentSuccess` (conversion)

**Failure exit points:**
- `chaloPayBottomsheetRechargeClicked` (insufficient balance)
- `chaloPayOrderCreationFailed` or `chaloPayPaymentFailed` (technical failure)

## Property combinations for segmentation

### By wallet state (Chalo Pay checkout)
Use `chaloPayWalletState` from `chaloPayItemClicked` and bottom sheet events:
- `ACTIVE` - Wallet ready
- `KYC_INITIATED` - KYC pending
- `DOES_NOT_EXIST` - Wallet not created
- `FULL_KYC_NEEDED` - Additional KYC required
- `BLOCKED_*` - Various blocked states

### By balance availability
Use `chaloPayWalletBalance` or `chalo pay bottom sheet wallet balance left` to segment by:
- High balance (>₹500)
- Medium balance (₹100-500)
- Low balance (<₹100)

### By validation method
Use `validationFlowType` from BLE events:
- Conductor validation (BLE/QR)
- TITO validation (automated tap)

### By failure reasons
- `chalo pay trip amount fragment next button clicked failure message` - Amount validation failures
- `reason` property - Invalid validation data reasons
- `failureReason` - Sync and other technical failures

## Notes for PM analytics setup

1. **Quick Pay vs Chalo Pay terminology**: "Quick Pay" is the standalone wallet-based bus fare product. "Chalo Pay" events (with camelCase naming) represent the wallet payment method used in checkout for other products. Both use the same wallet infrastructure.

2. **Order ID tracking**: The `orderId` property is crucial for tracking Quick Pay order lifecycle from creation → validation → punch → receipt.

3. **Validation events shared**: BLE validation events (`ble screen open`, `BLE permission*`, etc.) are shared with other product validation flows. Always filter by `isChaloPay=true` to isolate Quick Pay validation events.

4. **TITO vs Conductor validation**: TITO events (`tito tap in*`) represent automated tap-in/tap-out validation. Regular punch events (`chalo pay ticket punched`) represent conductor-initiated validation.

5. **Receipt payload debugging**: `quickpay receipt payload` event logs full receipt JSON for debugging punch notification issues.

6. **Recharge flow branching**: When insufficient balance is detected, users can branch to wallet load money via `chalo pay bottom sheet recharge button clicked` or `chaloPayBottomsheetRechargeClicked`. Track recharge completion and return rate to Quick Pay flow.

7. **sendToPlotline flag**: Only `pay for ticket screen opened` has `sendToPlotline=true`. This is the main entry event for Plotline journey tracking.
