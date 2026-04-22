'use client';

import { useState } from 'react';
import { StudyTab } from './study-tab';
import { InfoTab } from './info-tab';

type Tab = 'study' | 'info';

interface Props {
  studentId: string;
}

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: 'study', label: 'Обучение' },
  { id: 'info', label: 'Информация' },
];

export function StudentTabs({ studentId }: Props) {
  const [tab, setTab] = useState<Tab>('study');

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {TAB_CONFIG.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'study' && <StudyTab studentId={studentId} />}
      {tab === 'info' && <InfoTab studentId={studentId} />}
    </div>
  );
}
