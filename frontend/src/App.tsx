import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppProviders } from "./app/AppProviders";
import { AuthGate } from "./app/AuthGate";
// import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthGate />
        {/* <ChatWidget /> */}
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
