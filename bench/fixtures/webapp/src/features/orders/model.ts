import { create } from 'zustand';

export type StatusFilter = 'all' | 'open' | 'paid' | 'cancelled';

interface OrdersFilter {
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
  reset: () => void;
}

export const useOrdersFilter = create<OrdersFilter>((set) => ({
  status: 'all',
  setStatus: (status) => set({ status }),
  reset: () => set({ status: 'all' }),
}));
