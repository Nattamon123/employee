import { useState, useEffect, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { THAI_MONTHS_SHORT, getThaiMonthYearString } from '../utils/attendanceHelpers';

interface MonthPickerProps {
  filterMonth: string;
  setFilterMonth: (val: string) => void;
}

export default function MonthPicker({ filterMonth, setFilterMonth }: MonthPickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [selectedYear, selectedMonth] = useMemo(() => {
    const [y, m] = filterMonth.split('-');
    return [parseInt(y, 10), parseInt(m, 10)];
  }, [filterMonth]);

  useEffect(() => {
    if (isPickerOpen) {
      setPickerYear(selectedYear);
    }
  }, [isPickerOpen, selectedYear]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', zIndex: 50 }}>
      <button 
        type="button"
        className="btn-select-month"
        onClick={() => setIsPickerOpen(!isPickerOpen)}
      >
        <Calendar size={16} style={{ color: 'var(--primary-color)' }} />
        <span>{getThaiMonthYearString(selectedYear, selectedMonth)}</span>
      </button>

      {isPickerOpen && (
        <>
          {/* Overlay Backdrop to close on click outside */}
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 998, cursor: 'default' }} 
            onClick={() => setIsPickerOpen(false)} 
          />
          <div className="month-picker-popover">
            {/* Year Header */}
            <div className="picker-year-header">
              <button
                type="button"
                className="btn-picker-arrow"
                onClick={() => setPickerYear(p => p - 1)}
              >
                ‹
              </button>
              <select
                value={pickerYear}
                onChange={(e) => setPickerYear(Number(e.target.value))}
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
                      {y + 543} (ค.ศ. {y})
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                className="btn-picker-arrow"
                onClick={() => setPickerYear(p => p + 1)}
              >
                ›
              </button>
            </div>

            {/* Month Grid */}
            <div className="month-grid">
              {THAI_MONTHS_SHORT.map((mShort, idx) => {
                const monthVal = idx + 1;
                const isSelected = selectedYear === pickerYear && selectedMonth === monthVal;
                return (
                  <button
                    key={mShort}
                    type="button"
                    className={`btn-month-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      const monthStr = String(monthVal).padStart(2, '0');
                      setFilterMonth(`${pickerYear}-${monthStr}`);
                      setIsPickerOpen(false);
                    }}
                  >
                    {mShort}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
