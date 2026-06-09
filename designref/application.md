# Doorlock BLE Application — Specification

A Flutter application that controls and manages smart door locks over Bluetooth Low Energy (BLE). The application supports three operational roles (Owner, Guest, and Friend), persists known devices in a local SQLite database, and runs a foreground background service that performs periodic BLE scans and dispatches Time-based One-Time Password (TOTP) unlock commands to authorized devices automatically.

This document is the authoritative specification of the project. Its purpose is to allow a new engineer to take over development without prior context.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack and Dependencies](#2-tech-stack-and-dependencies)
3. [Architectural Overview (Clean Architecture)](#3-architectural-overview-clean-architecture)
4. [Project Structure](#4-project-structure)
5. [Application Lifecycle and Dependency Injection](#5-application-lifecycle-and-dependency-injection)
6. [Routing Map](#6-routing-map)
7. [End-to-End User Flows](#7-end-to-end-user-flows)
8. [BLE Protocol Specification (v1.3)](#8-ble-protocol-specification-v13)
9. [Domain Layer](#9-domain-layer)
10. [Data Layer](#10-data-layer)
11. [Local Database (SQLite)](#11-local-database-sqlite)
12. [Background Scan Service](#12-background-scan-service)
13. [Share File Format and Cryptography](#13-share-file-format-and-cryptography)
14. [Authentication Models](#14-authentication-models)
15. [TOTP Implementation](#15-totp-implementation)
16. [Permissions and Platform Configuration](#16-permissions-and-platform-configuration)
17. [State Management and Reactive Streams](#17-state-management-and-reactive-streams)
18. [Error Handling Strategy](#18-error-handling-strategy)
19. [User Interface and Theme](#19-user-interface-and-theme)
20. [Testing Strategy](#20-testing-strategy)
21. [Build and Run](#21-build-and-run)
22. [Known Stubs and Outstanding Work](#22-known-stubs-and-outstanding-work)
23. [Extension Guidelines](#23-extension-guidelines)

---

## 1. Project Overview

The application is a mobile client for smart door locks that expose a custom BLE GATT service. It performs the following responsibilities:

- Discovers nearby door-lock peripherals through BLE scanning.
- Authenticates the holder of the device against the lock using one of two mechanisms: Passkey Authentication (Owner) or Friend Authentication (Guest).
- Provisions a fresh TOTP shared secret on first-time setup, persists it locally, and uses it to generate one-time unlock codes.
- Operates a foreground background service that scans for known devices when the application is not in the foreground and silently delivers TOTP unlock commands when a known device is in BLE range.
- Allows the Owner to issue time-limited access shares to other users by writing a friend slot on the device and exporting an encrypted share file. A Guest can import that file on another phone to gain access.
- Reads and surfaces device telemetry (lock state, battery level, door open/closed, time-of-flight distance, whitelist occupancy, friend roster).

### 1.1 Operational Roles

| Role | Authentication Mechanism | Source of Identity |
| ---- | ------------------------ | ------------------ |
| Owner | Passkey Auth (4-digit PIN + 6-byte device UUID) written to the `passkeyAuth` characteristic | The user provisioning the device for the first time. The Owner is also entered into the device whitelist. |
| Guest | Friend Auth (6-character friend code + 32-bit TOTP code) written to the `friendAuth` characteristic | A user who imported a share file issued by the Owner. The friend slot is allocated by the device and bound to a TOTP secret shared by the Owner. |
| Friend | Identical to Guest at the protocol level | Conceptual term used in the device firmware for whitelisted non-owner identities. Each friend has a unique friend code. |

### 1.2 Out-of-Scope (Current Build)

The following items are intentionally not implemented and are documented in [Section 22](#22-known-stubs-and-outstanding-work):

- Real authentication backend. The login screen is a navigation stub.
- Server-side identity, device registry, or audit log.
- Localization. Strings are English-only.
- Over-the-air firmware update.

---

## 2. Tech Stack and Dependencies

### 2.1 Runtime

- **Flutter SDK:** `^3.11.0` (Dart 3 features are used).
- **Target platforms:** Android and iOS. The repository contains scaffolding for desktop targets (`linux/`, `macos/`, `windows/`, `web/`) but those are not part of the supported build matrix.

### 2.2 Production Dependencies

| Package | Version | Purpose |
| ------- | ------- | ------- |
| `flutter_blue_plus` | `^2.1.1` | BLE central role: scanning, GATT connection, characteristic read/write. |
| `get` | `^4.7.3` | State management, dependency injection, and routing (`GetMaterialApp`, `Bindings`, `GetXController`, `Get.toNamed`). |
| `dartz` | `^0.10.1` | `Either<Failure, Success>` for explicit, exception-free error propagation across layer boundaries. |
| `equatable` | `^2.0.5` | Value-equality for entities and value objects. |
| `rxdart` | `^0.27.7` | `BehaviorSubject` multicasting in the device state cache. |
| `sqflite` | `^2.4.2` | Local persistence of known devices. |
| `path` | `^1.9.1` | Database path joining. |
| `flutter_local_notifications` | `^20.1.0` | Foreground service notification channel and ongoing status updates. |
| `flutter_background_service` | `^5.1.0` | Cross-platform foreground/background isolate that runs the periodic BLE scan loop. |
| `otp` | `^3.2.0` | TOTP code generation (RFC 6238, SHA-1, 6-digit, 30-second period). |
| `base32` | `^2.2.0` | Base32 encoding of TOTP secrets (RFC 4648 alphabet). |
| `cryptography` | `^2.7.0` | AES-GCM authenticated encryption and PBKDF2-HMAC-SHA256 key derivation for the share file envelope. |
| `permission_handler` | `^12.0.1` | Runtime permission requests (`bluetoothScan`, `bluetoothConnect`, `location`, `notification`). |
| `android_intent_plus` | `^6.0.0` | Launching the Android Location Source Settings activity when location services are disabled. |
| `qr_flutter` | `^4.1.0` | Renders the `otpauth://` URI as a QR code on the post-setup bottom sheet. |
| `path_provider` | `^2.1.5` | Resolves the application documents directory for export-file output. |
| `share_plus` | `^11.0.0` | Invokes the platform share sheet for the encrypted share file. |
| `file_picker` | `^9.0.0` | Lets the Guest select a share file during import. |
| `intl` | `^0.20.2` | Date/time formatting (used in UI). |
| `google_fonts` | `^8.0.1` | Custom typography. |
| `logger` | `^2.6.2` | Structured logging. The single `Logger()` instance is created per-class. |

### 2.3 Development Dependencies

| Package | Purpose |
| ------- | ------- |
| `flutter_test` | Standard Flutter test harness. |
| `flutter_lints` `^6.0.0` | Lint rules referenced from `analysis_options.yaml`. |
| `mockito` `^5.4.4` | Generated mocks for unit tests. |
| `mocktail` `^1.0.3` | Hand-written mocks for use cases that take complex types. |
| `build_runner` `^2.4.8` | Source generation for `mockito`. |

---

## 3. Architectural Overview (Clean Architecture)

The application follows a three-layer Clean Architecture topology. Dependencies point inward only: `presentation` depends on `domain`; `data` depends on `domain`; `domain` depends on neither.

```
+-------------------------------+
|        Presentation           |   GetX Pages, Controllers, Bindings
|  (lib/features/*/presentation)|
+---------------+---------------+
                |
                v
+-------------------------------+
|            Domain             |   Entities, Use Cases, Repository Contracts
|     (lib/features/*/domain)   |
+---------------+---------------+
                ^
                |
+-------------------------------+
|             Data              |   Datasources, Repository Impl, Mappers, Models
|     (lib/features/*/data)     |
+-------------------------------+
```

### 3.1 Cross-Cutting Conventions

- **Result type.** Every public repository method returns `Future<Either<Failure, T>>` (or, for streaming methods, `Stream<Either<Failure, T>>`). Exceptions never cross the domain boundary. Callers must `fold` the result.
- **Failure hierarchy.** All failures inherit from `Failure` in `lib/core/error/failures.dart`. Specific subclasses signal cause to the UI: `BluetoothFailure`, `ConnectionFailure`, `PermissionFailure`, `CacheFailure`, `ServerFailure`.
- **Translation.** Raw exceptions thrown by `flutter_blue_plus` and platform channels are normalized to short, human-readable strings via `BleErrorTranslator.translate(Object)` before they reach the UI.
- **Dependency injection.** GetX `Bindings` declare per-route dependencies. Long-lived singletons (`BleDeviceRemoteDataSource`, `DeviceRepository`) are registered with `fenix: true` so that they survive controller disposal and are reused across pages within the same device session.

---

## 4. Project Structure

```
lib/
├── main.dart                              Application entry point and root widget.
├── routes/
│   ├── app_pages.dart                     GetPage list and custom fade transition.
│   └── app_routes.dart                    Route name constants.
├── core/
│   ├── constants/
│   │   ├── app_constants.dart             App name and version string.
│   │   └── ble_uuids.dart                 GATT service and characteristic UUIDs.
│   ├── controllers/
│   │   └── global_ui_controller.dart      Tracks the current route for the global bottom navigation bar.
│   ├── crypto/
│   │   └── payload_cipher.dart            AES-GCM + PBKDF2-SHA256 envelope for the share file.
│   ├── database/
│   │   └── device_database_helper.dart    sqflite singleton with schema migrations.
│   ├── error/
│   │   ├── failures.dart                  Failure type hierarchy.
│   │   └── ble_error_translator.dart      Maps raw exceptions to user-facing strings.
│   ├── services/
│   │   ├── permission_service.dart        Bluetooth, location, and notification permission acquisition.
│   │   ├── notification_service.dart      Local notification channel for the foreground service.
│   │   └── background_scan_service.dart   Foreground isolate, scan loop, and message channels.
│   ├── theme/
│   │   ├── app_theme.dart                 Dark theme (the only theme).
│   │   └── background.dart                Animated dotted background painter.
│   ├── utils/
│   │   ├── ble_utils.dart                 Endian helpers, XOR checksum, TOTP generation, hex formatting.
│   │   └── totp_secret_generator.dart     CSPRNG-based Base32 secret + otpauth:// URI builder.
│   └── widgets/
│       ├── bottomnavigatebar/             Global bottom navigation bar.
│       ├── label/                         Themed Text wrapper.
│       ├── painter/                       Custom CustomPainter (dot painter).
│       └── table/                         Reusable table widget.
└── features/
    ├── login/
    │   ├── bindings/                      LoginBinding.
    │   ├── controller/                    LoginController (stub).
    │   └── screen/                        LoginPage.
    ├── dashboard/
    │   ├── bindings/                      DashboardBinding.
    │   ├── controller/                    Dashboardcontroller (sic).
    │   └── pages/                         Dashboard widget.
    └── device/
        ├── data/
        │   ├── datasources/               BleDeviceRemoteDataSource and impl.
        │   ├── mappers/                   BlePacketMapper (raw packets → domain entities).
        │   ├── models/                    BleDeviceModel, DeviceConnectionModel, ble_packets.dart.
        │   └── repositories/              DeviceRepositoryImpl, DeviceStateCache.
        ├── domain/
        │   ├── entities/                  Pure value types (LockStatus, DoorStatus, Friend, …).
        │   ├── repositories/              DeviceRepository interface.
        │   └── usecases/                  One file per command/query.
        └── presentation/
            ├── bindings/                  Per-route Bindings.
            ├── controllers/                Per-route GetX controllers.
            └── pages/                     Per-route widgets.
test/
├── core/                                  Unit tests for crypto, totp generator, ble_utils, error translator.
└── features/device/                       Unit tests for entities, packets, use cases, controllers.
```

---

## 5. Application Lifecycle and Dependency Injection

### 5.1 Entry Point (`lib/main.dart`)

```
main()
 ├─ WidgetsFlutterBinding.ensureInitialized()
 ├─ Get.put(GlobalUIController())          singleton, observes current route
 └─ runApp(MainApp())
```

`MainApp` builds a `GetMaterialApp` with:

- `initialRoute: Routes.login`
- `getPages: AppPages.routes` (declared in `lib/routes/app_pages.dart`)
- `theme` and `darkTheme` set to the same dark theme with a transparent scaffold background, so that the `GlobalBackground` painter shows through every page.
- A custom `builder` that wraps every route in a `Scaffold` containing a `GlobalBackground` and a `GlobalBottomNavigationBar`. The bottom navigation bar is hidden on the login route via an `Obx` watching `GlobalUIController.to.currentRoute`.
- A `routingCallback` that updates `GlobalUIController.currentRoute` on every navigation event.

### 5.2 Dependency Injection Strategy

GetX `Bindings` declare the dependency graph for each route. The convention is:

1. Register `BleDeviceRemoteDataSource` and `DeviceRepository` lazily with `fenix: true` if they are not already registered. This causes them to be reconstructed on demand after disposal, which is required for repeat navigation through the BLE-using routes.
2. Register the use cases consumed by the controller (also with `fenix: true` where the controller may be re-entered).
3. Register the controller itself.

This pattern ensures that the BLE datasource and its per-device service map are not duplicated when the user moves through Scan → Connect → Setup → Key Sharing → Friend List in a single session.

### 5.3 Controller Lifecycle Conventions

Every controller that opens a BLE connection follows this discipline:

- `onInit`: read `Get.arguments` and bind reactive streams.
- `onReady`: trigger the connection and the initial refresh.
- `onClose`: cancel stream subscriptions, disconnect the BLE peripheral if still connected, and resume the background scan service.

The `DoorlockSetupController.onClose` implementation is the canonical example: it cancels the door-status subscription, disconnects, then fires `BackgroundScanService.instance.resumeScan()` without awaiting it.

---

## 6. Routing Map

Route constants are declared in `lib/routes/app_routes.dart`. Page bindings are wired in `lib/routes/app_pages.dart` and use a `SameDurationFadeTransition` (100 ms) for all transitions.

| Route Constant | Path | Page Widget | Binding | Purpose |
| -------------- | ---- | ----------- | ------- | ------- |
| `Routes.login` | `/login` | `LoginPage` | `LoginBinding` | Entry screen. Currently a stub; both Login and "Continue as Guest" call `Get.offAllNamed(Routes.dashboard)`. |
| `Routes.dashboard` | `/dashboard` | `Dashboard` | `DashboardBinding` | Grid of saved devices, an "Add Device" tile, and an error banner. Polls the SQLite store every 10 seconds. |
| `Routes.addDeviceType` | `/add_device_type` | `AdddeviceTypePage` | `AddDeviceBinding` | Choose Owner or Guest path. |
| `Routes.scanDevice` | `/scan_device` | `ScandevicePage` | `ScanDeviceBinding` | BLE scan with a 10-second timeout. The Guest path additionally exposes the share-file import flow. |
| `Routes.connectDevice` | `/connect_device` | `ConnectDevicePage` | `ConnectDeviceBinding` | Connect to the selected peripheral and (in the legacy flow) authenticate with a 4-digit PIN. |
| `Routes.doorlockSetup` | `/doorlock_setup` | `DoorlockSetupPage` | `DoorlockSetupBinding` | Per-device dashboard. Drives both Owner First-Time Setup (TOTP secret generation) and ongoing operations (refresh, test unlock, add friend). |
| `Routes.doorlockKeySharing` | `/doorlock_key_sharing` | `DoorlockKeySharingPage` | `DoorlockKeySharingBinding` | Capture share name, access window, and notes for an Owner-issued share. |
| `Routes.doorlockShareDeviceSetting` | `/doorlock_share_device_setting` | `DoorlockShareDeviceSettingPage` | `DoorlockKeySharingBinding` | Per-share configuration screen. |
| `Routes.doorlockKeySharingViewCurrent` | `/doorlock_key_sharing_view_current` | `DoorlockKeySharingViewCurrentPage` | `DoorlockKeySharingBinding` | View the active share. |
| `Routes.doorlockKeyDeviceHistory` | `/doorlock_key_device_history` | `DoorlockKeyDeviceHistoryPage` | `DoorlockKeySharingBinding` | History of issued keys. |
| `Routes.doorlockExportFile` | `/doorlock_export_file` | `DoorlockExportFilePage` | `DoorlockExportFileBinding` | Performs the export pipeline: connect → friendAdd → assemble payload → encrypt → write to disk → invoke share sheet. |
| `Routes.doorlockFriendList` | `/doorlock_friend_list` | `DoorlockFriendListPage` | `DoorlockFriendListBinding` | Live friend roster with remove-by-code support. |

---

## 7. End-to-End User Flows

### 7.1 Owner First-Time Setup

1. From the dashboard, the user taps "Add Device" → "Owner".
2. `ScanDeviceController.startScan` invokes the data layer scan, listens to the device stream, and forwards the first match to the Connect route. A 10-second timeout pushes the user to the same route with a null device argument so the page can render a "no device found" state.
3. On the Connect route, the user enters a 4-digit PIN. `ConnectDeviceController.passkeyAuth` calls `AuthenticateDeviceUseCase`, which writes the Passkey Auth packet, synchronizes time, persists a `BleDeviceModel` row in SQLite, and disconnects.
4. The user is navigated to `DoorlockSetupPage` with the `BluetoothDevice` as the route argument.
5. `DoorlockSetupController.onReady` reconnects to the device, subscribes to lock-state, battery, and door-status streams, and refreshes them.
6. When `secretConfigured` is `false` (the device is in setup mode), the page exposes a "Generate TOTP" affordance. Invoking it calls `DoorlockSetupController.startFirstTimeSetup`, which:
   1. Generates a fresh 16-byte (128-bit) secret with `TotpSecretGenerator.generateBase32`.
   2. Writes it to the `totpSecretWrite` characteristic.
   3. Issues `syncTime` so the device clock matches the phone.
   4. Persists the secret on the local device row via `BackgroundScanService.upsertDevice`.
   5. Surfaces a QR code (`otpauth://totp/Scotty:<label>?secret=…&algorithm=SHA1&digits=6&period=30`) on a bottom sheet so the Owner can register the device with an authenticator application.
7. The "Test Unlock" button generates a TOTP code from the in-memory secret and writes it to the `totpAuth` characteristic to verify clock alignment.
8. On screen close, the controller disconnects and resumes the background scan service.

### 7.2 Owner Issues a Share to a Guest

1. From the device setup screen, the Owner navigates to the Key Sharing flow and supplies a share name, an access window (`accessStart`/`accessEnd`), and optional metadata.
2. `DoorlockKeySharingController.exportDeviceSharingFile` navigates to `Routes.doorlockExportFile` with the device handle and the form fields as arguments.
3. `DoorlockExportFileController.onInit` immediately prompts for an export passphrase (minimum 6 characters, must be confirmed) and starts the export pipeline:
   1. `ExportShareFileUseCase` connects to the device, calls `friendAdd(name)` over BLE which returns a 6-character `friendCode`, reads the previously stored `totpSecret` from SQLite, and assembles a `ShareFilePayload`.
   2. The controller serializes the payload to pretty-printed JSON, encrypts it with `PayloadCipher.encryptToEnvelopeJson`, and writes the resulting envelope JSON to `<applicationDocumentsDirectory>/<suggestedFileName>.scotty-share.json`.
4. The user taps "Share" to invoke the platform share sheet. The Owner is responsible for transmitting both the file and the passphrase to the Guest over separate channels.

### 7.3 Guest Imports a Share

1. From the dashboard, the Guest taps "Add Device" → "Guest".
2. On the Scan route, the Guest taps the "Browse" affordance. `ScanDeviceController.importGuestShareFile`:
   1. Uses `file_picker` to obtain the file path.
   2. Calls `ImportShareFileUseCase.needsPassphrase`. If `true`, prompts for the passphrase.
   3. Calls `ImportShareFileUseCase.execute`, which handles both encrypted envelopes (Phase 3) and plaintext files (Phase 1, retained for backwards compatibility).
   4. On success, persists a `BleDeviceModel` containing `friendCode` and `totpSecret` via `BackgroundScanService.upsertDevice`. The presence of `friendCode` causes the background scan service to use Friend Auth instead of TOTP unlock.
3. The user is navigated back to the dashboard.

### 7.4 Background Auto-Unlock

1. After the first `upsertDevice` call, the background scan service is started. It is a foreground service on Android (notification id 888, channel `ble_connection_channel`).
2. `onStart` reads all known devices from SQLite into a `Set<String> savedUuids`, initializes the notification channel, and begins scanning for peripherals advertising the configurable `serviceFind` UUID (`6e400001-b5a3-f393-e0a9-e50e24dcca9e`).
3. For every scan result whose `remoteId` is in `savedUuids` and not currently being processed, the service calls `connectAndSendTotp`:
   1. Connect with a 10-second timeout, request MTU 512 on Android.
   2. Discover services and locate the `BleConstants.service` GATT service.
   3. If the saved row has a non-empty `friendCode`, write a `FriendAuthPacket(friendCode, otpInt)` to the `friendAuth` characteristic.
   4. Otherwise, write a `TotpUnlockPacket(otpInt, command: 0)` to the `totpAuth` characteristic.
   5. Read the lock-state and battery characteristics (best effort) and update the device row with `lastLockState`, `lastBatteryLevel`, and `lastStatusAt`.
   6. Wait 5 seconds, then disconnect.
4. The service emits `service.invoke('deviceFound', …)` on each cycle for any UI listener that wishes to subscribe.
5. When the foreground UI enters a BLE-using screen, it calls `BackgroundScanService.instance.pauseScan()` to suspend the loop. `onClose` of the same controller calls `resumeScan()`.
6. When the user removes a device from the dashboard, `BackgroundScanService.deleteDevice` is invoked, which dispatches `deleteDevice` into the service. If the saved set becomes empty, the service stops itself.

---

## 8. BLE Protocol Specification (v1.3)

All multi-byte integers are little-endian unless explicitly noted. UUIDs are defined in `lib/core/constants/ble_uuids.dart`. Packet builders and parsers live in `lib/features/device/data/models/ble_packets.dart`.

### 8.1 Service UUIDs

| Constant | UUID | Use |
| -------- | ---- | --- |
| `BleConstants.service` | `91bad492-b950-4226-aa2b-4ede9fa42f59` | Primary application service. All custom characteristics live here. |
| `BleConstants.serviceFind` | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` | Advertised service used by both the foreground scan and the background scan to filter devices. |

### 8.2 Characteristic Map

| Property | Characteristic UUID | Direction | Payload Size |
| -------- | ------------------- | --------- | ------------ |
| Lock Status | `00002A56-0000-1000-8000-00805F9B34FB` | Read | ASCII string `LOCKED` / `UNLOCKED`. |
| Battery | `00002A19-0000-1000-8000-00805F9B34FB` | Read | 1 byte (0–100). |
| Time Sync | `00002A2B-0000-1000-8000-00805F9B34FB` | Write | 4 bytes (Format A) or 16 bytes (Format B). |
| TOTP Auth | `ca73b3ba-39f6-4ab3-91ae-186dc9577d99` | Write | 8 bytes. |
| Door Status | `12345678-1234-1234-1234-123456789abc` | Read | 9 bytes. |
| Touchpad Read | `87654321-4321-4321-4321-cba987654321` | Read | 8 bytes. |
| Touchpad Write | `11111111-2222-3333-4444-555566667777` | Write | 8 bytes. |
| TOTP Secret Write | `ABCDEF12-3456-7890-ABCD-EF1234567890` | Write | 42 bytes. |
| TOTP Secret Read | `ABCDEF12-3456-7890-ABCD-EF1234567891` | Read | 34 bytes. |
| Passkey Auth | `12345678-9ABC-DEF0-1234-56789ABCDEF0` | Write | 26 bytes. |
| Whitelist Status | `87654321-0FED-CBA9-8765-4321FEDCBA98` | Read | 7 bytes. |
| Friend Add | `91bad492-b950-4226-aa2b-4ede9fa42f5c` | Write/Read | Write: name + null terminator. Read: 8 bytes (friend code + null + checksum). |
| Friend Remove | `91bad492-b950-4226-aa2b-4ede9fa42f5d` | Write | 6 bytes (friend code). |
| Friend List | `91bad492-b950-4226-aa2b-4ede9fa42f5e` | Read | `count × 36` bytes followed by a count byte. |
| Friend Auth | `91bad492-b950-4226-aa2b-4ede9fa42f5f` | Write | 11 bytes. |

### 8.3 Packet Layouts

#### 8.3.1 Time Sync (Format A, 4 bytes)

| Offset | Size | Field | Description |
| ------ | ---- | ----- | ----------- |
| 0 | 4 | `unixTimestamp` | Seconds since epoch, little-endian. |

Format B (16 bytes) is defined in code but not currently transmitted. It additionally carries `syncCounter`, `syncStatus`, and `batteryLevel`.

#### 8.3.2 TOTP Unlock (8 bytes)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0 | 4 | `totpCode` (little-endian) |
| 4 | 1 | `command` (0 = unlock) |
| 5 | 3 | Reserved (zero-filled) |

#### 8.3.3 Door Status (9 bytes, read)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0 | 1 | `doorOpen` (0/1) |
| 1 | 1 | `locked` (0/1) |
| 2 | 4 | `statusTimestamp` (Unix seconds, little-endian) |
| 6 | 2 | `tofDistanceMm` (little-endian) |
| 8 | 1 | `secretConfigured` (0/1) |

`secretConfigured == false` indicates the device is in Setup Mode and the Owner must run First-Time Setup.

#### 8.3.4 Touchpad Password (8 bytes)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0..3 | 4 | Four PIN digits as bytes 0..9 |
| 4 | 1 | `passwordLength` (always 4) |
| 5 | 1 | XOR checksum of the four digits |
| 6..7 | 2 | Reserved (zero) |

#### 8.3.5 TOTP Secret (41 bytes — same layout for write and read)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0..32 | 33 | UTF-8 secret (Base32 alphabet), zero-padded (final byte is the conventional null terminator) |
| 33 | 1 | `secretLen` (number of significant bytes) |
| 34 | 1 | XOR checksum of the secret bytes |
| 35..40 | 6 | Reserved |

The published spec describes the write payload as 42 bytes with `secret_b32[32] + secret_len + checksum + reserved[8]`. The actual firmware attribute is 41 bytes laid out identically to the read response above; sending 42 bytes fails with `GATT_INVALID_ATTRIBUTE_LENGTH`. Write only succeeds while the lock is in Setup Mode (no custom secret previously stored).

#### 8.3.7 Passkey Auth (32 bytes)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0..5 | 6 | `deviceUuid` (raw bytes, owner-defined) |
| 6..9 | 4 | `passkey` (four digits 0..9) |
| 10 | 1 | `nameLength` |
| 11..30 | 20 | `deviceName` (ASCII, max 20 characters; remaining bytes are zero) |
| 31 | 1 | XOR checksum across bytes 0..30 |

The packet builder enforces all length constraints and throws `ArgumentError` on violation.

#### 8.3.8 Whitelist Status (7 bytes, read)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0 | 1 | `totalDevices` |
| 1 | 1 | `maxDevices` |
| 2 | 1 | `lastAuthResult` (0=success, 1=wrong passkey, 2=invalid format, 3=storage error, 4=whitelist full) |
| 3..6 | 4 | `lastAuthTimestamp` (Unix seconds, little-endian) |

#### 8.3.9 Friend Add (request: variable, response: 8 bytes)

Request: ASCII friend name terminated by `0x00`.

Response:

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0..5 | 6 | ASCII `friendCode` |
| 6 | 1 | Null pad |
| 7 | 1 | XOR checksum of the friend code |

The parser also accepts a 7-byte form (checksum at offset 6) for backward compatibility with the published spec.

#### 8.3.10 Friend Remove (6 bytes)

ASCII friend code, no checksum.

#### 8.3.11 Friend List (read)

The payload is composed of `N` 36-byte entries followed by a 1-byte count. The data source iterates `count` times and parses each entry:

| Offset (within entry) | Size | Field |
| --------------------- | ---- | ----- |
| 0..6 | 7 | ASCII `friendCode` (zero-padded) |
| 7..26 | 20 | ASCII `friendName` (zero-padded) |
| 27..34 | 8 | `addedTimestamp` (Unix seconds, little-endian, 64-bit) |
| 35 | 1 | `isActive` (0/1) |

#### 8.3.12 Friend Auth (11 bytes)

| Offset | Size | Field |
| ------ | ---- | ----- |
| 0..5 | 6 | ASCII `friendCode` |
| 6..9 | 4 | `totpCode` (little-endian) |
| 10 | 1 | XOR checksum across bytes 0..9 |

### 8.4 Connection Robustness

- The data source requests an MTU of 512 bytes on Android after every successful connection. This is required for the 42-byte TOTP secret write to complete in a single ATT operation.
- `_discoverServicesWithRetry` retries `discoverServices` up to three times with exponential backoff (250 ms × attempt). It also rejects an empty service list as a transient failure. Both behaviors mitigate `flutter_blue_plus` race conditions and GATT 133 transient errors observed on Android.
- The data source maintains a `Map<String, BluetoothService>` keyed by `BluetoothDevice.remoteId.toString()` so that connecting to a second peripheral does not invalidate the first.

---

## 9. Domain Layer

### 9.1 Entities (`lib/features/device/domain/entities/`)

| Entity | Fields |
| ------ | ------ |
| `DeviceConnection` | `deviceId`, `deviceName`, `isConnected`, `availableServices` |
| `LockStatus` | `state` (`locked` / `unlocked` / `unknown`), `raw` |
| `DoorStatus` | `doorOpen`, `locked`, `statusAt`, `tofDistanceMm`, `secretConfigured` (`isInSetupMode == !secretConfigured`) |
| `WhitelistStatus` | `totalDevices`, `maxDevices`, `lastAuthResult` (`AuthResult` enum), `lastAuthAt` |
| `Friend` | `code`, `name`, `addedAt`, `isActive` |
| `FriendCreated` | `friendCode` (returned by Friend Add) |
| `TotpSecret` | `base32` |
| `TouchpadPassword` | `digits` (List of 4 ints) |
| `ShareFilePayload` | `version`, `kind`, `deviceId`, `deviceName`, `friendCode`, `totpSecret`, `accessStart`, `accessEnd`, `shareName`, `otherInfo`, `ownerName`, `exportedAt` |

`AuthResult` is an enum with a `.message` extension that provides the user-facing string for each whitelist status code.

### 9.2 Repository Contract (`lib/features/device/domain/repositories/device_repository.dart`)

The `DeviceRepository` interface enumerates every operation the application performs against a door lock:

- **Discovery and connection.** `scanDevices`, `connectDevice`, `disconnectDevice`, `authenticateDevice`.
- **Reads.** `readLockStatus`, `readBatteryLevel`, `readDoorStatus`, `readTouchpadPassword`, `readTotpSecret`, `readWhitelistStatus`, `readFriendList`.
- **Writes.** `syncTime`, `unlockDoor`, `writeTouchpadPassword`, `writeTotpSecret`, `passkeyAuth`, `friendAuth`, `friendAdd`, `friendRemove`.
- **Streams (multicast through the state cache).** `watchLockStatus`, `watchBatteryLevel`, `watchDoorStatus`, `watchWhitelistStatus`, `watchFriendList`.
- **Refresh triggers.** `refreshLockStatus`, `refreshBatteryLevel`, `refreshDoorStatus`, `refreshWhitelistStatus`, `refreshFriendList`.
- **Lifecycle.** `disposeCache` (called when leaving a device session).

### 9.3 Use Cases (`lib/features/device/domain/usecases/`)

The codebase defines twenty-four use cases. Each use case is a thin object holding a reference to the repository and exposing a single `execute(...)` (or `stream()` / `refresh()`) method. This pattern keeps controllers small and lets unit tests target individual operations.

```
authenticate_device_usecase.dart       connect_device_usecase.dart
disconnect_device_usecase.dart         friend_add_usecase.dart
friend_auth_usecase.dart               friend_list_usecase.dart
friend_remove_usecase.dart             read_battery_usecase.dart
read_door_status_usecase.dart          read_lock_status_usecase.dart
read_totp_secret_usecase.dart          read_touchpad_password_usecase.dart
read_whitelist_status_usecase.dart     scan_devices_usecase.dart
sync_time_usecase.dart                 unlock_door_usecase.dart
watch_battery_usecase.dart             watch_door_status_usecase.dart
watch_friend_list_usecase.dart         watch_lock_status_usecase.dart
watch_whitelist_status_usecase.dart    write_totp_secret_usecase.dart
write_touchpad_password_usecase.dart   passkey_auth_usecase.dart
export_share_file_usecase.dart         import_share_file_usecase.dart
```

Two of these use cases (`export_share_file_usecase` and `import_share_file_usecase`) orchestrate multi-step flows internally and are the only use cases that touch infrastructure (sqflite, file IO, cryptography) — they do so through narrowly-scoped helpers and remain platform-free in their public signatures.

---

## 10. Data Layer

### 10.1 `BleDeviceRemoteDataSource`

The remote data source wraps `flutter_blue_plus`. Important state held by the implementation:

- `Map<String, BluetoothService> _servicesByDeviceId` — the discovered target service per peripheral.
- `Map<String, StreamSubscription<BluetoothConnectionState>> _connStateSubs` — per-peripheral connection-state listener that cleans up `_servicesByDeviceId` and `_activeDeviceId` on disconnect.
- `String? _activeDeviceId` — the most recently connected peripheral. All single-device characteristic operations (`_char(uuid)`) target this peripheral. The selection is made implicitly by `connectDevice`.

The implementation is the only place that interacts with raw `flutter_blue_plus` types. All BLE exceptions raised here are caught by `DeviceRepositoryImpl._guard`.

### 10.2 `DeviceRepositoryImpl`

Each public method delegates to the data source and (for read operations that produce raw packets) routes the result through `BlePacketMapper` to obtain a domain entity. `_guard<T>` is the single error-translation site:

```dart
Future<Either<Failure, T>> _guard<T>(
  Future<T> Function() action, {
  Failure Function(Object e)? onError,
}) async {
  try {
    return Right(await action());
  } catch (e) {
    final f = onError?.call(e) ?? BluetoothFailure(BleErrorTranslator.translate(e));
    return Left(f);
  }
}
```

Connect and disconnect operations supply a `ConnectionFailure` builder; every other method falls through to a translated `BluetoothFailure`.

### 10.3 `DeviceStateCache`

`DeviceStateCache` lives inside the repository (one instance per `DeviceRepositoryImpl`). It holds five `BehaviorSubject`s — lock status, battery, door status, whitelist status, friend list — and exposes them as broadcast streams. Each stream is fed by a `refresh*` method that invokes the data source, runs the result through the mapper, and pushes the value (or a `Left(BluetoothFailure(...))`) into the subject. `dispose()` closes all subjects.

This pattern lets multiple controllers subscribe to the same characteristic without duplicate reads. The setup screen, for example, subscribes to lock status, battery, and door status simultaneously.

### 10.4 `BlePacketMapper`

The mapper provides pure, synchronous translation between the on-the-wire packet types in `ble_packets.dart` and the domain entities in `domain/entities/`. It is the only layer permitted to construct domain entities from raw packets.

### 10.5 `BleDeviceModel` and `DeviceConnectionModel`

Data-layer DTOs for SQLite serialization and for transporting the result of a successful connection back through the repository, respectively. The `BleDeviceModel` schema is documented in [Section 11](#11-local-database-sqlite).

---

## 11. Local Database (SQLite)

### 11.1 Schema (Version 3)

```
CREATE TABLE devices (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid               TEXT    NOT NULL UNIQUE,   -- BluetoothDevice.remoteId
  name               TEXT    NOT NULL,
  rssi               INTEGER NOT NULL,
  last_seen          INTEGER NOT NULL,           -- millisecondsSinceEpoch
  device_uuid        TEXT,                       -- 12-char hex of the 6-byte owner-defined UUID
  totp_secret        TEXT,                       -- Base32 secret
  friend_code        TEXT,                       -- 6-char ASCII code (Guest only)
  last_lock_state    TEXT,                       -- 'LOCKED' / 'UNLOCKED' / null
  last_battery_level INTEGER,                    -- 0..100
  last_status_at     INTEGER                     -- millisecondsSinceEpoch
);
```

### 11.2 Migrations

The database file is `ble_devices.db` and is opened via `getDatabasesPath()`.

- **v1 → v2.** Adds `device_uuid`, `totp_secret`, `friend_code`.
- **v2 → v3.** Adds `last_lock_state`, `last_battery_level`, `last_status_at` (the foreground status snapshot maintained by the background scan).

### 11.3 Write Ownership

Once the background service is running, the foreground UI **must not** call `DeviceDatabaseHelper` directly for inserts or deletes. Instead, the UI dispatches `BackgroundScanService.upsertDevice(...)` and `BackgroundScanService.deleteDevice(...)`. These methods route the write through the background service when it is active and fall back to a direct write when the service has not yet started. This rule is necessary because the background service caches the saved-UUID set (`savedUuids`) in memory and would not pick up a foreground-only write until the next manual `updateDevices` invocation.

Foreground-only **reads** through `DeviceDatabaseHelper.instance.getAllDevices()` and `getDeviceByUuid(...)` remain permitted (the dashboard polls in this manner).

---

## 12. Background Scan Service

### 12.1 Lifecycle

`BackgroundScanService` (in `lib/core/services/background_scan_service.dart`) is a singleton that wraps `flutter_background_service`. Calling `initializeService()` configures both the Android (`AndroidConfiguration`, foreground service, notification id 888, channel `ble_connection_channel`) and iOS (`IosConfiguration`, `onForeground`, `onBackground`) entry points and calls `service.startService()`. The service is started lazily — `initializeService()` is a no-op when no devices are saved or when the service is already running.

### 12.2 The `onStart` Entry Point

`@pragma('vm:entry-point') void onStart(ServiceInstance service)` runs in a background isolate and:

1. Initializes the Flutter binding and Dart plugin registrant.
2. Loads all saved devices into a `Set<String> savedUuids`.
3. Initializes the notification channel.
4. Starts a continuous BLE scan filtered by `BleConstants.serviceFind`.
5. On every scan result, dispatches `connectAndSendTotp` for each known peripheral that is not already being processed (`processingDevices`).

Each `connectAndSendTotp` cycle ends with a 5-second wait followed by `device.disconnect()`, after which the parent coroutine restarts the scan.

### 12.3 Message Channels

The service is controlled exclusively through `service.invoke(name, payload?)` from the foreground. The supported messages are:

| Message | Payload | Effect |
| ------- | ------- | ------ |
| `stopService` | none | Cancels the scan subscription and stops the service. |
| `pauseScan` | none | Cancels the scan subscription without stopping the service. Used when a foreground BLE-using screen is open. |
| `resumeScan` | none | Restarts the scan subscription. |
| `updateDevices` | none | Reloads the saved-UUID set from SQLite. If empty, stops the service. |
| `upsertDevice` | `BleDeviceModel.toMap()` | Inserts or replaces the row in SQLite and adds the UUID to `savedUuids`. |
| `deleteDevice` | `{ 'uuid': String }` | Deletes the row, removes the UUID from `savedUuids`, and stops the service when the set becomes empty. |

### 12.4 Outbound Events

The service emits `service.invoke('deviceFound', { id, name, rssi, status, error? })` after each cycle, where `status ∈ { 'totp_sent', 'friend_auth_sent', 'error' }`. The foreground may listen via `FlutterBackgroundService().on('deviceFound')` to update its UI.

---

## 13. Share File Format and Cryptography

### 13.1 Plaintext Payload (`ShareFilePayload.toJson`)

```json
{
  "version": 1,
  "kind": "doorlock-friend-share",
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "deviceName": "Front Door",
  "friendCode": "ABC123",
  "totpSecret": "JBSWY3DPEHPK3PXP",
  "accessStart": "2026-05-06T08:00:00.000",
  "accessEnd":   "2026-05-13T20:00:00.000",
  "shareName": "House sitter",
  "otherInfo": "Optional notes",
  "ownerName": "Optional",
  "exportedAt": "2026-05-06T11:23:45.000Z"
}
```

`fromJson` rejects payloads with `version > currentVersion` or `kind != currentKind`. `suggestedFileName` slugifies `shareName` and appends an ISO-8601 timestamp, producing names of the form `house_sitter_2026-05-06T112345.scotty-share.json`.

### 13.2 Encrypted Envelope (`PayloadCipher`)

Every Owner export is wrapped in an authenticated-encryption envelope:

```json
{
  "version": 1,
  "kind": "doorlock-friend-share-encrypted",
  "kdf": "pbkdf2-sha256",
  "kdfIterations": 100000,
  "salt":       "{base64 16 bytes}",
  "nonce":      "{base64 12 bytes}",
  "ciphertext": "{base64 N bytes}",
  "mac":        "{base64 16 bytes}"
}
```

- **Key derivation.** PBKDF2-HMAC-SHA256, 100 000 iterations, 256-bit derived key. Salt is 16 random bytes generated per export with `Random.secure()`.
- **Cipher.** AES-GCM with a 256-bit key. The 96-bit nonce is generated by the cryptography library. Authentication tag length is 128 bits.
- **Verification.** Wrong passphrase or tampered ciphertext throws `SecretBoxAuthenticationError` on decrypt. The import use case maps this to a `CacheFailure('Wrong passphrase or tampered file')`.
- **Compatibility.** `PayloadCipher.isEncryptedEnvelope(String)` is a cheap header sniff used by the import flow to decide whether to prompt for a passphrase. Plaintext files (Phase 1 format) are still accepted.

---

## 14. Authentication Models

### 14.1 Owner Authentication (Passkey Auth)

The Owner identifies the device with a 6-byte device UUID and authenticates with a 4-digit PIN. The packet is built by `PasskeyAuthPacket.toBytes()` and written to the `passkeyAuth` characteristic.

Two strategies are used to derive the 6-byte UUID inside `DoorlockSetupController._deriveDeviceUuid6`:

1. **Owner-supplied UUID.** If the user enters a 12-character hex string into `deviceUuidInput` (e.g. `01:00:00:00:00:01` or `010000000001`), it is parsed by `parseDeviceUuid6` and used verbatim.
2. **Fallback.** Otherwise, the controller derives a deterministic 6-byte sequence by sampling pairs of hex characters from `BluetoothDevice.remoteId`. This ensures legacy flows continue to function before the explicit owner-UUID UI is exposed.

`AuthenticateDeviceUseCase` (the legacy entry point used from `ConnectDevicePage`) follows the same fallback strategy and additionally:

- Sends the Passkey Auth packet.
- Synchronizes time.
- Reads RSSI.
- Persists a `BleDeviceModel` row via `BackgroundScanService.upsertDevice`.
- Disconnects.

### 14.2 Guest Authentication (Friend Auth)

The Guest authenticates with a 6-character friend code and a 32-bit TOTP code. The packet is built by `FriendAuthPacket.toBytes()` and written to the `friendAuth` characteristic. Friend Auth carries an XOR checksum across bytes 0..9.

### 14.3 Whitelist Surfacing

`DoorlockSetupController._readWhitelistMessage()` reads the whitelist status characteristic immediately after every authentication attempt and uses `lastAuthResult.message` to give the user a precise outcome (e.g. `Wrong passkey`, `Whitelist full`). When the read fails, the controller falls back to the local error message.

---

## 15. TOTP Implementation

### 15.1 Secret Generation (`TotpSecretGenerator`)

- `generateBase32({byteLength = 16})` creates a fresh 128-bit secret using `Random.secure()` and encodes it with the RFC 4648 Base32 alphabet, stripping `=` padding. The default of 16 bytes maps to 26 Base32 characters and meets the RFC 4226 minimum entropy recommendation.
- `otpauthUri({...})` produces a `otpauth://totp/Scotty:<label>?secret=...&algorithm=SHA1&digits=6&period=30` URI suitable for QR encoding by `qr_flutter`.

### 15.2 Code Generation (`BleUtils.generateTOTP`)

```dart
OTP.generateTOTPCodeString(
  secret,
  DateTime.now().millisecondsSinceEpoch,
  length: 6,
  interval: 30,
  algorithm: Algorithm.SHA1,
  isGoogle: true,
);
```

Both the foreground "Test Unlock" button (`DoorlockSetupController.testUnlock`) and the background scan loop generate codes through this helper. The 6-digit decimal string is parsed to an integer and packed into the appropriate write packet.

### 15.3 Time Synchronization

After every successful first-time setup and after every Owner authentication, `SyncTimeUseCase` issues a Time Sync (Format A) packet containing the current Unix timestamp. The device uses this timestamp as the basis for TOTP validation.

---

## 16. Permissions and Platform Configuration

`PermissionServiceImpl.checkAndRequestBluetoothPermissions` requests:

- `Permission.bluetoothScan`
- `Permission.bluetoothConnect`
- `Permission.location`
- `Permission.notification`

On Android, after the permission prompt:

1. If location services are disabled, the app launches the `android.settings.LOCATION_SOURCE_SETTINGS` activity via `android_intent_plus`.
2. If the Bluetooth adapter is off, the app calls `FlutterBluePlus.turnOn()`.
3. If notification permission was denied, the app launches `openAppSettings()`.

This service is invoked on demand from the BLE-using flows. Manifests for both Android and iOS must declare the corresponding permissions; refer to `android/app/src/main/AndroidManifest.xml` and `ios/Runner/Info.plist`.

---

## 17. State Management and Reactive Streams

### 17.1 GetX Reactive Values

Controllers expose state as `Rx<T>` and `RxList<T>` observables. UI widgets subscribe with `Obx(() => ...)` for the smallest possible rebuild scope. Enumerated states are common; for example, `DoorlockSetupController` exposes:

- `connectionState: Rx<SetupConnectionState>` — `idle`, `connecting`, `connected`, `error`.
- `authState: Rx<AuthFlowState>` — `idle`, `inProgress`, `success`, `failed`.
- `firstTimeSetupState: Rx<FirstTimeSetupState>` — `idle`, `inProgress`, `success`, `failed`.
- `role: Rx<SetupRole>` — `owner`, `guest`.

This gives the UI deterministic finite states it can render with `switch` expressions or conditional widgets.

### 17.2 RxDart Multicasting

`DeviceStateCache` provides `BehaviorSubject` streams (see [Section 10.3](#103-devicestatecache)). Controllers may bind a stream directly to a `Rx<T>` using GetX's `bindStream`:

```dart
lockState.bindStream(
  watchLockStatus.stream().map((e) => e.fold((_) => LockState.unknown, (s) => s.state)),
);
```

This idiom collapses the `Either` into a default value for UI purposes while logging the failure side-channel.

### 17.3 Lifecycle Discipline

Subscriptions taken in `onInit` must be cancelled in `onClose`. Connections opened in `onReady` must be closed in `onClose`. Failure to do so leaks isolate-level BLE state and breaks subsequent connect attempts; this is a recurring source of bugs.

---

## 18. Error Handling Strategy

### 18.1 Failure Hierarchy

```
Failure (abstract)
 ├── ServerFailure
 ├── CacheFailure
 ├── BluetoothFailure
 ├── PermissionFailure
 └── ConnectionFailure
```

All `Failure` subclasses extend `Equatable` and carry a single `message: String`.

### 18.2 Translation (`BleErrorTranslator`)

`BleErrorTranslator.translate(Object error)` returns one short, period-free, user-facing sentence. Resolution order:

1. `FlutterBluePlusException` — match by description or stringified form against the heuristic dictionary, then fall back to the first line.
2. `TimeoutException` — `Operation timed out — please try again`.
3. `PlatformException` — match GATT codes (`8`, `19`, `22`, `34`, `133`, `147`, `257`) explicitly, then fall back to text matching.
4. Anything else — text match against the heuristic dictionary, then first line.

The text dictionary recognizes phrases such as `timeout`, `disconnected`, `characteristic ... not found`, `service ... not found`, `permission`, `bluetooth is off`, and `already connected`.

### 18.3 Surface Convention

- Inline banners (the dashboard) for steady-state errors (`errorMessage.value`).
- `Get.snackbar` for transient one-shot errors (the friend-add dialog, the test-unlock button).
- Stateful `enum` transitions for multi-step flows (export, import, first-time setup).

---

## 19. User Interface and Theme

### 19.1 Theme

`AppTheme.darkTheme` is the single theme. The `GetMaterialApp` overrides `scaffoldBackgroundColor` to `Colors.transparent` so that a `GlobalBackground` painter renders behind every page. Cards use `Color.fromRGBO(28, 26, 26, 0.5)` with reduced opacity to harmonize with the painter.

### 19.2 Global Chrome

- `GlobalBackground` is rendered behind every route.
- `GlobalBottomNavigationBar` is rendered at the bottom of every route except `Routes.login`. Visibility is gated by `Obx(() => GlobalUIController.to.currentRoute.value == Routes.login ? const SizedBox.shrink() : const GlobalBottomNavigationBar())`.
- Page transitions use `SameDurationFadeTransition` (100 ms `FadeTransition`) configured on every `GetPage`.

### 19.3 Reusable Widgets (`lib/core/widgets/`)

- `Label` — themed `Text` wrapper.
- `painter/dotpainter.dart` — the dotted background painter.
- `table/` — reusable table widget.

---

## 20. Testing Strategy

The test tree mirrors the production tree. Unit tests cover the layers most amenable to deterministic input/output:

```
test/
├── core/
│   ├── crypto/payload_cipher_test.dart                    Round-trips, wrong passphrase, tamper.
│   ├── error/ble_error_translator_test.dart               GATT codes and heuristic matches.
│   └── utils/
│       ├── ble_utils_test.dart                            Endian helpers, XOR checksum, TOTP.
│       └── totp_secret_generator_test.dart                Base32 alphabet, otpauth URI shape.
└── features/device/
    ├── data/models/ble_packets_test.dart                  Every packet type round-trip.
    ├── domain/
    │   ├── entities/share_file_payload_test.dart          JSON round-trip and version rejection.
    │   └── usecases/
    │       ├── _mock_repository.dart                      Shared mocktail setup.
    │       ├── simple_usecases_test.dart                  One-shot use cases.
    │       ├── watch_usecases_test.dart                   Stream use cases.
    │       ├── export_share_file_usecase_test.dart        Owner export pipeline.
    │       └── import_share_file_usecase_test.dart        Plaintext and encrypted import.
    └── presentation/
        ├── parse_device_uuid_test.dart                    UUID input parser.
        └── controllers/
            ├── add_device_controller_test.dart
            └── key_sharing_controller_test.dart
```

Mocks are generated for `mockito` with `flutter pub run build_runner build --delete-conflicting-outputs`. Hand-rolled `mocktail` mocks are used where ergonomics favor them.

The data source itself is **not** unit tested because `flutter_blue_plus` does not expose injectable seams. Coverage of the data layer is achieved indirectly through use-case tests against a mocked repository.

---

## 21. Build and Run

### 21.1 Prerequisites

- Flutter SDK 3.11 or newer.
- A real Android or iOS device. The iOS Simulator and the Android emulator do not expose a usable BLE stack.
- A door-lock peripheral that implements the v1.3 service (or a mock peripheral that exposes the same UUIDs and packet formats).

### 21.2 Commands

```
git clone <repository-url>
cd doorlock
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run                         # foreground build for debugging
flutter test                        # unit tests
flutter analyze                     # static analysis (must be clean)
```

The project policy is that `flutter analyze` must report zero issues before any change is considered complete.

---

## 22. Known Stubs and Outstanding Work

The following items are present in the codebase as placeholders. A successor engineer should treat them as backlog candidates:

1. **Login is a stub.** `LoginController.login()` and `continueAsGuest()` both call `Get.offAllNamed(Routes.dashboard)` without any credential validation. The email and password text controllers are unused.
2. **Hard-coded profile.** `Dashboard.profile()` renders the literal name `John Doe` and a remote avatar URL. There is no profile model.
3. **Cosmetic placeholder.** `Dashboard.lastupdateText()` renders the literal string `Last update: test`.
4. **Empty `mainCard`.** The dashboard summary card is currently a sized empty container.
5. **Time Sync Format B.** The 16-byte format is implemented in code but never written. The 4-byte Format A is the only one transmitted today.
6. **Disconnect Use Case.** `disconnect_device_usecase.dart` exists but the production paths call `repository.disconnectDevice(...)` directly via `Get.find<DeviceRepository>()`.
7. **iOS background scanning.** `flutter_background_service` on iOS only runs the `onForeground` entry point; sustained background BLE scanning is platform-restricted and is not currently designed for.
8. **Localization.** All UI strings are in English. No `intl` ARB files are provided.
9. **Server-side audit.** No telemetry or audit log of unlock events leaves the device.

---

## 23. Extension Guidelines

The conventions below describe the "happy path" for adding a new BLE-backed feature without disturbing the existing structure.

### 23.1 Adding a New BLE Operation

1. **Define the wire packet** in `lib/features/device/data/models/ble_packets.dart`. Provide both `toBytes()` (for writes) and `fromBytes(List<int>)` (for reads) where applicable. Include checksum validation if the firmware specifies one.
2. **Register the characteristic UUID** in `lib/core/constants/ble_uuids.dart`.
3. **Extend the data source.** Add an abstract method to `BleDeviceRemoteDataSource` and an implementation in `BleDeviceRemoteDataSourceImpl`. Use `_char(uuid)` to obtain the active characteristic.
4. **Define the domain entity** in `lib/features/device/domain/entities/`. Keep it `Equatable` and free of `dart:io`/`flutter_blue_plus` imports.
5. **Add a mapper method** in `BlePacketMapper` if the packet must be translated.
6. **Extend the repository contract** in `lib/features/device/domain/repositories/device_repository.dart`. Always return `Future<Either<Failure, T>>` (or `Stream<Either<Failure, T>>`).
7. **Implement in `DeviceRepositoryImpl`.** Wrap the call in `_guard`. For streaming reads, add a `BehaviorSubject` to `DeviceStateCache` and a `refresh*` method, and expose the stream via `watch*`.
8. **Author a use case** under `lib/features/device/domain/usecases/`. One file per operation. The use case is a thin object holding a repository reference.
9. **Update the binding** of every controller that needs the use case. Use `Get.lazyPut<T>(..., fenix: true)` for both the use case and the data source / repository if they are not already registered.
10. **Wire the controller** to expose the new state and action. Use the existing `Rx<EnumState>` pattern for multi-step flows.
11. **Add unit tests** for the packet (round-trip), the use case (against a mocked repository), and the controller (against mocked use cases) under the matching path in `test/`.
12. **Run** `flutter analyze` and `flutter test` before committing.

### 23.2 Adding a New Page

1. Define a new constant in `lib/routes/app_routes.dart`.
2. Create the controller, page, and binding under `lib/features/<feature>/presentation/`.
3. Register a `GetPage` in `lib/routes/app_pages.dart` with the `SameDurationFadeTransition`.
4. Navigate to the new route via `Get.toNamed(Routes.newRoute, arguments: ...)`.

### 23.3 Modifying the Database Schema

1. Increment the `version` argument in `DeviceDatabaseHelper._initDb`.
2. Append a `if (oldVersion < N) { ... ALTER TABLE ... }` block to `onUpgrade`. Do not modify earlier blocks; existing installations are at unknown versions.
3. Update `BleDeviceModel.toMap` and `BleDeviceModel.fromMap`.
4. Update any callers that read or persist the new field. Remember the write-ownership rule in [Section 11.3](#113-write-ownership): writes go through `BackgroundScanService`.

### 23.4 General Conventions

- Public methods at every layer return the most specific success type the caller needs. Avoid leaking infrastructure types (`BluetoothDevice`, `Database`, `File`) past their natural layer except where a public flow truly requires it (the active `BluetoothDevice` does cross from data into presentation today, and that is intentional).
- Keep controllers small. Push orchestration into use cases when the controller would otherwise touch more than two repository methods.
- Every BLE-using controller must `pauseScan()` on entry and `resumeScan()` on exit. The single exception is the dashboard, which never holds a BLE connection.
- The static analysis configuration in `analysis_options.yaml` is treated as a strict gate. New code must compile with zero warnings.
