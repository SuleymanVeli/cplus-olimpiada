'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditTaskPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState('');
  const [lessonHtml, setLessonHtml] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Köhnə datanı gətir
    fetch(`/api/tasks/${params.id}`)
      .then(res => res.json())
      .then(res => {
        const data = res.data;
        setTitle(data.title);
        setLessonHtml(data.lessonHtml);
        setTasks(data.tasks);
        setLoading(false);
      });
  }, [params.id]);

  const handleUpdate = async () => {
    const res = await fetch(`/api/tasks/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, lessonHtml, tasks })
    });
    if (res.ok) {
      alert("Yeniləndi!");
      router.push('/admin/tasks');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      {/* Form strukturu Create səhifəsi ilə eynidir, handleUpdate funksiyasını Save düyməsinə bağla */}
    </div>
  );
}