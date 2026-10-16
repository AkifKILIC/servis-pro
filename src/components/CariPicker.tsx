import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Building, User, ChevronDown } from 'lucide-react';
import { CurrentAccount } from '../types';
import { formatCurrency } from '../utils/helpers';

interface CariPickerProps {
  accounts: CurrentAccount[];
  value: string;                       // seçili cari ID ('' = seçili değil)
  onChange: (id: string) => void;
  preferType?: 'customer' | 'supplier'; // listede önce gösterilecek tür
  placeholder?: string;
  id?: string;
  required?: boolean;
}

const normalize = (s: string) =>
  (s || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

export const balanceLabel = (balance: number): { text: string; color: string } => {
  if (balance > 0) return { text: `${formatCurrency(balance)} alacağımız`, color: 'var(--emerald)' };
  if (balance < 0) return { text: `${formatCurrency(Math.abs(balance))} borcumuz`, color: 'var(--rose)' };
  return { text: 'Hesap kapalı', color: 'var(--text-dim)' };
};

/**
 * Aranabilir cari hesap seçici. İsim, yetkili, telefon veya ilçeye göre arar;
 * her satırda cari türü ve güncel bakiye gösterilir.
 */
export const CariPicker: React.FC<CariPickerProps> = ({
  accounts,
  value,
  onChange,
  preferType,
  placeholder = 'Cari ara: ünvan, yetkili, telefon...',
  id = 'cari-picker',
  required,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = accounts.find(a => a.id === value) || null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = accounts.filter(a => {
      if (!q) return true;
      return (
        normalize(a.name).includes(q) ||
        normalize(a.authorizedPerson || '').includes(q) ||
        (a.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        normalize(a.district || '').includes(q)
      );
    });
    return list.sort((a, b) => {
      if (preferType) {
        const pa = a.type === preferType ? 0 : 1;
        const pb = b.type === preferType ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [accounts, query, preferType]);

  useEffect(() => { setHighlight(0); }, [query, open]);

  const pick = (acc: CurrentAccount) => {
    onChange(acc.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlight(h => Math.min(h + 1, results.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlight(h => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlight]) pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="cari-picker" ref={wrapRef}>
      {selected && !open ? (
        <button
          type="button"
          id={`${id}-selected`}
          className="cari-picker-selected"
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        >
          <span className={`cari-picker-icon ${selected.type === 'supplier' ? 'is-supplier' : 'is-customer'}`}>
            {selected.type === 'supplier' ? <Building size={16} /> : <User size={16} />}
          </span>
          <span className="cari-picker-main">
            <strong>{selected.name}</strong>
            <small style={{ color: balanceLabel(selected.balance).color }}>
              {selected.type === 'supplier' ? 'Toptancı' : 'Müşteri'} • {balanceLabel(selected.balance).text}
            </small>
          </span>
          <span
            role="button"
            tabIndex={0}
            className="cari-picker-clear"
            title="Cari seçimini kaldır"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
          >
            <X size={14} />
          </span>
        </button>
      ) : (
        <div className="cari-picker-input-wrap">
          <Search size={16} className="cari-picker-search-icon" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            className="form-control cari-picker-input"
            placeholder={placeholder}
            value={query}
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={onKeyDown}
            required={required && !selected}
          />
          <ChevronDown size={16} className="cari-picker-chevron" onClick={() => setOpen(o => !o)} />
        </div>
      )}

      {open && (
        <div className="cari-picker-dropdown" role="listbox">
          {results.length === 0 ? (
            <div className="cari-picker-empty">
              {accounts.length === 0 ? 'Henüz cari kart açılmamış.' : 'Aramaya uygun cari bulunamadı.'}
            </div>
          ) : (
            results.slice(0, 60).map((acc, i) => {
              const bl = balanceLabel(acc.balance);
              return (
                <div
                  key={acc.id}
                  role="option"
                  aria-selected={acc.id === value}
                  className={`cari-picker-option ${i === highlight ? 'is-active' : ''} ${acc.id === value ? 'is-selected' : ''}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={e => { e.preventDefault(); pick(acc); }}
                >
                  <span className={`cari-picker-icon ${acc.type === 'supplier' ? 'is-supplier' : 'is-customer'}`}>
                    {acc.type === 'supplier' ? <Building size={14} /> : <User size={14} />}
                  </span>
                  <span className="cari-picker-main">
                    <strong>{acc.name}</strong>
                    <small>
                      {acc.type === 'supplier' ? 'Toptancı' : 'Müşteri'}
                      {acc.authorizedPerson ? ` • ${acc.authorizedPerson}` : ''}
                      {acc.phone ? ` • ${acc.phone}` : ''}
                    </small>
                  </span>
                  <span className="cari-picker-balance" style={{ color: bl.color }}>{bl.text}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
