import supabaseAdmin from '../../config/supabase.js'

const PRIZE_SPLITS = {
  five_match: 0.40,
  four_match: 0.35,
  three_match: 0.25
}

/**
 * Generate 5 winning numbers using random or algorithmic mode
 */
export async function generateWinningNumbers(drawType = 'random') {
  if (drawType === 'random') {
    return generateRandom()
  }
  return generateAlgorithmic()
}

function generateRandom() {
  const numbers = new Set()
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1)
  }
  return [...numbers].sort((a, b) => a - b)
}

async function generateAlgorithmic() {
  // Weight by frequency of user scores across all active subscribers
  const { data: scores } = await supabaseAdmin
    .from('golf_scores')
    .select('score')
    .order('score')

  if (!scores?.length) return generateRandom()

  // Build frequency map
  const freq = {}
  for (let i = 1; i <= 45; i++) freq[i] = 0
  scores.forEach(s => { freq[s.score] = (freq[s.score] || 0) + 1 })

  // Weight: most frequent scores get higher probability
  const weighted = []
  for (const [num, count] of Object.entries(freq)) {
    const weight = Math.max(1, count)
    for (let i = 0; i < weight; i++) weighted.push(parseInt(num))
  }

  const selected = new Set()
  const shuffled = weighted.sort(() => Math.random() - 0.5)
  for (const n of shuffled) {
    if (selected.size >= 5) break
    selected.add(n)
  }

  if (selected.size < 5) return generateRandom()
  return [...selected].sort((a, b) => a - b)
}

/**
 * Calculate prize pools based on active subscriber count
 */
export async function calculatePrizePools(drawId) {
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('jackpot_rollover_pence, draw_month')
    .eq('id', drawId)
    .single()

  // Count active subscribers at draw time
  const { count: activeCount } = await supabaseAdmin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  // Calculate base pool: assume £9.99/month effective rate, 80% goes to prize pool (10% charity, 10% ops)
  const perSubPrizePence = Math.floor(999 * 0.80)
  const totalPoolPence = (activeCount || 0) * perSubPrizePence + (draw?.jackpot_rollover_pence || 0)

  return {
    total_pool_pence: totalPoolPence,
    jackpot_pool_pence: Math.floor(totalPoolPence * PRIZE_SPLITS.five_match),
    four_match_pool_pence: Math.floor(totalPoolPence * PRIZE_SPLITS.four_match),
    three_match_pool_pence: Math.floor(totalPoolPence * PRIZE_SPLITS.three_match),
    active_subscribers: activeCount || 0
  }
}

/**
 * Process a draw: snapshot entries, calculate matches, create winners
 */
export async function processDraw(drawId) {
  const { data: draw, error } = await supabaseAdmin
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single()

  if (error || !draw) throw new Error('Draw not found')
  if (!draw.winning_numbers?.length) throw new Error('Winning numbers not set')

  const winningSet = new Set(draw.winning_numbers)

  // Get all active subscribers with at least 1 score
  const { data: subscribers } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  const userIds = subscribers?.map(s => s.user_id) || []

  // Clear previous entries for this draw (if re-processing)
  await supabaseAdmin.from('draw_entries').delete().eq('draw_id', drawId)

  const entries = []
  const fiveMatches = []
  const fourMatches = []
  const threeMatches = []

  for (const userId of userIds) {
    // Get latest 5 scores
    const { data: scores } = await supabaseAdmin
      .from('golf_scores')
      .select('score')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .limit(5)

    if (!scores?.length) continue

    const entryNumbers = scores.map(s => s.score)
    const matchCount = entryNumbers.filter(n => winningSet.has(n)).length

    let matchTier = null
    if (matchCount >= 5) { matchTier = '5_match'; fiveMatches.push(userId) }
    else if (matchCount >= 4) { matchTier = '4_match'; fourMatches.push(userId) }
    else if (matchCount >= 3) { matchTier = '3_match'; threeMatches.push(userId) }

    entries.push({
      draw_id: drawId,
      user_id: userId,
      entry_numbers: entryNumbers,
      matches: matchCount,
      match_tier: matchTier
    })
  }

  // Batch insert entries
  if (entries.length) {
    await supabaseAdmin.from('draw_entries').insert(entries)
  }

  // Calculate prize splits
  const pools = await calculatePrizePools(drawId)

  // If no 5-match winner, jackpot rolls over
  const jackpotRollover = fiveMatches.length === 0 ? pools.jackpot_pool_pence : 0

  // Create winner records
  const winnerRecords = []

  const createWinners = (userList, tier, pool) => {
    if (!userList.length) return
    const share = Math.floor(pool / userList.length)
    userList.forEach(userId => {
      winnerRecords.push({
        draw_id: drawId,
        user_id: userId,
        match_tier: tier,
        prize_amount_pence: share,
        verification_status: 'pending',
        payment_status: 'pending'
      })
    })
  }

  createWinners(fiveMatches, '5_match', pools.jackpot_pool_pence)
  createWinners(fourMatches, '4_match', pools.four_match_pool_pence)
  createWinners(threeMatches, '3_match', pools.three_match_pool_pence)

  if (winnerRecords.length) {
    // Need draw_entry_id for each winner
    const { data: insertedEntries } = await supabaseAdmin
      .from('draw_entries')
      .select('id, user_id, match_tier')
      .eq('draw_id', drawId)
      .not('match_tier', 'is', null)

    const entryMap = {}
    insertedEntries?.forEach(e => { entryMap[e.user_id] = e.id })

    const winnersWithEntries = winnerRecords.map(w => ({
      ...w,
      draw_entry_id: entryMap[w.user_id]
    }))

    await supabaseAdmin.from('winners').delete().eq('draw_id', drawId)
    await supabaseAdmin.from('winners').insert(winnersWithEntries)
  }

  // Update draw with pools and rollover
  await supabaseAdmin.from('draws').update({
    ...pools,
    jackpot_rollover_pence: jackpotRollover
  }).eq('id', drawId)

  return {
    entries_processed: entries.length,
    five_matches: fiveMatches.length,
    four_matches: fourMatches.length,
    three_matches: threeMatches.length,
    pools,
    jackpot_rolls_over: jackpotRollover > 0
  }
}

/**
 * Simulate a draw without persisting winner records
 */
export async function simulateDraw(drawType = 'random') {
  const winningNumbers = await generateWinningNumbers(drawType)
  const winningSet = new Set(winningNumbers)

  const { data: subscribers } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  const userIds = subscribers?.map(s => s.user_id) || []
  let fiveCount = 0, fourCount = 0, threeCount = 0, totalEntries = 0

  for (const userId of userIds) {
    const { data: scores } = await supabaseAdmin
      .from('golf_scores')
      .select('score')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .limit(5)

    if (!scores?.length) continue
    totalEntries++
    const matches = scores.filter(s => winningSet.has(s.score)).length
    if (matches >= 5) fiveCount++
    else if (matches >= 4) fourCount++
    else if (matches >= 3) threeCount++
  }

  const totalPool = userIds.length * Math.floor(999 * 0.80)

  return {
    winning_numbers: winningNumbers,
    draw_type: drawType,
    total_entries: totalEntries,
    five_match_count: fiveCount,
    four_match_count: fourCount,
    three_match_count: threeCount,
    estimated_pools: {
      total: totalPool,
      five_match: Math.floor(totalPool * PRIZE_SPLITS.five_match),
      four_match: Math.floor(totalPool * PRIZE_SPLITS.four_match),
      three_match: Math.floor(totalPool * PRIZE_SPLITS.three_match)
    },
    jackpot_rolls_over: fiveCount === 0
  }
}
