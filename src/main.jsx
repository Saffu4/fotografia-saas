import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import Avisos from './components/Avisos.jsx'
import './index.css'

// Mensajes de campos obligatorios en español, sin importar el idioma del celular.
document.addEventListener('invalid', (e) => {
  const el = e.target
  if (!el.validity) return
  if (el.validity.valueMissing) el.setCustomValidity(el.tagName === 'SELECT' ? 'Elige una opción.' : 'Completa este campo.')
  else if (el.validity.typeMismatch && el.type === 'email') el.setCustomValidity('Escribe un correo válido.')
  else if (el.validity.patternMismatch) el.setCustomValidity(el.title || 'Revisa este dato.')
}, true)
document.addEventListener('input', (e) => e.target.setCustomValidity?.(''), true)
document.addEventListener('change', (e) => e.target.setCustomValidity?.(''), true)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Avisos />
    </BrowserRouter>
  </React.StrictMode>,
)
