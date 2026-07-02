package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// ContextKey เก็บชื่อ key ที่ใช้ฝังข้อมูลลง gin.Context
const (
	ContextKeyAuthID = "auth_id" // UUID ของ user จาก Supabase Auth (JWT sub claim)
	ContextKeyRole   = "role"    // สิทธิ์ของ user (employee/admin) — ถูกเซ็ตหลังจากดึงข้อมูลจาก DB
	ContextKeyUserID = "user_id" // UUID ของ user ในตาราง public.users
	ContextKeyStatus = "status"  // สถานะบัญชี (pending/active/disabled)
)

// JWTAuth ตรวจสอบ JWT ที่ส่งมาจาก Client ผ่าน Header: Authorization: Bearer <token>
// ถ้า JWT ถูกต้อง จะดึง auth_id (sub claim) ฝังลง Context เพื่อให้ handler ถัดไปใช้ได้
func JWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ดึง token จาก Header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "กรุณาล็อกอินก่อนใช้งาน"})
			return
		}

		// ตัด "Bearer " ออก เหลือแค่ token
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "รูปแบบ Authorization Header ไม่ถูกต้อง"})
			return
		}

		// ตรวจสอบ JWT ด้วย secret ของ Supabase
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			// Supabase ใช้ HMAC-SHA256
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token หมดอายุหรือไม่ถูกต้อง กรุณาล็อกอินใหม่"})
			return
		}

		// ดึง sub claim (auth_id จาก Supabase Auth)
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "ไม่สามารถอ่านข้อมูลจาก Token ได้"})
			return
		}

		authID, ok := claims["sub"].(string)
		if !ok || authID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token ไม่มีข้อมูล user"})
			return
		}

		// ฝัง auth_id ลง Context เพื่อให้ middleware/handler ถัดไปใช้ได้
		c.Set(ContextKeyAuthID, authID)
		c.Next()
	}
}

// RequireActive ตรวจสอบว่าบัญชีของ user ถูก Admin อนุมัติแล้ว (status = "active")
// Middleware นี้ต้องทำงานหลัง JWTAuth เสมอ (เพราะต้องใช้ auth_id จาก Context)
// หมายเหตุ: ข้อมูล user จะถูกดึงจาก DB ใน handler/user_handler.go
// แล้วฝัง role, status, user_id ลง Context ก่อนถึง middleware นี้
func RequireActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		status, exists := c.Get(ContextKeyStatus)
		if !exists {
			// ถ้ายังไม่มีข้อมูล status ใน Context หมายความว่ายังไม่ได้ดึงจาก DB
			// ปล่อยผ่านไปก่อน ให้ handler จัดการ (กรณี /auth/register)
			c.Next()
			return
		}

		if status != "active" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "บัญชีของคุณยังไม่ได้รับการอนุมัติจากแอดมิน กรุณารอการอนุมัติ",
			})
			return
		}
		c.Next()
	}
}

// RequireAdmin ตรวจสอบว่า user มีสิทธิ์ admin
// ต้องทำงานหลัง RequireActive เสมอ
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get(ContextKeyRole)
		if !exists || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ ต้องเป็นแอดมินเท่านั้น",
			})
			return
		}
		c.Next()
	}
}
