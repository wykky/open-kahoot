'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Lock, Dice6 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/socket-client';
import type { Game } from '@/types/game';
import { gameConfig, featureConfig } from '@/lib/config';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';

const PLAYER_ID_KEY = (pin: string) => `player_id_${pin}`;
const PLAYER_TOKEN_KEY = (pin: string) => `player_token_${pin}`;

export default function JoinGameFormScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const dbUserId = ((session?.user as { dbUserId?: string } | undefined)?.dbUserId) ?? null;
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [pinLocked, setPinLocked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const pinLength = gameConfig.pinLength;

  useEffect(() => {
    const pinFromUrl = searchParams?.get('pin');
    if (pinFromUrl) {
      setPin(pinFromUrl);
      setPinLocked(true);
    }
  }, [searchParams]);

  const joinGame = async () => {
    if (!pin || !playerName) return;
    setIsJoining(true);
    setError('');

    const socket = getSocket();

    // Phase 2: existing persistentId is only useful if we ALSO have its playerToken.
    // Otherwise treat as a fresh join (server will reject reconnect without a valid token).
    let persistentId: string | null = null;
    let playerToken: string | null = null;
    try {
      persistentId = localStorage.getItem(PLAYER_ID_KEY(pin));
      playerToken = localStorage.getItem(PLAYER_TOKEN_KEY(pin));
      if (persistentId && !playerToken) persistentId = null;
    } catch {
      persistentId = null;
      playerToken = null;
    }

    socket.emit(
      'joinGame',
      pin,
      playerName,
      persistentId,
      playerToken,
      dbUserId,
      (success: boolean, game?: Game, playerId?: string, newPlayerToken?: string) => {
        setIsJoining(false);
        if (success && game && playerId) {
          try {
            localStorage.setItem(PLAYER_ID_KEY(game.pin), playerId);
            if (newPlayerToken) localStorage.setItem(PLAYER_TOKEN_KEY(game.pin), newPlayerToken);
          } catch {}
          // If the server didn't issue a new token (reconnect path), keep the old one.
          if (!newPlayerToken && !playerToken) {
            console.warn('[join] No playerToken returned — answers will be rejected.');
          }
          router.push(`/game/${game.id}?player=true`);
        } else {
          // Reconnect attempt failed → clear stale credentials and ask the user to retry
          if (persistentId) {
            try {
              localStorage.removeItem(PLAYER_ID_KEY(pin));
              localStorage.removeItem(PLAYER_TOKEN_KEY(pin));
            } catch {}
            setError(t('join.error.gameNotFound'));
          } else {
            setError(t('join.error.gameNotFound'));
          }
        }
      }
    );
  };

  const generateRandomNickname = () => {
    const prefixes = [
      'Swift','Mighty','Shadow','Fire','Ice','Storm','Wild','Dark','Bright','Silent',
      'Golden','Silver','Red','Blue','Green','Purple','Cosmic','Lightning','Thunder','Frost',
      'Wolf','Eagle','Tiger','Dragon','Lion','Bear','Fox','Hawk','Shark','Raven',
      'Steel','Crystal','Phantom','Mystic','Savage','Noble','Royal','Ancient','Blazing','Frozen',
    ];
    const suffixes = [
      'Hunter','Warrior','Mage','Knight','Ninja','Master','Legend','Hero','Champion','Guardian',
      'Blade','Arrow','Shield','Staff','Sword','Bow','Hammer','Axe','Spear','Dagger',
      'Slayer','Breaker','Rider','Walker','Runner','Jumper','Striker','Fighter','Crusher','Bender',
      'Wing','Claw','Fang','Eye','Heart','Soul','Spirit','Force','Power','Storm',
    ];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    setPlayerName(`${randomPrefix}${randomSuffix}`);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinGame();
  };

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label={t('join.gamePin')}
          type="tel"
          inputMode="numeric"
          value={pin}
          onChange={
            pinLocked
              ? undefined
              : (e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, pinLength));
                  setError('');
                }
          }
          readOnly={pinLocked}
          variant="center"
          placeholder={'0'.repeat(pinLength)}
          maxLength={pinLength}
          className={pinLocked ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : ''}
          icon={pinLocked ? Lock : undefined}
        />

        <Input
          label={t('join.yourName')}
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value.slice(0, 20));
            setError('');
          }}
          placeholder={t('join.namePlaceholder')}
          maxLength={20}
          actionButton={
            featureConfig.showRandomNickname
              ? { icon: Dice6, onClick: generateRandomNickname, title: t('join.generateNickname') }
              : undefined
          }
        />

        {error && (
          <div className="bg-red-500 border border-none rounded-lg p-3">
            <p className="text-white text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!pin || !playerName || isJoining || pin.length !== pinLength}
          variant="primary"
          size="lg"
          fullWidth
          loading={isJoining}
          icon={LogIn}
        >
          {t('join.joinGame')}
        </Button>
      </form>
    </Card>
  );
}
