package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// parseDate แปลง string "2026-07-02" เป็น time.Time
func parseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

// parseYearMonth ดึงค่า year และ month จาก query string
func parseYearMonth(c *gin.Context) (int, int, error) {
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return 0, 0, err
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil {
		return 0, 0, err
	}

	return year, month, nil
}
