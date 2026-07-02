package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/Nattamon123/employee/backend/internal/domain"
)

// LocationRepo จัดการ SQL queries สำหรับตาราง work_locations (จุดทำงาน / Geofence)
type LocationRepo struct {
	db *sqlx.DB
}

func NewLocationRepo(db *sqlx.DB) *LocationRepo {
	return &LocationRepo{db: db}
}

// ListActive ดึงจุดทำงานที่ใช้งานอยู่ทั้งหมด
// ใช้ตอนเช็คอิน → ตรวจว่าพนักงานอยู่ในรัศมีของจุดทำงานไหนบ้าง
func (r *LocationRepo) ListActive(ctx context.Context) ([]domain.WorkLocation, error) {
	var locations []domain.WorkLocation
	err := r.db.SelectContext(ctx, &locations, `
		SELECT * FROM work_locations WHERE is_active = TRUE ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	return locations, nil
}

// Create เพิ่มจุดทำงานใหม่ (เช่น สาขาใหม่)
func (r *LocationRepo) Create(ctx context.Context, loc *domain.WorkLocation) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO work_locations (id, name, latitude, longitude, radius_m, is_active)
		VALUES (:id, :name, :latitude, :longitude, :radius_m, :is_active)
	`, loc)
	return err
}

// Delete ลบจุดทำงาน
func (r *LocationRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM work_locations WHERE id = $1`, id)
	return err
}
