import React from 'react';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { PeriodMode, PeriodSelection, resolvePeriod, shiftPeriod } from '../utils/period';
import { getLocalDateString } from '../utils/helpers';

interface PeriodSelectorProps {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
  /** Hızlı dönem butonlarını gizle (yalnızca gün / ay / aralık seçimi) */
  hideQuickModes?: boolean;
  /** Seçili dönemin okunabilir etiketini göster */
  showLabel?: boolean;
  idPrefix?: string;
  /** Yatay hizalama (varsayılan: sağa yaslı) */
  align?: 'start' | 'end';
}

const QUICK_MODES: { mode: PeriodMode; label: string }[] = [
  { mode: 'today', label: 'Bugün' },
  { mode: 'this_week', label: 'Bu Hafta' },
  { mode: 'this_month', label: 'Bu Ay' },
  { mode: 'all', label: 'Tüm Zamanlar' },
];

const CUSTOM_MODES: { mode: PeriodMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'day', label: 'Gün Seç', icon: <CalendarCheck size={14} /> },
  { mode: 'month', label: 'Ay Seç', icon: <CalendarDays size={14} /> },
  { mode: 'range', label: 'Tarih Aralığı', icon: <CalendarRange size={14} /> },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
  hideQuickModes = false,
  showLabel = true,
  idPrefix = 'period',
  align = 'end',
}) => {
  const range = resolvePeriod(value);
  const todayStr = getLocalDateString();
  const isCustom = value.mode === 'day' || value.mode === 'month' || value.mode === 'range';

  const setMode = (mode: PeriodMode) => onChange({ ...value, mode });

  return (
    <div className={`period-selector ${align === 'start' ? 'period-selector--start' : ''}`}>
      <div className="period-selector-modes">
        {!hideQuickModes && (
          <div className="period-segment">
            {QUICK_MODES.map(q => (
              <button
                key={q.mode}
                id={`${idPrefix}-mode-${q.mode}`}
                type="button"
                className={`period-chip ${value.mode === q.mode ? 'active' : ''}`}
                onClick={() => setMode(q.mode)}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        <div className="period-segment">
          {CUSTOM_MODES.map(c => (
            <button
              key={c.mode}
              id={`${idPrefix}-mode-${c.mode}`}
              type="button"
              className={`period-chip ${value.mode === c.mode ? 'active' : ''}`}
              onClick={() => setMode(c.mode)}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isCustom && (
        <div className="period-picker-row">
          {value.mode === 'day' && (
            <div className="period-stepper">
              <button type="button" className="period-step-btn" title="Önceki gün" onClick={() => onChange(shiftPeriod(value, -1))}>
                <ChevronLeft size={16} />
              </button>
              <input
                id={`${idPrefix}-day`}
                type="date"
                className="form-control period-input"
                value={value.day}
                max={todayStr}
                onChange={e => e.target.value && onChange({ ...value, day: e.target.value })}
              />
              <button type="button" className="period-step-btn" title="Sonraki gün" onClick={() => onChange(shiftPeriod(value, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {value.mode === 'month' && (
            <div className="period-stepper">
              <button type="button" className="period-step-btn" title="Önceki ay" onClick={() => onChange(shiftPeriod(value, -1))}>
                <ChevronLeft size={16} />
              </button>
              <input
                id={`${idPrefix}-month`}
                type="month"
                className="form-control period-input"
                value={value.month}
                max={todayStr.slice(0, 7)}
                onChange={e => e.target.value && onChange({ ...value, month: e.target.value })}
              />
              <button type="button" className="period-step-btn" title="Sonraki ay" onClick={() => onChange(shiftPeriod(value, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {value.mode === 'range' && (
            <div className="period-range">
              <label className="period-range-field">
                <span>Başlangıç</span>
                <input
                  id={`${idPrefix}-from`}
                  type="date"
                  className="form-control period-input"
                  value={value.from}
                  onChange={e => e.target.value && onChange({ ...value, from: e.target.value })}
                />
              </label>
              <span className="period-range-sep">→</span>
              <label className="period-range-field">
                <span>Bitiş</span>
                <input
                  id={`${idPrefix}-to`}
                  type="date"
                  className="form-control period-input"
                  value={value.to}
                  onChange={e => e.target.value && onChange({ ...value, to: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {showLabel && (
        <div className="period-label" id={`${idPrefix}-label`}>
          <CalendarDays size={13} />
          <span>Seçili dönem: <strong>{range.label}</strong></span>
        </div>
      )}
    </div>
  );
};
