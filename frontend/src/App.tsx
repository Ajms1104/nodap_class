import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/LandingPage';
import SessionPage from './pages/SessionPage';
import ResultPage from './pages/ResultPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          {/* 1번 메인 화면 (초기 입력) */}
          <Route path="/" element={<MainPage />} />
          {/* 세션 대화 화면 */}
          <Route path="/session/:id" element={<SessionPage />} />
          {/* 2번 결과 화면 */}
          <Route path="/result/:id" element={<ResultPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
