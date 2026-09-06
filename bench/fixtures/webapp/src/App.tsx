import { Route, Routes } from 'react-router-dom';

import { HomePage } from './features/home';
import { OrderDetailPage, OrdersPage } from './features/orders';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:id" element={<OrderDetailPage />} />
    </Routes>
  );
}
