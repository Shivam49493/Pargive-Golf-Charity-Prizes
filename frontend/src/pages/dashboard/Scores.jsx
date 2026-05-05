import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scoresApi } from '../../lib/api'
import { Card, Button, Input, Badge, Spinner, Empty, formatDate } from '../components/ui'
import toast from 'react-hot-toast'

function ScoreForm({ onSuccess, existing }) {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    score: existing?.score || '',
    score_date: existing?.score_date || today,
    notes: existing?.notes || ''
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    const s = parseInt(form.score)
    if (!form.score) e.score = 'Score required'
    else if (isNaN(s) || s < 1 || s > 45) e.score = 'Score must be between 1 and 45'
    if (!form.score_date) e.score_date = 'Date required'
    return e
  }

  const addMutation = useMutation({
    mutationFn: (data) => scoresApi.add(data),
    onSuccess: (res) => {
      qc.setQueryData(['myScores'], res.scores)
      toast.success('Score added!')
      onSuccess?.()
      setForm({ score: '', score_date: today, notes: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add score')
  })

  const editMutation = useMutation({
    mutationFn: (data) => scoresApi.update(existing.id, data),
    onSuccess: () => {
      qc.invalidateQueries(['myScores'])
      toast.success('Score updated!')
      onSuccess?.()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update score')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const payload = { score: parseInt(form.score), score_date: form.score_date, notes: form.notes || undefined }
    existing ? editMutation.mutate(payload) : addMutation.mutate(payload)
  }

  const loading = addMutation.isPending || editMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Stableford score"
          type="number"
          min={1}
          max={45}
          placeholder="e.g. 36"
          value={form.score}
          onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
          error={errors.score}
        />
        <Input
          label="Date played"
          type="date"
          max={today}
          value={form.score_date}
          onChange={e => setForm(p => ({ ...p, score_date: e.target.value }))}
          error={errors.score_date}
        />
      </div>
      <Input
        label="Notes (optional)"
        placeholder="Course name, conditions..."
        value={form.notes}
        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
      />
      <Button type="submit" loading={loading} className="w-full">
        {existing ? 'Update score' : 'Add score'}
      </Button>
    </form>
  )
}

export default function ScoresPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: scores, isLoading } = useQuery({
    queryKey: ['myScores'],
    queryFn: scoresApi.getAll
  })

  const deleteMutation = useMutation({
    mutationFn: scoresApi.delete,
    onSuccess: () => {
      qc.invalidateQueries(['myScores'])
      toast.success('Score deleted')
    },
    onError: () => toast.error('Failed to delete score')
  })

  const slotsUsed = scores?.length || 0
  const slotsLeft = 5 - slotsUsed

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">My Scores</h1>
        <p className="text-stone-500 text-sm mt-1">Enter your last 5 Stableford scores. Your newest score replaces the oldest when full.</p>
      </div>

      {/* Slot visualiser */}
      <div className="flex items-center gap-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < slotsUsed ? 'bg-green-400' : 'bg-stone-200'}`}
          />
        ))}
        <span className="text-xs text-stone-500 ml-1 whitespace-nowrap">{slotsUsed}/5 slots</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Score list */}
        <div className="lg:col-span-3 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : !scores?.length ? (
            <Card>
              <Empty
                icon="⛳"
                title="No scores yet"
                description="Add your first Stableford score to start entering draws."
                action={<Button onClick={() => setShowAdd(true)}>Add first score</Button>}
              />
            </Card>
          ) : (
            scores.map((score, i) => (
              <Card key={score.id} padding={false}>
                <div className="flex items-center gap-4 p-4">
                  {/* Rank indicator */}
                  <div className="w-8 text-center text-xs text-stone-400 font-medium">{i + 1}</div>

                  {/* Score bubble */}
                  <div className="w-14 h-14 rounded-2xl bg-green-50 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="font-serif text-2xl text-green-700 leading-none">{score.score}</span>
                    <span className="text-xs text-green-500">pts</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">{formatDate(score.score_date)}</p>
                    {score.notes && <p className="text-xs text-stone-400 truncate mt-0.5">{score.notes}</p>}
                    {i === 0 && <Badge variant="success" className="mt-1">Most recent</Badge>}
                    {i === slotsUsed - 1 && slotsUsed === 5 && (
                      <Badge variant="warning" className="mt-1">Will be replaced next</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditing(score); setShowAdd(false) }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this score?')) deleteMutation.mutate(score.id)
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {editing?.id === score.id && (
                  <div className="border-t border-stone-100 p-4 bg-stone-50 rounded-b-2xl">
                    <h3 className="text-sm font-medium text-stone-700 mb-3">Edit score</h3>
                    <ScoreForm existing={editing} onSuccess={() => setEditing(null)} />
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Add score panel */}
        <div className="lg:col-span-2">
          <Card className="sticky top-8">
            <h2 className="font-medium text-stone-800 mb-1">
              {slotsUsed < 5 ? 'Add a score' : 'Replace oldest score'}
            </h2>
            <p className="text-xs text-stone-400 mb-5">
              {slotsLeft > 0
                ? `You can add ${slotsLeft} more score${slotsLeft > 1 ? 's' : ''}.`
                : 'You have 5 scores. Adding a new one replaces the oldest.'}
            </p>
            <ScoreForm onSuccess={() => setShowAdd(false)} />

            <div className="mt-6 pt-6 border-t border-stone-100">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Score rules</h3>
              <ul className="space-y-1.5">
                {[
                  'Stableford format only (1–45 points)',
                  'One score per date maximum',
                  'Rolling window of 5 scores',
                  'Newest replaces oldest when full',
                  'Scores used as draw entry numbers'
                ].map(r => (
                  <li key={r} className="flex items-start gap-2 text-xs text-stone-500">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
