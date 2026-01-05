import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import '../../styles/PeriodSelector.css';

const PeriodSelector = ({ period, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

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

  // Calculer la position du dropdown pour éviter le débordement
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 600;
      
      let style = {};
      
      if (isMobile) {
        // Sur mobile, utiliser position fixed et calculer depuis le bouton
        // S'assurer que le dropdown ne dépasse pas de l'écran
        const dropdownWidth = 220;
        const padding = 8;
        let left = buttonRect.left;
        
        // Si le dropdown dépasse à droite, l'aligner à droite du bouton
        if (left + dropdownWidth > window.innerWidth - padding) {
          left = Math.max(padding, window.innerWidth - dropdownWidth - padding);
        }
        
        // Si le dropdown dépasse à gauche, l'aligner à gauche de l'écran
        if (left < padding) {
          left = padding;
        }
        
        style = {
          position: 'fixed',
          top: `${buttonRect.bottom + 8}px`,
          left: `${left}px`,
          right: 'auto',
          maxWidth: `${Math.min(dropdownWidth, window.innerWidth - 16)}px`,
          zIndex: 1301,
        };
      } else {
        // Sur desktop, garder position absolute mais ajuster si nécessaire
        const dropdownWidth = 220;
        const spaceRight = window.innerWidth - buttonRect.right;
        const spaceLeft = buttonRect.left;
        
        if (spaceRight < dropdownWidth && spaceLeft > dropdownWidth) {
          // Aligner à gauche si pas assez d'espace à droite
          style = {
            right: 'auto',
            left: '0',
          };
        }
      }
      
      setDropdownStyle(style);
    }
  }, [isOpen]);

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
        ref={buttonRef}
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
          <div 
            ref={dropdownRef}
            className="period-selector-dropdown"
            style={dropdownStyle}
          >
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
