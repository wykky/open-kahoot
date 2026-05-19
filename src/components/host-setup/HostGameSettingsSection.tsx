'use client';

import type { GameSettings } from '@/types/game';
import { accent } from '@/lib/palette';

interface HostGameSettingsSectionProps {
  gameSettings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
}

export default function HostGameSettingsSection({
  gameSettings,
  onUpdateSettings
}: HostGameSettingsSectionProps) {
  return (
    <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-black font-medium mb-2">
            Think Time
          </label>
          <p className="text-gray-600 text-sm mb-2">
            Time to show question before allowing answers
          </p>
          <select
            value={gameSettings.thinkTime}
            onChange={(e) => onUpdateSettings({ ...gameSettings, thinkTime: parseInt(e.target.value) })}
            className={`w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-black focus:outline-none focus:ring-2 ${accent.ringFocus} ${accent.borderFocus} [&>option]:text-black [&>option]:bg-white`}
          >
            <option value={5}>Default (5 seconds)</option>
            <option value={10}>Longer (10 seconds)</option>
            <option value={20}>Longest (20 seconds)</option>
          </select>
        </div>
        <div>
          <label className="block text-black font-medium mb-2">
            Answer Time
          </label>
          <p className="text-gray-600 text-sm mb-2">
            Time allowed to submit answers
          </p>
          <select
            value={gameSettings.answerTime}
            onChange={(e) => onUpdateSettings({ ...gameSettings, answerTime: parseInt(e.target.value) })}
            className={`w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-black focus:outline-none focus:ring-2 ${accent.ringFocus} ${accent.borderFocus} [&>option]:text-black [&>option]:bg-white`}
          >
            <option value={20}>Default (20 seconds)</option>
            <option value={30}>Longer (30 seconds)</option>
            <option value={60}>Longest (60 seconds)</option>
          </select>
        </div>
      </div>

      {/* Show-question-on-players toggle */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gameSettings.showQuestionOnPlayers ?? true}
            onChange={(e) => onUpdateSettings({ ...gameSettings, showQuestionOnPlayers: e.target.checked })}
            className="mt-1 w-5 h-5 rounded border-2 border-black accent-yellow-400 cursor-pointer"
          />
          <span className="flex-1">
            <span className="block text-black font-medium">
              Show questions on player phones
            </span>
            <span className="block text-gray-600 text-sm mt-1">
              When ON, players see the question and answer choices on their own device (solo / remote play). When OFF, players only see colored answer buttons and must look at the host&apos;s main screen (classroom mode).
            </span>
          </span>
        </label>
      </div>

      {/* Shuffle-answers toggle */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gameSettings.shuffleAnswers ?? false}
            onChange={(e) => onUpdateSettings({ ...gameSettings, shuffleAnswers: e.target.checked })}
            className="mt-1 w-5 h-5 rounded border-2 border-black accent-yellow-400 cursor-pointer"
          />
          <span className="flex-1">
            <span className="block text-black font-medium">
              Shuffle answer order per player
            </span>
            <span className="block text-gray-600 text-sm mt-1">
              When ON, each player sees A/B/C/D in their own random order. Stops students sitting next to each other from comparing answers — peeking gives the wrong shape/letter.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
