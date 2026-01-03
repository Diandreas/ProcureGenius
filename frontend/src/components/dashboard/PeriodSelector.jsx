import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import '../../styles/PeriodSelector.css';

const PeriodSelector = ({ period, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const periods = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'last_7_days', label: '7 derniers jours' },
    { value: 'last_30_days', label: '30 derniers jours' },
    { value: 'last_90_days', label: '90 derniers jours' },
    { value: 'this_month', label: 'Ce mois' },
    { value: 'last_month', label: 'Mois dernier' },
    { value: 'this_year', label: 'Cette année' },
    { value: 'custom', label: 'Plage personnalisée', icon: <Calendar size={14} /> },
  ];

  const selectedPeriod = periods.find(p => p.value === period) || periods[2];

  const handlePeriodChange = (value) => {
    if (value === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(value);
      setIsOpen(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (startDate && endDate) {
      // Format: custom_YYYY-MM-DD_YYYY-MM-DD
      onChange(`custom_${startDate}_${endDate}`);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  return (
    <div className="period-selector">
      <button
        className="period-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={16} />
        <span>{selectedPeriod.label}</span>
        <ChevronDown size={16} style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }} />
      </button>

      {isOpen && (
        <>
          <div className="period-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="period-selector-dropdown">
            {!showCustom ? (
              <div className="period-options">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    className={`period-option ${period === p.value ? 'active' : ''}`}
                    onClick={() => handlePeriodChange(p.value)}
                  >
                    {p.icon && <span style={{ marginRight: '6px' }}>{p.icon}</span>}
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="custom-range-picker">
                <h4>Sélectionner une plage</h4>
                <div className="date-inputs">
                  <div className="date-input-group">
                    <label>Date de début</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || undefined}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>Date de fin</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="custom-range-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setShowCustom(false);
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn-apply"
                    onClick={handleCustomRangeApply}
                    disabled={!startDate || !endDate}
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodSelector;
