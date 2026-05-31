import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Shell from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import LoginPage from './pages/LoginPage';
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
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="sales/new"
            element={
              <ProtectedRoute permission="write:sales">
                <NewSale />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute permission="read:inventory">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="sales/history"
            element={
              <ProtectedRoute permission="read:sales">
                <SalesHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/products"
            element={
              <ProtectedRoute permission="read:products">
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/products/new"
            element={
              <ProtectedRoute permission="write:products">
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/products/:id/edit"
            element={
              <ProtectedRoute permission="write:products">
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/categories"
            element={
              <ProtectedRoute permission="read:products">
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/brands"
            element={
              <ProtectedRoute permission="read:products">
                <BrandsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/batches"
            element={
              <ProtectedRoute permission="read:inventory">
                <BatchesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
