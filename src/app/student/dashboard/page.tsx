'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/src/context/UserContext';
import { useTransition } from '@/src/context/TransitionContext';

// Səviyyə məlumatları (x və y faiz ilə: 0-100%)
const components = [
    { name: 'Başlanğıc', x: 25, y: 40, img: '/badges/baslangic.png', link: '/student/learning', type: 'level', level: 1 },
    { name: 'Orta', x: 51, y: 30, img: '/badges/level2.png', link: '/student/adventure', type: 'level', level: 2 },
    { name: 'Yüksək', x: 78, y: 40, img: '/badges/level3.png', link: '/student/learning', type: 'level', level: 3 },
    { name: 'Robot', x: 51, y: 72, img: '/badges/robot1.png', link: '/student/gamearena', type: 'robot' },
    // { name: 'Robot', x: 32, y: 75, img: '/badges/coin-1.png', link: '/student/learning', type: 'coin' },
    // { name: 'Robot', x: 69, y: 75, img: '/badges/coin-2.png', link: '/student/learning', type: 'coin' },
];

export default function LevelsPage() {

    const { userData } = useUser();

    const { endTransition, navigateTo } = useTransition();

    useEffect(() => {
        if (userData) {
            endTransition();
        }
    }, [userData]);


    return (
        <main className="flex items-center justify-center min-h-screen bg-stone-900 p-4">

            <div className="relative w-full max-w-[90%] aspect-[16/8] ">

                {/* Arxa Fon Kitab */}
                <Image
                    src="/badges/bg-book-long1.png"
                    alt="Xəritə"
                    fill
                    className="object-cover"
                    priority
                />

                {/* Kitab uzerine cox cox azca blur effekti   */}
                <div className="absolute inset-0 bg-black/30 opacity-20 backdrop-blur-sm rounded-lg pointer-events-none" />

                {components.map((component, index) => {
                    // Şərti yoxlayırıq: Əgər tip "level"dirsə və istifadəçinin səviyyəsi komponentin səviyyəsindən kiçikdirsə
                    const isLocked = component.type === 'level' && userData?.level < (component?.level||0);

                    console.log(`Component: ${component.name}, User Level: ${userData?.level}, Required Level: ${component.level}, Is Locked: ${isLocked}`);

                    return (
                        <div
                            key={index}
                            className={`absolute transition-all ease-in-out ${!isLocked ? 'cursor-pointer group' : 'cursor-not-allowed'}`}
                            onClick={() => !isLocked && navigateTo(component?.link)}
                            style={{
                                top: `${component.y}%`,
                                left: `${component.x}%`,
                                width: component.type === 'coin' ? '12%' : '19%',
                                height: component.type === 'coin' ? '25%' : '40%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <div className={`relative w-full h-full transition-transform ease-in-out ${!isLocked ? 'group-hover:scale-110' : ''}`}>
                                <Image
                                    src={component?.img}
                                    alt={component?.name}
                                    fill
                                    className={`object-contain drop-shadow-lg transition-all ${isLocked ? 'brightness-[0.9] grayscale' : ''}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

        </main>
    );
}