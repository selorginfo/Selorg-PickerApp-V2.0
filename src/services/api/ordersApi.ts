import { config } from '../../constants/config';
import { request, mockResponse } from './client';

export type AssignedOrderSummary = {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  riderStage?: string | null;
  itemCount?: number | null;
  hubName?: string | null;
  customerName?: string | null;
  amountLabel?: string | null;
};

export type AssignedOrdersPage = {
  orders: AssignedOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function mapOrder(raw: Record<string, unknown>): AssignedOrderSummary {
  const items = raw.items;
  const itemCount = Array.isArray(items)
    ? items.length
    : typeof raw.itemCount === 'number'
      ? raw.itemCount
      : null;
  return {
    id: String(raw.id || raw._id || raw.orderId || ''),
    orderNumber: (raw.orderNumber || raw.orderCode || raw.code || null) as string | null,
    status: (raw.status || null) as string | null,
    riderStage: (raw.riderStage || raw.stage || null) as string | null,
    itemCount,
    hubName: (raw.hubName || raw.hub || null) as string | null,
    customerName: (raw.customerName || (raw.customer as { name?: string } | undefined)?.name || null) as
      | string
      | null,
    amountLabel: (raw.amountLabel || raw.totalLabel || null) as string | null,
  };
}

/**
 * Workforce visibility into orders. Item scanning / pick / shortage / bag handover
 * remain on HHD — this API surfaces assignment status only.
 */
export const ordersApi = {
  async listAssigned(query?: { scope?: 'mine' | 'available' | 'all'; page?: number; limit?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse<AssignedOrdersPage>({ orders: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    }
    const raw = await request<Record<string, unknown> | AssignedOrdersPage>('/shared-orders/assignorders', {
      query: {
        scope: query?.scope || 'mine',
        page: query?.page || 1,
        limit: query?.limit || 20,
      },
    });
    if (Array.isArray((raw as AssignedOrdersPage)?.orders)) {
      const page = raw as AssignedOrdersPage;
      return {
        ...page,
        orders: page.orders.map(o => mapOrder(o as unknown as Record<string, unknown>)),
      };
    }
    const data = (raw as { data?: AssignedOrdersPage })?.data || (raw as AssignedOrdersPage);
    const orders = Array.isArray(data?.orders) ? data.orders : Array.isArray(raw) ? (raw as unknown[]) : [];
    return {
      orders: orders.map(o => mapOrder(o as Record<string, unknown>)),
      total: Number(data?.total ?? orders.length) || 0,
      page: Number(data?.page) || 1,
      limit: Number(data?.limit) || 20,
      totalPages: Number(data?.totalPages) || 1,
    };
  },

  async listCompleted(query?: { page?: number; limit?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse<AssignedOrdersPage>({ orders: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    }
    const raw = await request<Record<string, unknown>>('/shared-orders/completed', {
      query: { page: query?.page || 1, limit: query?.limit || 20 },
    });
    const ordersRaw = Array.isArray(raw?.orders)
      ? raw.orders
      : Array.isArray((raw as { data?: { orders?: unknown[] } })?.data?.orders)
        ? (raw as { data: { orders: unknown[] } }).data.orders
        : [];
    return {
      orders: ordersRaw.map(o => mapOrder(o as Record<string, unknown>)),
      total: Number(raw?.total ?? ordersRaw.length) || 0,
      page: Number(raw?.page) || 1,
      limit: Number(raw?.limit) || 20,
      totalPages: Number(raw?.totalPages) || 1,
    };
  },
};
