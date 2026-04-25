export type Category = 'Electronics' | 'Clothing' | 'Food' | 'Services' | 'Other';
export type ExpenseCategory = 'Rent' | 'Utilities' | 'Supplies' | 'Wages' | 'Other';
export type PaymentMethod = 'Cash' | 'Credit' | 'Mobile Money Transfer' | 'Cheque' | 'Bank';

export interface Store {
  id: string;
  userId: string;
  name: string;
  location?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  category: string;
  unit: string;
  stockQuantity: number;
  buyingPrice: number;
  sellingPrice: number;
}

export interface Sale {
  id: string;
  userId: string;
  storeId: string;
  date: string;
  productId: string;
  quantity: number;
  sellingPrice: number;
  buyingPrice: number; // Added for accurate profit calculation at time of sale
  discount: number;
  paymentMethod: PaymentMethod;
}

export interface Expense {
  id: string;
  userId: string;
  storeId: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
}

export interface Restock {
  id: string;
  userId: string;
  storeId: string;
  date: string;
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface DailyData {
  date: string;
  sales: number;
  expenses: number;
}

export type AlertType = 'LOW_STOCK' | 'SALES_TARGET' | 'PROFIT_MARGIN' | 'SALES_VELOCITY';
export type UserRole = 'executive' | 'employee';

export interface AlertRule {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  type: AlertType;
  targetId?: string; // Product ID if applicable
  threshold: number;
  isActive: boolean;
  createdAt: string;
}

export interface TriggeredAlert {
  id: string;
  userId: string;
  storeId: string;
  ruleId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface Client {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  phone: string;
  totalDebt: number;
  createdAt: string;
}

export interface ClientTransaction {
  id: string;
  userId: string;
  clientId: string;
  storeId: string;
  date: string;
  type: 'CREDIT' | 'PAYMENT';
  amount: number;
  description: string;
  productId?: string; // Optional: if it's credit for a specific product
  quantity?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  displayName: string;
  assignedStoreIds?: string[];
  ownerId?: string;
  businessName?: string;
  notificationsEnabled?: boolean;
  otpSecret?: string;
  otpEnabled?: boolean;
}

export interface DocumentItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Quotation {
  id: string;
  userId: string;
  storeId: string;
  clientId?: string;
  clientName: string;
  date: string;
  expiryDate?: string;
  items: DocumentItem[];
  totalAmount: number;
  notes?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
}

export interface Invoice {
  id: string;
  userId: string;
  storeId: string;
  clientId?: string;
  clientName: string;
  date: string;
  dueDate?: string;
  items: DocumentItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  notes?: string;
}
