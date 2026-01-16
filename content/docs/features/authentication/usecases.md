---
feature: authentication
layer: domain
lastUpdated: 2026-01-16
sourceCommit: null
---

# Authentication — UseCase Documentation

## Domain Layer Overview

The domain layer orchestrates authentication flows including OTP request/verification, Truecaller login, token management, and DPDPA consent handling. Use cases validate inputs, coordinate repository operations, and map errors to user-friendly results.

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer"]
        Options["Login Options"]
        OTP["OTP Screen"]
        Consent["User Consent"]
    end

    subgraph Domain["Domain Layer"]
        SendOTP["SendOtpForLoginUseCase"]
        VerifyLogin["VerifyLoginSuccessUseCase"]
        ParseTokens["ParseAndStoreTokensUseCase"]
        RefreshTokens["RefreshAuthTokensUseCase"]
        GenerateUID["GenerateUidForTruecallerUseCase"]
        FetchConsent["FetchDpdpaUserConsentUseCase"]
        UpdateConsent["UpdateUserConsentUseCase"]
        ExtractOTP["ExtractOtpFromSmsContentUseCase"]
        SyncAnalytics["SyncAnalyticsPropertiesUseCase"]
    end

    subgraph Data["Data Layer"]
        Repo["LoginRepository"]
        ConsentMgr["DpdpaConsentManager"]
    end

    Options --> SendOTP
    Options --> GenerateUID
    OTP --> VerifyLogin
    OTP --> ExtractOTP
    VerifyLogin --> ParseTokens
    VerifyLogin --> SyncAnalytics
    Consent --> FetchConsent
    Consent --> UpdateConsent
    SendOTP --> Repo
    VerifyLogin --> Repo
    ParseTokens --> Repo
    RefreshTokens --> Repo
    FetchConsent --> ConsentMgr
    UpdateConsent --> ConsentMgr
```

---

## Use Case Inventory

| Use Case | Purpose | Called From |
|----------|---------|-------------|
| **SendOtpForLogin** | Request OTP via phone number | Login Options |
| **VerifyLoginSuccessOnServerAndHandleTokens** | Verify OTP/Truecaller and store tokens | OTP Screen, Login Options |
| **ParseAndStoreTokens** | Parse JWT and persist tokens | Verify Login UseCase |
| **RefreshAuthTokensForUser** | Refresh expired access token | Network interceptor |
| **GenerateUidForTruecallerLogin** | Get UID for Truecaller SDK | Login Options |
| **FetchDpdpaUserConsent** | Get current consent status | User Consent Screen |
| **UpdateUserConsent** | Update consent status | User Consent Screen |
| **ExtractOtpFromSmsContent** | Parse OTP from SMS message | OTP Screen |
| **SyncAndUpdateAnalyticsPropertiesAfterLogin** | Post-login analytics sync | Verify Login UseCase |

---

## Send OTP for Login

**Responsibility:** Validates phone number and requests OTP from server, returning a reference number for verification.

### Request Flow

```mermaid
flowchart TD
    Start["invoke(phone, countryCode, previousRefNo?)"]
    CleanCode["Remove + from country code"]
    BuildRequest["Build SendOtpRequestModel"]
    IsResend{previousRefNo present?}
    CallAPI["Repository.sendOtpForPhoneAuth()"]
    CheckResponse{Response valid?}
    CheckStatus{status == true?}
    ReturnRefNo["Return Success(refNo)"]
    MapError["Map exception to error"]
    ReturnError["Return Failure(error)"]

    Start --> CleanCode
    CleanCode --> BuildRequest
    BuildRequest --> IsResend
    IsResend -->|Yes| CallAPI
    IsResend -->|No| CallAPI
    CallAPI --> CheckResponse
    CheckResponse -->|Yes| CheckStatus
    CheckResponse -->|Exception| MapError
    CheckStatus -->|Yes| ReturnRefNo
    CheckStatus -->|No| MapError
    MapError --> ReturnError
```

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| **phoneNumber** | String | Yes | User's phone number |
| **countryCode** | String | Yes | Country code (with or without +) |
| **previousRefNoToResendOtp** | String? | No | Reference number for resend |

### Result Types

| Result | Meaning | Trigger |
|--------|---------|---------|
| **Success(refNo)** | OTP sent, use refNo for verify | API returned status=true |
| **OTP_STATUS_FALSE** | Server rejected request | status=false in response |
| **INVALID_REF_NO** | Reference number missing | refNo null in response |
| **PREVIOUS_OTP_EXPIRED** | Previous OTP no longer valid | Server error code |
| **PARSE_EXCEPTION** | Response parsing failed | JSON error |
| **SERVER_ERROR** | Server returned error | HTTP error |
| **UNKNOWN_ERROR** | Unexpected failure | Exception caught |

### Error Mapping

```mermaid
flowchart TD
    Exception["Exception Caught"]
    Check1{SendOtpFailedException?}
    CheckCode["Check Server Error Code"]
    CodeExpired["PREVIOUS_OTP_EXPIRED"]
    CodeOther["SERVER_ERROR"]
    Check2{ParseException?}
    ParseErr["PARSE_EXCEPTION"]
    Unknown["UNKNOWN_ERROR"]

    Exception --> Check1
    Check1 -->|Yes| CheckCode
    Check1 -->|No| Check2
    CheckCode -->|Expired Code| CodeExpired
    CheckCode -->|Other| CodeOther
    Check2 -->|Yes| ParseErr
    Check2 -->|No| Unknown
```

---

## Verify Login Success and Handle Tokens

**Responsibility:** Verifies OTP or Truecaller credentials with server, parses and stores authentication tokens, and persists user profile.

### Verification Flow

```mermaid
flowchart TD
    Start["invoke(loginModeAppModel)"]
    CallServer["Repository.verifyLoginSuccessOnServer()"]
    CheckResponse{Response valid?}
    ParseTokens["ParseAndStoreTokensUseCase"]
    TokensOK{Tokens stored?}
    StoreProfile["Repository.storeUserProfileDetails()"]
    SyncAnalytics["SyncAnalyticsPropertiesUseCase"]
    ReturnSuccess["Return LoginVerified(profile)"]
    MapError["Map to LoginVerificationResult"]
    ReturnError["Return Error Result"]

    Start --> CallServer
    CallServer --> CheckResponse
    CheckResponse -->|Success| ParseTokens
    CheckResponse -->|Exception| MapError
    ParseTokens --> TokensOK
    TokensOK -->|Yes| StoreProfile
    TokensOK -->|No| ReturnError
    StoreProfile --> SyncAnalytics
    SyncAnalytics --> ReturnSuccess
    MapError --> ReturnError
```

### Input: Login Mode

The use case accepts either OTP or Truecaller credentials:

**Phone Auth Login:**

| Field | Type | Description |
|-------|------|-------------|
| **phoneNumber** | String | User's phone number |
| **countryCode** | String | Country code |
| **otp** | String | 6-digit OTP |
| **refNo** | String | Reference from SendOtp |

**Truecaller Login:**

| Field | Type | Description |
|-------|------|-------------|
| **payload** | String | Signed profile data |
| **signature** | String | Digital signature |
| **signatureAlgorithm** | String | Algorithm used (SHA256withRSA) |
| **uid** | String | Generated UID |
| **phoneNumber, countryCode** | String | Phone details |
| **firstName, lastName, emailId** | String | Profile from Truecaller |

### Result Types

| Result | Meaning | Contains |
|--------|---------|----------|
| **LoginVerified** | Authentication successful | UserProfileAppModel |
| **InvalidOtpEntered** | OTP incorrect | — |
| **InvalidProfileReceived** | Profile data invalid | — |
| **InvalidTokensReceived** | Tokens missing/invalid | — |
| **ParseError** | Response parsing failed | — |
| **UnknownError** | Server error | Error message |
| **LocalError** | Local storage failed | Error message |
| **TokenProcessingError** | JWT parsing failed | — |

### Error Mapping

```mermaid
flowchart TD
    Exception["Exception Caught"]
    Check1{LoginVerificationFailed?}
    ServerCode["Check Error Code"]
    InvalidOTP["InvalidOtpEntered"]
    InvalidProfile["InvalidProfileReceived"]
    InvalidTokens["InvalidTokensReceived"]
    UnknownServer["UnknownError(msg)"]
    Check2{ProfileAndTokensException?}
    ProfileErr["InvalidProfileReceived"]
    TokensErr["InvalidTokensReceived"]
    Check3{LocalException?}
    LocalErr["LocalError(msg)"]
    ParseErr["ParseError"]

    Exception --> Check1
    Check1 -->|Yes| ServerCode
    Check1 -->|No| Check2
    ServerCode -->|Invalid OTP Code| InvalidOTP
    ServerCode -->|Profile Error| InvalidProfile
    ServerCode -->|Token Error| InvalidTokens
    ServerCode -->|Other| UnknownServer
    Check2 -->|Profile| ProfileErr
    Check2 -->|Tokens| TokensErr
    Check2 -->|No| Check3
    Check3 -->|Yes| LocalErr
    Check3 -->|No| ParseErr
```

---

## Parse and Store Tokens

**Responsibility:** Decodes JWT access token to extract expiry, calculates time delta, and persists tokens securely.

### Token Processing Flow

```mermaid
flowchart TD
    Start["invoke(tokensAppModel)"]
    ParseJWT["JwtEncodedAccessTokenParser.parse()"]
    ParseOK{Parse successful?}
    ExtractExpiry["Extract expiryTime"]
    ExtractIAT["Extract issuedAt"]
    GetCurrentTime["Get device current time"]
    CalcDelta["delta = currentTime - issuedAt"]
    StoreTokens["Repository.storeTokensPostLogin()"]
    ReturnTrue["Return true"]
    ReturnFalse["Return false"]

    Start --> ParseJWT
    ParseJWT --> ParseOK
    ParseOK -->|Yes| ExtractExpiry
    ParseOK -->|No| ReturnFalse
    ExtractExpiry --> ExtractIAT
    ExtractIAT --> GetCurrentTime
    GetCurrentTime --> CalcDelta
    CalcDelta --> StoreTokens
    StoreTokens --> ReturnTrue
```

### JWT Parsing

| JWT Claim | Purpose | Usage |
|-----------|---------|-------|
| **exp** | Expiration timestamp | Token validity check |
| **iat** | Issued at timestamp | Calculate clock delta |

### Time Delta Calculation

The delta accounts for clock differences between server and device:

```
delta = deviceCurrentTime - tokenIssuedAt
adjustedExpiry = tokenExpiry - delta
```

This ensures token expiry checks work correctly regardless of device clock accuracy.

### Stored Token Data

| Field | Description |
|-------|-------------|
| **accessToken** | JWT access token string |
| **refreshToken** | Refresh token string |
| **expiryTime** | Adjusted expiry timestamp |
| **delta** | Clock difference value |

---

## Refresh Auth Tokens

**Responsibility:** Refreshes expired access token using refresh token, called by network interceptor when token expires.

### Refresh Flow

```mermaid
flowchart TD
    Start["invoke()"]
    GetUserId["Repository.getUserId()"]
    UserExists{userId present?}
    GetRefreshToken["Repository.getRefreshToken()"]
    TokenExists{refreshToken present?}
    CallRefresh["Repository.refreshAuthTokens()"]
    RefreshOK{Refresh successful?}
    ParseStore["ParseAndStoreTokensUseCase"]
    StoreOK{Tokens stored?}
    ReturnSuccess["Return TOKENS_REFRESHED"]
    NoUser["Return USER_ID_NOT_PRESENT"]
    NoToken["Return REFRESH_TOKEN_NOT_PRESENT"]
    MapError["Map exception to result"]

    Start --> GetUserId
    GetUserId --> UserExists
    UserExists -->|No| NoUser
    UserExists -->|Yes| GetRefreshToken
    GetRefreshToken --> TokenExists
    TokenExists -->|No| NoToken
    TokenExists -->|Yes| CallRefresh
    CallRefresh --> RefreshOK
    RefreshOK -->|Yes| ParseStore
    RefreshOK -->|Exception| MapError
    ParseStore --> StoreOK
    StoreOK -->|Yes| ReturnSuccess
    StoreOK -->|No| MapError
```

### Result Types

| Result | Meaning | Recovery Action |
|--------|---------|-----------------|
| **TOKENS_REFRESHED** | New tokens stored | Retry original request |
| **USER_ID_NOT_PRESENT** | No logged-in user | Force re-login |
| **REFRESH_TOKEN_NOT_PRESENT** | Refresh token missing | Force re-login |
| **SERVER_ERROR** | Refresh API failed | Retry or re-login |
| **INVALID_TOKENS_RECEIVED** | New tokens invalid | Force re-login |
| **REFRESH_CALL_UNAUTHORIZED** | Refresh token expired | Force re-login |
| **RESPONSE_PARSE_EXCEPTION** | Response parsing failed | Force re-login |
| **TOKENS_PARSE_EXCEPTION** | JWT parsing failed | Force re-login |
| **UNKNOWN_LOCAL_ERROR** | Local storage error | Retry |

---

## Generate UID for Truecaller Login

**Responsibility:** Requests unique identifier from server required by Truecaller SDK for verification.

### UID Generation Flow

```mermaid
flowchart TD
    Start["invoke()"]
    CallAPI["Repository.generateUidForTruecaller()"]
    CheckResponse{Response valid?}
    CheckUID{uid present?}
    ReturnUID["Return Success(uid)"]
    InvalidUID["Return INVALID_UID"]
    MapError["Map exception"]
    ReturnError["Return Failure"]

    Start --> CallAPI
    CallAPI --> CheckResponse
    CheckResponse -->|Success| CheckUID
    CheckResponse -->|Exception| MapError
    CheckUID -->|Yes| ReturnUID
    CheckUID -->|No| InvalidUID
    MapError --> ReturnError
```

### Result Types

| Result | Meaning |
|--------|---------|
| **Success(uid)** | UID generated successfully |
| **INVALID_UID** | Server returned empty UID |
| **SERVER_ERROR** | API call failed |
| **UNKNOWN_ERROR** | Unexpected exception |

---

## Fetch DPDPA User Consent

**Responsibility:** Retrieves current consent status for user, including terms URL and consent items.

### Fetch Flow

```mermaid
flowchart TD
    Start["invoke(userId)"]
    CallManager["DpdpaConsentManager.fetchUserConsentStatus()"]
    CheckCache{Cached & valid?}
    ReturnCached["Return cached result"]
    CallAPI["Repository.fetchUserConsentStatus()"]
    ParseResponse["Parse response"]
    CacheResult["Cache in manager"]
    ReturnFresh["Return Success(consents)"]
    MapError["Map exception"]
    ReturnError["Return Failure"]

    Start --> CallManager
    CallManager --> CheckCache
    CheckCache -->|Yes| ReturnCached
    CheckCache -->|No| CallAPI
    CallAPI --> ParseResponse
    ParseResponse --> CacheResult
    CacheResult --> ReturnFresh
    CallAPI -->|Exception| MapError
    MapError --> ReturnError
```

### Output: Consent Info

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier |
| **policyVersion** | Int? | Current policy version |
| **tncUrl** | String | Terms URL for WebView |
| **consents** | List | Individual consent items |

### Consent Item

| Field | Type | Values |
|-------|------|--------|
| **id** | String | "marketing", "analytics", etc. |
| **status** | Enum | GRANTED, DENIED, NOT_REQUESTED, UNKNOWN |

### Error Reasons

| Reason | Cause |
|--------|-------|
| **SERVER_ERROR** | API call failed |
| **LOCAL_ERROR** | Cache/storage failed |
| **INVALID_RESPONSE** | Response missing fields |
| **UNKNOWN_ERROR** | Unexpected exception |

---

## Update User Consent

**Responsibility:** Updates consent status on server after user accepts, denies, or skips.

### Update Flow

```mermaid
flowchart TD
    Start["invoke(userProfile, consents)"]
    ValidateInput{consents not empty?}
    BuildRequest["Build update request"]
    CallAPI["Repository.updateUserConsentStatus()"]
    UpdateOK{Update successful?}
    InvalidateCache["Clear cached consent"]
    ReturnSuccess["Return Success(newConsents)"]
    EmptyError["Return EMPTY_CONSENT_LIST"]
    MapError["Map exception"]
    ReturnError["Return Failure"]

    Start --> ValidateInput
    ValidateInput -->|No| EmptyError
    ValidateInput -->|Yes| BuildRequest
    BuildRequest --> CallAPI
    CallAPI --> UpdateOK
    UpdateOK -->|Yes| InvalidateCache
    UpdateOK -->|Exception| MapError
    InvalidateCache --> ReturnSuccess
    MapError --> ReturnError
```

### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| **userProfile** | UserProfileAppModel | Current user info |
| **consents** | List<DpdpaConsentInfoAppModel> | Updated consent statuses |

### Error Reasons

| Reason | Cause |
|--------|-------|
| **UPDATE_FAILED_ON_SERVER** | API rejected update |
| **LOCAL_ERROR** | Cache invalidation failed |
| **INVALID_RESPONSE** | Response parsing failed |
| **EMPTY_CONSENT_LIST** | No consents provided |
| **UNKNOWN_ERROR** | Unexpected exception |

---

## Extract OTP from SMS Content

**Responsibility:** Parses incoming SMS message to extract 6-digit OTP code.

### Extraction Flow

```mermaid
flowchart TD
    Start["invoke(smsContent)"]
    SearchPattern["Find 6 consecutive digits"]
    Found{Pattern found?}
    ValidateOTP["Validate OTP format"]
    ReturnOTP["Return extracted OTP"]
    ReturnNull["Return null"]

    Start --> SearchPattern
    SearchPattern --> Found
    Found -->|Yes| ValidateOTP
    Found -->|No| ReturnNull
    ValidateOTP --> ReturnOTP
```

### Pattern Matching

| Rule | Description |
|------|-------------|
| **Length** | Exactly 6 digits |
| **Position** | First 6-digit sequence in message |
| **Validation** | All characters are digits |

---

## Sync Analytics Properties After Login

**Responsibility:** Orchestrates post-login setup including FCM registration, analytics sync, and product initialization.

### Sync Flow

```mermaid
flowchart TD
    Start["invoke(userProfile)"]
    RegisterFCM["Register FCM Token"]
    UpdateAnalytics["Update Analytics Properties"]
    InitProducts["Initialize Product Sync"]
    Complete["Post-login setup complete"]

    Start --> RegisterFCM
    RegisterFCM --> UpdateAnalytics
    UpdateAnalytics --> InitProducts
    InitProducts --> Complete
```

### Operations

| Step | Operation | Purpose |
|------|-----------|---------|
| 1 | Register FCM token | Enable push notifications |
| 2 | Update analytics properties | Set user ID, traits |
| 3 | Initialize product sync | Trigger wallet, tickets sync |

---

## Domain Models

### User Profile App Model

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | Unique user identifier |
| **firstName** | String | First name |
| **lastName** | String | Last name |
| **mobileNumber** | String | Phone number |
| **countryCode** | String | Country code |
| **emailId** | String | Email address |
| **profilePhoto** | String | Photo URL |
| **gender** | Gender? | MALE, FEMALE, OTHER |
| **dobInMillis** | Long? | Date of birth (epoch ms) |

### Post Login Tokens App Model

| Field | Type | Description |
|-------|------|-------------|
| **accessToken** | String | JWT access token |
| **refreshToken** | String | Refresh token |

### DPDPA Consent Status

| Value | Meaning |
|-------|---------|
| **GRANTED** | User accepted consent |
| **DENIED** | User rejected consent |
| **NOT_REQUESTED** | Not yet asked |
| **UNKNOWN** | Status unclear |

---

## Business Rules

| Rule | Description | Enforced By |
|------|-------------|-------------|
| **OTP length** | Must be exactly 6 digits | ExtractOtp UseCase |
| **Reference number required** | OTP verify needs refNo from send | VerifyLogin UseCase |
| **Token expiry adjustment** | Account for clock delta | ParseAndStore UseCase |
| **Consent caching** | Cache per user session | DpdpaConsentManager |
| **Refresh token priority** | Refresh before forcing re-login | RefreshTokens UseCase |
| **Truecaller UID required** | Must have UID before showing SDK | Login Options Component |

---

## Sequence Diagrams

### Complete OTP Login Sequence

```mermaid
sequenceDiagram
    participant User
    participant Options as Login Options
    participant SendOTP as SendOtpUseCase
    participant OTPScreen as OTP Screen
    participant Verify as VerifyLoginUseCase
    participant Parse as ParseTokensUseCase
    participant Repo as Repository
    participant Server

    User->>Options: Enter phone number
    User->>Options: Tap Continue
    Options->>SendOTP: invoke(phone, countryCode)
    SendOTP->>Repo: sendOtpForPhoneAuth()
    Repo->>Server: POST /auth/v1/otp/send
    Server-->>Repo: { refNo, status: true }
    Repo-->>SendOTP: SendOtpResponseModel
    SendOTP-->>Options: Success(refNo)
    Options->>OTPScreen: Navigate with refNo

    User->>OTPScreen: Enter OTP
    User->>OTPScreen: Tap Verify
    OTPScreen->>Verify: invoke(PhoneAuthLogin)
    Verify->>Repo: verifyLoginSuccessOnServer()
    Repo->>Server: POST /auth/v1/login
    Server-->>Repo: { tokens, profile }
    Repo-->>Verify: ProfileAndTokensAppModel
    Verify->>Parse: invoke(tokens)
    Parse->>Parse: Decode JWT
    Parse->>Repo: storeTokensPostLogin()
    Parse-->>Verify: true
    Verify->>Repo: storeUserProfileDetails()
    Verify-->>OTPScreen: LoginVerified(profile)
    OTPScreen->>OTPScreen: Navigate to Consent/Home
```

### Token Refresh Sequence

```mermaid
sequenceDiagram
    participant Interceptor as Network Interceptor
    participant Refresh as RefreshTokensUseCase
    participant Parse as ParseTokensUseCase
    participant Repo as Repository
    participant Server

    Note over Interceptor: Access token expired

    Interceptor->>Refresh: invoke()
    Refresh->>Repo: getUserId()
    Repo-->>Refresh: userId
    Refresh->>Repo: getRefreshToken()
    Repo-->>Refresh: refreshToken
    Refresh->>Repo: refreshAuthTokens()
    Repo->>Server: POST /auth/v1/token/refresh
    Server-->>Repo: { newAccessToken, newRefreshToken }
    Repo-->>Refresh: RefreshTokenResponseAppModel
    Refresh->>Parse: invoke(newTokens)
    Parse->>Repo: storeTokensPostLogin()
    Parse-->>Refresh: true
    Refresh-->>Interceptor: TOKENS_REFRESHED

    Note over Interceptor: Retry original request
```

---

## Error Handling

### OTP Errors

| Code | Error | User Message |
|------|-------|--------------|
| 100 | OTP_STATUS_FALSE | "Could not send OTP" |
| 101 | INVALID_REF_NO | "Please try again" |
| 102 | PREVIOUS_OTP_EXPIRED | "OTP expired, please resend" |
| 103 | PARSE_EXCEPTION | "Something went wrong" |
| 104 | SERVER_ERROR | Server error message |

### Login Verification Errors

| Code | Error | User Message |
|------|-------|--------------|
| 105 | InvalidOtpEntered | "Invalid OTP, please try again" |
| 106 | InvalidProfileReceived | "Could not complete login" |
| 107 | InvalidTokensReceived | "Could not complete login" |
| 108 | ParseError | "Something went wrong" |
| 109 | TokenProcessingError | "Please try again" |
| 110 | LocalError | "Could not save login" |
| 111 | UnknownError | Server error message |

### Token Refresh Errors

| Code | Error | Recovery |
|------|-------|----------|
| 112 | USER_ID_NOT_PRESENT | Force re-login |
| 113 | REFRESH_TOKEN_NOT_PRESENT | Force re-login |
| 114 | REFRESH_CALL_UNAUTHORIZED | Force re-login |
| 115 | INVALID_TOKENS_RECEIVED | Force re-login |
