'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MessageSquare, X } from 'lucide-react'
import { Branch, Employee, Expense, ExpenseComment } from '@/types'

type ExpenseRow = Expense & {
  employee?: Pick<Employee, 'full_name'>
  comment_count?: Array<{ count: number }>
}

type ExpenseCommentRow = ExpenseComment & {
  author?: Pick<Employee, 'full_name'>
}

type ExpenseGroup = {
  id: string
  primaryExpenseId: string
  employeeName: string
  title: string
  amount: number
  expense_date: string
  description: string | null
  items: ExpenseRow[]
  totalComments: number
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchFilter, setBranchFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month'>('month')
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [comments, setComments] = useState<Record<string, ExpenseCommentRow[]>>({})
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (branchFilter) params.set('branch_id', branchFilter)
    params.set('period', periodFilter)
    params.set('date', dateFilter)
    fetch(`/api/expenses?${params}`).then(r => r.json()).then(setExpenses)
  }, [branchFilter, periodFilter, dateFilter])

  async function loadComments(group: ExpenseGroup) {
    if (comments[group.id]) return

    const results = await Promise.all(
      group.items.map(async (item) => {
        const data = await fetch(`/api/comments?expense_id=${item.id}`).then(r => r.json())
        return Array.isArray(data) ? data : []
      })
    )

    const merged = results
      .flat()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    setComments(current => ({ ...current, [group.id]: merged }))
  }

  const groupedExpenses = groupExpenses(expenses)
  const selectedComments = selectedGroup ? comments[selectedGroup.id] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Expenses</h1>
        <p className="text-sm text-zinc-500 mt-1">Branch food and operational expenses</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All branches</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value as 'day' | 'week' | 'month')}
          className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="day">By day</option>
          <option value="week">By week</option>
          <option value="month">By month</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Entry</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {groupedExpenses.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-400 text-sm">No expenses recorded</td></tr>
            )}
            {groupedExpenses.map((group) => (
              <tr key={group.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-zinc-800">{group.employeeName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-zinc-800 font-medium">{group.title}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</div>
                  {group.description && <div className="text-xs text-zinc-500 mt-1">{group.description}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-zinc-900">PKR {group.amount.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-zinc-500">
                  {format(new Date(group.expense_date), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <MessageSquare size={14} />
                    View details
                    <span className="text-zinc-400">({group.totalComments})</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {groupedExpenses.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No expenses recorded
          </div>
        )}
        {groupedExpenses.map((group) => (
          <div key={group.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-800 truncate">{group.employeeName}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{format(new Date(group.expense_date), 'MMM d, yyyy')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-zinc-950 text-sm">PKR {group.amount.toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-100">
                <div className="text-sm font-medium text-zinc-800">{group.title}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</div>
                {group.description && <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{group.description}</div>}
              </div>

              <button
                onClick={() => setSelectedGroup(group)}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <MessageSquare size={13} />
                View details
                <span className="text-zinc-400">({group.totalComments})</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-zinc-900">{selectedGroup.title}</h2>
                <p className="text-sm text-zinc-500">{selectedGroup.employeeName} - {format(new Date(selectedGroup.expense_date), 'MMMM d, yyyy')} - PKR {selectedGroup.amount.toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>

            {selectedGroup.description && (
              <div className="mb-4 rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-600">
                {selectedGroup.description}
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-900">Items in this expense</h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {selectedGroup.items.map((item) => (
                  <div key={item.id} className="px-4 py-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-zinc-900">{item.title}</div>
                      <div className="text-xs text-zinc-400 mt-1">{item.category}</div>
                    </div>
                    <div className="text-sm font-semibold text-zinc-900">PKR {Number(item.amount).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Comments for this expense</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">One shared discussion for the full expense submission.</p>
                </div>
                <button
                  onClick={() => void loadComments(selectedGroup)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <MessageSquare size={13} />
                  {selectedGroup.totalComments > 0 ? `${selectedGroup.totalComments} comment${selectedGroup.totalComments !== 1 ? 's' : ''}` : 'Load comments'}
                </button>
              </div>

              <div className="p-4 space-y-3">
                {selectedComments ? (
                  selectedComments.length === 0 ? (
                    <div className="text-sm text-zinc-400">No comments yet</div>
                  ) : (
                    selectedComments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-medium shrink-0">
                          {comment.author?.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-700">{comment.author?.full_name}</div>
                          <div className="text-sm text-zinc-800 mt-0.5">{comment.comment}</div>
                          <div className="text-xs text-zinc-400 mt-1">{format(new Date(comment.created_at), 'MMM d, hh:mm a')}</div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-sm text-zinc-400">Comments will appear here.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function groupExpenses(expenses: ExpenseRow[]): ExpenseGroup[] {
  const groups = new Map<string, ExpenseGroup>()

  for (const expense of expenses) {
    const key = [
      expense.employee_id,
      expense.branch_id,
      expense.expense_date,
      expense.category,
      expense.description ?? '',
      expense.created_at,
    ].join('|')

    const commentCount = expense.comment_count?.[0]?.count ?? 0

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        primaryExpenseId: expense.id,
        employeeName: expense.employee?.full_name ?? 'Employee',
        title: expense.title,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        description: expense.description,
        items: [expense],
        totalComments: commentCount,
      })
      continue
    }

    const group = groups.get(key)!
    group.items.push(expense)
    group.amount += Number(expense.amount)
    group.totalComments += commentCount
    group.title = `${group.items.length} items`
  }

  return Array.from(groups.values())
}
