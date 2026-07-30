'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import ContestStickyCard from './ContestStickyCard';

interface ContestListProps {
  level: any;
  navigateTo: any;
  playSFX: any;
}

export default function ContestList({ level, navigateTo, playSFX }: ContestListProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeContests, setActiveContests] = useState<any[]>([]);
  const [isSubsLoading, setIsSubsLoading] = useState(true);

  const userLevel = level || 1;

  // Çəkiləcək aktiv və ya yarıda qalmış sınaqları filterləyirik
  const displayingContests = useMemo(() => {
    const now = Date.now();
    const uniqueContestsMap = new Map<string, any>();

    // 1. Bitməmiş submissions
    if (Array.isArray(submissions)) {
      submissions.forEach((sub: any) => {
        if (!sub.contestId) return;
        const end = new Date(sub.contestId.endTime).getTime();
        if (end > now && sub.status !== 'completed') {
          uniqueContestsMap.set(sub.contestId._id, sub.contestId);
        }
      });
    }

    // 2. Canlı/Gözlənilən sınaqlar
    if (Array.isArray(activeContests)) {
      activeContests.forEach((contest: any) => {
        const end = new Date(contest.endTime).getTime();
        if (now < end) {
          uniqueContestsMap.set(contest._id, contest);
        }
      });
    }

    return Array.from(uniqueContestsMap.values());
  }, [submissions, activeContests]);

  useEffect(() => {
    const fetchSubmissionsAndContests = async () => {
      setIsSubsLoading(true);
      try {
        // level və order URL parametr olaraq API-ya göndərilir
        const res = await fetch(`/api/student/submissions?level=${userLevel}`);
        if (res.ok) {
          const result = await res.json();
          setSubmissions(result.submissions || []);
          setActiveContests(result.activeContests || []);
        }
      } catch (err) {
        console.error("Sınaqlar yüklənərkən xəta baş verdi:", err);
      } finally {
        setIsSubsLoading(false);
      }
    };

    fetchSubmissionsAndContests();
  }, [level]);

  if (isSubsLoading) {
    return (
      <div className="fixed top-6 right-6 z-50 pointer-events-auto animate-in fade-in duration-300">
        <div className="bg-slate-800 text-slate-400 px-4 py-3.5 rounded-2xl shadow-lg flex items-center gap-2 font-mono font-black text-xs uppercase border-b-4 border-b-slate-900 animate-pulse">
          <Loader2 size={14} className="animate-spin" />
          <span>Sınaqlar Yüklənir...</span>
        </div>
      </div>
    );
  }

  if (!displayingContests.length) return null;

  return (
    <div className="fixed top-6 right-6 z-50 pointer-events-auto flex flex-col gap-4 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
      {displayingContests.map((contest: any) => {
            
        return (
          <ContestStickyCard
            key={contest._id}
            showInfoCard={true}
            activeContest={contest}
            submissions={submissions}
            navigateTo={navigateTo}
            playSFX= {playSFX}
          />
        );
      })}
    </div>
  );
}