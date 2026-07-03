export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const WORK_START_HOUR = 9;
export const WORK_START_MIN = 0;

export function getThaiMonthYearString(year: number, month: number) {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${months[month - 1]} ${year + 543}`;
}

export function computeLateMinutes(
  checkInAt: string | undefined,
  userName: string,
  ymd: string,
  morningLeaveMap: Map<string, boolean>
): number {
  if (!checkInAt) return 0;
  const checkIn = new Date(checkInAt);
  const target = new Date(checkIn);
  if (morningLeaveMap.get(`${userName}_${ymd}`)) {
    target.setHours(13, 0, 0, 0);
  } else {
    target.setHours(WORK_START_HOUR, WORK_START_MIN, 0, 0);
  }
  const diffMs = checkIn.getTime() - target.getTime();
  return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
}

export function computeWorkHours(checkInAt: string | undefined, checkOutAt: string | undefined): number {
  if (!checkInAt || !checkOutAt) return 0;
  const diffMs = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  return diffMs > 0 ? Math.round((diffMs / 3600000) * 100) / 100 : 0;
}

export function formatDate(iso: string) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const wd = d.toLocaleDateString('th-TH', { weekday: 'short' });
    const dm = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${dm} (${wd})`;
  } catch {
    return iso;
  }
}

export function formatTime(iso: string | undefined) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

export function translateType(t: string) {
  if (t === 'attendance') return 'เข้างาน';
  if (t === 'leave') return 'ลา';
  if (t === 'offsite') return 'ออกหน้างาน';
  return t;
}

export function translateStatus(raw: string, isoDate?: string) {
  if (isoDate) {
    const day = new Date(isoDate).getDay();
    if ((day === 0 || day === 6) && (raw === 'on_time' || raw === 'late')) {
      return 'ทำงานวันหยุด';
    }
  }
  if (raw === 'on_time') return 'มาทำงาน (ตรงเวลา)';
  if (raw === 'late') return 'มาทำงาน (สาย)';
  if (raw === 'no_record') return 'ไม่มีบันทึก';
  if (raw.startsWith('offsite')) return raw.replace('offsite', 'ออกหน้างาน');
  if (raw.includes('sick_leave_full')) return raw.replace('sick_leave_full', 'ลาป่วย (เต็มวัน)');
  if (raw.includes('sick_leave_morning')) return raw.replace('sick_leave_morning', 'ลาป่วย (ครึ่งเช้า)');
  if (raw.includes('sick_leave_afternoon')) return raw.replace('sick_leave_afternoon', 'ลาป่วย (ครึ่งบ่าย)');
  if (raw.includes('personal_leave_full')) return raw.replace('personal_leave_full', 'ลากิจ (เต็มวัน)');
  if (raw.includes('personal_leave_morning')) return raw.replace('personal_leave_morning', 'ลากิจ (ครึ่งเช้า)');
  if (raw.includes('personal_leave_afternoon')) return raw.replace('personal_leave_afternoon', 'ลากิจ (ครึ่งบ่าย)');
  if (raw.includes('annual_leave')) return raw.replace('annual_leave', 'ลาพักร้อน');
  if (raw.includes('shift_swap')) return raw.replace('shift_swap', 'สลับวันหยุด');
  if (raw === 'unknown') return 'ไม่ทราบสาเหตุ';
  return raw;
}

export function getStatusClass(status: string) {
  if (status.includes('ตรงเวลา')) return 'st-ontime';
  if (status.includes('สาย')) return 'st-late';
  if (status.includes('ออกหน้างาน')) return 'st-offsite';
  if (status.includes('ลา')) return 'st-leave';
  if (status.includes('วันหยุด')) return 'st-weekend';
  return 'st-unknown';
}
