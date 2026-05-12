export type TransactionType = 'Despesa' | 'Receita' | 'Transferência'
export type EmpresaType = 'Pessoal' | 'Marmitas' | 'Personal Chef'
export type BankSource = 'CBA' | 'ANZ' | 'Qantas' | 'Manual'
export type AccountType = 'corrente' | 'poupanca' | 'credito' | 'emprestimo' | 'dinheiro' | 'investimento'

export interface Transaction {
  id: number
  date: string
  description: string
  bank: string
  toBank?: string | null
  type: TransactionType
  category: string
  subcategory: string
  empresa: EmpresaType
  amount: number
  notes: string
  exported: boolean
  importedFrom?: string | null
  externalRef?: string | null
  graoExportId?: number | null
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: number
  name: string
  type: AccountType
  color: string
  initialBalance: number
  initialDate: string
  creditLimit?: number | null
  interestRate?: number | null
  minimumPayment?: number | null
  dueDay?: number | null
  isActive: boolean
  currentBalance: number   // calculado pela API
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: number
  month: number
  year: number
  category: string
  amount: number
}

export interface SavingsGoal {
  id: number
  name: string
  accountName?: string | null
  currentAmount: number
  targetAmount: number
  weeklyContrib: number
  startDate: string
  updatedAt: string
}

export interface GraoExportSummaryItem {
  category: string
  subcategory: string
  amount: number
  count: number
}

export interface GraoExport {
  id: number
  createdAt: string
  totalAmount: number
  summary: GraoExportSummaryItem[]
  transactions?: Transaction[]
}

export interface GraoPendingItem {
  category: string
  subcategory: string
  amount: number
  count: number
  transactionIds: number[]
}

export interface AllowedDevice {
  id: number
  fingerprint: string
  name: string
  lastSeen: string
  createdAt: string
}

export interface ParsedTransaction {
  date: Date
  amount: number
  description: string
  type: TransactionType
  bank: string
  source: BankSource
  externalRef: string
  category?: string
  subcategory?: string
  empresa?: EmpresaType
  notes?: string
  isDuplicate?: boolean
}

export interface AccountBalance {
  bank: string
  initialAmount: number
  initialDate: string
  currentBalance: number
}

export interface DashboardData {
  kpis: {
    receitas: number
    despesas: number
    saldo: number
    pendentesGrao: number
  }
  trend: Array<{
    month: string
    receitas: number
    despesas: number
  }>
  categories: Array<{
    name: string
    value: number
  }>
  companies: {
    marmitas: { receita: number; custo: number; lucro: number }
    personalChef: { receita: number; custo: number; lucro: number }
  }
  recentTransactions: Transaction[]
  analysis5030: {
    necessidades: number
    desejos: number
    poupanca: number
    totalReceita: number
  }
  accountBalances: AccountBalance[]
  netWorth: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  pages: number
  page: number
}

export interface ApiError {
  error: string
}

export interface DebtPayoffResult {
  method: 'avalanche' | 'bola-de-neve'
  order: Array<{
    name: string
    balance: number
    interestRate: number
    monthsPaidOff: number
    totalInterest: number
  }>
  totalMonths: number
  totalInterest: number
}

export interface ComparisonItem {
  category: string
  current: number
  previous: number
  diff: number
  pct: number | null
}

export interface SubscriptionItem {
  description: string
  bank: string
  category: string
  monthlyAvg: number
  yearlyEstimate: number
  monthsDetected: number
}

export interface EmergencyFundData {
  avg3Months: number
  avg6Months: number
  fund3x3: number
  fund3x6: number
  fund6x3: number
  fund6x6: number
  basedOnMonths3: number
  basedOnMonths6: number
}

export interface AnalyticsData {
  comparison: ComparisonItem[]
  categoryAverages: Record<string, number>
  subscriptions: SubscriptionItem[]
  emergencyFund: EmergencyFundData
  budgetAlerts: BudgetAlertItem[]
  healthScore: HealthScore
  weeklyReview: WeeklyReview
}

export interface BudgetAlertItem {
  category: string
  budgeted: number
  actual: number
  pct: number
}

export interface HealthScore {
  total: number
  savingsRate: number
  budgetAdherence: number
  emergencyMonths: number
  breakdown: {
    savings: number
    budget: number
    emergency: number
    debt: number
  }
}

export interface WeeklyReview {
  receitas: number
  despesas: number
  transactions: number
  topCategories: Array<{ category: string; amount: number }>
  balance: number
}
