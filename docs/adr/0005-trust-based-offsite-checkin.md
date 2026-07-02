# 5. Trust-Based Offsite Check-in (Geofence Bypass)

Date: 2026-07-02

## Status

Accepted

## Context

While standard office check-ins are protected by a strict geofence (ADR 0004), employees frequently need to work offsite (e.g., meeting clients). We need a mechanism to handle check-ins when an employee is legitimately away from the office.

## Decision

We will implement a Trust-Based Offsite mechanism:
1. When an employee has an "Approved Offsite Request" for a specific date, the Go API Gateway will bypass the strict geofence validation for that day.
2. The employee can check in from any location.
3. The Flutter app will still capture the raw GPS coordinates and send them to the backend, which will log them for auditing purposes without blocking the check-in.

## Consequences

- **Pros:**
  - Significantly reduces the development burden (no need to build a map interface for dropping customer pins).
  - Frictionless experience for employees working outside the office.
- **Cons:**
  - HR must rely on auditing logs post-facto to ensure employees actually checked in from the expected client locations.
