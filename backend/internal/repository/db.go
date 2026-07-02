package repository

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// NewDB สร้าง connection pool ไปยัง Supabase PostgreSQL
func NewDB(databaseURL string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถเชื่อมต่อฐานข้อมูลได้: %w", err)
	}

	// ตั้งค่า connection pool
	db.SetMaxOpenConns(25)  // จำนวนการเชื่อมต่อสูงสุด
	db.SetMaxIdleConns(5)   // จำนวนการเชื่อมต่อที่เก็บไว้รอ
	
	// ทดสอบการเชื่อมต่อ
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ฐานข้อมูลไม่ตอบสนอง: %w", err)
	}

	return db, nil
}
