import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charitiesApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Card, Button, Badge, Input, Spinner, Empty } from '../components/ui'
import toast from 'react-hot-toast'

function CharityCard({ charity, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(charity)}
      className={`cursor-pointer rounded-2xl border-2 p-5 transition-all hover:border-green-300
        ${selected ? 'border-green-400 bg-green-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
    >
      <div className="flex items-start gap-3 mb-3">
        {charity.logo_url ? (
          <img src={charity.logo_url} alt={charity.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">♥</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-stone-800 text-sm leading-tight">{charity.name}</h3>
          {charity.category && <Badge variant="default" className="mt-1">{charity.category}</Badge>}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>
      <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{charity.description}</p>
    </div>
  )
}

export default function CharityPage() {
  const { charitySelection, setCharitySelection } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCharity, setSelectedCharity] = useState(null)
  const [pct, setPct] = useState(charitySelection?.contribution_percentage || 10)
  const [step, setStep] = useState('browse') // 'browse' | 'confirm'

  const { data: charities, isLoading } = useQuery({
    queryKey: ['charities', search],
    queryFn: () => charitiesApi.getAll({ search: search || undefined })
  })

  const selectMutation = useMutation({
    mutationFn: (data) => charitiesApi.select(data),
    onSuccess: (selection) => {
      qc.invalidateQueries(['charities'])
      setCharitySelection(selection)
      toast.success(`Now supporting ${selection.charities?.name}!`)
      setStep('browse')
      setSelectedCharity(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update charity')
  })

  const handleSelect = (charity) => {
    setSelectedCharity(charity)
    setStep('confirm')
  }

  const handleConfirm = () => {
    selectMutation.mutate({ charity_id: selectedCharity.id, contribution_percentage: pct })
  }

  const monthlyAmount = ((999 * pct) / 100 / 100).toFixed(2)

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">My Charity</h1>
        <p className="text-stone-500 text-sm mt-1">Choose where your subscription gives back — at least 10% goes to your chosen cause.</p>
      </div>

      {/* Current selection */}
      {charitySelection && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Currently supporting</p>
              <h2 className="font-medium text-stone-800 text-lg">{charitySelection.charities?.name}</h2>
              <p className="text-sm text-stone-500 mt-1">
                {charitySelection.contribution_percentage}% of your plan (£{monthlyAmount}/month)
              </p>
            </div>
            <div className="text-4xl">♥</div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => setStep('browse')}
          >
            Change charity
          </Button>
        </Card>
      )}

      {/* Confirm step */}
      {step === 'confirm' && selectedCharity && (
        <Card className="border-green-200">
          <h2 className="font-medium text-stone-800 mb-1">Confirm your selection</h2>
          <p className="text-sm text-stone-500 mb-5">You're choosing to support:</p>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-2xl">♥</div>
            <div>
              <h3 className="font-medium text-stone-800">{selectedCharity.name}</h3>
              <p className="text-xs text-stone-400">{selectedCharity.category}</p>
            </div>
          </div>

          {/* Contribution slider */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-stone-700">Contribution percentage</label>
              <span className="text-sm font-medium text-green-600">{pct}% (£{((999 * pct) / 100 / 100).toFixed(2)}/mo)</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={pct}
              onChange={e => setPct(parseInt(e.target.value))}
              className="w-full accent-green-400"
            />
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>10% (min)</span>
              <span>50% (max)</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleConfirm} loading={selectMutation.isPending}>
              Confirm — support {selectedCharity.name}
            </Button>
            <Button variant="ghost" onClick={() => setStep('browse')}>Back</Button>
          </div>
        </Card>
      )}

      {/* Charity browser */}
      {step === 'browse' && (
        <div>
          <div className="mb-5">
            <Input
              placeholder="Search charities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : !charities?.length ? (
            <Empty icon="♥" title="No charities found" description="Try a different search term" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {charities.map(c => (
                <CharityCard
                  key={c.id}
                  charity={c}
                  selected={charitySelection?.charities?.id === c.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
