'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, MessageSquare, X, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PortalExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [myId, setMyId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    title: '', amount: '', category: 'food', description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd')
  })

  async function loadExpenses() {
    const data = await fetch('/api/portal/expenses').then(r => r.json())
    setExpenses(data.expenses ?? [])
    setMyId(data.my_employee_id ?? '')
  }

  useEffect(() => { loadExpenses() }, [])

  async function toggleComments(expenseId: string) {
    if (openComments === expenseId) { setOpenComments(null); return }
    if (!comments[expenseId]) {
      const data = await fetch(`/api/portal/comments?expense_id=${expenseId}`).then(r => r.json())
      setComments(c => ({ ...c, [expenseId]: Array.isArray(data) ? data : [] }))
    }
    setOpenComments(expenseId)
  }

  async function submitComment(expenseId: string) {
    const comment = newComment[expenseId]?.trim()
    if (!comment) return
    const res = await fetch('/api/portal/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expense_id: expenseId, comment }),
    })
    if (res.ok) {
      setNewComment(n => ({ ...n, [expenseId]: '' }))
      const data = await fetch(`/api/portal/comments?expense_id=${expenseId}`).then(r => r.json())
      setComments(c => ({ ...c, [expenseId]: Array.isArray(data) ? data : [] }))
      toast.success('Comment added')
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/portal/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    if (res.ok) {
      toast.success('Expense added')
      setShowModal(false)
      setForm({ title: '', amount: '', category: 'food', description: '', expense_date: format(new Date(), 'yyyy-MM-dd') })
      loadExpenses()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
    setLoading(false)
  }

  const myExpenses = expenses.filter(e => e.is_own)
  const otherExpenses = expenses.filter(e => !e.is_own)

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

      {/* My submissions */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">My submissions</h2>
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {myExpenses.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">No expenses submitted yet</div>
          )}
          {myExpenses.map((exp: any) => (
            <div key={exp.id} className="px-4 lg:px-6 py-4 border-b border-zinc-50 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-800 truncate">{exp.title}</div>
                  {exp.description && <div className="text-xs text-zinc-400 mt-0.5 truncate">{exp.description}</div>}
                  <div className="text-xs text-zinc-400 mt-1">{format(new Date(exp.expense_date), 'MMM d, yyyy')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium text-zinc-900 text-sm">PKR {Number(exp.amount).toLocaleString()}</div>
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

      {/* Branch expenses — can comment */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Branch expenses</h2>
        <div className="space-y-2">
          {otherExpenses.length === 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl px-6 py-8 text-center text-sm text-zinc-400">
              No other expenses in your branch
            </div>
          )}
          {otherExpenses.map((exp: any) => {
            const isOpen = openComments === exp.id
            const expComments = comments[exp.id] ?? []
            return (
              <div key={exp.id} className="bg-white border border-zinc-200 rounded-xl">
                <div className="px-4 lg:px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-800 truncate">{exp.title}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {exp.employee?.full_name} · {format(new Date(exp.expense_date), 'MMM d, yyyy')}
                      </div>
                      {exp.description && <div className="text-sm text-zinc-500 mt-1">{exp.description}</div>}
                    </div>
                    <div className="font-medium text-zinc-900 text-sm shrink-0">PKR {Number(exp.amount).toLocaleString()}</div>
                  </div>
                  <button onClick={() => toggleComments(exp.id)}
                    className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
                    <MessageSquare size={13} />
                    {isOpen ? 'Hide comments' : 'Comments'}
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-100 px-4 lg:px-5 py-4 bg-zinc-50 space-y-3 rounded-b-xl">
                    {expComments.length === 0 && (
                      <div className="text-xs text-zinc-400">No comments yet — be the first</div>
                    )}
                    {expComments.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0">
                          {c.author?.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-700">{c.author?.full_name}</div>
                          <div className="text-sm text-zinc-800">{c.comment}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">{format(new Date(c.created_at), 'MMM d · hh:mm a')}</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input
                        value={newComment[exp.id] ?? ''}
                        onChange={e => setNewComment(n => ({ ...n, [exp.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && submitComment(exp.id)}
                        className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                        placeholder="Write a comment…"
                      />
                      <button onClick={() => submitComment(exp.id)}
                        className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800">
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add expense modal — bottom sheet on mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-zinc-900">Add expense</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g. Team lunch" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Amount (PKR)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="0" required min="1" />
                </div>
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
                  rows={2} placeholder="Optional details…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg">
                  {loading ? 'Adding…' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}