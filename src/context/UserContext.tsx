// src/context/UserContext.tsx
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTransition } from './TransitionContext';

const UserContext = createContext<any>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { navigateTo } = useTransition();

  useEffect(() => {
    if (status === "authenticated" && session) {
      setIsLoading(true);
      fetch('/api/student/profile-info')
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else if (status === "unauthenticated") {
      setUserData(null);
      setIsLoading(false);
    }
  }, [session, status]);

  const logout = async () => {
    navigateTo('/');

    await signOut({ redirect: false });


    setTimeout(() => {
      setUserData(null);
    }, 2000);
  };

  return (
    <UserContext.Provider value={{ userData, setUserData, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);