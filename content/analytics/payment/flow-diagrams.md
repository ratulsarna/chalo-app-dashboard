# Payment flow analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- Payment flows vary significantly based on product type (mticket, super pass, wallet, card recharge, bills, etc.)
- Each product type has its own success/failure events (e.g., "mticket payment success", "pass booked")
- Payment method selection determines which checkout flow is used (native UPI apps, Razorpay, Inai, Juspay, Chalo Pay wallet)
- Event semantics matter for funnels:
  - `mticket payment success` / `pass booked` / other product-specific `*payment successful*` events are raised on **payment provider SDK callback** (gateway-level success). These can occur **before** `payment status response`, and do not necessarily mean the backend booking was confirmed.
  - `payment status response` is raised when the app polls backend for the order/payment status (values: `SUCCESS`/`FAILED`/`PENDING`/`UNKNOWN`).
  - `checkout post payment screen opened` is the safest **business-confirmed success** indicator in this flow, because the app navigates to post-payment only after `payment status response` returns `SUCCESS` (Chalo Pay is a separate flow).

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

## Main payment flow: Entry → Payment Method → Checkout → (Gateway callback & Status polling) → Post-payment

```mermaid
flowchart TD
  %%chalo:diagram-link ui_upiFlow -> title:Funnel: UPI payment method flow
  %%chalo:diagram-link ui_cardFlow -> title:Funnel: Card payment method flow
  %%chalo:diagram-link ui_netbankingFlow -> title:Funnel: Net Banking & Wallet flows
  %%chalo:diagram-link ui_walletFlow -> title:Funnel: Net Banking & Wallet flows
  %%chalo:diagram-link ui_chaloPayFlow -> title:Funnel: Chalo Pay wallet flow
  ui_entry([User initiates payment from product screen]) --> ev_mainScreenOpen["Payment Modes Screen opened"]

  ev_mainScreenOpen --> ev_paymentModeSelected["Payment mode selected"]

  ev_paymentModeSelected -->|UPI app| ui_upiFlow([UPI Flow])
  ev_paymentModeSelected -->|Card| ui_cardFlow([Card Flow])
  ev_paymentModeSelected -->|Net Banking| ui_netbankingFlow([Net Banking Flow])
  ev_paymentModeSelected -->|Wallet| ui_walletFlow([Wallet Flow])
  ev_paymentModeSelected -->|Chalo Pay| ui_chaloPayFlow([Chalo Pay Flow])

  ui_upiFlow --> ui_checkout([Checkout Processing])
  ui_cardFlow --> ui_checkout
  ui_netbankingFlow --> ui_checkout
  ui_walletFlow --> ui_checkout

  %% Two important signals happen around the payment attempt:
  %% 1) Gateway callback events (SDK-level) can fire before status polling
  %% 2) Status polling ("payment status response") is the backend-confirmed signal
  ui_checkout --> ui_gatewayCallback([Payment provider SDK callback])
  ui_gatewayCallback --> ev_gatewaySuccess["mticket payment success / pass booked / etc."]
  ui_gatewayCallback --> ev_gatewayFailed["mticket payment failed / pass payment failed / etc."]

  ui_checkout --> ev_paymentStatusResponse["payment status response"]
  ev_paymentStatusResponse -->|response = SUCCESS| ev_postPaymentOpen["checkout post payment screen opened"]
  ev_paymentStatusResponse -->|response != SUCCESS| ui_notConfirmed([PENDING / FAILED / UNKNOWN])

  ev_postPaymentOpen -->|Success| ev_detailsFetched["post payment mticket details fetched"]
  ev_postPaymentOpen -->|Failure| ev_historyFailure["post payment history call use case failure"]

  ev_detailsFetched --> ev_checkoutFinished["checkout activity finished"]
  ev_historyFailure --> ev_checkoutFinished

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_mainScreenOpen,ev_paymentModeSelected,ev_gatewaySuccess,ev_gatewayFailed,ev_paymentStatusResponse,ev_postPaymentOpen,ev_detailsFetched,ev_historyFailure,ev_checkoutFinished event;
  class ui_entry,ui_upiFlow,ui_cardFlow,ui_netbankingFlow,ui_walletFlow,ui_chaloPayFlow,ui_checkout,ui_gatewayCallback,ui_notConfirmed ui;
```

## Funnel: UPI payment method flow

```mermaid
flowchart TD
  ev_paymentModeSelected["Payment mode selected"] -->|mode=upi| ev_upiScreenOpen["checkout upi list screen opened"]

  ev_upiScreenOpen -->|Select UPI app| ev_installedUpiResult["installed upi app result"]
  ev_upiScreenOpen -->|Detection error| ev_upiCheckFailed["installed upi app check failed"]
  ev_upiScreenOpen -->|Add UPI ID| ev_addUpiSelected["add upi id selected"]

  ev_addUpiSelected -->|Valid VPA| ev_checkoutOpen["checkout screen opened"]
  ev_addUpiSelected -->|Invalid VPA| ev_vpaFailure["upi id entered failure"]

  ev_installedUpiResult --> ev_paymentStatus["payment status response"]
  ev_checkoutOpen --> ev_paymentStatus

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_paymentModeSelected,ev_upiScreenOpen,ev_installedUpiResult,ev_upiCheckFailed,ev_addUpiSelected,ev_vpaFailure,ev_checkoutOpen,ev_paymentStatus event;
```

## Funnel: Card payment method flow

```mermaid
flowchart TD
  ev_paymentModeSelected["Payment mode selected"] -->|mode=card| ev_cardScreenOpen["card screen opened"]

  ev_cardScreenOpen --> ev_cardSubmitted["card details submitted"]

  ev_cardSubmitted --> ev_checkoutOpen["checkout screen opened"]
  ev_checkoutOpen --> ev_razorpayLoaded["Razorpay webview loaded"]
  ev_razorpayLoaded --> ev_paymentStatus["payment status response"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_paymentModeSelected,ev_cardScreenOpen,ev_cardSubmitted,ev_checkoutOpen,ev_razorpayLoaded,ev_paymentStatus event;
```

## Funnel: Net Banking & Wallet flows

```mermaid
flowchart TD
  ev_paymentModeSelected["Payment mode selected"] -->|mode=netbanking| ev_netbankingOpen["Banking Screen Opened"]
  ev_paymentModeSelected -->|mode=wallet| ev_walletOpen["checkout wallet list screen opened"]

  ev_netbankingOpen --> ev_checkoutOpen["checkout screen opened"]
  ev_walletOpen --> ev_checkoutOpen

  ev_checkoutOpen --> ev_razorpayLoaded["Razorpay webview loaded"]
  ev_razorpayLoaded --> ev_paymentStatus["payment status response"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_paymentModeSelected,ev_netbankingOpen,ev_walletOpen,ev_checkoutOpen,ev_razorpayLoaded,ev_paymentStatus event;
```

## Funnel: Chalo Pay wallet flow

```mermaid
flowchart TD
  ev_mainScreenOpen["Payment Modes Screen opened"] --> ev_chaloPayRendered["chaloPayItemRendered"]

  ev_chaloPayRendered --> ev_chaloPayClicked["chaloPayItemClicked"]

  ev_chaloPayClicked --> ev_bottomsheetOpen["chaloPayBottomsheetOpened"]

  ev_bottomsheetOpen --> ev_tncClicked["chaloPayBottomsheetTncClicked"]
  ev_bottomsheetOpen --> ev_rechargeClicked["chaloPayBottomsheetRechargeClicked"]
  ev_bottomsheetOpen --> ev_confirmClicked["chaloPayBottomsheetConfirmPaymentClicked"]

  ev_confirmClicked --> ev_orderSuccess["chaloPayOrderCreationSuccess"]
  ev_confirmClicked --> ev_orderFailed["chaloPayOrderCreationFailed"]

  ev_orderSuccess --> ev_paymentSuccess["chaloPayPaymentSuccess"]
  ev_orderSuccess --> ev_paymentFailed["chaloPayPaymentFailed"]

  ev_paymentSuccess --> ev_postPaymentOpen["checkout post payment screen opened"]
  ev_paymentFailed --> ev_postPaymentOpen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_mainScreenOpen,ev_chaloPayRendered,ev_chaloPayClicked,ev_bottomsheetOpen,ev_tncClicked,ev_rechargeClicked,ev_confirmClicked,ev_orderSuccess,ev_orderFailed,ev_paymentSuccess,ev_paymentFailed,ev_postPaymentOpen event;
```

## Funnel: Juspay SDK flow (UPI Autopay)

```mermaid
flowchart TD
  ui_upiAutopay([UPI Autopay flow initiated]) --> ev_sdkInitiate["juspay sdk initiate request"]

  ev_sdkInitiate --> ev_sdkApplicable["juspay sdk flow applicable"]
  ev_sdkInitiate --> ev_sdkInitiateFailed["juspay sdk initiate failed"]

  ev_sdkApplicable --> ev_actionInitiated["juspay action initiated"]

  ev_actionInitiated --> ev_requestFailed["juspay request creation failed"]
  ev_actionInitiated --> ev_sessionToken["juspay sdk upi session token received"]

  ev_sessionToken --> ev_onboardingResult["juspay sdk onboarding and pay result"]

  ev_onboardingResult --> ev_sdkSuccess([SDK Success])
  ev_onboardingResult --> ev_sdkError["juspay sdk result error"]
  ev_onboardingResult --> ev_sessionExpired["juspay sdk session expired"]
  ev_onboardingResult --> ev_resultNotAvailable["juspay sdk result not available"]
  ev_onboardingResult --> ev_operationError["juspay sdk operation error"]
  ev_onboardingResult --> ev_processingError["juspay sdk result object processing error"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_sdkInitiate,ev_sdkApplicable,ev_sdkInitiateFailed,ev_actionInitiated,ev_requestFailed,ev_sessionToken,ev_onboardingResult,ev_sdkError,ev_sessionExpired,ev_resultNotAvailable,ev_operationError,ev_processingError event;
  class ui_upiAutopay,ev_sdkSuccess ui;
```

## Funnel: Custom URL checkout flow

```mermaid
flowchart TD
  ui_customCheckout([Custom payment gateway detected]) --> ev_urlOverride["custom checkout url override"]

  ev_urlOverride --> ev_pageLoaded["custom checkout url page loaded"]

  ev_pageLoaded -->|UPI intent| ev_upiUriReceived["custom checkout url on upi uri received"]
  ev_pageLoaded -->|Back pressed| ev_backPressed["custom checkout url back pressed"]

  ev_backPressed --> ev_cancelDialog["payment cancel dialog shown"]

  ev_cancelDialog --> ev_cancelYes["payment cancel dialog yes clicked"]
  ev_cancelDialog --> ev_cancelNo["payment cancel dialog no clicked"]

  ev_upiUriReceived --> ev_upiResult["custom checkout url upi app result"]

  ev_upiResult --> ev_paymentStatus["payment status response"]
  ev_cancelYes --> ev_paymentCancelled["payment cancelled"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_urlOverride,ev_pageLoaded,ev_upiUriReceived,ev_backPressed,ev_cancelDialog,ev_cancelYes,ev_cancelNo,ev_upiResult,ev_paymentStatus,ev_paymentCancelled event;
  class ui_customCheckout ui;
```

## Payment status polling and result handling

```mermaid
flowchart TD
  ui_paymentSubmitted([Payment submitted to gateway]) --> ev_orderStatus["order status response"]

  ev_orderStatus --> ev_paymentStatus["payment status response"]

  %% Backend-confirmed status (recommended for "purchase success" funnels)
  ev_paymentStatus -->|response = SUCCESS| ev_postPaymentOpen["checkout post payment screen opened"]
  ev_paymentStatus -->|response != SUCCESS| ev_cancelled["payment cancelled / failed / pending / unknown"]

  %% Gateway callback events (SDK-level). These may occur before status polling.
  ui_paymentSubmitted --> ui_gatewayCallback([Payment provider SDK callback])
  ui_gatewayCallback --> ev_mticketSuccess["mticket payment success"]
  ui_gatewayCallback --> ev_passSuccess["pass booked"]
  ui_gatewayCallback --> ev_walletSuccess["wallet load balance payment successful"]
  ui_gatewayCallback --> ev_cardSuccess["online card recharge payment successful"]
  ui_gatewayCallback --> ev_billSuccess["electricity bill payment successful"]
  ui_gatewayCallback --> ev_ncmcSuccess["ncmc recharge payment successful"]
  ui_gatewayCallback --> ev_instantSuccess["instant ticket payment successful"]
  ui_gatewayCallback --> ev_premiumSuccess["premium bus ticket payment successful"]
  ui_gatewayCallback --> ev_ondcSuccess["ondc ticket payment successful"]
  ui_gatewayCallback --> ev_ondcMetroSuccess["ondc metro ticket payment successful"]
  ui_gatewayCallback --> ev_metroSuccess["metro ticket payment successful"]

  ui_gatewayCallback --> ev_mticketFailed["mticket payment failed"]
  ui_gatewayCallback --> ev_passFailed["pass payment failed"]
  ui_gatewayCallback --> ev_walletFailed["wallet load balance payment failed"]
  ui_gatewayCallback --> ev_otherFailed["... payment failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_orderStatus,ev_paymentStatus,ev_postPaymentOpen,ev_cancelled,ev_mticketSuccess,ev_passSuccess,ev_walletSuccess,ev_cardSuccess,ev_billSuccess,ev_ncmcSuccess,ev_instantSuccess,ev_premiumSuccess,ev_ondcSuccess,ev_ondcMetroSuccess,ev_metroSuccess,ev_mticketFailed,ev_passFailed,ev_walletFailed,ev_otherFailed event;
  class ui_paymentSubmitted,ui_gatewayCallback ui;
```

## Post-payment screen and booking details fetching

```mermaid
flowchart TD
  ui_paymentComplete([Payment completed]) --> ev_postPaymentOpen["checkout post payment screen opened"]

  ev_postPaymentOpen -->|Success, mticket| ev_mticketFetched["post payment mticket details fetched"]
  ev_postPaymentOpen -->|Success, super pass| ev_passFetched["post payment super pass details fetched"]
  ev_postPaymentOpen -->|Failure| ev_historyFailed["post payment history call use case failure"]

  ev_mticketFetched --> ev_finished["checkout activity finished"]
  ev_passFetched --> ev_finished
  ev_historyFailed --> ev_finished

  ev_finished --> ev_navigateHome["checkout navigating to home screen"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_postPaymentOpen,ev_mticketFetched,ev_passFetched,ev_historyFailed,ev_finished,ev_navigateHome event;
  class ui_paymentComplete ui;
```

---

# Funnel Building Guide for PMs

## Quick Reference: Key Funnel Events

| Stage | Event Name | Purpose |
|-------|------------|---------|
| Entry | `Payment Modes Screen opened` | Funnel start - user reached payment |
| Method Selection | `Payment mode selected` | User chose a payment method |
| Checkout | `checkout screen opened` | User entered checkout flow |
| Gateway Load | `Razorpay webview loaded` | Payment gateway ready |
| Status (backend) | `payment status response` | Backend status poll result (`response` = `SUCCESS`/`FAILED`/`PENDING`/`UNKNOWN`) |
| Success (business) | `checkout post payment screen opened` | User reached post-payment after backend-confirmed `SUCCESS` |
| Success (gateway) | `mticket payment success` (or product-specific) | Provider SDK callback success (can occur before backend status; use primarily for diagnostics) |
| Failure | `mticket payment failed` (or product-specific) | Payment failed |
| Exit | `checkout activity finished` | User left checkout |

---

## Ready-to-Use Funnel Definitions

### Funnel 1: Overall Payment Conversion (All Products)

**Purpose:** Measure overall payment success rate across all products

**Events (in order):**
1. `Payment Modes Screen opened`
2. `Payment mode selected`
3. `payment status response` (filter: `response` = "SUCCESS")
4. `checkout post payment screen opened`

**Conversion calculation:**
- **Payment method selection rate:** Event 2 / Event 1
- **Payment success rate:** Event 3 (SUCCESS) / Event 2
- **Overall conversion:** Event 4 / Event 1

---

### Funnel 2: UPI Payment Conversion

**Purpose:** Measure UPI-specific payment funnel

**Events (in order):**
1. `Payment mode selected` (filter: `mode` = "upi")
2. `checkout upi list screen opened`
3. `installed upi app result` (filter: `resultStatus` = "SUCCESS")
4. `payment status response` (filter: `response` = "SUCCESS")

**Alternative path (manual VPA entry):**
1. `Payment mode selected` (filter: `mode` = "upi")
2. `add upi id selected`
3. `checkout screen opened`
4. `payment status response` (filter: `response` = "SUCCESS")

**Drop-off analysis:**
- `upi id entered failure` → VPA validation issues
- `installed upi app check failed` → System error detecting UPI apps
- `installed upi app result` with `isOperationCancelled` = "true" → User cancelled in UPI app

---

### Funnel 3: Card Payment Conversion

**Purpose:** Measure card payment funnel

**Events (in order):**
1. `Payment mode selected` (filter: `mode` = "card")
2. `card screen opened`
3. `card details submitted`
4. `checkout screen opened`
5. `Razorpay webview loaded`
6. `payment status response` (filter: `response` = "SUCCESS")

**Drop-off analysis:**
- Drop between 2→3: Card details entry abandonment
- Drop between 5→6: Gateway/bank failure

---

### Funnel 4: Chalo Pay Wallet Conversion

**Purpose:** Measure Chalo Pay wallet payment funnel

**Events (in order):**
1. `chaloPayItemRendered`
2. `chaloPayItemClicked`
3. `chaloPayBottomsheetOpened`
4. `chaloPayBottomsheetConfirmPaymentClicked`
5. `chaloPayOrderCreationSuccess`
6. `chaloPayPaymentSuccess`

**Drop-off analysis:**
- `chaloPayBottomsheetRechargeClicked` → Insufficient balance
- `chaloPayOrderCreationFailed` → Backend order creation issue
- `chaloPayPaymentFailed` → Wallet deduction failed

---

### Funnel 5: Product-Specific Payment (M-Ticket Example)

**Purpose:** Measure M-Ticket payment conversion

**Events (in order):**
1. `Payment Modes Screen opened`
2. `Payment mode selected`
3. `payment status response` (filter: `response` = "SUCCESS")
4. `checkout post payment screen opened`
5. `post payment mticket details fetched`

**Failure path:**
- `mticket payment failed` → Capture `error`, `description`, `reason` for failure analysis

---

## Segmentation Guide

### By Payment Method

Use `Payment mode selected` event with `mode` property:

| `mode` value | Payment Method |
|--------------|----------------|
| `upi` | UPI (GPay, PhonePe, etc.) |
| `card` | Credit/Debit Card |
| `netbanking` | Net Banking |
| `wallet` | Third-party Wallets (Paytm, etc.) |

For Chalo Pay, use separate events starting with `chaloPay*`.

### By Product Type

Filter success/failure events by product:

| Product | Success Event | Failure Event |
|---------|---------------|---------------|
| M-Ticket | `mticket payment success` | `mticket payment failed` |
| Super Pass | `pass booked` | `pass payment failed` |
| Wallet Recharge | `wallet load balance payment successful` | `wallet load balance payment failed` |
| Card Recharge | `online card recharge payment successful` | `online card recharge payment failed` |
| Electricity Bill | `electricity bill payment successful` | `electricity bill payment failed` |
| NCMC | `ncmc recharge payment successful` | `ncmc recharge payment failed` |
| Instant Ticket | `instant ticket payment successful` | `instant ticket payment failed` |
| Premium Bus | `premium bus ticket payment successful` | `premium bus ticket payment failed` |
| ONDC Bus | `ondc ticket payment successful` | `ondc ticket payment failed` |
| ONDC Metro | `ondc metro ticket payment successful` | `ondc metro ticket payment failed` |
| Metro | `metro ticket payment successful` | `metro ticket payment failed` |

### By UPI App

Use `Payment mode selected` event with `payment app name` property:
- "Google Pay", "PhonePe", "Paytm", "Amazon Pay", etc.

### By Time of Day

Use `hourOfEvent` property on success/failure events (0-23) to analyze payment patterns.

---

## Drop-off Analysis Guide

### Key Drop-off Points

1. **Entry → Method Selection**
   - Compare: `Payment Modes Screen opened` → `Payment mode selected`
   - Issue: Users not finding preferred payment method

2. **Method Selection → Checkout**
   - Compare: `Payment mode selected` → `checkout screen opened`
   - Issue: Card details entry friction, UPI validation failures

3. **Checkout → Gateway Load**
   - Compare: `checkout screen opened` → `Razorpay webview loaded`
   - Issue: Slow gateway load, network issues

4. **Gateway → Payment Status**
   - Compare: `Razorpay webview loaded` → `payment status response`
   - Issue: User abandonment during payment, bank OTP issues

5. **Payment Status → Success**
   - Compare: `payment status response` (all) → `payment status response` (SUCCESS)
   - Issue: Payment failures, declined transactions

### Cancellation Analysis

Track `payment cancelled` event with `paymentProvider` property to identify which gateway has higher cancellation rates.

Track `payment cancel dialog yes clicked` vs `payment cancel dialog no clicked` for cancellation intent vs recovery.

---

## Error Analysis

### Razorpay Failures

Filter `*payment failed` events and analyze:
- `errorCode` - Error code
- `description` - Human-readable error
- `source` - Error source (bank, network, etc.)
- `step` - Step where failure occurred
- `reason` - Detailed reason

### Inai Failures

Filter `*payment failed` events and analyze:
- `errorCode` - Error code
- `transactionId` - Transaction id (when available)
- `description` - Error description (when available)
- `reason` - Error reason/type (when available)

### Juspay SDK Failures

Track these events for SDK issues:
- `juspay sdk initiate failed`
- `juspay request creation failed`
- `juspay sdk result error`
- `juspay sdk session expired`
- `juspay sdk operation error`

---

## Funnel: Payment Reliability & Diagnostics

These events help monitor payment module health (method fetch failures, SDK management, eligibility/url failures).

```mermaid
flowchart TD
  ui_paymentInit([Payment module init]) --> ui_methods{Fetch payment methods}
  ui_methods --> ev_methodsApiResp["payment methods api response received"]
  ev_methodsApiResp -->|isSuccess=true| ev_methodsApiModel["payment methods api model fetched from backend"]
  ev_methodsApiResp -->|isSuccess=false| ev_methodsFail["payment methods failed response"]

  ev_methodsApiModel --> ui_provider{Provider conversion}
  ui_provider -->|Razorpay| ev_appRazor["payment method app model created for razorpay"]
  ui_provider -->|Inai| ev_appInai["payment method app model created for inai"]

  ev_appRazor --> ev_rzpApps["razorpay upi supported apps"]
  ev_rzpApps --> ev_appFetched["Payment methods app model fetched"]
  ev_appInai --> ev_appFetched

  ev_appFetched --> ev_validMethods["valid payment methods created"]
  ev_validMethods --> ev_methodsOk["payment methods success response"]

  ui_upi --> ev_upiMgmt["upi management clicked"]

  ui_juspay([Juspay SDK management]) --> ev_juspayResult["juspay sdk management result"]

  ui_lazypay([Lazypay url fetch]) --> ev_lpUrlFail["Lazypay url fetch error"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_methodsApiResp,ev_methodsApiModel,ev_appRazor,ev_appInai,ev_rzpApps,ev_appFetched,ev_validMethods,ev_methodsOk,ev_methodsFail,ev_upiMgmt,ev_juspayResult,ev_lpUrlFail event;
  class ui_paymentInit,ui_methods,ui_provider,ui_upi,ui_juspay,ui_lazypay ui;
```

## Property Definitions for Funnel Filters

### Payment Modes Screen opened

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `preferred mode` | number | Count of recent payment modes | 3 |
| `popular mode` | number | Count of popular modes | 5 |
| `installedUpiAppFlow` | string | Native UPI available | "true", "false" |
| `installedUpiAppsCount` | string | Number of UPI apps | "4" |
| `installedUpiApps` | string | UPI app names | "Google Pay,PhonePe,Paytm" |

### Payment mode selected

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `mode` | string | Payment method code | "upi", "card", "netbanking" |
| `payment app name` | string | Display name | "Google Pay", "HDFC Bank" |
| `top mode` | boolean | Featured mode | true, false |
| `preferred mode` | boolean | User's preferred | true, false |

### payment status response

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `response` | string | Status | "SUCCESS", "FAILURE", "PENDING" |
| `orderId` | string | Gateway order ID | "order_xyz123" |
| `chaloOrderId` | string | Chalo order ID | "CHO123456" |
| `bookingId` | string | Booking ID | "BK987654" |
| `reason` | string | Status reason | "Payment successful" |

### Product success events (e.g., mticket payment success)

| Property | Type | Description |
|----------|------|-------------|
| `paymentId` | string | Transaction ID |
| `hourOfEvent` | string | Hour (0-23) |
| `agency` | string | Transit agency |
| `bookingId` | string | Booking ID |
| `fare` | string | Amount paid |
| `isFreeRide` | string | Free ride flag |

**Important:** These events are emitted on the payment provider SDK callback (gateway-level success/failure). For business-confirmed success funnels, prefer `payment status response` with `response = "SUCCESS"` and/or `checkout post payment screen opened`.

---

## Example Dashboard Queries

### Payment Success Rate by Method (Last 7 Days)

```
Event: "payment status response"
Filter: response = "SUCCESS"
Group by: (join with "Payment mode selected" on session) mode
Time: Last 7 days
```

### UPI App Performance Comparison

```
Event: "installed upi app result"
Filter: resultStatus = "SUCCESS"
Group by: (from "Payment mode selected") payment app name
Calculate: Success rate = SUCCESS / Total
```

### Payment Failure Reasons

```
Event: "mticket payment failed" OR "pass payment failed" OR ...
Group by: error, description
Sort by: Count DESC
```

### Chalo Pay Adoption Funnel

```
Step 1: "chaloPayItemRendered" (impressions)
Step 2: "chaloPayItemClicked" (clicks)
Step 3: "chaloPayPaymentSuccess" (conversions)

CTR = Step 2 / Step 1
Conversion = Step 3 / Step 2
```
