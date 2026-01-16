---
slug: architecture
lastUpdated: 2026-01-16
---

# Architecture

## Overview

The Chalo App follows **Clean Architecture** principles with a **Model-View-Intent (MVI)** pattern for the presentation layer. The architecture prioritizes testability, separation of concerns, and unidirectional data flow. Built on **Decompose** for navigation and lifecycle management and **Koin** for dependency injection, the architecture enables maximum code sharing while maintaining clear boundaries between layers.

## Architectural Layers

The codebase is organized into three primary layers, each with distinct responsibilities and dependency rules. Dependencies flow inward—outer layers depend on inner layers, never the reverse.

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer"]
        direction TB
        Screen["Screen<br/>(Compose UI)"]
        Component["Component<br/>(ViewModel equivalent)"]
        ViewState["ViewState / DataState"]
        SideEffects["Side Effects"]
    end

    subgraph Domain["Domain Layer"]
        direction TB
        UseCase["Use Cases<br/>(Business Logic)"]
        DomainModel["Domain Models"]
        RepoInterface["Repository Interfaces"]
    end

    subgraph Data["Data Layer"]
        direction TB
        RepoImpl["Repository<br/>Implementations"]
        RemoteDS["Remote<br/>Data Sources"]
        LocalDS["Local<br/>Data Sources"]
        Mappers["DTO ↔ Model<br/>Mappers"]
    end

    Screen -->|user actions| Component
    Component -->|state updates| Screen
    Component --> UseCase
    UseCase --> RepoInterface
    RepoInterface -.->|implemented by| RepoImpl
    RepoImpl --> RemoteDS
    RepoImpl --> LocalDS
    RepoImpl --> Mappers

    style Presentation fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Domain fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Data fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### Layer Responsibilities

| Layer | Contents | Dependency Rules |
|-------|----------|------------------|
| **Presentation** | Compose screens, Decompose components (ViewModels), view states, intents, side effects | Depends on Domain. No direct data layer access. |
| **Domain** | Use cases, domain models, repository interfaces | Pure Kotlin. No framework dependencies. No awareness of data sources. |
| **Data** | Repository implementations, remote/local data sources, API models, mappers | Implements Domain interfaces. Knows about Ktor, SQLDelight, DataStore. |

## MVI Pattern

The presentation layer uses **Model-View-Intent (MVI)**, a unidirectional data flow pattern that makes state changes predictable and testable.

### Data Flow

```mermaid
flowchart LR
    UI["Compose UI"]
    Component["Component"]
    DataState["DataState"]
    ViewState["ViewState"]
    SideEffects["Side Effects<br/>Channel"]

    UI -->|"ViewIntent"| Component
    Component -->|"processIntent()"| DataState
    DataState -->|"convertToUiState()"| ViewState
    ViewState -->|"recomposition"| UI
    Component -->|"emitSideEffect()"| SideEffects
    SideEffects -->|"one-time events"| UI

    style UI fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Component fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style DataState fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
    style ViewState fill:#1e3a5f,stroke:#8b5cf6,color:#f8fafc
    style SideEffects fill:#1e3a5f,stroke:#ef4444,color:#f8fafc
```

### MVI Type Parameters

Every screen component is parameterized by four types that define its contract with the UI.

| Parameter | Purpose | Example |
|-----------|---------|---------|
| **ViewIntent** | User actions dispatched from UI. Sealed interface with all possible user interactions. | `NumberEnteredIntent`, `NextClickIntent`, `BackPressedIntent` |
| **DataState** | Internal business state. Contains raw data from use cases, not formatted for display. | Loading flags, fetched models, validation errors |
| **ViewState** | Presentation state consumed by Compose. Contains UI-ready strings, colors, button states. | Formatted text, button enabled states, dialog visibility |
| **ViewSideEffect** | One-time events that shouldn't survive recomposition. | Navigation requests, toast messages, keyboard dismiss |

### State Transformation Flow

The component maintains two state representations to separate business concerns from presentation concerns.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> DataState: initialDataState()
    DataState --> DataState: updateState { }
    DataState --> ViewState: convertToUiState()
    ViewState --> UI: Compose observes
```

**DataState** holds the raw business data—whether a network call is in progress, the fetched domain model, any error codes. **ViewState** transforms this into UI-ready form—loading spinners, formatted strings, button configurations. This separation allows business logic testing without UI concerns and enables different UI representations of the same data.

### ChaloBaseStateMviComponent

All screen components extend a base class that provides the MVI infrastructure.

| Member | Type | Purpose |
|--------|------|---------|
| `dataState` | `StateFlow<DataState>` | Internal business state, updated via `updateState {}` |
| `viewState` | `Value<ViewState>` | Observable state for Compose, derived from DataState |
| `sideEffects` | `Flow<ViewSideEffect>` | Channel-backed flow for one-time events |
| `componentScope` | `CoroutineScope` | Lifecycle-aware scope, auto-cancelled on destroy |

| Method | Purpose |
|--------|---------|
| `initialDataState()` | Returns the starting DataState when component is created |
| `processIntent(intent)` | Handles user actions, typically via `when` expression |
| `convertToUiState(dataState)` | Transforms DataState to ViewState for UI consumption |
| `updateState { current -> new }` | Thread-safe state mutation |
| `emitSideEffect(effect)` | Sends one-time event to UI |
| `repeatOnStarted { }` | Runs block when lifecycle is at least STARTED, cancels otherwise |

### Intent Processing Pattern

When the UI dispatches an intent, the component processes it through a deterministic handler.

```mermaid
flowchart TB
    Intent["ViewIntent received"]
    When["when (intent)"]
    Handler1["handleNumberEntered()"]
    Handler2["handleNextClick()"]
    Handler3["handleBackPressed()"]
    State["updateState { }"]
    Effect["emitSideEffect()"]
    UseCase["UseCase.execute()"]

    Intent --> When
    When --> Handler1
    When --> Handler2
    When --> Handler3
    Handler1 --> State
    Handler2 --> UseCase
    UseCase --> State
    UseCase --> Effect
    Handler3 --> Effect

    style Intent fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style When fill:#374151,stroke:#6b7280,color:#f8fafc
```

Each intent type maps to a handler method. Handlers may update state immediately (for synchronous operations like text input) or launch coroutines (for async operations like API calls). The pattern ensures all state changes are traceable to specific user actions.

## Navigation with Decompose

**Decompose** provides the navigation and lifecycle infrastructure, replacing Jetpack Navigation with a multiplatform, testable alternative.

### Navigation Architecture

```mermaid
flowchart TB
    subgraph Root["RootComponent"]
        direction TB
        ChildStack["ChildStack<SceneArgs, Child>"]
        NavManager["ChaloNavigationManager"]
    end

    subgraph Children["Child Components"]
        direction LR
        Home["HomeComponent"]
        Bills["EBillFetchComponent"]
        Checkout["CheckoutComponent"]
        More["...80+ screens"]
    end

    subgraph Parent["Parent Components (Nested Flows)"]
        direction LR
        CheckoutParent["CheckoutParentComponent"]
        WalletParent["WalletParentComponent"]
        PassParent["SuperPassParentComponent"]
    end

    NavManager -->|"postNavigationRequest()"| ChildStack
    ChildStack --> Children
    Children --> Parent
    Parent -->|"internal stack"| Children

    style Root fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Children fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Parent fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### Navigation Concepts

| Concept | Purpose |
|---------|---------|
| **ChildStack** | Decompose's navigation stack holding screen configurations and component instances |
| **SceneArgs** | Serializable arguments defining a navigation destination, carries data between screens |
| **ChaloScenes** | Enum of all navigable destinations (~80+ screens), each with a route identifier |
| **ChaloNavigationManager** | Centralized navigation coordinator, emits navigation requests to RootComponent |
| **ParentComponent** | Manages nested navigation flows (e.g., checkout has its own internal stack) |

### Navigation Request Types

The navigation manager accepts several request types to handle different navigation patterns.

| Request | Behavior |
|---------|----------|
| **Navigate** | Push new screen onto stack, optionally with pop-up-to configuration |
| **GoBack** | Pop current screen, optionally pop to specific destination |
| **BuildStack** | Replace entire stack with new list of screens (for deep links) |
| **ClearAllAndNavigate** | Clear stack completely and navigate to single destination |

### Nested Navigation (Parent Components)

Complex flows like checkout or pass booking use **ParentComponent** to manage internal navigation independent of the main stack. The parent has its own ChildStack for internal screens while appearing as a single entry in the root stack.

```mermaid
flowchart TB
    subgraph RootStack["Root Navigation Stack"]
        Home["Home"]
        Checkout["CheckoutParentComponent"]
    end

    subgraph CheckoutInternal["Checkout Internal Stack"]
        PaymentMain["PaymentMainScreen"]
        UPI["UPIScreen"]
        Card["CardScreen"]
        PostPayment["PostPaymentScreen"]
    end

    RootStack --> CheckoutInternal

    style RootStack fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style CheckoutInternal fill:#1e3a5f,stroke:#10b981,color:#f8fafc
```

When the nested flow completes, it signals the parent to finish, which pops the entire parent from the root stack, returning the user to the screen before the flow began.

## Dependency Injection with Koin

**Koin** provides lightweight dependency injection across the entire codebase.

### Module Organization

Each feature defines its own Koin module, wiring together data, domain, and presentation layers.

```mermaid
flowchart TB
    subgraph App["Application Startup"]
        StartKoin["startKoin { }"]
    end

    subgraph Core["Core Modules"]
        CoreMod["sharedCoreModule"]
        NetworkMod["sharedNetworkModule"]
        AnalyticsMod["analyticsModule"]
    end

    subgraph Features["Feature Modules"]
        BillsMod["electricityBillModule"]
        WalletMod["walletModule"]
        CheckoutMod["checkoutModule"]
        MoreMods["...per feature"]
    end

    StartKoin --> Core
    StartKoin --> Features
    Features --> Core

    style App fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Core fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Features fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### Scope Guidelines

| Scope | Use For | Lifecycle |
|-------|---------|-----------|
| **single** | Repositories, data sources, managers, singletons | Application lifetime |
| **factory** | Use cases, components | Created fresh each time requested |

Repositories and data sources are singletons because they manage shared resources (HTTP clients, databases). Use cases and components are factories because each screen instance should have its own state.

### Component Creation

Components are created via a factory that retrieves dependencies from Koin.

```mermaid
sequenceDiagram
    participant Root as RootComponent
    participant Factory as AppComponentFactory
    participant Koin as Koin Container
    participant Component as FeatureComponent

    Root->>Factory: createComponent(args)
    Factory->>Koin: get<UseCase>()
    Factory->>Koin: get<NavigationManager>()
    Factory->>Koin: get<AnalyticsContract>()
    Factory->>Component: new Component(deps...)
    Component-->>Root: Component instance
```

The factory pattern keeps component constructors explicit about their dependencies while delegating resolution to Koin.

## Data Layer Patterns

### Repository Pattern

Repositories abstract data sources from the domain layer. The domain defines interfaces; the data layer provides implementations.

```mermaid
flowchart LR
    subgraph Domain["Domain Layer"]
        Interface["Repository<br/>Interface"]
    end

    subgraph Data["Data Layer"]
        Impl["Repository<br/>Implementation"]
        Remote["Remote<br/>DataSource"]
        Local["Local<br/>DataSource"]
        Mapper["Mappers"]
    end

    Interface -.->|implemented by| Impl
    Impl --> Remote
    Impl --> Local
    Impl --> Mapper
    Remote -->|API models| Mapper
    Local -->|DB models| Mapper
    Mapper -->|Domain models| Impl

    style Domain fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style Data fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### Data Source Responsibilities

| Data Source | Responsibility |
|-------------|----------------|
| **Remote** | HTTP calls via Ktor, returns API response models |
| **Local** | Database queries via SQLDelight, DataStore reads/writes |
| **Repository** | Coordinates remote/local, applies caching strategy, maps to domain models |

### Model Types

The codebase uses distinct model types at each layer boundary.

| Model Type | Layer | Characteristics |
|------------|-------|-----------------|
| **ApiModel** | Data (network) | Matches API JSON structure, nullable fields for safety, `@Serializable` |
| **DbModel** | Data (local) | Matches SQLDelight schema, generated from `.sq` files |
| **AppModel** | Domain | Clean domain representation, non-nullable where possible, business-meaningful names |
| **UIState** | Presentation | UI-ready formatting, includes styling information |

### Mapping Flow

```mermaid
flowchart LR
    API["API Response<br/>(ApiModel)"]
    Mapper1["toAppModel()"]
    Domain["Domain Model<br/>(AppModel)"]
    Mapper2["toUIState()"]
    UI["UI State<br/>(ViewState)"]

    API --> Mapper1 --> Domain --> Mapper2 --> UI

    style API fill:#374151,stroke:#6b7280,color:#f8fafc
    style Domain fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style UI fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
```

## Error Handling

### Result Types

Use cases return sealed result types that force callers to handle both success and failure cases.

| Result | Contains |
|--------|----------|
| **Success** | The requested data of type `S` |
| **Failure** | A domain-specific error of type `E` |

### Error Type Hierarchy

Each feature defines its own error types, keeping error handling domain-specific.

```mermaid
flowchart TB
    subgraph Network["Network Layer"]
        NetEx["NetworkException"]
        Timeout["TimeoutException"]
        Auth["AuthException"]
    end

    subgraph Feature["Feature Domain"]
        FeatureError["FeatureErrorType"]
        NotFound["NOT_FOUND"]
        Invalid["INVALID_INPUT"]
        APIFail["API_FAILED"]
    end

    Network -->|"mapped to"| Feature

    style Network fill:#374151,stroke:#6b7280,color:#f8fafc
    style Feature fill:#1e3a5f,stroke:#ef4444,color:#f8fafc
```

Network exceptions are caught in repositories and mapped to feature-specific error types. This keeps the domain layer ignorant of network implementation details.

### Exception Declaration

Repository methods declare their possible exceptions using `@Throws`, making failure modes explicit.

| Exception Type | When Thrown |
|----------------|-------------|
| **Feature-specific** | Business rule violations (e.g., ConsumerNotFoundException) |
| **ChaloLocalException** | Local parsing or storage failures |
| **CancellationException** | Coroutine cancellation (always allowed to propagate) |

## Platform Abstraction

### Expect/Actual Pattern

For simple platform differences, Kotlin's expect/actual mechanism provides compile-time safety.

```mermaid
flowchart TB
    subgraph Common["commonMain"]
        Expect["expect class<br/>PlatformContext"]
    end

    subgraph Android["androidMain"]
        ActualAndroid["actual class<br/>PlatformContext(context: Context)"]
    end

    subgraph iOS["iosMain"]
        ActualiOS["actual class<br/>PlatformContext()"]
    end

    Expect -.-> ActualAndroid
    Expect -.-> ActualiOS

    style Common fill:#1e3a5f,stroke:#3b82f6,color:#f8fafc
    style Android fill:#1e3a5f,stroke:#10b981,color:#f8fafc
    style iOS fill:#1e3a5f,stroke:#f59e0b,color:#f8fafc
```

### PlatformDependencyFactory

For complex platform code requiring runtime construction, the **PlatformDependencyFactory** pattern provides indirection without module-level dependencies.

| Platform Need | Factory Request | Result |
|---------------|-----------------|--------|
| HTTP Client | `ChaloHttpClientRequest` | Platform-configured Ktor HttpClient |
| Socket | `ChaloSocketRequest` | Platform-specific WebSocket implementation |
| Map Utilities | `MapUtilsRequest` | Android/iOS map helpers |

The factory is injected once at app startup, then used throughout shared code to obtain platform-specific implementations.

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **MVI over MVVM** | Unidirectional data flow makes state changes predictable and debugging easier. Single source of truth for screen state. |
| **Decompose over Jetpack Navigation** | True multiplatform support, better testability (no Android dependencies), component-based lifecycle. |
| **Repository interfaces in Domain** | Domain layer remains pure Kotlin with no framework dependencies, enabling unit testing without mocks. |
| **Separate DataState/ViewState** | Business logic testing doesn't require UI knowledge; UI changes don't affect business logic. |
| **Feature-specific error types** | Each feature handles its own failure modes with appropriate user messaging, avoiding generic error handling. |
| **Factory pattern for components** | Explicit dependency declaration while leveraging Koin for resolution. Easy to test with mock dependencies. |
