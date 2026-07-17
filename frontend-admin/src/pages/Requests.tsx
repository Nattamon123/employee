import { useState, useEffect } from 'react';
import {
  fetchPendingRequests,
  fetchUsers,
  updateLeaveStatus,
  updateOffsiteStatus,
} from '../services/adminApi';
import type { User, LeaveRequest, OffsiteRequest } from '../types';

interface RequestRow {
  id: string;
  type: 'leave' | 'offsite';
  date: string;
  userName: string;
  detail: string;
  reason: string;
  createdAt: string;
  medicalCertUrl?: string;
}

export default function Requests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const [pending, users] = await Promise.all([
        fetchPendingRequests(),
        fetchUsers(),
      ]);

      const userMap = new Map<string, User>();
      (users ?? []).forEach(u => userMap.set(u.id, u));

      const combined: RequestRow[] = [];

      (pending.leaves ?? []).forEach((l: LeaveRequest) => {
        const user = userMap.get(l.user_id);
        combined.push({
          id: l.id,
          type: 'leave',
          date: l.date,
          userName: user ? `${user.first_name} ${user.last_name}` : l.user_id,
          detail: `${l.leave_type}${l.duration && l.duration !== 'เต็มวัน' ? ` (${l.duration})` : ''}`,
          reason: l.reason,
          createdAt: l.created_at,
          medicalCertUrl: l.medical_cert_url,
        });
      });

      (pending.offsite ?? []).forEach((o: OffsiteRequest) => {
        const user = userMap.get(o.user_id);
        combined.push({
          id: o.id,
          type: 'offsite',
          date: o.date,
          userName: user ? `${user.first_name} ${user.last_name}` : o.user_id,
          detail: 'ออกหน้างาน',
          reason: o.reason,
          createdAt: o.created_at,
        });
      });

      // เรียงตามวันที่ขอ (ใหม่สุดก่อน)
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRows(combined);
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว:', err);
    }
    setLoading(false);
  }

  async function handleAction(row: RequestRow, status: 'approved' | 'rejected') {
    setActionLoading(row.id);
    try {
      if (row.type === 'leave') {
        await updateLeaveStatus(row.id, status);
      } else {
        await updateOffsiteStatus(row.id, status);
      }
      await loadRequests();
    } catch (err) {
      console.error('อัปเดตสถานะล้มเหลว:', err);
      alert('อัปเดตสถานะล้มเหลว');
    }
    setActionLoading(null);
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div id="requests-admin" className="page-section active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ marginBottom: '5px' }}>จัดการคำขอรอดำเนินการ (Inbox)</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
            คำขอลา และขอออกหน้างานจากแอปพนักงาน
            {rows.length > 0 && (
              <span style={{ marginLeft: '10px', fontWeight: 600, color: 'var(--red)' }}>
                ({rows.length} รายการ)
              </span>
            )}
          </span>
        </div>
        <button className="btn-primary" onClick={loadRequests} disabled={loading}>
          <i className="fa-solid fa-rotate-right"></i> โหลดข้อมูลใหม่
        </button>
      </div>
      <div className="table-card glass-panel">
        <table>
          <thead>
            <tr>
              <th>วันที่ขอใช้สิทธิ์</th>
              <th>พนักงาน</th>
              <th>ประเภทและเหตุผล</th>
              <th style={{ textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody id="req-table-body">
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px' }}>
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-gray)' }}>
                  ไม่มีคำขอรอดำเนินการ 🎉
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td data-label="วันที่ขอใช้สิทธิ์">{formatDate(row.date)}</td>
                  <td data-label="พนักงาน" style={{ fontWeight: 600 }}>{row.userName}</td>
                  <td data-label="ประเภทและเหตุผล">
                    <div style={{ fontWeight: 500 }}>{row.detail}</div>
                    {row.reason && (
                      <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '2px' }}>
                        {row.reason}
                      </div>
                    )}
                    {row.medicalCertUrl && (
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {parseImageUrls(row.medicalCertUrl).map((imgUrl, idx) => (
                          <img 
                            key={idx}
                            src={imgUrl} 
                            alt={`Medical Certificate ${idx+1}`} 
                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }} 
                            onClick={() => setPreviewImage(imgUrl)}
                            title="คลิกเพื่อดูรูปใหญ่"
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td data-label="จัดการ" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-approve"
                        disabled={actionLoading === row.id}
                        onClick={() => handleAction(row, 'approved')}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        <i className="fa-solid fa-check"></i> อนุมัติ
                      </button>
                      <button
                        className="btn-reject"
                        disabled={actionLoading === row.id}
                        onClick={() => handleAction(row, 'rejected')}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        <i className="fa-solid fa-xmark"></i> ปฏิเสธ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
