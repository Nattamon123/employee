# 1. Use Go (Gin) as the API Gateway instead of direct Supabase client access

Date: 2026-07-02

## Status

Accepted

## Context

We are migrating the HR employee check-in system to a mobile app (Flutter) for employees and a web app for admins, backed by Go (Gin) and Supabase.
Supabase offers BaaS features like Supabase Auth, Row Level Security (RLS), and a direct PostgREST API that Flutter could consume directly. 
However, an attendance system requires strict server-side validation for critical operations like timestamping (to prevent client-side time spoofing) and securely processing biometrics or location data.

## Decision

We will use Go (Gin) as the sole API Gateway for the application. 
The Flutter Employee App and Admin Web App will communicate exclusively with the Go backend via REST APIs. 
Supabase will be used strictly as a managed PostgreSQL database, connected to the Go service via standard database drivers (e.g., `pgx`).

## Consequences

- **Pros:** 
  - Complete control over business logic and security.
  - Timestamps and check-in verifications are generated securely on the Go server, preventing client-side spoofing.
  - Database schema is hidden from the client apps.
- **Cons:**
  - We do not leverage Supabase's out-of-the-box BaaS features (Auth, RLS), meaning we must implement JWT authentication and authorization in Go.
  - Increased development effort to build the API endpoints compared to querying Supabase directly from Flutter.
