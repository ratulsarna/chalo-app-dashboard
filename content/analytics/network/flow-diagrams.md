# Network analytics event flow diagrams

These diagrams help PMs and analysts stitch funnels for RTS socket behavior. Green boxes are the exact event strings emitted by the app; grey boxes are contextual states or external handshakes. Edges show the typical progression.

Visual key:
- Green solid boxes: analytics events (exact strings from `events.json`)
- Grey dashed pills: screens/states
- Grey dotted boxes: external hints or non-analytics steps

```mermaid
flowchart TD
  ui_config([Socket config fetch]) --> ev_configSuccess["crts config success"]
  ui_config --> ev_configFailed["crts config failed"]
  ev_configSuccess --> ev_cookie["starting crts connection with cookies"]
  ev_configSuccess --> ui_socketInit([Socket initialization])
  ev_cookie --> ui_socketInit

  ui_socketInit --> ev_connect["crts connect"]
  ev_connect --> ev_data["crts response"]
  ev_connect --> ev_disconnect["crts disconnect"]
  ev_connect --> ev_connectError["crts connect error"]
  ev_connect --> ev_connectTimeout["crts connect timeout"]
  ev_connect --> ev_crtsError["crts error"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_configSuccess,ev_configFailed,ev_cookie,ev_connect,ev_data,ev_disconnect,ev_connectError,ev_connectTimeout,ev_crtsError event;
  class ui_config,ui_socketInit ui;
``` 

```mermaid
flowchart LR
  ev_disconnect["crts disconnect"] --> ev_recover["crts reconnect attempt"]
  ev_recover --> ev_reconnect["crts reconnect"]
  ev_recover --> ev_reconnectError["crts reconnect error"]
  ev_reconnect --> ev_reconnectFailed["crts reconnect failed"]
  ev_reconnectError --> ev_reconnectFailed

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  class ev_disconnect,ev_recover,ev_reconnect,ev_reconnectError,ev_reconnectFailed event;
``` 

Notes:
- `crts_*` events flow continuously in the background while RTS subscriptions are active, so reconnection events accompany every long-running tracking session.
- `crts response` fires only once per subscription when the view model receives its first payload (see the `reference type` property for the originating request).

## Key Sync & Encryption

```mermaid
flowchart TD
  ui_worker([Background key sync worker]) --> ev_workerStarted["key sync worker started"]
  ev_workerStarted --> ui_sync{Key sync result}
  ui_sync -->|Success| ev_keySyncOk["encryption key sync success"]
  ui_sync -->|Failure| ev_keySyncFail["encryption key sync failed"]

  ui_crypto([Encrypt/decrypt payload]) --> ui_cryptoResult{Crypto result}
  ui_cryptoResult -->|Encrypt failure| ev_encryptFail["encryption failed"]
  ui_cryptoResult -->|Decrypt failure| ev_decryptFail["decryption failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_workerStarted,ev_keySyncOk,ev_keySyncFail,ev_encryptFail,ev_decryptFail event;
  class ui_worker,ui_sync,ui_crypto,ui_cryptoResult ui;
```

## City Data Sync (Routes & Config)

```mermaid
flowchart TD
  ui_cityData([City data refresh]) --> ui_cfg{Remote config fetch}
  ui_cfg -->|Error| ev_cfgErr["City data remote config fetch error"]

  ui_cityData --> ui_routes{Routes sync}
  ui_routes -->|Success| ev_routesOk["City data routes sync success"]
  ui_routes -->|Failure| ev_routesFail["City data routes sync failed"]

  ui_cityData --> ui_nearby{Nearby routes fetch}
  ui_nearby -->|Failure| ev_nearbyFail["Nearby routes fetch failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_cfgErr,ev_routesOk,ev_routesFail,ev_nearbyFail event;
  class ui_cityData,ui_cfg,ui_routes,ui_nearby ui;
```

## Bluetooth (BLE)

```mermaid
flowchart TD
  ui_bluetooth([User turns on Bluetooth]) --> ev_btOn["BLE system bluetooth turned on"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_btOn event;
  class ui_bluetooth ui;
```
