import React from 'react';
import ReactDOM from 'react-dom/client';

import OnboardingApp from './app/OnboardingApp';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <OnboardingApp />
    </React.StrictMode>,
);
