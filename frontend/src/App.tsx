import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col"></div>
    </ErrorBoundary>
  );
}
