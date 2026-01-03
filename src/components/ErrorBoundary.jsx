import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', background: '#111', color: 'white', height: '100vh', overflow: 'auto' }}>
                    <h1 style={{ color: '#ef4444' }}>🚫 Algo salió mal</h1>
                    <p>La aplicación ha encontrado un error crítico.</p>
                    <pre style={{ background: '#333', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1rem', padding: '0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Recargar Página
                    </button>
                    <button 
                        onClick={() => { localStorage.clear(); window.location.reload(); }}
                        style={{ marginTop: '1rem', marginLeft: '1rem', padding: '0.8rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Borrar Caché y Recargar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
