# 4. Strict Geofencing and Mock Location Prevention

Date: 2026-07-02

## Status

Accepted

## Context

Employees will use their personal mobile devices to check in. Location spoofing (using "Fake GPS" apps) is a common method of time attendance fraud. 
We need a policy on how to handle check-in attempts that occur outside the office perimeter or from devices running location spoofing software.

## Decision

We will implement Strict Geofencing and Mock Location Prevention:
1. **Client-Side:** The Flutter app must integrate plugins to detect if a "Mock Location" provider is active. If detected, the check-in button is disabled.
2. **Server-Side:** The Flutter app sends its raw GPS coordinates to the Go (Gin) API. The Go server calculates the distance between the employee and their designated work location (e.g., office coordinates). If the distance exceeds the allowed radius (e.g., 50 meters), the server rejects the check-in request with an error.

## Consequences

- **Pros:**
  - Prevents almost all forms of location-based check-in fraud.
  - Transparent to the employee (they know immediately if they are out of bounds, preventing month-end disputes).
- **Cons:**
  - GPS drift inside large buildings might occasionally block legitimate check-ins. We may need to fine-tune the acceptable radius.
