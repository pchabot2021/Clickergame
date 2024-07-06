import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ftylkznhgbhivgfaynul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eWxrem5oZ2JoaXZnZmF5bnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAyMjQzODgsImV4cCI6MjAzNTgwMDM4OH0.3slILc1F_bDMpg9ndFniRCKdS5EcyDpu2nmXCGOALqI');

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoggedIn(true);
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, so let's create one
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([
          { id: userId, username: email.split('@')[0], coins: 0 }
        ])
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
      } else {
        data = newProfile;
      }
    } else if (error) {
      console.error('Error fetching profile:', error);
    }

    if (data) {
      setProfile(data);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
  
      if (error) throw error;
  
      if (data.user && data.user.id) {
        // Manually confirm the user's email
        const { error: confirmError } = await supabase.rpc('confirm_user', {
          user_id: data.user.id
        });
  
        if (confirmError) throw confirmError;
  
        // Sign in the user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
  
        if (signInError) throw signInError;
  
        setIsLoggedIn(true);
        setUser(data.user);
        alert('Signed up and logged in successfully!');
      } else {
        throw new Error('User creation failed');
      }
    } catch (error) {
      alert('Error signing up: ' + error.message);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setIsLoggedIn(true);
    } catch (error) {
      alert('Error signing in: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Error signing out: ' + error.message);
    } else {
      setIsLoggedIn(false);
      setUser(null);
      setProfile(null);
    }
  };

  const handleAddCoins = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('add_coins', {
        user_id: user.id,
        amount: 10
      });
      if (error) throw error;
      setProfile({ ...profile, coins: data });
      alert('10 coins added successfully!');
    } catch (error) {
      alert('Error adding coins: ' + error.message);
    }
  };

  if (isLoggedIn && profile) {
    return (
      <div>
        <h2>Welcome, {profile.username || user.email}!</h2>
        <p>Coins: {profile.coins}</p>
        <button onClick={handleAddCoins}>Add 10 Coins</button>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSignUp}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Sign Up</button>
      </form>
      <form onSubmit={handleSignIn}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
}

export default App;