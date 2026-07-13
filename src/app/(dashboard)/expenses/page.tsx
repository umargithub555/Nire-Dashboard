'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import React from 'react'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState('')
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, any[]>>({})

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (branchFilter) params.set('branch_id', branchFilter)
    fetch(`/api/expenses?${params}`).then(r => r.json()).then(setExpenses)
  }, [branchFilter])

  async function loadComments(expenseId: string) {
    if (comments[expenseId]) {
      setOpenComments(openComments === expenseId ? null : expenseId)
      return
    }
    const data = await fetch(`/api/comments?expense_id=${expenseId}`).then(r => r.json())
    setComments(c => ({ ...c, [expenseId]: data }))
    setOpenComments(expenseId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Expenses</h1>
        <p className="text-sm text-zinc-500 mt-1">Branch food and operational expenses</p>
      </div>

      {/* Filters layout */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All branches</option>
          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Title</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-400 text-sm">No expenses recorded</td></tr>
            )}
            {expenses.map((exp: any) => {
              const commentCount = exp.comment_count?.[0]?.count ?? 0
              const isOpen = openComments === exp.id
              return (
                <React.Fragment key={exp.id}>
                  <tr className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-800">{exp.employee?.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-800 font-medium">{exp.title}</div>
                      {exp.description && <div className="text-xs text-zinc-400 mt-0.5">{exp.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-zinc-900">PKR {Number(exp.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {format(new Date(exp.expense_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => loadComments(exp.id)}
                        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
                        <MessageSquare size={14} />
                        {commentCount > 0 ? (
                          <span className="text-amber-600 font-semibold">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
                        ) : 'No comments'}
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${exp.id}-comments`}>
                      <td colSpan={5} className="px-6 pb-4 bg-zinc-50">
                        <div className="space-y-2 pt-2">
                          {(comments[exp.id] ?? []).length === 0 ? (
                            <div className="text-xs text-zinc-400">No comments yet</div>
                          ) : (
                            (comments[exp.id] ?? []).map((c: any) => (
                              <div key={c.id} className="flex items-start gap-3 p-3 bg-white border border-zinc-200 rounded-lg">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-medium shrink-0">
                                  {c.author?.full_name?.[0] ?? '?'}
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-zinc-700">{c.author?.full_name}</div>
                                  <div className="text-sm text-zinc-800 mt-0.5">{c.comment}</div>
                                  <div className="text-xs text-zinc-400 mt-1">{format(new Date(c.created_at), 'MMM d, hh:mm a')}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list view */}
      <div className="lg:hidden space-y-3">
        {expenses.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center text-sm text-zinc-400">
            No expenses recorded
          </div>
        )}
        {expenses.map((exp: any) => {
          const commentCount = exp.comment_count?.[0]?.count ?? 0
          const isOpen = openComments === exp.id
          return (
            <div key={exp.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-800 truncate">{exp.employee?.full_name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{format(new Date(exp.expense_date), 'MMM d, yyyy')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-zinc-950 text-sm">PKR {Number(exp.amount).toLocaleString()}</div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-100">
                  <div className="text-sm font-medium text-zinc-805">{exp.title}</div>
                  {exp.description && <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{exp.description}</div>}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button onClick={() => loadComments(exp.id)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
                    <MessageSquare size={13} />
                    {commentCount > 0 ? (
                      <span className="text-amber-600 font-semibold">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
                    ) : 'No comments'}
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="bg-zinc-50 border-t border-zinc-100 p-4 space-y-3">
                  {(comments[exp.id] ?? []).length === 0 ? (
                    <div className="text-xs text-zinc-400">No comments yet</div>
                  ) : (
                    (comments[exp.id] ?? []).map((c: any) => (
                      <div key={c.id} className="flex items-start gap-2.5 bg-white border border-zinc-200 rounded-lg p-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {c.author?.full_name?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-700">{c.author?.full_name}</div>
                          <div className="text-sm text-zinc-800 mt-0.5 leading-relaxed">{c.comment}</div>
                          <div className="text-[10px] text-zinc-400 mt-1">{format(new Date(c.created_at), 'MMM d, hh:mm a')}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}