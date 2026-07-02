package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/Nattamon123/employee/backend/internal/middleware"
	"github.com/Nattamon123/employee/backend/internal/service"
)

// UserHandler รับ HTTP Request เกี่ยวกับข้อมูลผู้ใช้
type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// registerBody ข้อมูลที่แอปส่งมาตอนสมัครสมาชิก/ล็อกอินครั้งแรก
type registerBody struct {
	AuthID    string `json:"auth_id" binding:"required"`    // UUID จาก Supabase Auth
	Email     string `json:"email" binding:"required"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name"`
}

// Register POST /auth/register
// สร้างบัญชีใหม่จาก Supabase Auth → สถานะ pending รอ Admin อนุมัติ
func (h *UserHandler) Register(c *gin.Context) {
	var body registerBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ครบ"})
		return
	}

	authID, err := uuid.Parse(body.AuthID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "auth_id ไม่ถูกต้อง"})
		return
	}

	user, err := h.svc.Register(c.Request.Context(), authID, body.Email, body.FirstName, body.LastName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างบัญชีล้มเหลว: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"ok":      true,
		"message": "สมัครสมาชิกสำเร็จ กรุณารอแอดมินอนุมัติบัญชี",
		"data":    user,
	})
}

// GetMe GET /api/users/me
// ดึงข้อมูลของตัวเอง
func (h *UserHandler) GetMe(c *gin.Context) {
	authIDStr, _ := c.Get(middleware.ContextKeyAuthID)
	authID, _ := uuid.Parse(authIDStr.(string))

	user, err := h.svc.GetByAuthID(c.Request.Context(), authID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลผู้ใช้"})
		return
	}

	// ฝังข้อมูลลง Context เพื่อให้ middleware ถัดไปใช้ได้
	c.Set(middleware.ContextKeyUserID, user.ID)
	c.Set(middleware.ContextKeyRole, user.Role)
	c.Set(middleware.ContextKeyStatus, user.Status)

	c.JSON(http.StatusOK, gin.H{"ok": true, "data": user})
}

// bindDeviceBody ข้อมูลที่แอปส่งมาตอนผูกเครื่อง
type bindDeviceBody struct {
	DeviceID string `json:"device_id" binding:"required"` // UUID ของเครื่องมือถือ
}

// BindDevice PUT /api/users/me/device
// ผูกเครื่องมือถือกับบัญชี (ครั้งแรก) หรือยืนยันว่าเป็นเครื่องเดิม
func (h *UserHandler) BindDevice(c *gin.Context) {
	var body bindDeviceBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาระบุ device_id"})
		return
	}

	userID, _ := c.Get(middleware.ContextKeyUserID)

	if err := h.svc.BindDevice(c.Request.Context(), userID.(uuid.UUID), body.DeviceID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "ผูกเครื่องสำเร็จ"})
}
