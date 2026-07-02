# 3. Strict HR-Controlled Device Binding for Native Biometrics

Date: 2026-07-02

## Status

Accepted

## Context

By opting for Native OS Biometrics (FaceID/BiometricPrompt) for employee check-ins, we rely on the device itself to verify the user. To prevent check-in fraud (e.g., an employee logging into a coworker's device to check in for them), the system must enforce a 1-to-1 relationship between an employee's account and a specific physical device.

We need a policy for handling device changes, such as when an employee upgrades their phone or their device breaks.

## Decision

We will implement a Strict Device Binding policy controlled by HR.
1. When an employee logs in successfully for the first time, the Go backend permanently binds their Account ID to the device's unique identifier (e.g., UUID).
2. Subsequent login attempts from any other device will be rejected by the API.
3. To change devices, the employee must request an "Unbind" action from HR. HR will use the Admin Web App to click an "Unbind Device" button, clearing the saved Device ID in the database and allowing the employee to bind a new device upon their next login.

## Consequences

- **Pros:**
  - Highly secure. Prevents employees from sharing credentials or bypassing biometric checks by using someone else's device.
  - Keeps control within the organization, minimizing fraud.
- **Cons:**
  - Creates a minor operational overhead for HR when employees change phones.
  - Employees cannot instantly switch phones without HR intervention.
