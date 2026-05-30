import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import NewSale from './pages/NewSale';
import SalesHistory from './pages/SalesHistory';
import BatchesPage from './pages/catalog/BatchesPage';
import BrandsPage from './pages/catalog/BrandsPage';
import CategoriesPage from './pages/catalog/CategoriesPage';
import ProductForm from './pages/catalog/ProductForm';
import ProductsPage from './pages/catalog/ProductsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="sales/new" element={<NewSale />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales/history" element={<SalesHistory />} />
          {/* Catalog */}
          <Route path="catalog/products" element={<ProductsPage />} />
          <Route path="catalog/products/new" element={<ProductForm />} />
          <Route path="catalog/products/:id/edit" element={<ProductForm />} />
          <Route path="catalog/categories" element={<CategoriesPage />} />
          <Route path="catalog/brands" element={<BrandsPage />} />
          <Route path="catalog/batches" element={<BatchesPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
