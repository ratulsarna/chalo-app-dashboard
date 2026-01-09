# Authentication flow analytics event flow diagrams

These diagrams exist to help build funnels in analytics dashboards. Green nodes are the exact event strings emitted by the app; grey nodes are non-analytics context (screens/states/branches). Edges show the typical order and major forks.

Notes:
- Authentication has two primary paths: **OTP-based login** (phone number) and **Truecaller login**
- Users can skip login entirely via the "skip" button
- Profile management events are logged post-authentication
- `login successful` and `login failed` can be emitted from either the login options screen (Truecaller path) or OTP verification screen (OTP path)

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

## Overall authentication flow structure

```mermaid
flowchart TD
  ui_entry([App requires login]) --> ev_loginScreen["login screen displayed"]

  ev_loginScreen -->|User chooses| ui_pathChoice([Authentication path choice])

  ui_pathChoice -->|Phone number| ui_otpPath([OTP path])
  ui_pathChoice -->|Truecaller| ui_truecallerPath([Truecaller path])
  ui_pathChoice -->|Skip| ev_skipLogin["login skip btn clicked"]

  ui_otpPath --> funnel_otp([OTP Login Funnel])
  ui_truecallerPath --> funnel_truecaller([Truecaller Login Funnel])

  funnel_otp --> ev_loginSuccess1["login successful"]
  funnel_truecaller --> ev_loginSuccess2["login successful"]

  ev_loginSuccess1 --> ui_authenticated([User authenticated])
  ev_loginSuccess2 --> ui_authenticated
  ev_skipLogin --> ui_guest([Guest mode - no auth])

  ui_authenticated --> ui_profileAccess([Profile management available])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;
  classDef external fill:#ffffff,stroke:#6b7280,stroke-dasharray: 3 3,color:#111827;

  class ev_loginScreen,ev_skipLogin,ev_loginSuccess1,ev_loginSuccess2 event;
  class ui_entry,ui_pathChoice,ui_otpPath,ui_truecallerPath,ui_authenticated,ui_guest,ui_profileAccess,funnel_otp,funnel_truecaller ui;
```

## Funnel 1: OTP-based login (phone number)

```mermaid
flowchart TD
  ui_loginScreen([Login screen displayed]) --> ev_screenOpen["login screen displayed"]

  ev_screenOpen --> ui_userEntersPhone([User enters phone number])
  ui_userEntersPhone --> ev_continueClicked["login continue btn clicked"]

  ev_continueClicked --> ui_otpRequest([OTP request API call])
  ui_otpRequest --> ev_otpSent["otp sent"]
  ui_otpRequest --> ev_otpRequestFailed["login otp request failed"]

  ev_otpSent --> ui_otpScreen([OTP entry screen])
  ui_otpScreen --> ev_otpEntered["otp entered"]

  ev_otpEntered --> ui_verifyOtp([Verify OTP API call])
  ui_verifyOtp --> ev_loginSuccess["login successful"]
  ui_verifyOtp --> ev_loginFailed["login failed"]

  ui_otpScreen --> ev_resendClicked["resend otp button clicked"]
  ev_resendClicked --> ui_resendRequest([Resend OTP API call])
  ui_resendRequest --> ev_otpResent["otp resent"]
  ui_resendRequest --> ev_resendFailed["resend otp request failed"]

  ev_otpResent --> ui_otpScreen

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_screenOpen,ev_continueClicked,ev_otpSent,ev_otpRequestFailed,ev_otpEntered,ev_loginSuccess,ev_loginFailed,ev_resendClicked,ev_otpResent,ev_resendFailed event;
  class ui_loginScreen,ui_userEntersPhone,ui_otpRequest,ui_otpScreen,ui_verifyOtp,ui_resendRequest ui;
```

### Key metrics for OTP funnel:
- **Conversion rate**: `login screen displayed` → `login continue btn clicked` → `otp sent` → `otp entered` → `login successful`
- **Failure points**: Track `login otp request failed` (network/API issues) vs `login failed` (invalid OTP)
- **Resend rate**: `resend otp button clicked` / `otp sent` (indicates OTP delivery issues)

## Funnel 2: Truecaller login

```mermaid
flowchart TD
  ui_loginScreen([Login screen displayed]) --> ev_screenOpen["login screen displayed"]

  ev_screenOpen --> ui_userSelectsTruecaller([User taps Truecaller option])
  ui_userSelectsTruecaller --> ev_uidFetchTry["login truecaller uid fetch try"]

  ev_uidFetchTry --> ui_uidFetch([Fetch Truecaller UID])
  ui_uidFetch --> ev_uidFetchSuccess["login truecaller uid fetch success"]
  ui_uidFetch --> ev_uidFetchFailed["login truecaller uid fetch failed"]

  ev_uidFetchSuccess --> ev_bottomSheetRendered["truecaller bottomsheet rendered for login"]

  ev_bottomSheetRendered --> ui_truecallerAuth([User interacts with Truecaller UI])
  ui_truecallerAuth --> ev_continueWithTruecaller["continue with truecaller clicked"]
  ui_truecallerAuth --> ev_truecallerError["truecaller error callback"]

  ev_continueWithTruecaller --> ui_verifyTruecaller([Verify Truecaller token])
  ui_verifyTruecaller --> ev_loginSuccess["login successful"]
  ui_verifyTruecaller --> ev_loginFailed["login failed"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_screenOpen,ev_uidFetchTry,ev_uidFetchSuccess,ev_uidFetchFailed,ev_bottomSheetRendered,ev_continueWithTruecaller,ev_truecallerError,ev_loginSuccess,ev_loginFailed event;
  class ui_loginScreen,ui_userSelectsTruecaller,ui_uidFetch,ui_truecallerAuth,ui_verifyTruecaller ui;
```

### Key metrics for Truecaller funnel:
- **Availability**: `login truecaller uid fetch try` → `login truecaller uid fetch success` (Truecaller availability rate)
- **Conversion rate**: `truecaller bottomsheet rendered for login` → `continue with truecaller clicked` → `login successful`
- **Failure points**: Track `login truecaller uid fetch failed` (app not installed) vs `truecaller error callback` (user cancelled) vs `login failed` (verification failed)

## Funnel 3: User profile management (post-authentication)

```mermaid
flowchart TD
  ui_authenticated([User authenticated and logged in]) --> ev_profileRefreshed["user profile screen refreshed"]

  ev_profileRefreshed --> ui_profileActions([User profile actions])

  ui_profileActions -->|Edit profile| ev_editClicked["user profile edit clicked"]
  ui_profileActions -->|Logout| ev_logoutClicked["user profile logout clicked"]
  ui_profileActions -->|Delete account| ev_deleteClicked["user profile delete clicked"]

  ev_editClicked --> ui_editScreen([Profile edit screen])
  ui_editScreen --> ev_editScreenDisplayed["user profile edit screen displayed"]

  ev_editScreenDisplayed --> ui_editActions([Edit actions])

  ui_editActions -->|Edit photo| ev_photoClicked["user profile edit photo clicked"]
  ui_editActions -->|Edit gender| ev_genderClicked["user profile edit gender clicked"]
  ui_editActions -->|Edit DOB| ev_dobClicked["user profile edit dob clicked"]
  ui_editActions -->|Save| ev_saveClicked["user profile edit save clicked"]
  ui_editActions -->|Cancel| ev_cancelClicked["user profile edit cancel clicked"]

  ev_photoClicked --> ev_photoChanged["user profile photo changed"]
  ev_photoChanged --> ev_photoUploaded["user profile photo uploaded"]

  ev_genderClicked --> ev_genderChanged["user profile gender changed"]

  ev_dobClicked --> ev_dobChanged["user profile dob changed"]

  ev_saveClicked --> ui_saveApi([Save profile API call])
  ui_saveApi --> ev_editSuccess["user profile edit successful"]
  ui_saveApi --> ev_editFailed["user profile edit failed"]

  ev_logoutClicked --> ui_logoutApi([Logout API call])
  ui_logoutApi --> ev_logoutResult["user profile logout result"]
  ev_logoutResult -->|loggedOutSuccessfully=true| ev_userLoggedOut["user logged out"]

  ev_deleteClicked --> ui_deleteUrl([Open delete account URL])
  ui_deleteUrl --> ev_deleteUrlOpened["user profile delete web url opened"]

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_profileRefreshed,ev_editClicked,ev_logoutClicked,ev_deleteClicked,ev_editScreenDisplayed,ev_photoClicked,ev_genderClicked,ev_dobClicked,ev_saveClicked,ev_cancelClicked,ev_photoChanged,ev_photoUploaded,ev_genderChanged,ev_dobChanged,ev_editSuccess,ev_editFailed,ev_logoutResult,ev_userLoggedOut,ev_deleteUrlOpened event;
  class ui_authenticated,ui_profileActions,ui_editScreen,ui_editActions,ui_saveApi,ui_logoutApi,ui_deleteUrl ui;
```

### Key metrics for profile management:
- **Profile completion rate**: Track which fields users update (`user profile photo changed`, `user profile gender changed`, `user profile dob changed`)
- **Edit success rate**: `user profile edit save clicked` → `user profile edit successful` vs `user profile edit failed`
- **Logout success**: Track `user profile logout result` with `loggedOutSuccessfully` attribute
- **Account deletion intent**: `user profile delete clicked` → `user profile delete web url opened` (funnel drop-off indicates friction)

## Skip login path

```mermaid
flowchart TD
  ui_loginScreen([Login screen displayed]) --> ev_screenOpen["login screen displayed"]

  ev_screenOpen --> ui_skipOption([User can skip login])
  ui_skipOption --> ev_skipClicked["login skip btn clicked"]

  ev_skipClicked --> ui_guestMode([Continue as guest - no authentication])

  classDef event fill:#166534,stroke:#166534,color:#ffffff;
  classDef ui fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 5 5,color:#111827;

  class ev_screenOpen,ev_skipClicked event;
  class ui_loginScreen,ui_skipOption,ui_guestMode ui;
```

### Key metrics for skip login:
- **Skip rate**: `login skip btn clicked` / `login screen displayed` (indicates authentication friction or value proposition issues)

## Property usage guide

### method property (login successful / login failed)
Used to segment authentication success/failure by method:
- `"otp"` - Phone number + OTP verification
- `"trueCaller"` - Truecaller authentication

Example funnel filter: `login successful WHERE method = "otp"` vs `login successful WHERE method = "trueCaller"`

### countryCallingCode property
Tracks international user distribution and can identify country-specific OTP delivery issues.

Example: `otp sent WHERE countryCallingCode = "+91"` (India) vs `"+1"` (US/Canada)

### reason property
Critical for debugging failures. Used in:
- `login failed` - Indicates why authentication failed (e.g., "Invalid otp entered", network errors)
- `truecaller error callback` - Truecaller-specific errors (user cancelled, network issues, etc.)
- `user profile edit failed` - Profile update failure reasons

### loggedOutSuccessfully property
Boolean flag on `user profile logout result` to distinguish successful vs failed logout attempts.

Example: `user profile logout result WHERE loggedOutSuccessfully = false` (to investigate logout issues)

## Common funnel patterns for PMs

### 1. Overall authentication conversion
```
login screen displayed
  → login continue btn clicked OR continue with truecaller clicked
  → otp sent OR truecaller bottomsheet rendered for login
  → login successful
```

### 2. OTP delivery success
```
login continue btn clicked
  → otp sent (success)
  → login otp request failed (failure)
```

### 3. OTP verification success
```
otp entered
  → login successful (success)
  → login failed (failure)
```

### 4. Truecaller availability and conversion
```
login truecaller uid fetch try
  → login truecaller uid fetch success (Truecaller available)
  → truecaller bottomsheet rendered for login
  → continue with truecaller clicked
  → login successful
```

### 5. Profile edit completion
```
user profile edit clicked
  → user profile edit screen displayed
  → user profile edit save clicked
  → user profile edit successful
```

### 6. Account deletion funnel
```
user profile delete clicked
  → user profile delete web url opened
```
(Drop-off between these two events indicates issues opening the deletion URL)
