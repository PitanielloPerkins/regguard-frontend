import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class DashboardErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected error" };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[RegGuard dashboard]", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rg-panel" role="alert" style={{ gridColumn: "1 / -1", padding: 24 }}>
          <h2 className="rg-subheading">Dashboard paused</h2>
          <p>
            Something went wrong while rendering this workspace. The header and notifications stay available; try recovering
            below without losing your browser cache.
          </p>
          <p className="field-hint">{this.state.message}</p>
          <button
            type="button"
            className="rg-btn rg-btn--primary"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Try again
          </button>{" "}
          <button type="button" className="rg-btn rg-btn--ghost" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
