# 6. Go Backend Architecture and Database Access Strategy

Date: 2026-07-02

## Status

Accepted

## Context

We are building a Go (Gin) backend as the API Gateway. We need a structured folder layout to maintain separation of concerns (Clean Architecture). 
Additionally, we must choose a database access strategy. The user expressed a desire to avoid the maintenance burden of keeping Go ORM structs (like GORM) perfectly synchronized with the Supabase PostgreSQL schema. 

## Decision

1. **Folder Architecture:** We will adopt a standard Go project layout:
   - `cmd/api/`: Application entrypoints.
   - `internal/domain/`: Core business entities.
   - `internal/handler/`: Gin HTTP controllers.
   - `internal/service/`: Business logic.
   - `internal/repository/`: Database access.
2. **Database Access (ORM Alternative):** To eliminate the headache of keeping ORM models synced with Supabase, we will NOT use GORM's AutoMigrate or strict ORM mapping. Instead, we will use **`sqlx`** (or standard `pgx`). 
   - `sqlx` allows us to write raw, performant SQL queries while automatically mapping the result rows into simple Go structs. 
   - This means Supabase remains the absolute "Source of Truth" for the database schema. The Go code only defines the fields it actually needs to read or write, drastically reducing maintenance overhead.

## Consequences

- **Pros:**
  - Complete architectural separation.
  - No need to maintain massive, perfectly synced ORM model files. Supabase handles the database design.
  - Raw SQL performance via `sqlx`/`pgx`.
- **Cons:**
  - Developers must write raw SQL queries instead of chaining ORM methods (e.g., `db.Select().Where()`).
