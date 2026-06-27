export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";

export interface StockEntry {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string;
  price: number;
  stock: StockEntry[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  price?: number;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl?: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}
