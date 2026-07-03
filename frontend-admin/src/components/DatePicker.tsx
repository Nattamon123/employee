import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
}

const MONTHS_THAI = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS_THAI = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function DatePicker({ selectedDate, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD
  const [currYear, currMonth, currDay] = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return [y, m, d];
  }, [selectedDate]);

  // Temporary browsing year/month inside popover
  const [viewYear, setViewYear] = useState(currYear);
  const [viewMonth, setViewMonth] = useState(currMonth); // 1-12

  // Sync view when selectedDate changes or picker opens
  useEffect(() => {
    if (isOpen) {
      setViewYear(currYear);
      setViewMonth(currMonth);
    }
  }, [isOpen, currYear, currMonth]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date display on button (Thai)
  const formattedDisplay = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      const dm = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      return dm;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Calendar Grid Math
  const gridCells = useMemo(() => {
    const cells = [];
    
    // First day of current month (0 = Sunday, 1 = Monday...)
    const firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    // Days in current month
    const daysInCurrMonth = new Date(viewYear, viewMonth, 0).getDate();
    // Days in previous month
    const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

    // 1. Fill trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      let targetMonth = viewMonth - 1;
      let targetYear = viewYear;
      if (targetMonth === 0) {
        targetMonth = 12;
        targetYear -= 1;
      }
      cells.push({
        day: prevDay,
        year: targetYear,
        month: targetMonth,
        isCurrentMonth: false,
      });
    }

    // 2. Fill days of current month
    for (let i = 1; i <= daysInCurrMonth; i++) {
      cells.push({
        day: i,
        year: viewYear,
        month: viewMonth,
        isCurrentMonth: true,
      });
    }

    // 3. Pad remaining cells to complete grid (multiples of 7, total 35 or 42 cells)
    const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= remaining; i++) {
      let targetMonth = viewMonth + 1;
      let targetYear = viewYear;
      if (targetMonth === 13) {
        targetMonth = 1;
        targetYear += 1;
      }
      cells.push({
        day: i,
        year: targetYear,
        month: targetMonth,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    setViewMonth(prev => {
      if (prev === 1) {
        setViewYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth(prev => {
      if (prev === 12) {
        setViewYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const handleSelectDay = (cell: { day: number; month: number; year: number }) => {
    const yStr = cell.year;
    const mStr = String(cell.month).padStart(2, '0');
    const dStr = String(cell.day).padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        className="btn-select-month"
        style={{
          width: '100%',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarIcon size={18} style={{ color: 'var(--blue)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formattedDisplay}</span>
        </div>
        <span style={{ color: 'var(--text-gray)', fontSize: '12px' }}>▼</span>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div 
          className="month-picker-popover"
          style={{
            top: 'calc(100% + 8px)',
            left: 0,
            right: 'auto',
            width: '320px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header Year/Month Navigation */}
          <div className="picker-year-header">
            <button
              type="button"
              className="btn-picker-arrow"
              onClick={handlePrevMonth}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                style={{
                  background: 'none',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: 0,
                  margin: 0,
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {MONTHS_THAI.map((m, idx) => (
                  <option key={m} value={idx + 1} style={{ background: 'white', color: 'black' }}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                style={{
                  background: 'none',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: 0,
                  margin: 0,
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {Array.from({ length: 41 }, (_, i) => {
                  const y = new Date().getFullYear() - 20 + i;
                  return (
                    <option key={y} value={y} style={{ background: 'white', color: 'black' }}>
                      {y + 543}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              className="btn-picker-arrow"
              onClick={handleNextMonth}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {WEEKDAYS_THAI.map((day) => (
              <span 
                key={day} 
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-gray)',
                  paddingBottom: '4px'
                }}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {gridCells.map((cell, idx) => {
              const isSelected = 
                cell.day === currDay && 
                cell.month === currMonth && 
                cell.year === currYear;

              return (
                <button
                  key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                  type="button"
                  className={`btn-month-cell ${isSelected ? 'selected' : ''}`}
                  style={{
                    height: '34px',
                    padding: 0,
                    fontSize: '13px',
                    fontWeight: isSelected ? 700 : 400,
                    opacity: cell.isCurrentMonth ? 1 : 0.4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleSelectDay(cell)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
