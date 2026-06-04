import React from 'react';
import { createRoot } from 'react-dom/client';
import { Consent } from './Consent';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Consent />
    </React.StrictMode>
  );
}