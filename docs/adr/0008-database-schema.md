# 8. Database Schema Design (Supabase PostgreSQL)

Date: 2026-07-02

## Status

Accepted

## Context

We are migrating from Google Sheets to Supabase (PostgreSQL). The old system had 5 sheets:
- `ฐานข้อมูลพนักงาน` (Employee DB)
- `บันทึกลงเวลา` (Attendance Log)
- `ใบลาพนักงาน` (Leave Requests)
- `OffsiteRequests`
- `Holidays`

This ADR documents the new normalized PostgreSQL schema that maps from the old structure while incorporating new security features (Device Binding, Account Approval, Geofencing).

## Decision

See the SQL migration file at `backend/migrations/001_initial_schema.sql` for the complete schema.

### Table Summary

| Table | Replaces (Old Sheet) | Purpose |
|-------|---------------------|---------|
| `users` | ฐานข้อมูลพนักงาน | Employee profiles. Linked to `auth.users` via Supabase Auth. Adds `device_id`, `status`, `role`. Removes `password` and `face_descriptor`. |
| `work_locations` | (new) | Geofence centers. Admin can add multiple office locations with lat/lng/radius. |
| `attendance` | บันทึกลงเวลา | Daily attendance records. Timestamps are set by Go server, not client. |
| `leave_requests` | ใบลาพนักงาน | Leave requests (sick, personal, swap holiday, work on holiday). |
| `offsite_requests` | OffsiteRequests | Offsite work requests. |
| `holidays` | Holidays | Public/company holidays. |

### Key Design Changes from Old Schema
1. **No password column.** Supabase Auth handles authentication.
2. **No face_descriptor column.** Native Biometrics (FaceID/Fingerprint) replaces custom face recognition.
3. **`device_id` column on `users`.** Supports strict Device Binding (ADR 0003).
4. **`status` column on `users`.** Supports Account Approval flow (pending → active → disabled).
5. **`check_in_at` / `check_out_at` are TIMESTAMPTZ.** Server sets these, not the client. Prevents time spoofing.
6. **`work_locations` table.** Supports multiple office locations for Geofencing (ADR 0004).
7. **Proper foreign keys and indexes** for query performance.

## Consequences

- **Pros:**
  - Normalized, relational schema with referential integrity.
  - Supports all new security features out of the box.
  - Supabase Studio provides a spreadsheet-like UI for HR to browse data if needed.
- **Cons:**
  - Requires a one-time data migration from Google Sheets if historical data needs to be preserved.
