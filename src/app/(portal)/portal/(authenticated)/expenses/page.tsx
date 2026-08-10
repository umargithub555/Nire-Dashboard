'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, MessageSquare, X, Lock, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Employee, Expense, ExpenseComment } from '@/types'

type ExpenseItemForm = {
  title: string
  amount: string
}

type PortalExpense = Expense & {
  is_own: boolean
  employee?: Pick<Employee, 'full_name'>
}

type PortalComment = ExpenseComment & {
  author?: Pick<Employee, 'full_name'>
}

type ExpenseGroup = {
  id: string
  primaryExpenseId: string
  title: string
  amount: number
  expense_date: string
  description: string | null
  employeeName: string
  items: PortalExpense[]
}

export default function PortalExpensesPage() {
  const [expenses, setExpenses] = useState<PortalExpense[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Record<string, PortalComment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null)
  const [form, setForm] = useState({
    category: 'food',
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd')
  })
  const [items, setItems] = useState<ExpenseItemForm[]>([{ title: '', amount: '' }])

  async function loadExpenses() {
    const data = await fetch('/api/portal/expenses').then(r => r.json())
    setExpenses(data.expenses ?? [])
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadExpenses()
    })
  }, [])

  async function loadComments(group: ExpenseGroup) {
    if (comments[group.id]) return

    const results = await Promise.all(
      group.items.map(async (item) => {
        const data = await fetch(`/api/portal/comments?expense_id=${item.id}`).then(r => r.json())
        return Array.isArray(data) ? data : []
      })
    )

    const merged = results
      .flat()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    setComments(current => ({ ...current, [group.id]: merged }))
  }

  async function submitComment(group: ExpenseGroup) {
    const comment = newComment[group.id]?.trim()
    if (!comment) return
    const res = await fetch('/api/portal/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expense_id: group.primaryExpenseId, comment }),
    })
    if (res.ok) {
      setNewComment(current => ({ ...current, [group.id]: '' }))
      setComments(current => {
        const next = { ...current }
        delete next[group.id]
        return next
      })
      await loadComments(group)
      toast.success('Comment added')
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payloadItems = items
      .map((item) => ({ title: item.title.trim(), amount: Number(item.amount) }))
      .filter((item) => item.title && Number.isFinite(item.amount) && item.amount > 0)

    const res = await fetch('/api/portal/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, items: payloadItems }),
    })
    if (res.ok) {
      toast.success(payloadItems.length > 1 ? 'Expenses added' : 'Expense added')
      setShowModal(false)
      setForm({ category: 'food', description: '', expense_date: format(new Date(), 'yyyy-MM-dd') })
      setItems([{ title: '', amount: '' }])
      void loadExpenses()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
    setLoading(false)
  }

  const myExpenses = groupExpenses(expenses.filter(expense => expense.is_own))
  const otherExpenses = groupExpenses(expenses.filter(expense => !expense.is_own))
  const selectedComments = selectedGroup ? comments[selectedGroup.id] : null

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">Expenses</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Branch expenses and your submissions</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-lg transition-colors active:scale-95">
          <Plus size={16} />
          <span className="hidden sm:inline">Add expense</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">My submissions</h2>
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {myExpenses.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">No expenses submitted yet</div>
          )}
          {myExpenses.map((group) => (
            <div key={group.id} className="px-4 lg:px-6 py-4 border-b border-zinc-50 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-800 truncate">{group.title}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</div>
                  {group.description && <div className="text-xs text-zinc-400 mt-1 truncate">{group.description}</div>}
                  <div className="text-xs text-zinc-400 mt-1">{format(new Date(group.expense_date), 'MMM d, yyyy')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium text-zinc-900 text-sm">PKR {group.amount.toLocaleString()}</div>
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="text-blue-600 text-xs font-medium hover:underline mt-1 block"
                  >
                    View details
                  </button>
                  <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1 justify-end">
                    <Lock size={11} />
                    <span className="hidden sm:inline">Comments hidden from you</span>
                    <span className="sm:hidden">Hidden</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Branch expenses</h2>
        <div className="space-y-2">
          {otherExpenses.length === 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl px-6 py-8 text-center text-sm text-zinc-400">
              No other expenses in your branch
            </div>
          )}
          {otherExpenses.map((group) => (
            <div key={group.id} className="bg-white border border-zinc-200 rounded-xl">
              <div className="px-4 lg:px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-800 truncate">{group.title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {group.employeeName} - {format(new Date(group.expense_date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</div>
                    {group.description && <div className="text-sm text-zinc-500 mt-1">{group.description}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium text-zinc-900 text-sm">PKR {group.amount.toLocaleString()}</div>
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="text-blue-600 text-xs font-medium hover:underline mt-1"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

            {!selectedGroup.items[0]?.is_own && (
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
                    Load comments
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {selectedComments ? (
                    selectedComments.length === 0 ? (
                      <div className="text-sm text-zinc-400">No comments yet - be the first</div>
                    ) : (
                      selectedComments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0">
                            {comment.author?.full_name?.[0] ?? '?'}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-zinc-700">{comment.author?.full_name}</div>
                            <div className="text-sm text-zinc-800">{comment.comment}</div>
                            <div className="text-xs text-zinc-400 mt-0.5">{format(new Date(comment.created_at), 'MMM d, hh:mm a')}</div>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="text-sm text-zinc-400">Comments will appear here.</div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      value={newComment[selectedGroup.id] ?? ''}
                      onChange={e => setNewComment(current => ({ ...current, [selectedGroup.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && void submitComment(selectedGroup)}
                      className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                      placeholder="Write a comment for this expense..."
                    />
                    <button onClick={() => void submitComment(selectedGroup)}
                      className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-zinc-900">Add expense</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700">Items</label>
                  <button
                    type="button"
                    onClick={() => setItems(current => [...current, { title: '', amount: '' }])}
                    className="text-xs font-medium text-zinc-900 hover:text-zinc-700"
                  >
                    Add another item
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_130px_auto] gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Item name</label>
                      <input
                        value={item.title}
                        onChange={e => setItems(current => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry))}
                        className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="e.g. Team lunch"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Price</label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={e => setItems(current => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, amount: e.target.value } : entry))}
                        className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setItems(current => current.length === 1 ? current : current.filter((_, entryIndex) => entryIndex !== index))}
                      disabled={items.length === 1}
                      className="h-[42px] w-10 rounded-lg border border-zinc-200 text-zinc-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:hover:text-zinc-500"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} className="mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900">
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="supplies">Supplies</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
                    Total: PKR {items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Date</label>
                <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                  rows={2} placeholder="Optional details for all items..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg">
                  {loading ? 'Adding...' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function groupExpenses(expenses: PortalExpense[]): ExpenseGroup[] {
  const groups = new Map<string, ExpenseGroup>()

  for (const expense of expenses) {
    const key = [
      expense.employee_id,
      expense.branch_id,
      expense.expense_date,
      expense.category,
      expense.description ?? '',
      expense.created_at,
      expense.is_own ? 'own' : 'branch',
    ].join('|')

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        primaryExpenseId: expense.id,
        title: expense.title,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        description: expense.description,
        employeeName: expense.employee?.full_name ?? 'Employee',
        items: [expense],
      })
      continue
    }

    const group = groups.get(key)!
    group.items.push(expense)
    group.amount += Number(expense.amount)
    group.title = `${group.items.length} items`
  }

  return Array.from(groups.values())
}
