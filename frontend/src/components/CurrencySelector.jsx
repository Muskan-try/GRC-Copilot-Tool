import React from 'react';
import { CURRENCY_CONFIG } from '../utils/currencyUtils';

const CurrencySelector = ({ selectedCurrency, onCurrencyChange, style = {} }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
        Currency:
      </span>
      <select
        value={selectedCurrency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#1e293b',
          background: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        {Object.entries(CURRENCY_CONFIG).map(([code, config]) => (
          <option key={code} value={code}>
            {code} ({config.symbol})
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrencySelector;
