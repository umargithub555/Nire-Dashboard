export type Branch = {
  id: string
  name: string
  address: string | null
  created_at: string
}

export type Employee = {
  id: string
  auth_user_id: string
  branch_id: string | null
  full_name: string
  email: string
  phone: string | null
  designation: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  branch?: Branch
}

export type Attendance = {
  id: string
  employee_id: string
  branch_id: string
  clock_in_at: string
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_in_address: string | null
  date: string
  employee?: Employee
}

export type Visit = {
  id: string
  employee_id: string
  branch_id: string
  purpose: string
  place_name: string | null
  lat: number | null
  lng: number | null
  address: string | null
  photo_url: string | null
  visited_at: string
  notes: string | null
  employee?: Employee
}

export type Expense = {
  id: string
  employee_id: string
  branch_id: string
  title: string
  amount: number
  category: string
  description: string | null
  expense_date: string
  created_at: string
  employee?: Employee
  comment_count?: number
}

export type ExpenseComment = {
  id: string
  expense_id: string
  author_id: string
  comment: string
  created_at: string
  author?: Employee
}