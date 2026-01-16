---
feature: authentication
layer: data
lastUpdated: 2026-01-16
sourceCommit: null
---

# Authentication — Repository Documentation

## Data Layer Overview

The data layer handles authentication API calls and secure token/profile storage. It follows the **Repository Pattern** with separate remote and local data sources, plus dedicated managers for consent caching and secure storage.

```mermaid
flowchart TB
    subgraph Domain["Domain Layer"]
        SendOTP["SendOtpUseCase"]
        VerifyLogin["VerifyLoginUseCase"]
        RefreshTokens["RefreshTokensUseCase"]
        ConsentUC["Consent UseCases"]
    end

    subgraph Repository["Repository Layer"]
        Repo["LoginRepository"]
    end

    subgraph DataSources["Data Sources"]
        Remote["LoginRemoteDataSource"]
        Local["LoginLocalDataSource"]
    end

    subgraph Managers["Managers"]
        ConsentMgr["DpdpaConsentManager"]
        SecureMgr["ChaloAuthSecureManager"]
    end

    subgraph Storage["Storage"]
        API["Auth API"]
        DataStore["Encrypted DataStore"]
        Vault["Secure Vault"]
    end

    SendOTP --> Repo
    VerifyLogin --> Repo
    RefreshTokens --> Repo
    ConsentUC --> ConsentMgr
    Repo --> Remote
    Repo --> Local
    Remote --> API
    Local --> DataStore
    SecureMgr --> Vault
    ConsentMgr --> Repo
```

---

## Repository Operations

| Operation | Description | Data Flow |
|-----------|-------------|-----------|
| **sendOtpForPhoneAuth** | Request OTP for phone login | Remote → Return |
| **verifyLoginSuccessOnServerAndGetTokens** | Verify OTP/Truecaller | Remote → Transform → Return |
| **storeTokensPostLogin** | Persist tokens securely | Transform → Local |
| **storeUserProfileDetails** | Persist user profile | Transform → Local |
| **generateUidForTruecaller** | Get UID for Truecaller SDK | Remote → Return |
| **refreshAuthTokens** | Refresh expired access token | Remote → Return |
| **makeLogoutUserCall** | Server-side logout | Remote |
| **fetchUserConsentStatus** | Get DPDPA consent status | Remote → Return |
| **updateUserConsentStatus** | Update DPDPA consent | Remote → Return |
| **getUserId** | Get stored user ID | Local → Return |
| **getAccessToken** | Get stored access token | Local → Return |
| **getRefreshToken** | Get stored refresh token | Local → Return |
| **getAccessTokenExpiry** | Get token expiry time | Local → Return |

---

## API Endpoints

### Send OTP

Requests OTP for phone number authentication.

| Property | Value |
|----------|-------|
| **Endpoint** | `auth/v1/otp/send` |
| **Method** | POST |
| **Auth** | Not required |
| **Content-Type** | application/json |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **phoneNumber** | String | Yes | Phone number without country code |
| **countryCode** | String | Yes | Country code without + |
| **templateId** | String | Yes | OTP template identifier |
| **refNo** | String | No | Previous refNo for resend |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **status** | Boolean | OTP sent successfully |
| **refNo** | String | Reference for verification |
| **message** | String? | Error message if failed |

---

### Verify Login (OTP/Truecaller)

Verifies OTP or Truecaller credentials and returns tokens.

| Property | Value |
|----------|-------|
| **Endpoint** | `auth/v1/login` |
| **Method** | POST |
| **Auth** | Not required |
| **Content-Type** | application/json |

**Request Body (OTP):**

| Field | Type | Description |
|-------|------|-------------|
| **loginMode** | String | "PHONE_AUTH" |
| **phoneNumber** | String | Phone number |
| **countryCode** | String | Country code |
| **otp** | String | 6-digit OTP |
| **refNo** | String | Reference from send OTP |
| **deviceId** | String | Device identifier |
| **refreshToken** | Boolean | Request refresh token |

**Request Body (Truecaller):**

| Field | Type | Description |
|-------|------|-------------|
| **loginMode** | String | "TRUECALLER" |
| **payload** | String | Truecaller signed payload |
| **signature** | String | Digital signature |
| **signatureAlgorithm** | String | Algorithm (SHA256withRSA) |
| **uid** | String | Generated UID |
| **phoneNumber** | String | Phone from Truecaller |
| **countryCode** | String | Country code |
| **firstName** | String | First name |
| **lastName** | String | Last name |
| **emailId** | String | Email address |
| **deviceId** | String | Device identifier |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **accessToken** | String | JWT access token |
| **refreshToken** | String | Refresh token |
| **profile** | Object | User profile data |

**Profile Object:**

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier |
| **firstName** | String | First name |
| **lastName** | String | Last name |
| **mobileNumber** | String | Phone number |
| **countryCode** | String | Country code |
| **emailId** | String | Email address |
| **profilePhoto** | String? | Photo URL |
| **gender** | String? | Gender string |
| **dateOfBirth** | Long? | DOB in milliseconds |

---

### Refresh Tokens

Refreshes expired access token.

| Property | Value |
|----------|-------|
| **Endpoint** | `auth/v1/token/refresh` |
| **Method** | POST |
| **Auth** | Refresh token in header |
| **Content-Type** | application/json |

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier |
| **deviceId** | String | Device identifier |
| **refreshToken** | String | Current refresh token |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **accessToken** | String | New JWT access token |
| **refreshToken** | String | New refresh token |

---

### Generate Truecaller UID

Generates unique identifier for Truecaller SDK.

| Property | Value |
|----------|-------|
| **Endpoint** | `auth/v1/truecaller/uid` |
| **Method** | GET |
| **Auth** | Not required |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **uid** | String | Unique identifier |

---

### Logout

Server-side logout to invalidate tokens.

| Property | Value |
|----------|-------|
| **Endpoint** | `auth/v1/logout` |
| **Method** | POST |
| **Auth** | Required (Access token) |
| **Content-Type** | application/json |

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier |
| **deviceId** | String | Device identifier |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **success** | Boolean | Logout successful |

---

### Fetch User Consent Status

Retrieves DPDPA consent status for user.

| Property | Value |
|----------|-------|
| **Endpoint** | `user/v1/consent/{userId}` |
| **Method** | GET |
| **Auth** | Required |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier |
| **policyVersion** | Int? | Current policy version |
| **tncUrl** | String | Terms and conditions URL |
| **consents** | List | Consent items |

**Consent Item:**

| Field | Type | Description |
|-------|------|-------------|
| **id** | String | Consent identifier |
| **status** | String | GRANTED, DENIED, NOT_REQUESTED |

---

### Update User Consent

Updates DPDPA consent status.

| Property | Value |
|----------|-------|
| **Endpoint** | `user/v1/consent` |
| **Method** | PUT |
| **Auth** | Required |
| **Content-Type** | application/json |

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| **userId** | String | User identifier |
| **consents** | List | Updated consent items |

**Consent Item:**

| Field | Type | Description |
|-------|------|-------------|
| **id** | String | Consent identifier |
| **status** | String | GRANTED or DENIED |

**Response:** Same as fetch consent status

---

## Data Flow

### OTP Login Flow

```mermaid
sequenceDiagram
    participant UC as UseCase
    participant Repo as Repository
    participant Remote as RemoteDataSource
    participant Local as LocalDataSource
    participant API as Auth Server

    UC->>Repo: sendOtpForPhoneAuth()
    Repo->>Repo: Clean country code (remove +)
    Repo->>Remote: sendOtpForPhoneAuth(request)
    Remote->>API: POST /auth/v1/otp/send
    API-->>Remote: { status, refNo }
    Remote-->>Repo: SendOtpResponseModel
    Repo-->>UC: refNo

    Note over UC: User enters OTP

    UC->>Repo: verifyLoginSuccessOnServer()
    Repo->>Repo: Map LoginModeAppModel to API request
    Repo->>Remote: verifyLoginSuccessOnServer(request)
    Remote->>API: POST /auth/v1/login
    API-->>Remote: { tokens, profile }
    Remote-->>Repo: PostLoginAuthTokensResponseModel
    Repo->>Repo: Map response to AppModel
    Repo-->>UC: ProfileAndTokensAppModel

    Note over UC: ParseAndStoreTokensUseCase

    UC->>Repo: storeTokensPostLogin()
    Repo->>Local: storeAuthTokens()
    Local->>Local: Encrypt and persist
    Local-->>Repo: Done

    UC->>Repo: storeUserProfileDetails()
    Repo->>Repo: Map AppModel to LocalModel
    Repo->>Local: storeUserProfileDetails()
    Local-->>Repo: Done
```

### Token Refresh Flow

```mermaid
sequenceDiagram
    participant Interceptor as Network Interceptor
    participant UC as RefreshTokensUseCase
    participant Repo as Repository
    participant Remote as RemoteDataSource
    participant Local as LocalDataSource
    participant API as Auth Server

    Note over Interceptor: Access token expired (401)

    Interceptor->>UC: invoke()
    UC->>Repo: getUserId()
    Repo->>Local: getUserId()
    Local-->>Repo: userId
    Repo-->>UC: userId

    UC->>Repo: getRefreshToken()
    Repo->>Local: getRefreshToken()
    Local-->>Repo: refreshToken
    Repo-->>UC: refreshToken

    UC->>Repo: refreshAuthTokens()
    Repo->>Remote: refreshAuthTokens(request)
    Remote->>API: POST /auth/v1/token/refresh
    API-->>Remote: { newAccessToken, newRefreshToken }
    Remote-->>Repo: RefreshTokensResponseApiModel
    Repo->>Repo: Map to AppModel
    Repo-->>UC: RefreshTokenResponseAppModel

    UC->>Repo: storeTokensPostLogin()
    Repo->>Local: storeAuthTokens()
    Local-->>Repo: Done

    UC-->>Interceptor: TOKENS_REFRESHED
    Note over Interceptor: Retry original request
```

---

## Data Transformations

### Login Mode to API Request

**Phone Auth:**

| App Model | API Field | Transformation |
|-----------|-----------|----------------|
| phoneNumber | phoneNumber | Direct |
| countryCode | countryCode | Remove + prefix |
| otp | otp | Direct |
| refNo | refNo | Direct |

**Truecaller:**

| App Model | API Field | Transformation |
|-----------|-----------|----------------|
| payload | payload | Direct |
| signature | signature | Direct |
| signatureAlgorithm | signatureAlgorithm | Direct |
| uid | uid | Direct |
| phoneNumber | phoneNumber | Direct |
| countryCode | countryCode | Remove + prefix |
| firstName | firstName | Direct |
| lastName | lastName | Direct |
| emailId | emailId | Direct |

### API Response to App Model

**Profile:**

| API Field | App Field | Transformation |
|-----------|-----------|----------------|
| userId | userId | Direct |
| firstName | firstName | Null coalesce to "" |
| lastName | lastName | Null coalesce to "" |
| mobileNumber | mobileNumber | Direct |
| countryCode | countryCode | Direct |
| emailId | emailId | Null coalesce to "" |
| profilePhoto | profilePhoto | Null coalesce to "" |
| gender | gender | Parse via Gender.fromString() |
| dateOfBirth | dobInMillis | Direct |

### App Model to Local Model

| App Field | Local Field | Transformation |
|-----------|-------------|----------------|
| userId | userId | Direct |
| firstName | firstName | Direct |
| lastName | lastName | Direct |
| mobileNumber | mobileNumber | Direct |
| countryCode | countryCallingCode | Direct |
| emailId | mailId | Direct |
| profilePhoto | profilePhoto | Direct |
| gender | gender | Gender.value string |
| dobInMillis | dobInMillis | Direct |
| dobInMillis | dateOfBirth | Format to string |

---

## Local Storage

### Storage Mechanism

Authentication data is stored using encrypted DataStore wrapped by specialized managers.

### Token Storage

Tokens are stored securely via `ChaloAuthSecureManager`:

| Data | Storage | Encryption |
|------|---------|------------|
| **Access Token** | Encrypted Preferences | AES-256 |
| **Refresh Token** | Encrypted Preferences | AES-256 |
| **Token Expiry** | Encrypted Preferences | AES-256 |
| **Token Delta** | Encrypted Preferences | AES-256 |

### Profile Storage

User profile stored via `LoginLocalDataSource`:

| Data | Storage |
|------|---------|
| **User ID** | DataStore |
| **First Name** | DataStore |
| **Last Name** | DataStore |
| **Phone Number** | DataStore |
| **Email** | DataStore |
| **Profile Photo URL** | DataStore |
| **Gender** | DataStore |
| **DOB** | DataStore |

### Login State Flags

| Key | Type | Description |
|-----|------|-------------|
| **isUserLoginFirstTime** | Boolean | First-time login flag |
| **shouldRequestConsentAfterSplashScreen** | Boolean | Pending consent flag |
| **firstConsentRequestedAt_{userId}** | Long | Timestamp of first consent request |

### Reactive Access

Login state is exposed as reactive flows:

```mermaid
flowchart TD
    Store["DataStore"]
    UserIdFlow["userId Flow"]
    IsLoggedIn["isLoggedIn: StateFlow<Boolean>"]
    Profile["Profile Flow"]

    Store --> UserIdFlow
    UserIdFlow --> IsLoggedIn
    Store --> Profile
```

---

## DPDPA Consent Manager

### Caching Strategy

The consent manager implements session-based caching with thread safety:

```mermaid
flowchart TD
    Request["fetchUserConsentStatus(userId)"]
    CheckCache{Cache exists?}
    CheckUser{Same user?}
    CheckExpiry{Not expired?}
    ReturnCached["Return cached"]
    FetchFresh["Call repository"]
    StoreCache["Cache result"]
    ReturnFresh["Return fresh"]

    Request --> CheckCache
    CheckCache -->|No| FetchFresh
    CheckCache -->|Yes| CheckUser
    CheckUser -->|No| FetchFresh
    CheckUser -->|Yes| CheckExpiry
    CheckExpiry -->|Yes| ReturnCached
    CheckExpiry -->|No| FetchFresh
    FetchFresh --> StoreCache
    StoreCache --> ReturnFresh
```

### Cache Properties

| Property | Value | Purpose |
|----------|-------|---------|
| **Scope** | Per user session | Invalidates on logout/user change |
| **Thread Safety** | Mutex-protected | Prevents race conditions |
| **Force Refresh** | Supported | Clears cache and fetches fresh |

### Cache Status

| Status | Meaning |
|--------|---------|
| **NOT_CACHED_IN_MEMORY** | No cached data |
| **EXPIRED** | Cache has expired |
| **VALID** | Cache is usable |

---

## Exception Handling

### Exception Hierarchy

```mermaid
flowchart TD
    Base["ChaloException"]
    Send["SendOtpFailedException"]
    Login["LoginVerificationFailedException"]
    Refresh["RefreshAuthTokensFailedException"]
    UID["TruecallerUidFetchFailedException"]
    Consent["UserConsentStatusFetchFailedException"]
    ConsentUpdate["UserConsentUpdateFailedException"]
    Tokens["InvalidRefreshAuthTokensException"]
    Profile["ProfileAndTokensExceptions"]

    Base --> Send
    Base --> Login
    Base --> Refresh
    Base --> UID
    Base --> Consent
    Base --> ConsentUpdate
    Base --> Tokens
    Base --> Profile
```

### Exception Details

| Exception | Cause | Contains |
|-----------|-------|----------|
| **SendOtpFailedException** | OTP API error | Error code, message |
| **LoginVerificationFailedException** | Login API error | Error code, message |
| **RefreshAuthTokensFailedException** | Refresh API error | Error code, message |
| **TruecallerUidFetchFailedException** | UID API error | Error code |
| **UserConsentStatusFetchFailedException** | Consent fetch error | Error code |
| **UserConsentUpdateFailedException** | Consent update error | Error code |
| **InvalidRefreshAuthTokensException** | Invalid tokens in response | — |
| **ProfileAndTokensExceptions** | Invalid profile/tokens | Specific sub-type |

### Error Response Mapping

```mermaid
flowchart TD
    Response["API Response"]
    CheckSuccess{isSuccess?}
    Parse["Parse response"]
    Return["Return model"]
    CheckCode["Check error code"]
    MapException["Create typed exception"]
    Throw["Throw exception"]

    Response --> CheckSuccess
    CheckSuccess -->|Yes| Parse
    CheckSuccess -->|No| CheckCode
    Parse --> Return
    CheckCode --> MapException
    MapException --> Throw
```

### Server Error Codes

| Code | Meaning | Exception |
|------|---------|-----------|
| 1001 | Invalid OTP | LoginVerificationFailedException |
| 1002 | OTP expired | SendOtpFailedException (PREVIOUS_OTP_EXPIRED) |
| 1003 | Too many attempts | SendOtpFailedException |
| 2001 | Invalid refresh token | RefreshAuthTokensFailedException |
| 2002 | Refresh token expired | RefreshAuthTokensFailedException |
| 3001 | User not found | LoginVerificationFailedException |

---

## Logout Cleanup

### Data Cleared on Logout

| Data | Method | Order |
|------|--------|-------|
| FCM Token | FCM feature | 1 |
| Products (wallet, tickets) | ClearProductStoresUseCase | 2 |
| User profile | clearStoredUserProfileAndAuthTokensDetails() | 3 |
| Auth tokens | Same as above | 3 |
| Consent cache | DpdpaConsentManager.clear() | 4 |

### Cleanup Sequence

```mermaid
sequenceDiagram
    participant Logout as LogoutUseCase
    participant FCM as FCM Manager
    participant Products as ProductsUseCase
    participant Login as LoginRepository
    participant Local as LocalDataSource
    participant Consent as ConsentManager

    Logout->>FCM: Clear FCM token
    Logout->>Products: invoke()
    Note over Products: Clear tickets, passes, wallet

    Logout->>Login: makeLogoutUserCall()
    Note over Login: Best effort API call

    Logout->>Login: clearStoredProfile()
    Login->>Local: Clear profile data
    Login->>Local: Clear auth tokens

    Logout->>Consent: Clear cache
```

---

## Dependency Injection

### Koin Bindings

| Interface | Implementation | Scope |
|-----------|----------------|-------|
| LoginRepository | LoginRepositoryImpl | Factory |
| LoginRemoteDataSource | LoginRemoteDataSourceImpl | Factory |
| LoginLocalDataSource | LoginLocalDataSourceImpl | Factory |
| ChaloAuthSecureManager | ChaloAuthSecureManagerImpl | Singleton |
| DpdpaConsentManager | DpdpaConsentManagerImpl | Singleton |
| UserProfileDetailsProvider | UserProfileDetailsProviderImpl | Singleton (createdAtStart) |

### Dependency Graph

```mermaid
flowchart TB
    subgraph Koin["Koin Module"]
        RepoBinding["LoginRepository"]
        RemoteBinding["RemoteDataSource"]
        LocalBinding["LocalDataSource"]
        SecureBinding["AuthSecureManager"]
        ConsentBinding["ConsentManager"]
    end

    subgraph Impl["Implementations"]
        RepoImpl["LoginRepositoryImpl"]
        RemoteImpl["RemoteDataSourceImpl"]
        LocalImpl["LocalDataSourceImpl"]
        SecureImpl["ChaloAuthSecureManagerImpl"]
        ConsentImpl["DpdpaConsentManagerImpl"]
    end

    subgraph Deps["Dependencies"]
        NetworkMgr["NetworkManager"]
        ExMapper["GenericExceptionMapper"]
        DataStore["DataStoreManager"]
        Vault["SecureVault"]
    end

    RepoBinding -.-> RepoImpl
    RemoteBinding -.-> RemoteImpl
    LocalBinding -.-> LocalImpl
    SecureBinding -.-> SecureImpl
    ConsentBinding -.-> ConsentImpl

    RepoImpl --> RemoteBinding
    RepoImpl --> LocalBinding
    RemoteImpl --> NetworkMgr
    RemoteImpl --> ExMapper
    LocalImpl --> DataStore
    SecureImpl --> Vault
    ConsentImpl --> RepoBinding
```

---

## Security

### Data Protection

| Aspect | Implementation |
|--------|----------------|
| **Token Storage** | Encrypted via Android Keystore / iOS Keychain |
| **Profile Storage** | Encrypted DataStore |
| **Transport** | HTTPS only with certificate pinning |
| **JWT Parsing** | Decode-only (no signature verification on client) |
| **Truecaller** | Server verifies signature |

### Token Security

| Token | Storage | Lifetime | Refresh |
|-------|---------|----------|---------|
| **Access Token** | Encrypted preferences | Short (15-30 min) | Via refresh token |
| **Refresh Token** | Encrypted preferences | Long (30 days) | Via re-login |

### Secure Headers

All authenticated API calls include:

| Header | Purpose |
|--------|---------|
| **Authorization** | Bearer {accessToken} |
| **X-Device-Id** | Device identifier |
| **X-App-Version** | App version |
| **X-Platform** | Android/iOS |

---

## Platform Implementations

### Android

| Component | Implementation |
|-----------|----------------|
| **Secure Storage** | Android Keystore + EncryptedSharedPreferences |
| **DataStore** | Jetpack DataStore |
| **Network** | Ktor with OkHttp engine |
| **SMS Retriever** | Google Play Services SmsRetriever |
| **Truecaller** | Truecaller Android SDK |

### iOS

| Component | Implementation |
|-----------|----------------|
| **Secure Storage** | iOS Keychain |
| **DataStore** | NSUserDefaults with encryption |
| **Network** | Ktor with Darwin engine |
| **SMS Retriever** | Not available (manual entry) |
| **Truecaller** | Limited/no support |

---

## Error Handling Summary

| Scenario | Exception | User Impact |
|----------|-----------|-------------|
| Network failure | Various | "Check connection" |
| OTP send failed | SendOtpFailedException | "Could not send OTP" |
| Invalid OTP | LoginVerificationFailedException | "Invalid OTP" |
| Token refresh failed | RefreshAuthTokensFailedException | Force re-login |
| Consent fetch failed | UserConsentStatusFetchFailedException | Full-screen error |
| Storage failure | ChaloLocalException | Retry or re-login |
