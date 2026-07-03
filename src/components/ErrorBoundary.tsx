import { Component, ErrorInfo, ReactNode } from "react";
import { Button, Text } from "@stellar/design-system";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>
            {"\u26a0\ufe0f"}
          </div>
          <Text
            as="h2"
            size="lg"
            style={{ marginBottom: "10px", color: "var(--text-primary)" }}
          >
            Something went wrong
          </Text>
          <Text
            as="p"
            size="sm"
            style={{
              marginBottom: "20px",
              color: "var(--text-secondary)",
              maxWidth: "400px",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </Text>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button
            variant="tertiary"
            size="md"
            onClick={this.handleReset}
            style={{ marginTop: "10px" }}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
