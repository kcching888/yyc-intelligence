import { Component } from "react";

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(
    error
  ) {
    return { error };
  }

  componentDidCatch(
    error,
    errorInfo
  ) {
    console.error(
      "Map component error:",
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            color: "#b91c1c",
            fontFamily: "sans-serif",
          }}
        >
          <h2>Map failed to load</h2>
          <pre>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;