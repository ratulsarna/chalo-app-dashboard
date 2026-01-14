---
slug: tech-stack
lastUpdated: 2026-01-14
---

# Tech Stack

## Overview

`chalo-app-kmp` is built with Kotlin Multiplatform (KMP), enabling code sharing between Android and iOS while allowing platform-specific implementations where needed. The project leverages modern libraries for networking, persistence, UI, and navigation.

## Core Technologies

### Language & Platform

| Technology | Version | Purpose |
|------------|---------|---------|
| Kotlin | 2.2.20 | Primary language for all shared and Android code |
| Kotlin Multiplatform | 2.2.20 | Cross-platform code sharing framework |
| Swift/SwiftUI | — | iOS-specific UI code |

### Build System

| Tool | Version | Purpose |
|------|---------|---------|
| Gradle | 8.x | Build automation |
| Android Gradle Plugin | 8.13.0 | Android build tooling |
| CocoaPods | — | iOS dependency management |

## UI Framework

### Compose Multiplatform

| Library | Version | Purpose |
|---------|---------|---------|
| Compose Multiplatform | 1.9.1 | Cross-platform declarative UI |
| Compose UI | 1.8.0 | Core Compose UI components |
| Activity Compose | 1.10.1 | Android activity integration |

### Platform-Specific UI

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Lottie Compose | Android | 6.6.10 | Animation support |
| Compottie | Shared | 2.0.1 | KMP Lottie animations |
| Maps Compose | Android | 6.12.2 | Google Maps integration |
| Coil 3 | Shared | 3.3.0 | Image loading |

## Architecture & Navigation

### Decompose

| Library | Version | Purpose |
|---------|---------|---------|
| Decompose | 3.4.0 | Lifecycle-aware navigation and component architecture |
| Decompose Compose | 3.4.0 | Compose integration for Decompose |
| Essenty Lifecycle | 2.5.0 | Lifecycle management primitives |

Decompose provides:
- Type-safe navigation with `ChildStack`
- Component-based architecture with lifecycle awareness
- State preservation across configuration changes
- Back handler integration

## Dependency Injection

### Koin

| Library | Version | Purpose |
|---------|---------|---------|
| Koin Core | 4.1.1 | Multiplatform DI framework |
| Koin Android | 4.1.1 | Android-specific DI extensions |
| Koin Compose | 4.1.1 | Compose integration |

## Networking

### Ktor

| Library | Version | Purpose |
|---------|---------|---------|
| Ktor Client Core | 3.3.1 | HTTP client framework |
| Ktor Content Negotiation | 3.3.1 | JSON serialization |
| Ktor Serialization | 3.3.1 | Kotlinx serialization support |
| Ktor OkHttp | 3.3.1 | Android HTTP engine |
| Ktor Darwin | 3.3.1 | iOS HTTP engine |

### Supporting Libraries

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Socket.IO | Android | 1.0.2 | Real-time socket communication |
| Chucker | Android | 4.2.0 | HTTP inspection (debug builds) |

## Persistence

### SQLDelight

| Library | Version | Purpose |
|---------|---------|---------|
| SQLDelight | 2.1.0 | Type-safe SQL database |
| SQLDelight Android Driver | 2.1.0 | Android SQLite driver |
| SQLDelight Native Driver | 2.1.0 | iOS SQLite driver |
| SQLDelight Coroutines | 2.1.0 | Flow-based queries |
| SQLCipher | 4.11.0 | Database encryption (Android) |

### Preferences & DataStore

| Library | Version | Purpose |
|---------|---------|---------|
| DataStore Preferences | 1.1.7 | Typed key-value storage |
| Multiplatform Settings | 1.1.1 | Cross-platform preferences |
| Security Crypto | 1.1.0 | Encrypted SharedPreferences (Android) |

## Async & Reactive

### Coroutines

| Library | Version | Purpose |
|---------|---------|---------|
| Kotlinx Coroutines | 1.10.2 | Async programming |
| Kotlinx Coroutines Android | 1.10.2 | Android main dispatcher |
| Kotlinx DateTime | 0.7.1 | Date/time handling |

### Paging

| Library | Version | Purpose |
|---------|---------|---------|
| Paging Common | 3.3.0-alpha02 | Multiplatform paging |
| Paging Compose | 3.3.0-alpha02 | Compose paging integration |

## Payment Integrations

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Razorpay Custom UI | Android | 3.9.11 | Payment gateway |
| Juspay HyperSDK | Android | 2.0.6 | Payment orchestration |
| Inai SDK | Android | 0.1.36 | Payment processing |
| CCAvenue (Uvik) | Android | 1.1.0 | Payment gateway |

## Analytics & Monitoring

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Mixpanel | Android | 6.1.1 | User analytics |
| Firebase BOM | Android | 34.4.0 | Firebase services |
| Firebase Crashlytics | Shared | — | Crash reporting |
| CrashKiOS | iOS | 0.9.0 | iOS crash reporting bridge |
| Adjust | Android | 4.33.5 | Attribution analytics |
| Plotline | Shared | 1.2.5 | In-app engagement |

## Maps & Location

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Play Services Maps | Android | 19.2.0 | Google Maps |
| Play Services Location | Android | 21.3.0 | Location services |
| Android Maps Utils | Android | 3.19.0 | Map utilities (clustering, etc.) |

## Authentication

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Truecaller SDK | Android | 2.7.0 | Phone number verification |
| Play Services Auth | Android | 21.4.0 | Google Sign-In, SMS retriever |
| SMS Retriever API | Android | 18.3.0 | Automatic OTP reading |

## iOS Interop

### SKIE

| Library | Version | Purpose |
|---------|---------|---------|
| SKIE | 0.10.8 | Swift-friendly Kotlin interop |

SKIE enables:
- `@SealedInterop.Enabled` — Exposes sealed classes as Swift enums
- `@EnumInterop.Enabled` — Better enum support in Swift
- Suspend function to async/await bridging
- Flow to AsyncSequence bridging

## Media & Content

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| ExoPlayer | Android | 2.19.1 | Video playback |
| Media3 | Android | 1.3.1 | Media framework |
| Image Cropper | Android | 4.5.0 | Image editing |
| ZXing Core | Android | 3.5.1 | QR/barcode scanning |
| QRose | Shared | 1.0.1 | QR code generation |

## Background Processing

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| WorkManager | Android | 2.8.1 | Background task scheduling |
| KMP Notifier | Shared | 1.6.0 | Push notifications |

## Customer Support

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Freshchat | Android | 6.4.5 | In-app chat support |

## Testing

| Library | Version | Purpose |
|---------|---------|---------|
| Kotlin Test | 2.2.20 | Multiplatform test framework |
| Turbine | 1.0.0 | Flow testing |
| MockK | 1.13.7 | Mocking framework |
| JUnit 5 | 5.10.1 | Test runner |
| Robolectric | 4.16 | Android unit testing |
| Coroutines Test | 1.10.2 | Coroutine testing utilities |

## Security

| Library | Platform | Version | Purpose |
|---------|----------|---------|---------|
| Silent Ride | Android | 2.0.30 | Device security |
| RootBeer | Android | 0.1.0 | Root detection |
| Security Crypto | Android | 1.1.0 | Encrypted storage |
| SQLCipher | Android | 4.11.0 | Database encryption |

## Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| Ksoup | 0.6.0 | HTML parsing |
| Kotlinx Serialization | — | JSON serialization (via Kotlin plugin) |

## Android SDK Targets

```toml
android-minSdk = "23"       # Android 6.0 (Marshmallow)
android-targetSdk = "35"    # Android 15
android-compileSdk = "36"   # Android 16 (preview)
```

## Gradle Plugins

| Plugin | Version | Purpose |
|--------|---------|---------|
| Android Application | 8.13.0 | Android app builds |
| Android Library | 8.13.0 | Android library builds |
| Kotlin Multiplatform | 2.2.20 | KMP project configuration |
| Kotlin Serialization | 2.2.20 | JSON serialization |
| Kotlin CocoaPods | 2.2.20 | iOS dependency integration |
| Compose Compiler | 2.2.20 | Compose compilation |
| JetBrains Compose | 1.9.1 | Compose Multiplatform |
| SQLDelight | 2.1.0 | Database code generation |
| SKIE | 0.10.8 | Swift interop |
| Google Services | 4.4.4 | Firebase/Google integration |
| Firebase Crashlytics | 3.0.6 | Crash reporting |

## Dependency Bundles

The project uses Gradle version catalog bundles for commonly grouped dependencies:

```toml
[bundles]
ktor-common = ["ktor-client-core", "ktor-content-negotiation", "ktor-serialization"]
data-store = ["data-store-core", "data-store-prefs"]
coil = ["coil-mp", "coil-network", "coil-compose"]
decompose-ui = ["decompose", "decompose-compose"]
test-common = ["kotlin-test", "turbine", "kotlin-coroutines-test"]
```
