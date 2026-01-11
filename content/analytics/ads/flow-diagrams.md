# Ads analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- All ad events are tracked with `sendToPlotline = false` and `frequency = Always`
- Native inline ads support prefetching, indicated by `nativeAdLoadSource` attribute
- Ad targeting parameters (city, language, location) are added to all ad requests
- Revenue tracking happens via paid impression events with `valueMicros`, `currencyCode`, `precision`, and `responseId`

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

## Funnel: Adjust Attribution Callbacks

Adjust SDK callbacks received by the app (used for attribution diagnostics).

```mermaid
flowchart TD
  ui_adjust([Adjust SDK callback]) --> ev_attribution["Adjust Attribution Received"]
  ui_adjust --> ev_labelInfo["Adjust Label Info Received"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_attribution,ev_labelInfo event;
  class ui_adjust ui;
```

### Adjust Attribution Attributes by Event

```mermaid
flowchart TD
  ev_attribution["Adjust Attribution Received<br/>─────────────<br/>[Adjust]Network<br/>[Adjust]Campaign<br/>[Adjust]Adgroup<br/>[Adjust]Creative<br/>[Adjust]TrackerName<br/>[Adjust]ReferrerDeviceId (optional)<br/>[Adjust]ReferrerMobileNumber (optional)"]

  ev_labelInfo["Adjust Label Info Received<br/>─────────────<br/>[Adjust]ReferrerDeviceId (optional)<br/>[Adjust]ReferrerMobileNumber (optional)<br/>[Adjust]ReferredMobileNumber<br/>[Adjust]ReferredDeviceId"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  class ev_attribution,ev_labelInfo event;
```

## Ad Placements Overview

The app uses two types of ads across four placements:

**Native Inline Ads:**
- Route Details screen (`screen = "route details"`, `source = "route details"`)
- Checkout Payment Methods screen (`screen = "checkout payment methods"`, `source = "checkoutPaymentActivity"`)

**Banner Ads:**
- Home Screen (`screen = "home screen"`, `source = "homeScreenTab"`)
- Regular Bus Screen (`screen = "regular bus screen"`, `source = "regularBusScreenTab"`)

## Native Inline Ad Flow (Route Details & Checkout Payment Methods)

Complete lifecycle from request to revenue tracking.

```mermaid
flowchart TD
  ui_screen([Route Details or Checkout Payment Methods screen]) --> ev_requested["native inline ad requested"]

  ev_requested --> ui_loading([Ad loading...])
  ui_loading --> ev_loaded["native inline ad loaded"]

  ev_loaded --> ui_binding([Ad binds to view])
  ui_binding --> ev_rendered["native inline ad rendered"]

  ev_rendered --> ui_visible([Ad visible to user])
  ui_visible --> ev_impression["native inline ad impression"]

  ui_visible -->|User clicks| ev_clicked["native inline ad clicked"]

  ev_impression --> ev_paidImpression["native inline ad paid impression"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_requested,ev_loaded,ev_rendered,ev_impression,ev_clicked,ev_paidImpression event;
  class ui_screen,ui_loading,ui_binding,ui_visible ui;
```

### Native Inline Ad Attributes by Event

```mermaid
flowchart TD
  ev_requested["native inline ad requested<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>screen"]

  ev_loaded["native inline ad loaded<br/>─────────────<br/>screen<br/>adUnitId<br/>placement (default)<br/>nativeAdLoadTime<br/>nativeAdAspectRatio (ratio)<br/>nativeAdLoadSource (direct/prefetch)<br/>nativeAdAdditionalData"]

  ev_rendered["native inline ad rendered<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>hasVideo<br/>nativeAdLoadSource<br/>nativeAdAspectRatio (ratio)<br/>screen"]

  ev_impression["native inline ad impression<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>hasVideo<br/>nativeAdLoadSource<br/>nativeAdAspectRatio (ratio)<br/>screen"]

  ev_clicked["native inline ad clicked<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>hasVideo<br/>nativeAdLoadSource<br/>nativeAdAspectRatio (ratio)<br/>screen"]

  ev_paidImpression["native inline ad paid impression<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>hasVideo<br/>nativeAdLoadSource<br/>nativeAdAspectRatio (ratio)<br/>screen<br/>valueMicros<br/>currencyCode<br/>precision<br/>responseId"]

  ev_requested --> ev_loaded
  ev_loaded --> ev_rendered
  ev_rendered --> ev_impression
  ev_impression --> ev_paidImpression
  ev_rendered -.->|optional| ev_clicked

  classDef event fill:#166534,stroke:#166534,color:#ffffff;

  class ev_requested,ev_loaded,ev_rendered,ev_impression,ev_clicked,ev_paidImpression event;
```

## Banner Ad Flow (Home Screen & Regular Bus Screen)

Complete lifecycle from request to revenue tracking.

```mermaid
flowchart TD
  ui_screen([Home Screen or Regular Bus Screen]) --> ev_requested["banner ad requested"]

  ev_requested --> ui_loading([Ad loading...])
  ui_loading --> ev_loaded["banner ad loaded"]

  ev_loaded --> ui_visible([Ad visible to user])
  ui_visible --> ev_impression["banner ad impression"]

  ui_visible -->|User clicks| ev_clicked["banner ad clicked"]

  ev_impression --> ev_paidImpression["banner ad paid impression"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_requested,ev_loaded,ev_impression,ev_clicked,ev_paidImpression event;
  class ui_screen,ui_loading,ui_visible ui;
```

### Banner Ad Attributes by Event

```mermaid
flowchart TD
  ev_requested["banner ad requested<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>screen"]

  ev_loaded["banner ad loaded<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>screen<br/>adLoadTime"]

  ev_impression["banner ad impression<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>screen"]

  ev_clicked["banner ad clicked<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>screen"]

  ev_paidImpression["banner ad paid impression<br/>─────────────<br/>adUnitId<br/>placement (default)<br/>screen<br/>valueMicros<br/>currencyCode<br/>precision<br/>responseId"]

  ev_requested --> ev_loaded
  ev_loaded --> ev_impression
  ev_impression --> ev_paidImpression
  ev_loaded -.->|optional| ev_clicked

  classDef event fill:#166534,stroke:#166534,color:#ffffff;

  class ev_requested,ev_loaded,ev_impression,ev_clicked,ev_paidImpression event;
```

## Building Funnels

### Native Inline Ad Performance Funnel

For analyzing native ad performance on Route Details or Checkout Payment Methods:

```
native inline ad requested
  → native inline ad loaded (measure load success rate, load time)
  → native inline ad rendered (measure render success rate)
  → native inline ad impression (measure impression rate)
  → native inline ad clicked (measure CTR)
  → native inline ad paid impression (measure revenue)
```

**Key Metrics:**
- **Load Success Rate**: `loaded / requested`
- **Render Success Rate**: `rendered / loaded`
- **Impression Rate**: `impression / rendered`
- **Click-Through Rate (CTR)**: `clicked / impression`
- **Average Load Time**: `avg(nativeAdLoadTime)` from loaded events
- **Prefetch Effectiveness**: Compare `nativeAdLoadTime` by `nativeAdLoadSource`
- **Revenue per Impression**: `sum(valueMicros) / count(impression)`

**Segmentation:**
- By `screen` (route details vs checkout payment methods)
- By `nativeAdLoadSource` (direct vs prefetch)
- By `nativeAdAspectRatio` (ratio buckets; e.g., `>= 1.6` ≈ landscape)
- By `hasVideo` (video ads vs non-video ads)

### Banner Ad Performance Funnel

For analyzing banner ad performance on Home Screen or Regular Bus Screen:

```
banner ad requested
  → banner ad loaded (measure load success rate, load time)
  → banner ad impression (measure impression rate)
  → banner ad clicked (measure CTR)
  → banner ad paid impression (measure revenue)
```

**Key Metrics:**
- **Load Success Rate**: `loaded / requested`
- **Impression Rate**: `impression / loaded`
- **Click-Through Rate (CTR)**: `clicked / impression`
- **Average Load Time**: `avg(adLoadTime)` from loaded events
- **Revenue per Impression**: `sum(valueMicros) / count(impression)`

**Segmentation:**
- By `screen` (home screen vs regular bus screen)

### Cross-Ad Comparison

Compare performance across all ad placements:

**By Screen:**
- Route Details (native inline)
- Checkout Payment Methods (native inline)
- Home Screen (banner)
- Regular Bus Screen (banner)

**By Ad Type:**
- Native Inline Ads (more attributes, prefetch support)
- Banner Ads (simpler lifecycle)

### Revenue Analysis

Use paid impression events for revenue tracking:

```
Filter: event = "native inline ad paid impression" OR "banner ad paid impression"

Metrics:
- Total Revenue: sum(valueMicros) / 1,000,000 grouped by currencyCode
- Revenue by Screen: sum(valueMicros) grouped by screen
- Revenue by Ad Type: sum(valueMicros) grouped by event type
- Average Revenue per Impression: sum(valueMicros) / count(impressions)
```

## Important Notes for PM Dashboards

1. **All events have `placement = "default"`**: This attribute doesn't segment ads; use `screen` instead.

2. **Native ads have unique attributes**:
   - `nativeAdLoadSource`: Distinguish direct loads vs prefetched ads
   - `nativeAdAspectRatio`: Raw aspect ratio float (bucket in dashboards if needed)
   - `hasVideo`: Identify video vs static ads
   - `nativeAdAdditionalData`: Optional custom metadata from components

3. **Load time tracking**:
   - Native ads: `nativeAdLoadTime` in "native inline ad loaded"
   - Banner ads: `adLoadTime` in "banner ad loaded"

4. **Click events are optional**: Not all impressions result in clicks; use impression events as the denominator for CTR.

5. **Paid impressions contain revenue data**: Use `valueMicros`, `currencyCode`, `precision`, and `responseId` for monetization analysis.

6. **Source attribution**:
   - Route Details: `source = "route details"`
   - Checkout Payment Methods: `source = "checkoutPaymentActivity"`
   - Home Screen: `source = "homeScreenTab"`
   - Regular Bus Screen: `source = "regularBusScreenTab"`

7. **Event frequency**: All events are tracked with `frequency = Always` (not sampled).

8. **Plotline integration**: All ad events have `sendToPlotline = false`.
