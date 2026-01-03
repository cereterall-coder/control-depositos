import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppDebug from './AppDebug.jsx'
import './styles/global.css'

import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <AppDebug />
            </BrowserRouter>
        </ErrorBoundary>
    </StrictMode>,
)
