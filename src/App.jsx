//WARNING VERY BIG BUG WITH GOOGLE CHROME CACHE I HAVEN'T BEEN ABLE TO FIX, NEED TO CLEAR COOKIES IF YOU REFRESH PAGE
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
//api key 
const supabase = createClient('https://ftylkznhgbhivgfaynul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eWxrem5oZ2JoaXZnZmF5bnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAyMjQzODgsImV4cCI6MjAzNTgwMDM4OH0.3slILc1F_bDMpg9ndFniRCKdS5EcyDpu2nmXCGOALqI');
//app set functions 
function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [heroes, setHeroes] = useState([]);
//user fetch data
  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session ", session);
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        
        
        await fetchHeroes(session.user.id);
      }
    };

    fetchUserAndData();
//used this to fix issues with fetch data very difficult to debug be careful
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Error Supabase relatd:", event, session);
      if (session?.user) {
        
        setUser(session.user);
        await fetchProfile(session.user.id);
        await fetchHeroes(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setHeroes([]);
      }
    });
//this is optional and can be removed
    return () => {
      subscription.unsubscribe();
    };
  }, []);
//profile fetch 
  const fetchProfile = async (userId) => {
    console.log("Profile user", userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      console.log("Profile data", data);
      setProfile(data);
    }
  };
//hero fetch
  const fetchHeroes = async (userId) => {
    console.log("Fetch heroes:", userId);
    const { data, error } = await supabase
      .from('heroes')
      .select('*')
      .eq('account_id', userId);
    if (error) {
      console.error("Error fetching heroes:", error);
    } else {
      console.log("Heroes data:", data);
      setHeroes(data || []);
    }
  };
//signup
  const handleSignUp = async (e) => {
    e.preventDefault();
    console.log("Signing up with email:", email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("Error signing up:", error);
      alert('Error signing up: ' + error.message);
    } else if (data.user) {
      console.log("Sign up successful:", data.user);
      setUser(data.user);
      await supabase.from('profiles').insert([{ id: data.user.id, username: email.split('@')[0], coins: 0 }]);
    }
  };
//signin
  const handleSignIn = async (e) => {
    e.preventDefault();
    console.log("Signing in with email:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Error signing in:", error);
      alert('Error signing in: ' + error.message);
    } else if (data.user) {
      console.log("Sign in successful:", data.user);
      setUser(data.user);
      await fetchProfile(data.user.id);
      await fetchHeroes(data.user.id);
    }
  };

  const handleSignOut = async () => {
    console.log("Signing you out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Signout error", error);
      alert('Error signing out: ' + error.message);
    } else {
      console.log("Signedd out successfully");
      setUser(null);
      setProfile(null);
      setHeroes([]);
    }
  };
//coins
  const handleAddCoins = async () => {
    if (!user) return;
    console.log("Adding coins for user:", user.id);
    const { data, error } = await supabase.rpc('add_coins', { user_id: user.id, amount: 10 });
    if (error) {
      console.error("Error adding coins:", error);
      alert('Error adding coins: ' + error.message);
    } else {
      console.log("Coins added successfully:", data);
      setProfile(prevProfile => ({ ...prevProfile, coins: data }));
    }
  };
//summon 0.9 chance for hero A and 0.1 for hero B
  const handleSummon = async () => {
    if (!user) return;
    console.log("Summoning hero for user:", user.id);
    const heroType = Math.random() < 0.9 ? 'Hero A' : 'Hero B';
    const coinsPerSecond = heroType === 'Hero A' ? 1 : 2;
    const { data, error } = await supabase
      .from('heroes')
      .insert([{ account_id: user.id, hero_name: heroType, coins_per_second: coinsPerSecond }])
      .select()
      .single();
    if (error) {
      console.error("Error summoning hero:", error);
      alert('Error summoning hero: ' + error.message);
    } else {
      console.log("Hero summoned successfully:", data);
      setHeroes(prevHeroes => [...prevHeroes, data]);
    }
  };
//these are actually error message handlers, but they are not going to show up because the issue is with cookies and chrome I believe for right now.
  const toggleHero = async (heroId, isActive) => {
    console.log("Toggling hero:", heroId, isActive);
    const { data, error } = await supabase
      .from('heroes')
      .update({ is_active: isActive })
      .eq('id', heroId)
      .select()
      .single();
    if (error) {
      console.error("Error toggling hero:", error);
      alert('Error toggling hero: ' + error.message);
    } else {
      console.log("Hero toggled successfully:", data);
      setHeroes(prevHeroes => prevHeroes.map(hero => hero.id === heroId ? data : hero));
    }
  };
//CAREFUL DO NOT MESS UP THE CHROME SECURITY CHECK HERE 
  useEffect(() => {
    let intervalId;
    if (user && profile) {
      intervalId = setInterval(() => {
        const activeHeroes = heroes.filter(hero => hero.is_active);
        const totalCoinsPerSecond = activeHeroes.reduce((sum, hero) => sum + hero.coins_per_second, 0);
        if (totalCoinsPerSecond > 0) {
          supabase.rpc('add_coins', { user_id: user.id, amount: totalCoinsPerSecond })
            .then(({ data, error }) => {
              if (!error) {
                setProfile(prevProfile => ({ ...prevProfile, coins: data }));
              } else {
                console.error("Error adding coins in interval:", error);
              }
            });
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [user, profile, heroes]);

  if (!user) {
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
//hero per second and button handle
  return (
    <div>
      <h2>Welcome, {profile?.username || user.email}!</h2>
      <p>Coins: {profile?.coins}</p>
      <button onClick={handleAddCoins}>Add 10 Coins</button>
      <button onClick={handleSummon}>Summon Hero</button>
      <button onClick={handleSignOut}>Sign Out</button>
      <h3>Heroes:</h3>
      <ul>
        {heroes.map(hero => (
          <li key={hero.id}>
            {hero.hero_name} - {hero.coins_per_second} coins/s
            <button onClick={() => toggleHero(hero.id, !hero.is_active)}>
              {hero.is_active ? 'Turn Off' : 'Turn On'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;