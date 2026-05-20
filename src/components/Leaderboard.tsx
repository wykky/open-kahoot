'use client';

import { motion } from 'framer-motion';
import { Trophy, LucideIcon } from 'lucide-react';
import type { Player } from '@/types/game';
import Button from './Button';
import AnimatedIcon from './AnimatedIcon';

interface LeaderboardProps {
  players: Player[];
  title?: string;
  subtitle?: string;
  showPodium?: boolean;
  showIcon?: boolean;
  className?: string;
  /**
   * Compact mode: the component fills its parent (`h-full flex flex-col`),
   * header + buttons stay `shrink-0`, and the rows region is `flex-1 min-h-0
   * overflow-y-auto`. Use this when embedded in a height-bounded shell.
   */
  compact?: boolean;
  buttons?: {
    text: string;
    onClick: () => void;
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    variant?: 'link' | 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline' | 'pill' | 'black';
  }[];
}

export default function Leaderboard({
  players,
  title = "Leaderboard",
  subtitle,
  showIcon = true,
  buttons,
  compact = false
}: LeaderboardProps) {
  if (compact) {
    return (
      <div className="h-full flex flex-col min-h-0">
        {(title || subtitle) && (
          <div className="text-center shrink-0 mb-2 sm:mb-3">
            {showIcon && (
              <AnimatedIcon icon={Trophy} size="md" iconColor="text-black" />
            )}
            <h1 className="text-xl sm:text-2xl text-black font-subtitle leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-gray-600 text-xs sm:text-sm">{subtitle}</p>
            )}
          </div>
        )}

        {buttons && buttons.length > 0 && (
          <div className="text-center shrink-0 mb-2 sm:mb-3">
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  onClick={button.onClick}
                  variant={button.variant || "primary"}
                  size="md"
                  icon={button.icon}
                  iconPosition={button.iconPosition}
                  className="mx-auto sm:mx-0"
                >
                  {button.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable list region — only place that overflows on tiny viewports */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg border-2 border-black bg-white"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-black text-yellow-400 font-bold text-xs sm:text-sm shrink-0">
                  {player.rank ?? index + 1}
                </div>
                <div className="text-black font-semibold text-sm sm:text-base truncate">{player.name}</div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="text-black font-bold text-sm sm:text-base leading-none">{player.score}</div>
                <div className="text-gray-500 text-[10px]">points</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {showIcon && (
            <AnimatedIcon icon={Trophy} size="xl" iconColor="text-black" />
          )}
          <h1 className="text-4xl text-black mb-4 font-subtitle">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 text-xl">{subtitle}</p>
          )}
        </div>
      )}

      {buttons && buttons.length > 0 && (
        <div className="text-center mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {buttons.map((button, index) => (
              <Button
                key={index}
                onClick={button.onClick}
                variant={button.variant || "primary"}
                size="xl"
                icon={button.icon}
                iconPosition={button.iconPosition}
                className="mx-auto sm:mx-0"
              >
                {button.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* `layout` prop animates row reordering between renders — Kahoot-style "climb"
          when scores cross. Spring tween gives a satisfying overshoot at the top. */}
      <div className="space-y-3">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            layout
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="flex items-center justify-between p-4 rounded-xl border-2 border-black bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black text-yellow-400 font-bold text-lg">
                {player.rank ?? index + 1}
              </div>
              <div className="text-black font-semibold text-lg">{player.name}</div>
            </div>
            <div className="text-right">
              <div className="text-black font-bold text-xl">{player.score}</div>
              <div className="text-gray-500 text-xs">points</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}