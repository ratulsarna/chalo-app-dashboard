# Card analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The Card flow has multiple independent paths: **Chalo Card** operations, **NCMC** operations, and **Tap** operations
- Users can enter from multiple entry points (home screen, drawer)
- Chalo Card and NCMC have different recharge flows
- Not all events fire in sequence - some are parallel or conditional based on card type

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

## Entry points → card type branches

```mermaid
flowchart TD
  ui_home([Home screen]) --> ev_homeRechargeCard["ocr homescreen card recharge card"]
  ev_homeRechargeCard --> ev_tutorialShown["ocr tutorial bottomsheet displayed"]
  ev_tutorialShown --> ev_tutorialNext["ocr tutorial bottomsheet next clicked"]

  ev_homeRechargeCard --> ui_branch([Card type selection])
  ev_tutorialNext --> ui_branch

  ui_branch -->|Chalo Card| ui_chaloCardBranch([Chalo Card flow])
  ui_branch -->|NCMC Card| ui_ncmcBranch([NCMC flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_homeRechargeCard,ev_tutorialShown,ev_tutorialNext event;
  class ui_home,ui_branch,ui_chaloCardBranch,ui_ncmcBranch ui;
```

## Funnel: Chalo Card info → link or recharge

```mermaid
flowchart TD
  ui_cardInfo([Chalo Card info screen]) --> ev_screenOpen["chalo card info screen opened"]

  ev_screenOpen --> ev_fetchSuccess["chalo card info fetch success"]
  ev_screenOpen --> ev_fetchFailed["chalo card info fetch failed"]
  ev_screenOpen --> ev_noCard["no linked chalo card found"]

  ev_fetchSuccess --> ev_refreshClicked["refresh chalo card info clicked"]
  ev_fetchSuccess --> ev_addMoney["chalo card info add money clicked"]
  ev_fetchSuccess --> ev_showTransactions["chalo card info show transaction history btn clicked"]
  ev_fetchSuccess --> ev_activePassClicked["chalo card info active pass card clicked"]

  ev_noCard --> ev_buyCard["chalo card buy new card btn clicked"]
  ev_noCard --> ev_linkTutorial["chalo card info link card tut link btn clicked"]

  ev_addMoney --> ui_rechargeFlow([Recharge flow])
  ev_showTransactions --> ui_transactionsFlow([Transactions flow])
  ev_linkTutorial --> ui_linkingFlow([Card linking flow])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_screenOpen,ev_fetchSuccess,ev_fetchFailed,ev_noCard,ev_refreshClicked,ev_addMoney,ev_showTransactions,ev_activePassClicked,ev_buyCard,ev_linkTutorial event;
  class ui_cardInfo,ui_rechargeFlow,ui_transactionsFlow,ui_linkingFlow ui;
```

## Funnel: Chalo Card linking

```mermaid
flowchart TD
  ui_linking([Card linking screen]) --> ev_linkingOpen["chalo card linking screen opened"]
  ev_linkingOpen --> ev_proceedClicked["chalocard link code proceed btn clicked"]

  ev_proceedClicked --> ev_linkSuccess["chalocard linking success"]
  ev_proceedClicked --> ev_linkFailed["chalo card linking failed"]

  ev_linkSuccess --> ui_cardInfo([Card info screen])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_linkingOpen,ev_proceedClicked,ev_linkSuccess,ev_linkFailed event;
  class ui_linking,ui_cardInfo ui;
```

## Funnel: Chalo Card recharge → payment → success

```mermaid
flowchart TD
  ui_enterCard([Enter card details]) --> ev_cardDetailsNext["ocr cardDetails next clicked"]
  ev_cardDetailsNext --> ev_validityCheck["ocr card validity checked"]

  ev_validityCheck --> ui_rechargeAmount([Recharge amount screen])
  ui_rechargeAmount --> ev_amountScreenOpen["chalo card enter recharge amount screen opened"]

  ev_amountScreenOpen --> ev_cardInfoSuccess["chalo card info fetch success"]
  ev_amountScreenOpen --> ev_cardInfoFailed["chalo card info fetch failed"]
  ev_amountScreenOpen --> ev_configFailed["chalo card recharge config fetch failed"]

  ev_cardInfoSuccess --> ev_proceedClicked["chalo card recharge proceed btn clicked"]
  ev_proceedClicked --> ev_amountError["ocr recharge amount error"]
  ev_proceedClicked --> ev_termsOpen["terms and conditions open"]

  ev_termsOpen --> ev_acceptTerms["terms accept"]
  ev_termsOpen --> ev_cancelTerms["terms cancel"]

  ev_acceptTerms --> ev_orderCreated["ocr order created"]
  ev_acceptTerms --> ev_orderFailed["ocr order creation failed"]

  ev_orderCreated --> ext_checkout[Checkout payment flow]
  ext_checkout --> ev_paymentSuccessOpen["ocr payment success activity open"]

  ev_paymentSuccessOpen --> ev_successOk["ocr payment success ok clicked"]
  ev_paymentSuccessOpen --> ev_successDetails["ocr payment success recharge details clicked"]

  ev_successDetails --> ev_summaryOpen["ocr payment summary activity open"]

  ev_orderFailed --> ev_errorAction["chalo card recharge error action btn clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_cardDetailsNext,ev_validityCheck,ev_amountScreenOpen,ev_cardInfoSuccess,ev_cardInfoFailed,ev_configFailed,ev_proceedClicked,ev_amountError,ev_termsOpen,ev_acceptTerms,ev_cancelTerms,ev_orderCreated,ev_orderFailed,ev_paymentSuccessOpen,ev_successOk,ev_successDetails,ev_summaryOpen,ev_errorAction event;
  class ui_enterCard,ui_rechargeAmount ui;
  class ext_checkout external;
```

## Funnel: Card transactions history

```mermaid
flowchart TD
  ui_transactions([Transactions screen]) --> ev_transactionsOpen["chalo card transactions opened"]
  ev_transactionsOpen --> ev_fetchResult["chalo card transactions fetch result"]

  ev_fetchResult -->|success| ev_transactionClicked["chalo card transaction clicked"]
  ev_fetchResult -->|success| ev_refreshClicked["chalo card transactions refresh clicked"]
  ev_fetchResult -->|success| ev_emailAll["chalo card transactions email all clicked"]

  ev_fetchResult -->|failure| ev_retryClicked["chalo card transactions retry clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_transactionsOpen,ev_fetchResult,ev_transactionClicked,ev_refreshClicked,ev_emailAll,ev_retryClicked event;
  class ui_transactions ui;
```

## Funnel: NCMC online recharge

```mermaid
flowchart TD
  ui_ncmcOnline([NCMC online recharge screen]) --> ev_viewCreated["ncmc load balance view created"]
  ev_viewCreated --> ev_nextClicked["ncmc load balance next clicked"]

  ev_nextClicked --> ev_tncAccepted["ncmc tnc accepted loading"]
  ev_tncAccepted --> ev_orderCreated["ncmc online recharge order created"]
  ev_tncAccepted --> ev_apiError["ncmc recharge api error"]

  ev_orderCreated --> ext_checkout[Checkout payment flow]
  ext_checkout --> ev_paymentSuccess["ncmc recharge payment successful"]
  ext_checkout --> ev_paymentFailed["ncmc recharge payment failed"]

  ev_paymentSuccess --> ev_completed["ncmc online recharge completed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_viewCreated,ev_nextClicked,ev_tncAccepted,ev_orderCreated,ev_apiError,ev_paymentSuccess,ev_paymentFailed,ev_completed event;
  class ui_ncmcOnline ui;
  class ext_checkout external;
```

## Funnel: NCMC offline recharge

```mermaid
flowchart TD
  ui_ncmcOffline([NCMC offline recharge screen]) --> ev_viewCreated["ncmc load balance view created"]
  ev_viewCreated --> ev_nextClicked["ncmc load balance next clicked"]

  ev_nextClicked --> ev_tncAccepted["ncmc tnc accepted loading"]
  ev_tncAccepted --> ev_offlineSuccess["ncmc offline recharge success"]
  ev_tncAccepted --> ev_apiError["ncmc recharge api error"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_viewCreated,ev_nextClicked,ev_tncAccepted,ev_offlineSuccess,ev_apiError event;
  class ui_ncmcOffline ui;
```

## Funnel: NCMC tap operations (NFC)

```mermaid
flowchart TD
  ui_tap([NCMC tap screen]) --> ev_intentHashFailed["uvik intent hash creation failed"]
  ui_tap --> ui_tapProcess([Tap operation processing])

  ui_tapProcess --> ev_tapSuccess["ncmc tap operation success"]
  ui_tapProcess --> ev_tapFailed["ncmc tap operation failure"]
  ui_tapProcess --> ev_tapUnavailable["ncmc tap operation result unavailable"]
  ui_tapProcess --> ev_transactionFailed["ncmc tap transaction failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_intentHashFailed,ev_tapSuccess,ev_tapFailed,ev_tapUnavailable,ev_transactionFailed event;
  class ui_tap,ui_tapProcess ui;
```

## Checkout payment events (shared across card types)

```mermaid
flowchart TD
  ui_checkout([Checkout flow]) --> ev_cardScreenOpen["card screen opened"]
  ev_cardScreenOpen --> ev_cardSubmitted["card details submitted"]

  ev_cardSubmitted --> ui_paymentResult([Payment processing])
  ui_paymentResult -->|Chalo Card| ev_chaloSuccess["online card recharge payment successful"]
  ui_paymentResult -->|Chalo Card| ev_chaloFailed["online card recharge payment failed"]
  ui_paymentResult -->|NCMC| ev_ncmcSuccess["ncmc recharge payment successful"]
  ui_paymentResult -->|NCMC| ev_ncmcFailed["ncmc recharge payment failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_cardScreenOpen,ev_cardSubmitted,ev_chaloSuccess,ev_chaloFailed,ev_ncmcSuccess,ev_ncmcFailed event;
  class ui_checkout,ui_paymentResult ui;
```

## Global events (can fire from anywhere)

```mermaid
flowchart TD
  ui_anyScreen([Any card screen]) --> ev_notification["chalo card transaction notification received"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_notification event;
  class ui_anyScreen ui;
```

## Complete flow overview

```mermaid
flowchart TD
  ui_entry([Entry: Home/Drawer]) --> ui_cardType{Card Type?}

  ui_cardType -->|Chalo Card| ui_chaloInfo([Chalo Card Info])
  ui_chaloInfo --> ui_chaloActions{Action?}
  ui_chaloActions -->|Link Card| flow_linking[Card Linking Flow]
  ui_chaloActions -->|Add Money| flow_chaloRecharge[Chalo Card Recharge Flow]
  ui_chaloActions -->|Transactions| flow_transactions[Transaction History Flow]

  ui_cardType -->|NCMC| ui_ncmcActions{NCMC Action?}
  ui_ncmcActions -->|Online Recharge| flow_ncmcOnline[NCMC Online Recharge Flow]
  ui_ncmcActions -->|Offline Recharge| flow_ncmcOffline[NCMC Offline Recharge Flow]
  ui_ncmcActions -->|Tap Operation| flow_tap[NCMC Tap Flow]

  flow_chaloRecharge --> flow_checkout[Checkout Payment]
  flow_ncmcOnline --> flow_checkout

  flow_checkout --> ui_success([Payment Success/Summary])

  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef flow fill:#dbeafe,stroke:#3b82f6,color:#111827;

  class ui_entry,ui_cardType,ui_chaloInfo,ui_chaloActions,ui_ncmcActions,ui_success ui;
  class flow_linking,flow_chaloRecharge,flow_transactions,flow_ncmcOnline,flow_ncmcOffline,flow_tap,flow_checkout flow;
```
