-- ============================================================
-- NexHR Database Schema - Initial Migration
-- Target: Supabase (PostgreSQL 15+)
-- Date: 2026-07-02
-- ============================================================

-- ============================================================
-- 1. USERS (replaces: ฐานข้อมูลพนักงาน)
-- ============================================================
-- Linked to Supabase Auth via auth_id (= auth.users.id)
-- Removed: password (Supabase Auth), face_descriptor (Native Biometrics)
-- Added: device_id (Device Binding), status (Account Approval), role
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id     UUID UNIQUE NOT NULL,       -- FK to auth.users.id (from Supabase Auth JWT sub claim)
    email       TEXT UNIQUE NOT NULL,
    first_name  TEXT NOT NULL DEFAULT '',
    last_name   TEXT NOT NULL DEFAULT '',
    department  TEXT NOT NULL DEFAULT '',
    position    TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
    device_id   TEXT,                        -- Bound device UUID (NULL = no device bound yet)
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by auth_id (used on every JWT verification)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- 2. WORK_LOCATIONS (new: for Geofencing)
-- ============================================================
-- Admin can add multiple office/site locations
-- Go API calculates distance from employee GPS to these points
CREATE TABLE IF NOT EXISTS work_locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,               -- e.g. "สำนักงานใหญ่", "คลังสินค้า"
    latitude    NUMERIC(10, 8) NOT NULL,
    longitude   NUMERIC(11, 8) NOT NULL,
    radius_m    INTEGER NOT NULL DEFAULT 50, -- Geofence radius in meters
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ATTENDANCE (replaces: บันทึกลงเวลา)
-- ============================================================
-- Key change: check_in_at and check_out_at are TIMESTAMPTZ set by Go server
-- Old columns "วัน" (day name) and "สถานะเข้า" (status text) are computed/stored
CREATE TABLE IF NOT EXISTS attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,                   -- The calendar date (e.g. 2026-07-02)
    check_in_at     TIMESTAMPTZ,                     -- Server timestamp of check-in
    check_out_at    TIMESTAMPTZ,                     -- Server timestamp of check-out
    status          TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'late', 'no_record')),
    check_in_lat    NUMERIC(10, 8),
    check_in_lng    NUMERIC(11, 8),
    check_out_lat   NUMERIC(10, 8),
    check_out_lng   NUMERIC(11, 8),
    check_in_photo  TEXT,                            -- URL to stored photo (Supabase Storage)
    check_out_photo TEXT,                            -- URL to stored photo (Supabase Storage)
    location_id     UUID REFERENCES work_locations(id), -- Which office they checked in at
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One attendance record per user per day
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ============================================================
-- 4. LEAVE_REQUESTS (replaces: ใบลาพนักงาน)
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,                   -- The date of leave
    leave_type      TEXT NOT NULL,                    -- ลาป่วย, ลากิจ, สลับวันหยุด, ทำงานวันหยุด
    duration        TEXT DEFAULT 'เต็มวัน',           -- เต็มวัน, ครึ่งวันเช้า, ครึ่งวันบ่าย
    swap_date       DATE,                            -- For สลับวันหยุด: the date they will work instead
    reason          TEXT DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    medical_cert_url TEXT,                           -- URL to medical certificate photo
    reviewed_by     UUID REFERENCES users(id),       -- Admin who approved/rejected
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date ON leave_requests(date);

-- ============================================================
-- 5. OFFSITE_REQUESTS (replaces: OffsiteRequests)
-- ============================================================
CREATE TABLE IF NOT EXISTS offsite_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,                   -- The date of offsite work
    reason          TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     UUID REFERENCES users(id),       -- Admin who approved/rejected
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offsite_requests_user ON offsite_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_offsite_requests_status ON offsite_requests(status);
CREATE INDEX IF NOT EXISTS idx_offsite_requests_date ON offsite_requests(date);

-- ============================================================
-- 6. HOLIDAYS (replaces: Holidays)
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date        DATE NOT NULL,
    name        TEXT NOT NULL,                       -- e.g. "วันสงกรานต์"
    num_days    INTEGER NOT NULL DEFAULT 1,          -- For multi-day holidays
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- ============================================================
-- HELPER: Auto-update updated_at on users table
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
