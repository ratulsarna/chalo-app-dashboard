# Help & Support analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- The help flow has three main branches: **Booking Help**, **SOS Emergency Alert**, and **Report Problem**
- Each branch operates independently with its own entry points and flows
- Context-specific help buttons can appear throughout the app and are tracked separately

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

## Entry Points: Three Main Help Branches

Help & support functionality is accessed through three independent entry points.

```mermaid
flowchart TD
  ui_home([Various App Screens]) --> ui_bookingHelp([Booking Help Entry])
  ui_home --> ui_sos([SOS Entry])
  ui_home --> ui_reportProblem([Report Problem Entry])

  ui_bookingHelp --> ev_bookingHelpOpen["booking help screen opened"]
  ui_sos --> ev_sosOpen["sos screen open"]
  ui_reportProblem --> ev_reportProblemClicked["report problem clicked v2"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_bookingHelpOpen,ev_sosOpen,ev_reportProblemClicked event;
  class ui_home,ui_bookingHelp,ui_sos,ui_reportProblem ui;
```

## Funnel 1: Booking Help → FAQ → Cancellation

This funnel tracks users who access booking-specific help and potentially cancel their bookings.

```mermaid
flowchart TD
  ui_bookingEntry([User accesses booking help]) --> ev_screenOpened["booking help screen opened"]

  ev_screenOpened --> ui_viewFaq([User views FAQs])
  ui_viewFaq --> ev_faqActionClicked["booking help faq action clicked"]

  ev_faqActionClicked -->|actionType: CANCEL_BOOKING| ui_cancelFlow([Cancellation initiated])
  ev_faqActionClicked -->|actionType: NONE| ui_noAction([No action taken])

  ui_cancelFlow --> ev_apiSuccess["booking cancel api success"]
  ui_cancelFlow --> ev_apiFailure["booking cancel api failure"]

  ev_apiSuccess --> ui_successSheet([Show success bottom sheet])
  ev_apiFailure --> ui_failureSheet([Show failure bottom sheet])

  ui_successSheet --> ev_positiveSuccess["booking help bottom sheet positive button clicked"]
  ui_failureSheet --> ev_positiveRetry["booking help bottom sheet positive button clicked"]
  ui_failureSheet --> ev_negativeCancel["booking help bottom sheet negative button clicked"]

  ev_positiveRetry -->|Retry cancellation| ui_cancelFlow
  ev_negativeCancel --> ui_exit([Exit flow])
  ev_positiveSuccess --> ui_exit

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_screenOpened,ev_faqActionClicked,ev_apiSuccess,ev_apiFailure,ev_positiveSuccess,ev_positiveRetry,ev_negativeCancel event;
  class ui_bookingEntry,ui_viewFaq,ui_cancelFlow,ui_noAction,ui_successSheet,ui_failureSheet,ui_exit ui;
```

## Funnel 2: SOS Emergency Alert → Contact Management → Alert Sending

This funnel tracks emergency SOS alert functionality including contact management and alert transmission.

```mermaid
flowchart TD
  ui_sosEntry([User accesses SOS screen]) --> ev_sosScreenOpen["sos screen open"]

  ev_sosScreenOpen --> ui_contactSetup([User manages emergency contacts])
  ui_contactSetup -->|Add contact fails| ev_contactPickFailed["sos contact pick failed"]
  ui_contactSetup -->|Contacts ready| ui_readyToSend([Ready to send alert])

  ev_contactPickFailed --> ui_contactSetup

  ui_readyToSend --> ev_sendAlertClicked["sos send alert clicked"]
  ev_sendAlertClicked --> ui_confirmDialog([Confirmation dialog shown])

  ui_confirmDialog --> ev_confirmSendClicked["sos confirm send alert clicked"]

  ev_confirmSendClicked --> ui_sendToContacts([Send message to contacts])
  ev_confirmSendClicked --> ui_raiseToBackend([Raise SOS to backend])

  ui_raiseToBackend --> ev_raiseSuccess["raise SOS success"]
  ui_raiseToBackend --> ev_raiseFailed["raise SOS failed"]

  ev_raiseSuccess --> ui_complete([SOS sent successfully])
  ev_raiseFailed --> ui_complete

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_sosScreenOpen,ev_contactPickFailed,ev_sendAlertClicked,ev_confirmSendClicked,ev_raiseSuccess,ev_raiseFailed event;
  class ui_sosEntry,ui_contactSetup,ui_readyToSend,ui_confirmDialog,ui_sendToContacts,ui_raiseToBackend,ui_complete ui;
```

## Funnel 3: Report Problem → Reclaim Operations

This funnel tracks general issue reporting and pass reclaim operations.

```mermaid
flowchart TD
  ui_reportEntry([User accesses report problem]) --> ev_reportClicked["report problem clicked v2"]

  ev_reportClicked --> ui_problemType([Select problem type])
  ui_problemType --> ev_featureEvent["Report Problem feature event"]

  ev_featureEvent --> ui_requestSent([Submit problem report])
  ui_requestSent --> ev_requestSent["Report Problem request sent"]
  ui_requestSent --> ev_parseError["Report Problem store parsing error"]

  ui_problemType -->|Reclaim flow| ui_reclaimEntry([Reclaim operations])

  ui_reclaimEntry --> ev_reclaimPass["reclaim pass"]
  ui_reclaimEntry --> ev_ssReclaim["ss reclaim"]
  ui_reclaimEntry --> ev_autoReclaim["auto reclaim for wallet migration"]

  ev_reclaimPass --> ui_reclaimCard([Show reclaim card])
  ev_ssReclaim --> ui_reclaimCard

  ui_reclaimCard --> ev_cardShown["reclaim card shown"]
  ev_cardShown --> ev_cardButtonClicked["reclaim card button clicked"]

  ev_cardButtonClicked --> ui_reclaimDialog([Show reclaim dialog])
  ui_reclaimDialog --> ev_dialogPositive["reclaim dialog positive button clicked"]
  ui_reclaimDialog --> ev_dialogNegative["reclaim dialog negative button clicked"]

  ev_dialogPositive --> ui_processReclaim([Process reclaim])
  ev_dialogNegative --> ui_cancelReclaim([Cancel reclaim])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_reportClicked,ev_featureEvent,ev_requestSent,ev_parseError,ev_reclaimPass,ev_ssReclaim,ev_autoReclaim,ev_cardShown,ev_cardButtonClicked,ev_dialogPositive,ev_dialogNegative event;
  class ui_reportEntry,ui_problemType,ui_requestSent,ui_reclaimEntry,ui_reclaimCard,ui_reclaimDialog,ui_processReclaim,ui_cancelReclaim ui;
```

## Context-Specific Help Buttons (Global)

Help buttons appear throughout the app on various screens. These are tracked independently.

```mermaid
flowchart TD
  ui_bleValidation([BLE Validation Screen]) --> ev_bleHelp["BLE validation help btn clicked"]
  ui_ticketSummary([Ticket Summary Screen]) --> ev_ticketHelp["ticket summary screen help button clicked"]
  ui_qrValidation([QR Validation Screen]) --> ev_qrHelp["qr validation screen help button clicked"]

  ev_bleHelp --> ui_helpResource([Help resource / FAQ / Support])
  ev_ticketHelp --> ui_helpResource
  ev_qrHelp --> ui_helpResource

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_bleHelp,ev_ticketHelp,ev_qrHelp event;
  class ui_bleValidation,ui_ticketSummary,ui_qrValidation,ui_helpResource ui;
```

## Funnel: Report Problem Feature (In-Flow Help)

Some flows use the shared Report Problem feature, which emits its own instrumentation when the list is rendered and when the user selects a problem.

```mermaid
flowchart TD
  ui_reportFeature([Report Problem feature UI]) --> ev_desc["Report Problem feature event description "]
  ev_desc --> ui_list([Problem list shown])
  ui_list --> ev_problemClicked["report problem feature problem clicked"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_desc,ev_problemClicked event;
  class ui_reportFeature,ui_list ui;
```

## Funnel: Chat Support (Freshchat)

```mermaid
flowchart TD
  ui_help([Help screen]) --> ui_chat{User opens chat}
  ui_chat --> ev_chat["chat screen"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_chat event;
  class ui_help,ui_chat ui;
```

## Funnel: Auto Reclaim (Background)

```mermaid
flowchart TD
  ui_autoReclaim([Auto reclaim attempt]) --> ev_autoReclaim["auto reclaim passes response"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_autoReclaim event;
  class ui_autoReclaim ui;
```

## Property Usage Patterns

### Booking Help Events
All booking help events include:
- `bookingId` - To track which booking the help request relates to
- `bookingHelpFaqCount` - Number of FAQs shown (on screen open)
- `bookingHelpFaqActionType` - Action selected (CANCEL_BOOKING, NONE)
- `bottomSheetType` - Type of bottom sheet for button clicks
- `pass status` / `message` - API response details for cancellation

### SOS Events
All SOS alert events include location and user context:
- `userMobile` - User's mobile number
- `lat` / `long` - Current GPS coordinates
- `timeStamp` - When the event occurred
- `sosSentSuccessfully` - Whether message sent to contacts (on confirm)
- `errorType` - Type of error (on failure events)

### Report Problem Events
Most events have minimal properties:
- `ss reclaim type` - For super saver reclaim operations
- `isDeviceAutoLinked` - For auto-link device scenarios

## Building Funnels

### Recommended Funnels

**1. Booking Cancellation Funnel:**
```
booking help screen opened
  → booking help faq action clicked (filter: actionType = CANCEL_BOOKING)
    → booking cancel api success OR booking cancel api failure
      → booking help bottom sheet positive/negative button clicked
```

**2. SOS Alert Success Funnel:**
```
sos screen open
  → sos send alert clicked
    → sos confirm send alert clicked (filter: sosSentSuccessfully = true)
      → raise SOS success
```

**3. SOS Alert Failure Funnel:**
```
sos screen open
  → sos send alert clicked
    → sos confirm send alert clicked (filter: sosSentSuccessfully = false)
      → raise SOS failed
```

**4. Reclaim Operations Funnel:**
```
reclaim card shown
  → reclaim card button clicked
    → reclaim dialog positive button clicked
```

### Segmentation Recommendations

- **Booking Help**: Segment by `bookingHelpFaqActionType` to see which actions are most common
- **SOS**: Segment by `errorType` to identify common failure modes
- **Cancellation**: Segment by `pass status` (Success vs Failed) to track API reliability
- **Help Buttons**: Track click-through rates by screen type to identify where users need most help
