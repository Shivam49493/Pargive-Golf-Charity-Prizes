import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charitiesApi } from '../../lib/api'
import { Card, Button, Badge, Input, Spinner, Empty } from '../components/ui'
import toast from 'react-hot-toast'

const CATEGORIES = ['Health', 'Mental Health', 'Homelessness', 'Children', 'Elderly Care', 'Disability', 'Environment', 'Education', 'Other']

function CharityForm({ existing, onSuccess, onCancel }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: existing?.name || '',
    slug: existing?.slug || '',
    description: existing?.description || '',
    long_description: existing?.long_description || '',
    website_url: existing?.website_url || '',
    category: existing?.category || '',
    is_featured: existing?.is_featured || false,
    logo_url: existing?.logo_url || '',
    image_url: existing?.image_url || ''
  })

  const f = (k) => ({
    value: form[k],
    onChange: e => setForm(p => ({ ...p, [k]: e.target.value }))
  })

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const createMutation = useMutation({
    mutationFn: charitiesApi.adminCreate,
    onSuccess: () => { qc.invalidateQueries(['adminCharities']); toast.success('Charity created!'); onSuccess() },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create')
  })

  const updateMutation = useMutation({
    mutationFn: (data) => charitiesApi.adminUpdate(existing.id, data),
    onSuccess: () => { qc.invalidateQueries(['adminCharities']); toast.success('Charity updated!'); onSuccess() },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    existing ? updateMutation.mutate(form) : createMutation.mutate(form)
  }
  const loading = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Charity name" required placeholder="e.g. Macmillan Cancer Support"
          {...f('name')}
          onBlur={e => !existing && setForm(p => ({ ...p, slug: autoSlug(e.target.value) }))}
        />
        <Input label="URL slug" required placeholder="e.g. macmillan-cancer" {...f('slug')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Category</label>
        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400">
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Short description</label>
        <textarea rows={2} placeholder="One sentence summary..." className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none resize-none"
          value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Full description</label>
        <textarea rows={4} placeholder="Detailed description..." className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none resize-none"
          value={form.long_description} onChange={e => setForm(p => ({ ...p, long_description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Logo URL" placeholder="https://..." {...f('logo_url')} />
        <Input label="Banner image URL" placeholder="https://..." {...f('image_url')} />
      </div>
      <Input label="Website URL" type="url" placeholder="https://..." {...f('website_url')} />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))}
          className="w-4 h-4 accent-green-400" />
        <span className="text-sm text-stone-700">Feature this charity on homepage</span>
      </label>
      <div className="flex gap-3">
        <Button type="submit" loading={loading}>{existing ? 'Save changes' : 'Create charity'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function AdminCharities() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: charities, isLoading } = useQuery({
    queryKey: ['adminCharities'],
    queryFn: () => charitiesApi.getAll({})
  })

  const deleteMutation = useMutation({
    mutationFn: charitiesApi.adminDelete,
    onSuccess: () => { qc.invalidateQueries(['adminCharities']); toast.success('Charity removed') },
    onError: () => toast.error('Failed to remove charity')
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">Charities</h1>
          <p className="text-stone-500 text-sm mt-1">Manage listed charities and featured spotlight</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditing(null) }}>+ Add charity</Button>
      </div>

      {showCreate && (
        <Card>
          <h2 className="font-medium text-stone-800 mb-5">New charity</h2>
          <CharityForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !charities?.length ? (
        <Card><Empty icon="♥" title="No charities yet" action={<Button onClick={() => setShowCreate(true)}>Add first charity</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {charities.map(c => (
            <Card key={c.id} padding={false}>
              <div className="p-5">
                {editing?.id === c.id ? (
                  <div>
                    <h3 className="font-medium text-stone-800 mb-4">Edit: {c.name}</h3>
                    <CharityForm existing={c} onSuccess={() => setEditing(null)} onCancel={() => setEditing(null)} />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-2xl flex-shrink-0">
                        {c.logo_url ? <img src={c.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg" /> : '♥'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-stone-800">{c.name}</h3>
                          {c.is_featured && <Badge variant="success">Featured</Badge>}
                          {c.category && <Badge variant="default">{c.category}</Badge>}
                        </div>
                        <p className="text-xs text-stone-500 max-w-md">{c.description}</p>
                        {c.website_url && (
                          <a href={c.website_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline mt-1 inline-block">
                            {c.website_url}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-50"
                        onClick={() => { if (confirm(`Remove ${c.name}?`)) deleteMutation.mutate(c.id) }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
