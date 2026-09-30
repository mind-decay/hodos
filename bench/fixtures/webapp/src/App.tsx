import { Route, Routes } from 'react-router-dom';

import { HomePage } from './features/home';
import { OrderDetailPage, OrdersPage } from './features/orders';
import { ShiftPage } from './features/shift';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:id" element={<OrderDetailPage />} />
      <Route path="/shift" element={<ShiftPage />} />
    </Routes>
  );
}
