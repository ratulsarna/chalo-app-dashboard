# Bills analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The Bills flow has two main paths: **Bill Payment** (consumer number → amount → confirmation → payment) and **Payment History** (view past payments → view invoice)
- Users can enter from home screen drawer
- After payment completion, flow connects with Checkout payment flow (instrumented in payment module)
- Payment history can be accessed from fetch screen or as a standalone feature

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

## Entry point → Bill Payment or Payment History

```mermaid
flowchart TD
  ui_home([Home screen drawer]) --> ev_homeDrawer["eBill payment homescreen drawer clicked"]

  ev_homeDrawer --> ev_fetchOpened["eBill fetch screen opened"]

  ev_fetchOpened --> ui_branch([User action])
  ui_branch -->|Enter consumer number| ui_paymentFlow([Bill Payment Flow])
  ui_branch -->|View history| ui_historyFlow([Payment History Flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_homeDrawer,ev_fetchOpened event;
  class ui_home,ui_branch,ui_paymentFlow,ui_historyFlow ui;
```

## Funnel: Complete Bill Payment Flow

```mermaid
flowchart TD
  ui_fetchScreen([Consumer fetch screen]) --> ev_fetchOpened["eBill fetch screen opened"]

  ev_fetchOpened --> ui_authCheck{Logged in?}
  ui_authCheck -->|Yes| ui_enterNumber([User enters consumer number])
  ui_authCheck -->|No| ev_loginFlowStarted["eBill fetch screen login flow started"]
  ev_loginFlowStarted --> ui_login([Login flow])
  ui_login --> ev_loginSuccess["eBill fetch screen user login successful"]
  ev_loginSuccess --> ui_enterNumber
  ui_enterNumber --> ev_nextClicked["eBill fetch screen next btn clicked"]

  ev_nextClicked --> ui_checkPaid([Check payment status])
  ui_checkPaid -->|Already paid| ev_dialogShown["eBill payment already done dialog shown"]
  ui_checkPaid -->|Not paid| ev_amountOpened["eBill amount screen opend"]

  ev_dialogShown --> ev_dialogOk["eBill payment already done dialog ok clicked"]
  ev_dialogShown --> ev_dialogCancel["eBill payment already done dialog cancel clicked"]

  ev_dialogOk --> ev_amountOpened
  ev_dialogCancel --> ui_end([Flow cancelled])

  ev_amountOpened --> ui_amountScreen([Amount entry screen])
  ui_amountScreen --> ev_amountNext["eBill amount screen next btn clicked"]

  ev_amountNext --> ev_confirmOpened["eBill payment confirmation screen opened"]

  ev_confirmOpened --> ui_confirmScreen([Confirmation screen])
  ui_confirmScreen --> ev_payClicked["eBill payment confirmation screen payment btn clicked"]

  ev_payClicked --> ev_tncShown["eBill payment tnc dialog shown"]

  ev_tncShown --> ev_tncAccept["eBill payment tnc accept clicked"]
  ev_tncShown --> ev_tncReject["eBill payment tnc reject clicked"]

  ev_tncReject --> ui_end2([Flow cancelled])

  ev_tncAccept --> ev_orderCreated["eBill payment order created"]

  ev_orderCreated --> ext_checkout[Checkout Payment Flow]

  ext_checkout --> ev_successOpened["eBill payment success screen opened"]

  ev_successOpened --> ev_viewInvoice["eBill payment success screen view invoice clicked"]
  ev_successOpened --> ev_okClicked["eBill payment success screen ok clicked"]

  ev_viewInvoice --> ev_invoiceOpened["eBill payment invoice screen opened"]
  ev_okClicked --> ui_home([Return to home])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_fetchOpened,ev_loginFlowStarted,ev_loginSuccess,ev_nextClicked,ev_dialogShown,ev_dialogOk,ev_dialogCancel,ev_amountOpened,ev_amountNext,ev_confirmOpened,ev_payClicked,ev_tncShown,ev_tncAccept,ev_tncReject,ev_orderCreated,ev_successOpened,ev_viewInvoice,ev_okClicked,ev_invoiceOpened event;
  class ui_fetchScreen,ui_authCheck,ui_login,ui_enterNumber,ui_checkPaid,ui_amountScreen,ui_confirmScreen,ui_end,ui_end2,ui_home ui;
  class ext_checkout external;
```

## Funnel: Payment History Flow

```mermaid
flowchart TD
  ui_entryPoint([Entry point]) --> ui_entryChoice([Entry source])
  ui_entryChoice -->|From fetch screen| ev_historyBtnFetch["eBill fetch screen show history btn clicked"]
  ui_entryChoice -->|Direct navigation| ev_historyOpened["eBill payment history screen opened"]

  ev_historyBtnFetch --> ev_historyOpened

  ev_historyOpened --> ui_loadHistory([Load payment history])

  ui_loadHistory --> ev_loadSuccess["eBill payment history load success"]
  ui_loadHistory --> ev_loadError["eBill payment history load error"]

  ev_loadError --> ev_retryLoad["eBill payment history retry load"]
  ev_retryLoad --> ui_loadHistory

  ev_loadSuccess --> ui_historyList([Payment history list])
  ui_historyList --> ev_historyClicked["eBill payment history clicked"]

  ev_historyClicked --> ev_invoiceOpened["eBill payment invoice screen opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_historyBtnFetch,ev_historyOpened,ev_loadSuccess,ev_loadError,ev_retryLoad,ev_historyClicked,ev_invoiceOpened event;
  class ui_entryPoint,ui_entryChoice,ui_loadHistory,ui_historyList ui;
```

## Funnel: Consumer Fetch with Already-Paid Dialog

```mermaid
flowchart TD
  ui_fetchScreen([Consumer fetch screen]) --> ev_fetchOpened["eBill fetch screen opened"]

  ev_fetchOpened --> ui_actions([User actions])
  ui_actions -->|Enter consumer number| ev_nextClicked["eBill fetch screen next btn clicked"]
  ui_actions -->|View history| ev_historyBtn["eBill fetch screen show history btn clicked"]

  ev_historyBtn --> ui_historyFlow([Payment History Flow])

  ev_nextClicked --> ui_apiCall([Fetch bill API call])

  ui_apiCall -->|Bill already paid| ev_dialogShown["eBill payment already done dialog shown"]
  ui_apiCall -->|Bill not paid| ev_amountOpened["eBill amount screen opend"]

  ev_dialogShown --> ui_userChoice([User decision])
  ui_userChoice -->|Proceed anyway| ev_dialogOk["eBill payment already done dialog ok clicked"]
  ui_userChoice -->|Cancel| ev_dialogCancel["eBill payment already done dialog cancel clicked"]

  ev_dialogOk --> ev_amountOpened
  ev_dialogCancel --> ui_backToFetch([Return to fetch screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_fetchOpened,ev_nextClicked,ev_historyBtn,ev_dialogShown,ev_dialogOk,ev_dialogCancel,ev_amountOpened event;
  class ui_fetchScreen,ui_actions,ui_apiCall,ui_userChoice,ui_backToFetch,ui_historyFlow ui;
```

## Funnel: Payment Confirmation with T&C

```mermaid
flowchart TD
  ui_confirmScreen([Payment confirmation screen]) --> ev_confirmOpened["eBill payment confirmation screen opened"]

  ev_confirmOpened --> ui_reviewDetails([User reviews bill details])
  ui_reviewDetails --> ev_payClicked["eBill payment confirmation screen payment btn clicked"]

  ev_payClicked --> ev_tncShown["eBill payment tnc dialog shown"]

  ev_tncShown --> ui_tncChoice([User reads T&C])
  ui_tncChoice -->|Accept| ev_tncAccept["eBill payment tnc accept clicked"]
  ui_tncChoice -->|Reject| ev_tncReject["eBill payment tnc reject clicked"]

  ev_tncAccept --> ev_orderCreated["eBill payment order created"]
  ev_tncReject --> ui_backToConfirm([Return to confirmation screen])

  ev_orderCreated --> ext_checkout[Checkout Payment Flow]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_confirmOpened,ev_payClicked,ev_tncShown,ev_tncAccept,ev_tncReject,ev_orderCreated event;
  class ui_confirmScreen,ui_reviewDetails,ui_tncChoice,ui_backToConfirm ui;
  class ext_checkout external;
```

## Funnel: Payment Success and Invoice

```mermaid
flowchart TD
  ext_checkout[Checkout Payment Flow] --> ev_successOpened["eBill payment success screen opened"]

  ev_successOpened --> ui_successScreen([Payment success screen])

  ui_successScreen --> ui_userAction([User action])
  ui_userAction -->|View invoice| ev_viewInvoice["eBill payment success screen view invoice clicked"]
  ui_userAction -->|Return home| ev_okClicked["eBill payment success screen ok clicked"]

  ev_viewInvoice --> ev_invoiceOpened["eBill payment invoice screen opened"]
  ev_okClicked --> ui_home([Return to home screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_successOpened,ev_viewInvoice,ev_okClicked,ev_invoiceOpened event;
  class ui_successScreen,ui_userAction,ui_home ui;
  class ext_checkout external;
```

## Key Conversion Funnels for PMs

### Primary Payment Funnel (End-to-End)
```
1. eBill payment homescreen drawer clicked
2. eBill fetch screen opened
3. eBill fetch screen next btn clicked
4. eBill amount screen opend
5. eBill amount screen next btn clicked
6. eBill payment confirmation screen opened
7. eBill payment confirmation screen payment btn clicked
8. eBill payment tnc dialog shown
9. eBill payment tnc accept clicked
10. eBill payment order created
11. [Checkout Payment Flow - external]
12. eBill payment success screen opened
```

**Drop-off points to monitor:**
- Fetch screen → Amount screen (consumer number validation failures)
- Confirmation screen → T&C acceptance (user hesitation)
- T&C acceptance → Order creation (order creation API failures)
- Order creation → Success screen (payment gateway failures - tracked in checkout flow)

### Payment History Funnel
```
1. eBill fetch screen show history btn clicked (or direct navigation)
2. eBill payment history screen opened
3. eBill payment history load success
4. eBill payment history clicked
5. eBill payment invoice screen opened
```

**Drop-off points to monitor:**
- History screen → Load success (API failures)
- Load success → History item click (empty history or UX issues)

### Already-Paid Dialog Funnel
```
1. eBill fetch screen next btn clicked
2. eBill payment already done dialog shown
3. eBill payment already done dialog ok clicked (vs cancel clicked)
4. eBill amount screen opend
```

**Metrics to track:**
- Dialog shown rate (indicates repeat payment attempts)
- OK vs Cancel click rate (user intent to pay again)
