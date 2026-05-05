import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [charitySelection, setCharitySelection] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadUserData(accessToken) {
    if (!accessToken) {
      setUser(null)
      setSubscription(null)
      setCharitySelection(null)
      setLoading(false)
      return
    }
    try {
      const { user: profile, subscription: sub, charity_selection } = await authApi.getMe(accessToken)
      setUser(profile)
      setSubscription(sub)
      setCharitySelection(charity_selection)
    } catch (err) {
      setUser(null)
      setSubscription(null)
      setCharitySelection(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only trigger on SIGNED_IN and SIGNED_OUT — ignore INITIAL_SESSION with null session
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        loadUserData(session?.access_token || null)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSubscription(null)
        setCharitySelection(null)
        setLoading(false)
      }
    })

    return () => authSub.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) throw error

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'subscriber'
      }, { onConflict: 'id', ignoreDuplicates: true })
    }

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await loadUserData(session?.access_token || null)
  }

  const isAdmin = user?.role === 'admin'
  const isSubscribed = subscription?.status === 'active'

  return (
    <AuthContext.Provider value={{
      user, subscription, charitySelection,
      loading, isAdmin, isSubscribed,
      signUp, signIn, signOut, refreshUser,
      setCharitySelection
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}