---
slug: project-structure
lastUpdated: 2026-01-14
---

# Project Structure

## Overview

`chalo-app-kmp` is a Kotlin Multiplatform (KMP) project targeting Android and iOS. The codebase uses a modular architecture with shared business logic and platform-specific UI implementations.

## Root Directory Layout

```
chalo-app-kmp/
├── androidApp/              # Android application module
├── iosApp/                  # iOS application (Xcode project)
├── shared/                  # KMP shared modules
│   ├── src/                 # Main shared module
│   ├── analytics/           # Analytics SDK integration
│   ├── ble-communication/   # BLE validation
│   ├── chalo-base/          # Base classes, models, utilities
│   ├── checkout/            # Payment processing
│   ├── core/                # App core, navigation, DI
│   ├── framework-city-data/ # City data management
│   ├── framework-wallet/    # Wallet framework
│   ├── home/                # Home + many features
│   ├── kyc/                 # KYC verification
│   ├── livetracking/        # Live bus tracking
│   ├── login/               # Authentication
│   ├── network/             # Networking layer
│   ├── onboarding/          # Onboarding flow
│   ├── productbooking/      # Product booking (tickets, passes)
│   ├── security/            # Encryption, security
│   ├── test-utils/          # Test utilities
│   ├── validationsdk/       # Ticket validation
│   ├── vault/               # Secure storage
│   └── wallet/              # Wallet + Quick Pay
├── gradle/                  # Gradle wrapper, version catalog
├── docs/                    # Documentation
├── scripts/                 # Build/utility scripts
└── build.gradle.kts         # Root build configuration
```

## Shared Module Structure

Each shared module follows a consistent KMP structure:

```
shared/<module>/
├── build.gradle.kts
└── src/
    ├── commonMain/          # Shared Kotlin code (all platforms)
    │   └── kotlin/
    │       └── app/chalo/<feature>/
    │           ├── data/        # Data layer (repositories, data sources)
    │           ├── domain/      # Domain layer (use cases, models)
    │           ├── di/          # Koin DI modules
    │           └── ui/          # Presentation layer (components, screens)
    ├── androidMain/         # Android-specific implementations
    │   └── kotlin/
    └── iosMain/             # iOS-specific implementations
        └── kotlin/
```

## Key Modules

### Core Infrastructure

| Module | Purpose |
|--------|---------|
| `shared:core` | App entry point, Decompose navigation, root component |
| `shared:chalo-base` | Base classes, common models, scene args, utilities |
| `shared:network` | Ktor HTTP client, API configuration |
| `shared:security` | Encryption, decryption, key management |
| `shared:vault` | Secure storage (DataStore, encrypted preferences) |
| `shared:analytics` | Analytics SDK integration (Mixpanel, Firebase) |

### Feature Modules

| Module | Features Contained |
|--------|-------------------|
| `shared:home` | Home screen, profile, history, bills, super-pass, premium-bus, metro, ONDC, validation, notifications, M-ticket, trip planner, SOS, and more |
| `shared:productbooking` | Route selection, instant ticket, metro booking, premium bus booking, ONDC booking |
| `shared:checkout` | Payment processing, UPI, cards, net banking, Razorpay, Juspay, Inai |
| `shared:wallet` | Wallet balance, load money, transactions, Quick Pay |
| `shared:login` | Authentication, OTP, Truecaller integration |
| `shared:onboarding` | Language selection, city selection, permissions |
| `shared:livetracking` | Route details, live bus positions, ETA |
| `shared:validationsdk` | BLE/QR ticket validation |
| `shared:kyc` | KYC verification for wallet |

## Gradle Configuration

### Version Catalog

All dependency versions are centralized in `gradle/libs.versions.toml`:

```toml
[versions]
kotlin = "2.2.20"
compose = "1.8.0"
ktor-client = "3.3.1"
koin = "4.1.1"
decompose = "3.4.0"
sql-delight = "2.1.0"
```

### Android SDK Targets

```toml
android-targetSdk = "35"
android-compileSdk = "36"
android-minSdk = "23"
```

### Module Dependencies

Modules declare dependencies on other shared modules using typesafe accessors:

```kotlin
// In shared:home/build.gradle.kts
kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(projects.shared.core)
            implementation(projects.shared.chaloBase)
            implementation(projects.shared.network)
        }
    }
}
```

## iOS Integration

The iOS app uses CocoaPods for KMP integration:

```
iosApp/
├── iosApp.xcodeproj
├── iosApp/
│   ├── ContentView.swift
│   └── iOSApp.swift
└── Podfile
```

KMP shared code is exposed to Swift via SKIE annotations for better interop:
- `@SealedInterop.Enabled` on sealed classes
- `@EnumInterop.Enabled` on enums

## Android App Structure

```
androidApp/
├── src/main/
│   ├── java/app/chalo/android/
│   │   └── MainActivity.kt
│   ├── res/
│   └── AndroidManifest.xml
└── build.gradle.kts
```

The Android app is primarily a thin shell that hosts the KMP Compose UI via `DecomposeApp`.

## Build Commands

```bash
# Build Android app
./gradlew :androidApp:assembleDebug

# Build shared modules
./gradlew :shared:build

# Run Android tests
./gradlew :shared:testDebugUnitTest

# Clean build
./gradlew clean
```
