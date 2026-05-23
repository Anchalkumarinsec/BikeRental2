import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 min-h-screen">
          <h2 className="text-2xl font-bold mb-4">Dashboard Error</h2>
          <p className="mb-4">The application crashed. Here are the details:</p>
          <pre className="bg-red-100 p-4 rounded overflow-auto text-sm">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white font-bold rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default ErrorBoundary;
