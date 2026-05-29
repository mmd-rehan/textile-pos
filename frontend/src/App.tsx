import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import NewSale from './pages/NewSale';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="sales/new" element={<NewSale />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales/history" element={<SalesHistory />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
