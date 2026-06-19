import { Loader2 } from 'lucide-react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Shell from './components/layout/Shell';
import FeatureDisabledPage from './components/ui/FeatureDisabledPage';
import { useFeatureFlag } from './hooks/useFeatureFlags';
import SettingsPage from './pages/admin/SettingsPage';
import UsersPage from './pages/admin/UsersPage';
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
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import BarcodeLookupPage from './pages/inventory/BarcodeLookupPage';
import MovementsPage from './pages/inventory/MovementsPage';
import ReconcilePage from './pages/inventory/ReconcilePage';
import RemnantsListPage from './pages/inventory/RemnantsListPage';
import RollDetailPage from './pages/inventory/RollDetailPage';
import RollListPage from './pages/inventory/RollListPage';
import WastageListPage from './pages/inventory/WastageListPage';
import LoginPage from './pages/LoginPage';
import NewSale from './pages/NewSale';
import RetailPOSPage from './pages/pos/RetailPOSPage';
import WholesalePOSPage from './pages/pos/WholesalePOSPage';
import PurchaseCreatePage from './pages/purchases/PurchaseCreatePage';
import PurchaseDetailPage from './pages/purchases/PurchaseDetailPage';
import PurchaseListPage from './pages/purchases/PurchaseListPage';
import SuppliersPage from './pages/purchases/SuppliersPage';
import SupplierStatementPage from './pages/purchases/SupplierStatementPage';
import SupplierStatementPrintView from './pages/purchases/SupplierStatementPrintView';
import CustomersReportPage from './pages/reports/CustomersReportPage';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import PurchasesReportPage from './pages/reports/PurchasesReportPage';
import SalesReportPage from './pages/reports/SalesReportPage';
import WastageReportPage from './pages/reports/WastageReportPage';
import SalesHistory from './pages/SalesHistory';

function FeatureFlagRoute({
  flagKey,
  featureName,
  children,
}: {
  flagKey: string;
  featureName: string;
  children: React.ReactNode;
}) {
  const { enabled, isLoading } = useFeatureFlag(flagKey);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!enabled) return <FeatureDisabledPage featureName={featureName} />;
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Standalone print route — rendered outside the dashboard Shell
            so the sidebar / top nav don't appear when the user prints. */}
        <Route
          path="/purchases/suppliers/:id/statement/print"
          element={
            <ProtectedRoute permission="suppliers.view_statement">
              <SupplierStatementPrintView />
            </ProtectedRoute>
          }
        />

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
                <FeatureFlagRoute flagKey="wholesalePos" featureName="Wholesale POS">
                  <WholesalePOSPage />
                </FeatureFlagRoute>
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
          <Route
            path="purchases/suppliers/:id/statement"
            element={
              <ProtectedRoute permission="suppliers.view_statement">
                <SupplierStatementPage />
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
                <FeatureFlagRoute flagKey="wastageTracking" featureName="Wastage Tracking">
                  <WastageListPage />
                </FeatureFlagRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/remnants"
            element={
              <ProtectedRoute permission="read:inventory">
                <FeatureFlagRoute flagKey="remnantManagement" featureName="Remnant Management">
                  <RemnantsListPage />
                </FeatureFlagRoute>
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

          {/* Reports */}
          <Route
            path="reports/sales"
            element={
              <ProtectedRoute permission="read:sales">
                <SalesReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/inventory"
            element={
              <ProtectedRoute permission="read:inventory">
                <InventoryReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/wastage"
            element={
              <ProtectedRoute permission="read:inventory">
                <FeatureFlagRoute flagKey="wastageTracking" featureName="Wastage Report">
                  <WastageReportPage />
                </FeatureFlagRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/customers"
            element={
              <ProtectedRoute permission="read:sales">
                <CustomersReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/purchases"
            element={
              <ProtectedRoute permission="read:purchases">
                <PurchasesReportPage />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="admin/settings"
            element={
              <ProtectedRoute permission="read:settings">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute permission="read:users">
                <UsersPage />
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
