# 2. Use Native OS Biometrics for Check-in Instead of Custom Face Recognition

Date: 2026-07-02

## Status

Accepted

## Context

The employee mobile app (Flutter) requires a mechanism to verify the employee's identity during time attendance check-ins.
The legacy web system utilized `face-api.js` for custom client-side facial recognition, which is slow, hardware-intensive, and prone to spoofing.
Since the new system relies on personal devices (Bring Your Own Device - BYOD), we must decide between continuing to maintain custom face recognition or leveraging the built-in device biometrics.

## Decision

We will use Native OS Biometrics (FaceID on iOS, BiometricPrompt on Android) to authorize check-ins. 
The app will not perform custom facial recognition or transmit facial images/descriptors to the backend. Instead, it delegates identity verification to the OS. Once the OS confirms the user, the app sends a signed check-in request to the Go backend.

## Consequences

- **Pros:**
  - Extremely fast and accurate verification.
  - Zero server cost for processing or storing biometric data.
  - High security, leveraging hardware-level encryption (Secure Enclave).
- **Cons:**
  - Requires a 1-to-1 strict relationship between an employee and a specific physical device (Device Binding).
  - Employees must have a screen lock/biometrics enabled on their personal devices.
