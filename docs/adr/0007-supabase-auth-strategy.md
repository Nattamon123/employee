# 7. Authentication Strategy: Supabase Auth + Go JWT Verification

Date: 2026-07-02

## Status

Accepted

## Context

ADR 0001 established Go (Gin) as the sole API Gateway. However, it did not specify how user authentication would work. We need a strategy that avoids building a custom auth system from scratch while still keeping Go in control of all business logic.

## Decision

We will use **Supabase Auth** for user authentication (Google OAuth) and **Go for JWT verification**.

### Login Flow:
1. Flutter/Web Client calls Supabase Auth SDK directly to sign in with Google OAuth.
2. Supabase Auth returns a JWT (access token) to the client.
3. For all subsequent API calls, the client sends this JWT in the `Authorization: Bearer <token>` header to the Go API.
4. Go Middleware verifies the JWT using Supabase's JWT secret (HMAC-SHA256).
5. Go extracts the user's Supabase `auth.users.id` from the JWT `sub` claim and uses it to look up the user's profile and permissions in the database.

### Account Approval:
- When a user signs up via Google OAuth for the first time, Supabase Auth creates an entry in `auth.users`.
- A database trigger (or Go logic on first API call) creates a corresponding row in `public.users` with `status = 'pending'`.
- Go Middleware checks this status on every request. If `status != 'active'`, the request is rejected with a 403 Forbidden.
- An Admin must approve the account via the Admin Web App, which calls a Go endpoint to set `status = 'active'`.

## Consequences

- **Pros:**
  - Zero custom auth code (no password hashing, no OAuth flow, no email verification).
  - Supabase Auth handles token refresh, session management, and Google OAuth out of the box.
  - Go retains full control over authorization (role checks, account approval).
- **Cons:**
  - Flutter and Web clients need the Supabase client SDK installed (lightweight dependency).
  - Go must be configured with Supabase's JWT secret for verification.
