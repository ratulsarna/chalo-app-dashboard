# Quick Pay (Chalo Pay) analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- Quick Pay has two main contexts: (1) Standalone Quick Pay flow for wallet-based bus fare payment, (2) Chalo Pay as payment method in checkout for other products
- The standalone flow starts from `pay for ticket screen opened` or direct navigation to `chalo pay trip amount fragment opened`
- The checkout integration uses `chaloPayItem*` and `chaloPayBottomsheet*` events
- Validation events are shared with other product validation flows but tagged with `isQuickPay=true`

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

## Entry → amount entry (main Quick Pay flow)
Quick Pay can be entered from multiple sources. Use the `source` property to segment by origin.

```mermaid
flowchart TD
  ui_home([Home / Various sources]) --> ui_payForTicket([Pay for ticket screen])
  ui_payForTicket --> ev_payForTicketOpened["pay for ticket screen opened"]

  ev_payForTicketOpened -->|Chalo Pay card shown| ev_chaloPayCardClicked["chalo pay card clicked"]
  ev_payForTicketOpened -->|Only Chalo Pay enabled| ui_autoNavigate([Auto-navigate to Quick Pay])

  ev_chaloPayCardClicked --> ev_tripAmountOpened["chalo pay trip amount fragment opened"]
  ui_autoNavigate --> ev_tripAmountOpened
  ui_directNav([Direct navigation from wallet/checkout]) --> ev_tripAmountOpened

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_payForTicketOpened,ev_chaloPayCardClicked,ev_tripAmountOpened event;
  class ui_home,ui_payForTicket,ui_autoNavigate,ui_directNav ui;
```

## Funnel: amount entry → confirmation → order creation
Primary Quick Pay purchase flow from amount entry to order creation.

```mermaid
flowchart TD
  ui_amountEntry([Amount entry screen]) --> ev_tripAmountOpened["chalo pay trip amount fragment opened"]
  ev_tripAmountOpened --> ev_nextButtonClicked["chalo pay trip amount fragment next button clicked"]
  ev_tripAmountOpened -->|History icon| ev_historyClicked["chalo pay trip amount fragment chalo pay history clicked"]

  ev_nextButtonClicked -->|Prerequisites check fails| ev_prerequisitesFailed["chalo pay prerequisites failed"]
  ev_nextButtonClicked -->|Amount validation fails| ev_nextButtonFailure["chalo pay trip amount fragment next button clicked failure"]
  ev_nextButtonClicked -->|Success| ev_bottomSheetOpened["chalo pay bottom sheet fragment opened"]

  ev_prerequisitesFailed --> ui_walletAccess([Navigate to KYC/Wallet activation])
  ev_historyClicked --> ui_history([Navigate to transaction history])

  ev_bottomSheetOpened --> ev_bottomSheetNextClicked["chalo pay bottom sheet fragment next button clicked"]
  ev_bottomSheetOpened -->|Insufficient balance| ev_rechargeClicked["chalo pay bottom sheet recharge button clicked"]

  ev_rechargeClicked --> ui_loadMoney([Navigate to load money])
  ev_bottomSheetNextClicked -->|Balance sufficient| ev_orderCreated["chalo pay order created"]
  ev_orderCreated --> ev_summaryOpened["chalo pay summary screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_tripAmountOpened,ev_nextButtonClicked,ev_historyClicked,ev_prerequisitesFailed,ev_nextButtonFailure,ev_bottomSheetOpened,ev_bottomSheetNextClicked,ev_rechargeClicked,ev_orderCreated,ev_summaryOpened event;
  class ui_amountEntry,ui_walletAccess,ui_history,ui_loadMoney ui;
```

## Funnel: validation screen → BLE/QR → punch received
Validation screen with BLE and QR options, permission handling, and validation acknowledgment.

```mermaid
flowchart TD
  ui_validationEntry([Validation screen entry]) --> ev_summaryOpened["chalo pay summary screen opened"]
  ui_ticketList([My Tickets list]) --> ev_ticketClicked["chalo pay ticket clicked"]

  ev_summaryOpened --> ev_bleScreenOpen["ble screen open"]
  ev_summaryOpened --> ev_qrScreenOpen["qr screen open"]
  ev_ticketClicked --> ev_bleScreenOpen
  ev_ticketClicked --> ev_qrScreenOpen

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

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_summaryOpened,ev_ticketClicked,ev_bleScreenOpen,ev_qrScreenOpen,ev_permissionCheck,ev_permissionGranted,ev_permissionDenied,ev_rationaleOpened,ev_rationaleAccepted,ev_settingsOpened,ev_qrOptionShown,ev_useQrClicked,ev_openQrClicked,ev_switchToQr,ev_qrZoomClicked,ev_helpClicked,ev_bottomSheetClicked event;
  class ui_validationEntry,ui_ticketList ui;
```

## Funnel: validation acknowledgment → post validation
Conductor validates ticket, app receives punch, processes receipt, and shows post-validation screen.

```mermaid
flowchart TD
  ui_conductorScan([Conductor scans ticket]) --> ui_ackReceived([Validation ack received])

  ui_ackReceived -->|Conductor validation| ev_ticketPunched["chalo pay ticket punched"]
  ui_ackReceived -->|TITO validation| ev_titoNotificationReceived["tito tapIn notif recv on conductor flow"]

  ui_ackReceived -->|Invalid data| ev_invalidAckData["invalid ble validation ack data received"]
  ui_ackReceived -->|Polling stopped| ev_pollingStoppedTito["tito tapin polling stopped due to notification received"]

  ui_ackReceived -->|Valid polling| ev_validTitoPolling["valid tito tap in data received in polling"]
  ui_ackReceived -->|Invalid polling| ev_invalidTitoPolling["invalid tito tap in data received in polling"]

  ui_ackReceived --> ev_receiptPayload["quickpay receipt payload"]
  ev_ticketPunched --> ev_punchReceived["chalo pay punch received"]
  ev_punchReceived --> ev_ackConsumed["ble validation ack data consumed"]
  ev_titoNotificationReceived --> ev_ackConsumed

  ev_ackConsumed -->|Sync fails| ev_syncFailed["syncing post ble validation failed"]
  ev_ackConsumed -->|Success| ev_postValidationOpened["Post validation screen opened"]

  ev_postValidationOpened --> ev_viewReceiptClicked["view receipt post validation clicked"]
  ev_postValidationOpened --> ev_exitClicked["view receipt post validation clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_ticketPunched,ev_punchReceived,ev_titoNotificationReceived,ev_invalidAckData,ev_pollingStoppedTito,ev_validTitoPolling,ev_invalidTitoPolling,ev_receiptPayload,ev_ackConsumed,ev_syncFailed,ev_postValidationOpened,ev_viewReceiptClicked,ev_exitClicked event;
  class ui_conductorScan,ui_ackReceived ui;
```

## Funnel: receipt viewing
Receipt viewing from post-validation screen or My Tickets history.

```mermaid
flowchart TD
  ui_postValidation([Post validation screen]) --> ev_viewReceiptClicked["view receipt post validation clicked"]
  ui_ticketList([My Tickets / Validation screen]) --> ev_viewReceiptMenuClicked["view trip receipt from menu clicked"]
  ui_ticketList --> ev_chaloPayViewReceiptClicked["chalo pay view receipt clicked"]

  ev_viewReceiptClicked --> ev_receiptShown["chalo pay receipt shown"]
  ev_viewReceiptMenuClicked --> ev_receiptShown
  ev_chaloPayViewReceiptClicked --> ev_receiptShown

  ev_receiptShown --> ev_receiptOpened["chalo pay receipt opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_viewReceiptClicked,ev_viewReceiptMenuClicked,ev_chaloPayViewReceiptClicked,ev_receiptShown,ev_receiptOpened event;
  class ui_postValidation,ui_ticketList ui;
```

## Chalo Pay as payment method (checkout integration)
Chalo Pay used as wallet payment method for other products (mTicket, metro, premium bus, etc.).

```mermaid
flowchart TD
  ui_checkout([Checkout / Payment method selection]) --> ev_itemRendered["chaloPayItemRendered"]
  ev_itemRendered --> ev_itemClicked["chaloPayItemClicked"]

  ev_itemClicked -->|Wallet prerequisites| ui_walletAccess([Navigate to KYC/Wallet activation])
  ev_itemClicked -->|Wallet usable| ev_bottomsheetOpened["chaloPayBottomsheetOpened"]

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
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_itemRendered,ev_itemClicked,ev_bottomsheetOpened,ev_tncClicked,ev_confirmClicked,ev_rechargeClickedCheckout,ev_orderCreationSuccess,ev_orderCreationFailed,ev_paymentSuccess,ev_paymentFailed event;
  class ui_checkout,ui_walletAccess,ui_loadMoney ui;
```

## Validation screen side-paths (back press confirmation, help)
Additional validation screen interactions.

```mermaid
flowchart TD
  ui_validation([Validation screen]) --> ev_backPress["exit chalo pay confirmation shown"]
  ev_backPress --> ev_backYes["exit chalo pay confirmation yes clicked"]
  ev_backPress --> ev_backNo["exit chalo pay confirmation no clicked"]

  ui_validation --> ev_reportProblem["report problem clicked v2"]
  ui_validation --> ev_quickpayFetched["chalo pay order fetched"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_backPress,ev_backYes,ev_backNo,ev_reportProblem,ev_quickpayFetched event;
  class ui_validation ui;
```

## Complete Quick Pay standalone flow (high-level overview)
End-to-end Quick Pay flow from entry to receipt viewing.

```mermaid
flowchart TD
  ui_entry([Entry]) --> ev_payForTicketOpened["pay for ticket screen opened"]
  ev_payForTicketOpened --> ev_chaloPayCardClicked["chalo pay card clicked"]

  ev_chaloPayCardClicked --> ev_tripAmountOpened["chalo pay trip amount fragment opened"]
  ev_tripAmountOpened --> ev_nextButtonClicked["chalo pay trip amount fragment next button clicked"]

  ev_nextButtonClicked --> ev_bottomSheetOpened["chalo pay bottom sheet fragment opened"]
  ev_bottomSheetOpened --> ev_bottomSheetNextClicked["chalo pay bottom sheet fragment next button clicked"]

  ev_bottomSheetNextClicked --> ev_orderCreated["chalo pay order created"]
  ev_orderCreated --> ev_summaryOpened["chalo pay summary screen opened"]

  ev_summaryOpened --> ev_bleScreenOpen["ble screen open"]
  ev_bleScreenOpen --> ev_ticketPunched["chalo pay ticket punched"]

  ev_ticketPunched --> ev_postValidationOpened["Post validation screen opened"]
  ev_postValidationOpened --> ev_viewReceiptClicked["view receipt post validation clicked"]

  ev_viewReceiptClicked --> ev_receiptShown["chalo pay receipt shown"]
  ev_receiptShown --> ev_receiptOpened["chalo pay receipt opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_payForTicketOpened,ev_chaloPayCardClicked,ev_tripAmountOpened,ev_nextButtonClicked,ev_bottomSheetOpened,ev_bottomSheetNextClicked,ev_orderCreated,ev_summaryOpened,ev_bleScreenOpen,ev_ticketPunched,ev_postValidationOpened,ev_viewReceiptClicked,ev_receiptShown,ev_receiptOpened event;
  class ui_entry ui;
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
1. `chalo pay summary screen opened` or `ble screen open` (start)
2. `chalo pay ticket punched` (conversion)

**Permission sub-funnel:**
- `BLE permission check on validation initialization` → `BLE permission granted` vs `BLE permission denied`

### Funnel 3: Receipt viewing engagement
Tracks post-validation receipt views.

**Events:**
1. `Post validation screen opened` (start)
2. `view receipt post validation clicked` (intent)
3. `chalo pay receipt shown` (view)
4. `chalo pay receipt opened` (detailed view)

### Funnel 4: Chalo Pay checkout adoption
Tracks Chalo Pay usage as payment method for other products.

**Events:**
1. `chaloPayItemRendered` (exposure)
2. `chaloPayItemClicked` (selection)
3. `chaloPayBottomsheetOpened` (confirmation view)
4. `chaloPayBottomsheetConfirmPaymentClicked` (confirmation intent)
5. `chaloPayOrderCreationSuccess` + `chaloPayPaymentSuccess` (conversion)

**Failure exit points:**
- `chaloPayBottomsheetRechargeClicked` (insufficient balance)
- `chaloPayOrderCreationFailed` or `chaloPayPaymentFailed` (technical failure)

## Property combinations for segmentation

### By wallet state (Chalo Pay checkout)
Use `chaloPayWalletState` property from `chaloPayItemRendered` and `chaloPayItemClicked`:
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

3. **Validation events shared**: BLE validation events (`ble screen open`, `ble permission*`, etc.) are shared with other product validation flows. Always filter by `isQuickPay=true` to isolate Quick Pay validation events.

4. **TITO vs Conductor validation**: TITO events (`tito tap in*`) represent automated tap-in/tap-out validation. Regular punch events (`chalo pay ticket punched`) represent conductor-initiated validation.

5. **Receipt payload debugging**: `quickpay receipt payload` event logs full receipt JSON for debugging punch notification issues.

6. **Recharge flow branching**: When insufficient balance is detected, users can branch to wallet load money via `chalo pay bottom sheet recharge button clicked` or `chaloPayBottomsheetRechargeClicked`. Track recharge completion and return rate to Quick Pay flow.

7. **sendToPlotline flag**: Only `pay for ticket screen opened` has `sendToPlotline=true`. This is the main entry event for Plotline journey tracking.
