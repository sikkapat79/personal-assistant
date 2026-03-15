import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSession } from './features/auth/useSession';
import { LoginPage } from './features/auth/LoginPage';

function AppRoutes() {
  const { loading, user } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<div>Pax</div>} />
      <Route path="/pomodoro" element={<div>Pomodoro (coming soon)</div>} />
      <Route path="/tasks" element={<div>Tasks (coming soon)</div>} />
      <Route path="*" element={<div>404</div>} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
