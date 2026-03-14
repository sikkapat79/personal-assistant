import { BrowserRouter, Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Pax</div>} />
        <Route path="/pomodoro" element={<div>Pomodoro (coming soon)</div>} />
        <Route path="/tasks" element={<div>Tasks (coming soon)</div>} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}
