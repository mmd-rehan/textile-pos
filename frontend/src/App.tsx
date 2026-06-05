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
import ColorsPage from './pages/catalog/ColorsPage';
import DesignsPage from './pages/catalog/DesignsPage';
import ProductDetailPage from './pages/catalog/ProductDetailPage';
import ProductForm from './pages/catalog/ProductForm';
import ProductsPage from './pages/catalog/ProductsPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import CustomerForm from './pages/customers/CustomerForm';
import CustomersPage from './pages/customers/CustomersPage';
import BarcodeLookupPage from './pages/inventory/BarcodeLookupPage';
import MovementsPage from './pages/inventory/MovementsPage';
import ReconcilePage from './pages/inventory/ReconcilePage';
import RemnantsListPage from './pages/inventory/RemnantsListPage';
import RollDetailPage from './pages/inventory/RollDetailPage';
import RollListPage from './pages/inventory/RollListPage';
import WastageListPage from './pages/inventory/WastageListPage';
import RetailPOSPage from './pages/pos/RetailPOSPage';
import WholesalePOSPage from './pages/pos/WholesalePOSPage';
import PurchaseCreatePage from './pages/purchases/PurchaseCreatePage';
import PurchaseDetailPage from './pages/purchases/PurchaseDetailPage';
import PurchaseListPage from './pages/purchases/PurchaseListPage';
import SuppliersPage from './pages/purchases/SuppliersPage';

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
            path="pos/retail"
            element={
              <ProtectedRoute permission="write:sales">
                <RetailPOSPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos/wholesale"
            element={
              <ProtectedRoute permission="write:sales">
                <WholesalePOSPage />
              </ProtectedRoute>
            }
          />
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
            path="catalog/products/:id"
            element={
              <ProtectedRoute permission="read:products">
                <ProductDetailPage />
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
            path="catalog/colors"
            element={
              <ProtectedRoute permission="read:products">
                <ColorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog/designs"
            element={
              <ProtectedRoute permission="read:products">
                <DesignsPage />
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

          {/* Customers */}
          <Route
            path="customers"
            element={
              <ProtectedRoute permission="read:sales">
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers/new"
            element={
              <ProtectedRoute permission="write:sales">
                <CustomerForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers/:id"
            element={
              <ProtectedRoute permission="read:sales">
                <CustomerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers/:id/edit"
            element={
              <ProtectedRoute permission="write:sales">
                <CustomerForm />
              </ProtectedRoute>
            }
          />

          {/* Purchases */}
          <Route
            path="purchases"
            element={
              <ProtectedRoute permission="read:purchases">
                <PurchaseListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchases/new"
            element={
              <ProtectedRoute permission="write:purchases">
                <PurchaseCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchases/:id"
            element={
              <ProtectedRoute permission="read:purchases">
                <PurchaseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchases/suppliers"
            element={
              <ProtectedRoute permission="read:purchases">
                <SuppliersPage />
              </ProtectedRoute>
            }
          />

          {/* Inventory */}
          <Route
            path="inventory/rolls"
            element={
              <ProtectedRoute permission="read:inventory">
                <RollListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/rolls/:id"
            element={
              <ProtectedRoute permission="read:inventory">
                <RollDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/rolls/:id/reconcile"
            element={
              <ProtectedRoute permission="write:inventory">
                <ReconcilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/wastage"
            element={
              <ProtectedRoute permission="read:inventory">
                <WastageListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/remnants"
            element={
              <ProtectedRoute permission="read:inventory">
                <RemnantsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/movements"
            element={
              <ProtectedRoute permission="read:inventory">
                <MovementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/barcode-lookup"
            element={
              <ProtectedRoute permission="read:inventory">
                <BarcodeLookupPage />
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
