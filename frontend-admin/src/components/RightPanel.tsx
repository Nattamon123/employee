import { useState, useEffect } from 'react';
import { fetchAllRequests, fetchUserHistory, fetchUserQuota, updateUserQuota, updateLeaveStatus } from '../services/adminApi';
import type { LeaveRequest, User } from '../types';

interface RightPanelProps {
  selectedUser: User | null;
}

export default function RightPanel({ selectedUser }: RightPanelProps) {
  const [todayLeaves, setTodayLeaves] = useState<LeaveRequest[]>([]);
  const [userLeaves, setUserLeaves] = useState<LeaveRequest[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  function getImageUrl(url: string) {
    if (url.startsWith('r2://')) {
      return url.replace('r2://', 'https://pub-2a877f7cc07b481ca09dec82cb240465.r2.dev/');
    }
    return url;
  }

  function parseImageUrls(urlStr: string | undefined): string[] {
    if (!urlStr) return [];
    try {
      if (urlStr.trim().startsWith('[')) {
        const arr = JSON.parse(urlStr);
        if (Array.isArray(arr)) {
          return arr.map((u: string) => getImageUrl(u));
        }
      }
    } catch (e) {
      // Fallback
    }
    return [getImageUrl(urlStr)];
  }

  // สิทธิวันลาสะสมสำหรับพนักงานที่ถูกเลือก
  const [usedSick, setUsedSick] = useState(0);
  const [usedPersonal, setUsedPersonal] = useState(0);
  const [usedVacation, setUsedVacation] = useState(0);
  const [usedSwap, setUsedSwap] = useState(0);

  // โควต้าสูงสุด (State ดึงจาก Database)
  const [maxSick, setMaxSick] = useState(30);
  const [maxPersonal, setMaxPersonal] = useState(6);
  const [maxVacation, setMaxVacation] = useState(6);

  // การแก้ไขโควต้า
  const [isEditingQuota, setIsEditingQuota] = useState(false);
  const [editSick, setEditSick] = useState(30);
  const [editPersonal, setEditPersonal] = useState(6);
  const [editVacation, setEditVacation] = useState(6);

  useEffect(() => {
    loadTodayData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setIsEditingQuota(false);
      loadEmployeeQuota(selectedUser.id);
    }
  }, [selectedUser]);

  async function loadTodayData() {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const [allRequests] = await Promise.all([
        fetchAllRequests(),
      ]);

      const todaysLeaves = (allRequests.leaves ?? []).filter(l => {
        const leaveDate = l.date.split('T')[0];
        return leaveDate === todayStr && l.status === 'approved';
      });
      setTodayLeaves(todaysLeaves);
    } catch {
      // backend อาจยังไม่พร้อม
    }
  }

  async function loadEmployeeQuota(userId: string) {
    try {
      const currentYear = new Date().getFullYear();
      const [history, quota] = await Promise.all([
        fetchUserHistory(userId),
        fetchUserQuota(userId, currentYear)
      ]);

      let sick = 0;
      let personal = 0;
      let vacation = 0;
      let swap = 0;

      // กรองใบลาที่ได้รับอนุมัติของปีปัจจุบันมาคำนวณสะสม
      (history.leaves ?? []).forEach(l => {
        const leaveDateObj = new Date(l.date);
        if (leaveDateObj.getFullYear() === currentYear && l.status === 'approved') {
          const amount = l.duration.includes('ครึ่ง') ? 0.5 : 1;
          if (l.leave_type === 'ลาป่วย') sick += amount;
          else if (l.leave_type === 'ลากิจ') personal += amount;
          else if (l.leave_type === 'ลาพักร้อน') vacation += amount;
          else if (l.leave_type === 'สลับวันหยุด') swap++;
        }
      });

      setUsedSick(sick);
      setUsedPersonal(personal);
      setUsedVacation(vacation);
      setUsedSwap(swap);
      setUserLeaves(history.leaves ?? []);

      if (quota) {
        setMaxSick(quota.sick_leave);
        setMaxPersonal(quota.personal_leave);
        setMaxVacation(quota.annual_leave);
      } else {
        // Fallback default
        setMaxSick(30);
        setMaxPersonal(6);
        setMaxVacation(6);
      }
    } catch (err) {
      console.error('โหลดโควตาวันลาล้มเหลว:', err);
    }
  }

  async function handleSaveQuota() {
    if (!selectedUser) return;
    try {
      const currentYear = new Date().getFullYear();
      await updateUserQuota(selectedUser.id, currentYear, {
        sick_leave: editSick,
        personal_leave: editPersonal,
        annual_leave: editVacation,
      });
      setMaxSick(editSick);
      setMaxPersonal(editPersonal);
      setMaxVacation(editVacation);
      setIsEditingQuota(false);
    } catch (err) {
      console.error('บันทึกโควต้าล้มเหลว:', err);
      alert('บันทึกโควต้าล้มเหลว');
    }
  }

  async function handleLeaveAction(leaveId: string, status: 'approved' | 'rejected') {
    try {
      await updateLeaveStatus(leaveId, status);
      if (selectedUser) {
        loadEmployeeQuota(selectedUser.id);
      }
    } catch (err) {
      console.error('อัปเดตสถานะล้มเหลว:', err);
      alert('อัปเดตสถานะล้มเหลว');
    }
  }

  // Calendar strip — สร้างจากวันจริง
  const today = new Date();
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const calDays = [];
  for (let i = -2; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    calDays.push({
      name: dayNames[d.getDay()],
      date: d.getDate(),
      isToday: i === 0,
    });
  }

  function renderQuotaBar(label: string, iconClass: string, used: number, max: number, gradient: string) {
    const percent = Math.min((used / max) * 100, 100);
    const isExceeded = used > max;
    const finalBg = isExceeded ? 'var(--red)' : gradient;
    const textStyle = isExceeded ? { color: 'var(--red)' } : { color: 'var(--text-main)' };

    return (
      <div className="quota-item" style={{ marginBottom: '12px' }}>
        <div className="quota-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ display: 'flex', alignItems: 'center', fontWeight: 500, fontSize: '13px' }}>
            <i className={`fa-solid ${iconClass}`} style={{ marginRight: '8px', width: '18px' }}></i> {label}
          </span>
          <span style={{ fontWeight: 700, fontSize: '13px', ...textStyle }}>
            {used} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-gray)' }}>/ {max} วัน</span>
          </span>
        </div>
        <div className="progress-bg" style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
          <div className="progress-fill" style={{ width: `${percent}%`, background: finalBg, height: '100%', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel" id="main-right-panel">
      {/* วิดเจ็ตสิทธิคงเหลือ / สรุปวันนี้ */}
      <div className="widget" id="quota-widget">
        {selectedUser ? (
          <>
            <div className="widget-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>สิทธิวันลาคงเหลือ (ปีปัจจุบัน)</span>
              {!isEditingQuota && (
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                  onClick={() => {
                    setEditSick(maxSick);
                    setEditPersonal(maxPersonal);
                    setEditVacation(maxVacation);
                    setIsEditingQuota(true);
                  }}
                >
                  <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }}></i> แก้ไข
                </button>
              )}
            </div>
            <div id="quota-content">
              {isEditingQuota ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}><i className="fa-solid fa-notes-medical" style={{ marginRight: '6px', color: 'var(--blue)' }}></i> ลาป่วย (วัน)</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '70px', padding: '6px 8px', fontSize: '13px', margin: 0, textAlign: 'center' }}
                      value={editSick}
                      onChange={(e) => setEditSick(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}><i className="fa-solid fa-briefcase" style={{ marginRight: '6px', color: 'var(--blue)' }}></i> ลากิจ (วัน)</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '70px', padding: '6px 8px', fontSize: '13px', margin: 0, textAlign: 'center' }}
                      value={editPersonal}
                      onChange={(e) => setEditPersonal(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}><i className="fa-solid fa-plane-departure" style={{ marginRight: '6px', color: 'var(--blue)' }}></i> พักร้อน (วัน)</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '70px', padding: '6px 8px', fontSize: '13px', margin: 0, textAlign: 'center' }}
                      value={editVacation}
                      onChange={(e) => setEditVacation(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                      onClick={handleSaveQuota}
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      className="btn-reset"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', margin: 0 }}
                      onClick={() => setIsEditingQuota(false)}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {renderQuotaBar('ลาป่วย (ใช้ไป)', 'fa-notes-medical', usedSick, maxSick, 'linear-gradient(90deg, #93C5FD, #2563EB)')}
                  {renderQuotaBar('ลากิจ (ใช้ไป)', 'fa-briefcase', usedPersonal, maxPersonal, 'linear-gradient(90deg, #67E8F9, #0EA5E9)')}
                  {renderQuotaBar('พักร้อน (ใช้ไป)', 'fa-plane-departure', usedVacation, maxVacation, 'linear-gradient(90deg, #A5B4FC, #4F46E5)')}
                  
                  <div className="quota-item" style={{ marginTop: '15px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '15px' }}>
                    <div className="quota-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                      <span style={{ color: '#595959', display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                        <i className="fa-solid fa-rotate" style={{ marginRight: '8px', color: 'var(--text-gray)' }}></i> สลับวันหยุด (ใช้ไป)
                      </span>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '13px' }}>{usedSwap} ครั้ง</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="widget-title">สิทธิวันลาคงเหลือ</div>
            <div id="quota-content" style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '20px 10px' }}>
              <i className="fa-solid fa-magnifying-glass-user" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <br />
              เลือกพนักงานเพื่อดูสิทธิ
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <>
          <div className="widget">
            <div className="widget-title">คำขอที่รอจัดการ</div>
            <div id="pending-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userLeaves.filter(l => l.status === 'pending').length === 0 ? (
                <div style={{ color: 'var(--text-gray)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                  ไม่มีคำขอที่รออนุมัติ
                </div>
              ) : (
                userLeaves.filter(l => l.status === 'pending').map((l) => (
                  <div key={l.id} className="list-item" style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{l.leave_type}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{new Date(l.date).toLocaleDateString('th-TH')}</div>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: '#FEF08A', color: '#854D0E', borderRadius: '10px', fontWeight: 500 }}>รออนุมัติ</span>
                    </div>
                    {l.reason && (
                      <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '10px', fontStyle: 'italic' }}>
                        เหตุผล: {l.reason}
                      </div>
                    )}
                    {l.medical_cert_url && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 500 }}>เอกสารแนบ:</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {parseImageUrls(l.medical_cert_url).map((imgUrl, idx) => (
                            <img 
                              key={idx}
                              src={imgUrl} 
                              alt={`Medical Certificate ${idx+1}`} 
                              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }} 
                              onClick={() => setPreviewImage(imgUrl)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleLeaveAction(l.id, 'approved')} style={{ flex: 1, padding: '6px', fontSize: '12px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                        <i className="fa-solid fa-check"></i> อนุมัติ
                      </button>
                      <button onClick={() => handleLeaveAction(l.id, 'rejected')} style={{ flex: 1, padding: '6px', fontSize: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                        <i className="fa-solid fa-xmark"></i> ปฏิเสธ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="widget">
            <div className="widget-title">ประวัติการลาล่าสุด</div>
            <div id="recent-history" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userLeaves.filter(l => l.status !== 'pending').length === 0 ? (
                <div style={{ color: 'var(--text-gray)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                  ไม่มีประวัติการลา
                </div>
              ) : (
                userLeaves.filter(l => l.status !== 'pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).map((l) => (
                  <div key={l.id} className="list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{l.leave_type}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{new Date(l.date).toLocaleDateString('th-TH')}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: l.status === 'approved' ? 'var(--green)' : 'var(--red)' }}>
                      {l.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <button 
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-15px', right: '-15px', background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', backgroundColor: 'white' }} 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
