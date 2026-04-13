import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/LandingPage';
import ResultPage from './pages/ResultPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;