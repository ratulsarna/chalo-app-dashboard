---
feature: chalo-wallet
layer: domain
lastUpdated: 2026-01-16
sourceCommit: null
---

# Chalo Wallet & Quick Pay — UseCase Documentation

## Domain Layer Overview

The Wallet domain layer handles balance management, transaction synchronization, load money operations, Quick Pay validation, and KYC verification. Use cases coordinate between UI components and repositories, managing complex wallet state including sync, reclaim, and timeout scenarios.

```mermaid
flowchart TB
    subgraph Presentation
        Balance["WalletBalanceComponent"]
        LoadMoney["WalletLoadBalanceEnterAmountComponent"]
        QuickPay["QuickpayTripAmountComponent"]
        KYC["MinKycComponents"]
    end

    subgraph Domain["Domain Layer"]
        subgraph Status["Status Use Cases"]
            GetStatus["GetWalletStatusUseCase"]
            FetchStatus["FetchWalletStatusOnlineUseCase"]
            CheckTimeout["CheckIsWalletTimedOutUseCase"]
        end

        subgraph Sync["Sync Use Cases"]
            WalletSync["WalletSyncUseCase"]
            GetWalletTxns["GetWalletAndAllTransactionsUseCase"]
            AutoReclaim["WalletAutoReclaimUseCase"]
        end

        subgraph LoadMoneyUC["Load Money Use Cases"]
            GetConfig["GetWalletLoadConfigAndPlaceRechargeOrderUseCase"]
            GetDenoms["GetLoadMoneyDenominationsUseCase"]
            ValidateAmount["LoadMoneyAmountValidationUseCase"]
            AddTxnSync["AddProcessingLoadMoneyTransactionsAndSyncWalletUseCase"]
        end

        subgraph QuickPayUC["Quick Pay Use Cases"]
            ValidateQP["ValidateQuickPayUseCase"]
            ValidateAmount2["ValidateQuickPayAmountUseCase"]
            CheckPrereqs["SatisfiesQuickPayPrerequisitesUseCase"]
            SyncReceipts["SyncQuickPayReceiptsUseCase"]
        end

        subgraph KYCUC["KYC Use Cases"]
            Register["RegisterUserUseCase"]
            SubmitKyc["SubmitKycUseCase"]
        end
    end

    subgraph Data
        WalletRepo["WalletRepository"]
        QuickPayRepo["QuickPayRepository"]
    end

    Balance --> GetWalletTxns
    Balance --> WalletSync
    LoadMoney --> GetConfig
    LoadMoney --> AddTxnSync
    QuickPay --> ValidateQP
    KYC --> SubmitKyc
    WalletSync --> WalletRepo
    GetConfig --> WalletRepo
```

---

## Use Case Inventory

| Use Case | Purpose | Called From |
|----------|---------|-------------|
| **GetWalletStatusUseCase** | Get wallet status from cache/backend | WalletAccessManager |
| **FetchWalletStatusOnlineUseCase** | Fetch status from backend | GetWalletStatusUseCase |
| **GetWalletStatusWithoutSyncUseCase** | Get status without triggering sync | Quick checks |
| **GetWalletAndAllTransactionsUseCase** | Get wallet + transactions | WalletBalanceComponent |
| **FetchWalletBalanceUseCase** | Get current balance | Balance display |
| **GetWalletIdUseCase** | Get wallet ID | Various components |
| **WalletSyncUseCase** | Sync wallet with backend | Balance refresh |
| **WalletAutoReclaimUseCase** | Auto-reclaim on timeout | Background |
| **MergeCachedWalletAndFetchedWalletUseCase** | Merge cache with API | WalletSyncUseCase |
| **CheckIsWalletTimedOutUseCase** | Check timeout status | WalletSyncUseCase |
| **CheckIsWalletInAppReclaimUseCase** | Check app reclaim | WalletSyncUseCase |
| **GetWalletLoadConfigAndPlaceRechargeOrderUseCase** | Create recharge order | LoadMoneyComponent |
| **GetLoadMoneyDenominationsUseCase** | Get suggested amounts | LoadMoneyComponent |
| **LoadMoneyAmountValidationUseCase** | Validate amount | LoadMoneyComponent |
| **AddProcessingLoadMoneyTransactionsAndSyncWalletUseCase** | Add transaction and sync | LoadMoneyComponent |
| **ValidateQuickPayUseCase** | Validate balance for Quick Pay | QuickPayComponent |
| **ValidateQuickPayAmountUseCase** | Validate Quick Pay amount | QuickPayComponent |
| **SatisfiesQuickPayPrerequisitesUseCase** | Check Quick Pay prereqs | QuickPayComponent |
| **RefreshQuickPayPrerequisitesUseCase** | Refresh prereqs | QuickPayComponent |
| **GetAllQuickPaysUseCase** | Get all Quick Pay transactions | History |
| **SyncQuickPayReceiptsUseCase** | Sync Quick Pay receipts | Background |
| **RegisterUserUseCase** | Register for KYC | MinKycOtpComponent |
| **SubmitKycUseCase** | Submit KYC data | MinKycOtpComponent |

---

## Get Wallet Status

**Responsibility:** Determines wallet status from cache or backend.

### Flow

```mermaid
flowchart TD
    Start["invoke()"]
    CheckCache{Wallet cached?}
    CheckTimeout["CheckIsWalletTimedOutUseCase"]
    TimeoutResult{Timed out?}
    ReturnTimeout["Return WALLET_TIMED_OUT"]
    CheckReclaim["CheckIsWalletInAppReclaimUseCase"]
    ReclaimResult{In reclaim?}
    ReturnReclaim["Return BLOCKED_FOR_APP_RECLAIM"]
    ReturnActive["Return ACTIVE"]
    FetchOnline["FetchWalletStatusOnlineUseCase"]
    ReturnFetched["Return fetched status"]

    Start --> CheckCache
    CheckCache -->|Yes| CheckTimeout
    CheckCache -->|No| FetchOnline
    CheckTimeout --> TimeoutResult
    TimeoutResult -->|Yes| ReturnTimeout
    TimeoutResult -->|No| CheckReclaim
    CheckReclaim --> ReclaimResult
    ReclaimResult -->|Yes| ReturnReclaim
    ReclaimResult -->|No| ReturnActive
    FetchOnline --> ReturnFetched
```

### Output: WalletStatus

| Status | Meaning |
|--------|---------|
| **USER_NOT_LOGGED_IN** | User not authenticated |
| **WALLET_FETCH_PENDING** | Fetching from backend |
| **DOES_NOT_EXIST** | No wallet created |
| **FULL_KYC_NEEDED** | KYC not complete |
| **ACTIVE** | Wallet usable |
| **BLOCKED_FOR_BACKEND_RECLAIM** | Backend reclaim active |
| **BLOCKED_USER** | User blocked |
| **BLOCKED_FOR_APP_RECLAIM** | App reclaim active |
| **WALLET_TIMED_OUT** | Wallet timed out |
| **KYC_INITIATED** | KYC in progress |
| **CHALO_TIME_UNAVAILABLE** | Time sync failed |

---

## Wallet Sync

**Responsibility:** Core sync operation that fetches wallet state and transactions from backend.

### Flow

```mermaid
flowchart TD
    Start["invoke(shouldFetchTransactions)"]
    CheckCached{Wallet cached?}

    subgraph NotCached["Not Cached Flow"]
        CheckPrefs["Check NoWalletStatus prefs"]
        PrefsResult{Status?}
        DoesNotExist["Return KYC_NOT_DONE"]
        KycInitiated["Fetch from backend"]
        WalletCached["Fetch from backend"]
        FetchPending["Fetch from backend"]
    end

    subgraph Cached["Cached Flow"]
        GetChaloTime["Get chaloTime"]
        CheckAppReclaim["Check app reclaim period"]
        ReclaimActive{Reclaim active?}
        ReturnBlocked["Return BLOCKED_FOR_APP_RECLAIM"]
        CallRemote["Call sync API"]
        MergeWallets["Merge cached + fetched"]
    end

    SaveWallet["Save wallet + transactions"]
    MarkSynced["Mark unsynced as synced"]
    ReturnSuccess["Return Success"]
    HandleError["Handle error"]

    Start --> CheckCached
    CheckCached -->|No| CheckPrefs
    CheckCached -->|Yes| GetChaloTime
    CheckPrefs --> PrefsResult
    PrefsResult -->|DOES_NOT_EXIST| DoesNotExist
    PrefsResult -->|KYC_INITIATED| KycInitiated
    PrefsResult -->|WALLET_CACHED| WalletCached
    PrefsResult -->|FETCH_PENDING| FetchPending
    KycInitiated --> SaveWallet
    WalletCached --> SaveWallet
    FetchPending --> SaveWallet
    GetChaloTime --> CheckAppReclaim
    CheckAppReclaim --> ReclaimActive
    ReclaimActive -->|Yes| ReturnBlocked
    ReclaimActive -->|No| CallRemote
    CallRemote --> MergeWallets
    MergeWallets --> SaveWallet
    SaveWallet --> MarkSynced
    MarkSynced --> ReturnSuccess
    CallRemote -->|Error| HandleError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| **shouldFetchTransactions** | Boolean | Include transaction history |

### Output: WalletSyncResult

| Result | Content |
|--------|---------|
| **Success** | WalletAndAllTransactions |
| **Failure** | WalletSyncFailureReason |

### Failure Reasons

| Reason | Description |
|--------|-------------|
| **USER_NOT_LOGGED_IN** | User not authenticated |
| **KYC_NOT_DONE** | KYC incomplete |
| **BLOCKED_FOR_APP_RECLAIM** | App reclaim active |
| **CHALO_TIME_NOT_AVAILABLE** | Time sync failed |
| **API_FETCH_FAILED** | Network error |
| **WALLET_TIMED_OUT** | Timeout exceeded |

### Sync Operations

| Operation | Description |
|-----------|-------------|
| **Merge wallets** | Combine cached and fetched state |
| **Save transactions** | Store LoadMoney, QuickPay, ChaloPay |
| **Mark synced** | Update unsynced transactions |
| **Update timestamps** | Latest sync and oldest cached |

---

## Get Wallet And All Transactions

**Responsibility:** Returns combined wallet model and transaction list as a Flow.

### Flow

```mermaid
flowchart TD
    Start["invoke()"]
    TriggerSync["Trigger WalletSyncUseCase"]
    CombineFlows["Combine wallet + transactions flows"]
    SortTxns["Sort transactions by time DESC"]
    ReturnFlow["Return Flow<Result>"]

    Start --> TriggerSync
    TriggerSync --> CombineFlows
    CombineFlows --> SortTxns
    SortTxns --> ReturnFlow
```

### Output

| Field | Type | Description |
|-------|------|-------------|
| **wallet** | WalletAppModel | Wallet details |
| **allTransactions** | List<WalletTransactionAppModel> | Sorted transactions |

---

## Get Wallet Load Config And Place Recharge Order

**Responsibility:** Fetches wallet load configuration and creates a recharge order.

### Flow

```mermaid
flowchart TD
    Start["invoke(amount, userId)"]
    FetchConfig["Fetch load balance config"]
    ValidateConfig{Config valid?}
    ConfigError["Return config error"]
    CreateOrder["Create recharge order"]
    OrderResult{Success?}
    ReturnCombined["Return config + order"]
    OrderError["Return order error"]

    Start --> FetchConfig
    FetchConfig --> ValidateConfig
    ValidateConfig -->|No| ConfigError
    ValidateConfig -->|Yes| CreateOrder
    CreateOrder --> OrderResult
    OrderResult -->|Yes| ReturnCombined
    OrderResult -->|No| OrderError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| **amount** | Int | Recharge amount (smallest unit) |
| **userId** | String | User identifier |

### Output: WalletLoadBalanceConfigAndRechargeOrderCombined

| Field | Type | Description |
|-------|------|-------------|
| **walletConfig** | WalletLoadBalanceConfigListAppModel | Load config |
| **rechargeOrderAppModel** | CreateOrderResponseAppModel | Order details |

### Config Validation

| Check | Validation |
|-------|------------|
| **Not empty** | Config list has entries |
| **Valid agency** | Agency info present |
| **Payment modes** | At least one mode |

---

## Load Money Amount Validation

**Responsibility:** Validates user-entered amount against configured limits.

### Flow

```mermaid
flowchart TD
    Start["invoke(amountString)"]
    ParseAmount["Parse amount string"]
    ParseResult{Valid number?}
    ParseError["Return parse error"]
    CheckMin{>= minAmount?}
    MinError["Return min error"]
    CheckMax{<= maxAmount?}
    MaxError["Return max error"]
    ReturnValid["Return validated amount"]

    Start --> ParseAmount
    ParseAmount --> ParseResult
    ParseResult -->|No| ParseError
    ParseResult -->|Yes| CheckMin
    CheckMin -->|No| MinError
    CheckMin -->|Yes| CheckMax
    CheckMax -->|No| MaxError
    CheckMax -->|Yes| ReturnValid
```

### Output

| Result | Content |
|--------|---------|
| **Success** | Validated amount in smallest unit |
| **Failure** | LoadMoneyValidationError |

### Validation Errors

| Error | Meaning |
|-------|---------|
| **INVALID_FORMAT** | Not a valid number |
| **BELOW_MINIMUM** | Amount too low |
| **ABOVE_MAXIMUM** | Amount too high |

---

## Add Processing Load Money Transactions And Sync Wallet

**Responsibility:** After payment, adds transaction and syncs wallet.

### Flow

```mermaid
flowchart TD
    Start["invoke(paymentData)"]
    CreateTxn["Create transaction entity"]
    SaveTxn["Save to database"]
    SyncWallet["Trigger wallet sync"]
    MarkSynced["Mark transaction synced"]
    ReturnAmount["Return amount added"]

    Start --> CreateTxn
    CreateTxn --> SaveTxn
    SaveTxn --> SyncWallet
    SyncWallet --> MarkSynced
    MarkSynced --> ReturnAmount
```

### Input: LoadMoneyPaymentCompleteData

| Field | Type | Description |
|-------|------|-------------|
| **orderId** | String | Order reference |
| **amount** | Int | Recharge amount |
| **transactionTime** | Long | Payment timestamp |
| **transactionId** | String | Transaction ID |
| **paymentMode** | String | Payment method |
| **userId** | String | User ID |
| **walletId** | String | Wallet ID |

---

## Validate Quick Pay

**Responsibility:** Validates that user has sufficient balance for Quick Pay amount.

### Flow

```mermaid
flowchart TD
    Start["invoke(amount)"]
    GetWallet["Get wallet model"]
    WalletResult{Wallet found?}
    NoWallet["Return WalletNotFound"]
    CheckBalance{amount <= balance?}
    Sufficient["Return Success(wallet, remaining)"]
    Insufficient["Return InsufficientBalance(remaining)"]

    Start --> GetWallet
    GetWallet --> WalletResult
    WalletResult -->|No| NoWallet
    WalletResult -->|Yes| CheckBalance
    CheckBalance -->|Yes| Sufficient
    CheckBalance -->|No| Insufficient
```

### Output: QuickPayValidationResult

| Result | Content |
|--------|---------|
| **Success** | wallet, remainingBalance |
| **InsufficientBalance** | remainingBalance |
| **WalletNotFound** | — |
| **UserNotFound** | — |
| **GeneralError** | — |

---

## Validate Quick Pay Amount

**Responsibility:** Validates Quick Pay amount format and limits.

### Flow

```mermaid
flowchart TD
    Start["invoke(amountString)"]
    ParseAmount["Parse amount string"]
    ParseResult{Valid?}
    ReturnIncorrect["Return INCORRECT_AMOUNT"]
    CheckMax{<= maxQuickPayAmount?}
    ReturnOverMax["Return INCORRECT_AMOUNT"]
    ReturnValid["Return validated amount"]

    Start --> ParseAmount
    ParseAmount --> ParseResult
    ParseResult -->|No| ReturnIncorrect
    ParseResult -->|Yes| CheckMax
    CheckMax -->|No| ReturnOverMax
    CheckMax -->|Yes| ReturnValid
```

### Output

| Result | TripAmountState |
|--------|-----------------|
| **Success** | CORRECT_AMOUNT |
| **Failure** | INCORRECT_AMOUNT |

---

## Satisfies Quick Pay Prerequisites

**Responsibility:** Checks if user meets all Quick Pay requirements.

### Prerequisites Checked

| Check | Requirement |
|-------|-------------|
| **Wallet active** | Wallet status is ACTIVE |
| **KYC complete** | KYC verified |
| **Device registered** | Device ID linked |

### Output

| Returns | Meaning |
|---------|---------|
| **true** | All prerequisites met |
| **false** | One or more missing |

---

## Register User (KYC)

**Responsibility:** Registers user for wallet KYC.

### Flow

```mermaid
flowchart TD
    Start["invoke()"]
    CreateEntry["Create wallet entry in DB"]
    CallAPI["Register with backend"]
    ReturnRef["Return reference number"]

    Start --> CreateEntry
    CreateEntry --> CallAPI
    CallAPI --> ReturnRef
```

### Output

| Field | Type | Description |
|-------|------|-------------|
| **referenceNum** | String | OTP reference |
| **userId** | String | User identifier |

---

## Submit KYC

**Responsibility:** Submits KYC details with OTP verification.

### Flow

```mermaid
flowchart TD
    Start["invoke(referenceNum, otp, userName)"]
    CallAPI["Submit KYC to backend"]
    CheckResult{Success?}
    ActivateWallet["Update wallet status to ACTIVE"]
    ReturnSuccess["Return activation response"]
    ReturnError["Return error"]

    Start --> CallAPI
    CallAPI --> CheckResult
    CheckResult -->|Yes| ActivateWallet
    ActivateWallet --> ReturnSuccess
    CheckResult -->|No| ReturnError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| **referenceNum** | String | From registration |
| **otp** | String | SMS OTP |
| **userName** | String | User's name |

### Output

| Result | Content |
|--------|---------|
| **Success** | MinKycSubmitDataResponseAppModel |
| **Failure** | SubmitKycError |

### KYC Errors

| Error | Description |
|-------|-------------|
| **SubmitKycUiError** | Retryable UI error |
| **GenericError** | Non-retryable error |

---

## Domain Models

### WalletAppModel

| Field | Type | Description |
|-------|------|-------------|
| **walletId** | String | Wallet identifier |
| **userId** | String | User identifier |
| **cachedWalletStatus** | CachedWalletStatus | Local status |
| **remainingBalance** | Int | Balance (smallest unit) |
| **remainingLoadLimit** | Long | Load limit remaining |
| **walletReclaimTime** | Long? | Reclaim timestamp |

### CachedWalletStatus

| Status | Description |
|--------|-------------|
| **ACTIVE** | Wallet usable |
| **APP_RECLAIM** | App-side reclaim |
| **WALLET_TIMED_OUT** | Timeout exceeded |
| **BACKEND_RECLAIM** | Backend reclaim |

### WalletTransactionAppModel

| Field | Type | Description |
|-------|------|-------------|
| **transactionId** | String | Transaction ID |
| **walletId** | String | Wallet ID |
| **userId** | String | User ID |
| **orderId** | String | Order reference |
| **amount** | Int | Amount |
| **transactionStatus** | WalletTransactionStatus | Status |
| **transactionType** | WalletTransactionType | Type |
| **transactionTime** | Long | Timestamp |
| **synced** | Boolean | Sync status |

### WalletTransactionType

| Type | Description |
|------|-------------|
| **QUICK_PAY** | Tap-to-pay |
| **LOAD_MONEY** | Wallet recharge |
| **CHALO_PAY** | Checkout payment |

### WalletTransactionStatus

| Status | Description |
|--------|-------------|
| **PROCESSING** | In progress |
| **COMPLETED** | Success |
| **FAILED** | Failed |
| **RECLAIMED** | Reclaimed |

---

## Business Rules

| Rule | Description | Enforced By |
|------|-------------|-------------|
| **Active wallet required** | Must have active wallet for operations | GetWalletStatusUseCase |
| **KYC required** | KYC must be complete | WalletSyncUseCase |
| **Balance check** | Amount <= balance for Quick Pay | ValidateQuickPayUseCase |
| **Amount limits** | Within min/max for load money | LoadMoneyAmountValidationUseCase |
| **Reclaim period** | No sync during app reclaim | WalletSyncUseCase |

---

## Sequence Diagrams

### Wallet Sync Sequence

```mermaid
sequenceDiagram
    participant UI as WalletBalanceComponent
    participant UC as WalletSyncUseCase
    participant Merge as MergeCachedWalletUseCase
    participant Repo as WalletRepository
    participant API as Backend

    UI->>UC: invoke(true)
    UC->>Repo: Check cached wallet
    Repo-->>UC: Cached wallet (if any)

    alt Not cached
        UC->>Repo: Check NoWalletStatus
        Repo-->>UC: Status
    end

    UC->>Repo: syncWalletAndFetchTransactions()
    Repo->>API: POST /wallet/sync
    API-->>Repo: WalletHistorySyncResponse

    alt Has cached
        UC->>Merge: merge(cached, fetched)
        Merge-->>UC: Merged wallet
    end

    UC->>Repo: updateWalletAndTransactions()
    Repo-->>UC: Saved
    UC-->>UI: Success(WalletAndAllTransactions)
```

### Load Money Sequence

```mermaid
sequenceDiagram
    participant UI as LoadMoneyComponent
    participant Config as GetWalletLoadConfigUseCase
    participant Add as AddProcessingLoadMoneyUseCase
    participant Repo as WalletRepository
    participant Checkout as Checkout

    UI->>Config: invoke(amount, userId)
    Config->>Repo: getWalletLoadBalanceConfig()
    Repo-->>Config: Config
    Config->>Repo: placeWalletLoadBalanceRechargeOrder()
    Repo-->>Config: Order
    Config-->>UI: Combined(config, order)

    UI->>Checkout: Navigate with order
    Checkout-->>UI: Payment result

    UI->>Add: invoke(paymentData)
    Add->>Repo: insertWalletTransactionAndLoadMoney()
    Add->>Repo: syncWallet()
    Repo-->>Add: Synced
    Add-->>UI: AmountAdded
```

---

## Error Handling

### Exception Types

| Exception | When Thrown |
|-----------|-------------|
| **SyncWalletException** | Sync API failed |
| **WalletLoadBalanceRechargeOrderCreationException** | Order creation failed |
| **SubmitKycApiException** | KYC API failed |

### Recovery Strategies

| Error | Strategy |
|-------|----------|
| **Sync failed** | Use cached data, show retry |
| **Order failed** | Show error, allow retry |
| **KYC failed** | Show specific error, allow retry |
| **Insufficient balance** | Offer load money option |
