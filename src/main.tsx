import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// The entry point for the Football CRM application.  It wraps
// the application in a BrowserRouter and renders the root
// component into the DOM.  Using React StrictMode helps
// highlight potential problems during development.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);