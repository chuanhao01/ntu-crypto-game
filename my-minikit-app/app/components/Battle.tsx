import { useState } from 'react';
import { Card } from './DemoComponents';
import { Sprite } from './Sprite';

interface Character {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  sprite: string;
  moves: Move[];
}

interface Move {
  name: string;
  damage: number;
  animation: 'slash' | 'magic' | 'punch';
}

export function Battle() {
  const [player, setPlayer] = useState<Character>({
    name: "Hero",
    hp: 100,
    maxHp: 100,
    attack: 15,
    defense: 10,
    sprite: "/sprites/placeholder-hero.svg",
    moves: [
      { name: "Slash", damage: 15, animation: "slash" },
      { name: "Magic", damage: 20, animation: "magic" },
      { name: "Punch", damage: 10, animation: "punch" }
    ]
  });

  const [enemy, setEnemy] = useState<Character>({
    name: "Monster",
    hp: 80,
    maxHp: 80,
    attack: 12,
    defense: 8,
    sprite: "/sprites/placeholder-monster.svg",
    moves: [
      { name: "Slash", damage: 12, animation: "slash" },
      { name: "Punch", damage: 8, animation: "punch" }
    ]
  });

  const [animation, setAnimation] = useState({ 
    isPlaying: false, 
    type: 'idle' as 'idle' | 'attack' | 'hit',
    target: 'none' as 'player' | 'enemy' | 'none'
  });

  const executeMove = async (move: Move) => {
    setAnimation({ isPlaying: true, type: 'attack', target: 'enemy' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const damage = Math.max(move.damage - enemy.defense, 1);
    setEnemy(prev => ({
      ...prev,
      hp: Math.max(prev.hp - damage, 0)
    }));

    setAnimation({ isPlaying: true, type: 'hit', target: 'enemy' });
    await new Promise(resolve => setTimeout(resolve, 500));

    if (enemy.hp > damage) {
      setAnimation({ isPlaying: true, type: 'attack', target: 'player' });
      await new Promise(resolve => setTimeout(resolve, 500));

      const enemyMove = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
      const enemyDamage = Math.max(enemyMove.damage - player.defense, 1);
      setPlayer(prev => ({
        ...prev,
        hp: Math.max(prev.hp - enemyDamage, 0)
      }));

      setAnimation({ isPlaying: true, type: 'hit', target: 'player' });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setAnimation({ isPlaying: false, type: 'idle', target: 'none' });
  };

  return (
    <Card title="Battle Arena">
      <div className="relative h-[350px]">
        {/* Enemy Section - Top Right */}
        <div className="absolute top-2 right-2 w-24">
          <div className="scale-50">
            <Sprite
              src={enemy.sprite}
              isAnimating={animation.isPlaying && animation.target === 'enemy'}
              animation={animation.type}
              flip
            />
          </div>
          <div className="h-1 bg-gray-200 rounded mt-1">
            <div 
              className="h-full bg-red-500 rounded" 
              style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
            />
          </div>
          <p className="text-xs">HP: {enemy.hp}/{enemy.maxHp}</p>
        </div>

        {/* Player Section - Bottom Left */}
        <div className="absolute bottom-24 left-2 w-32">
          <div className="scale-75">
            <Sprite
              src={player.sprite}
              isAnimating={animation.isPlaying && animation.target === 'player'}
              animation={animation.type}
            />
          </div>
          <div className="h-1 bg-gray-200 rounded mt-1">
            <div 
              className="h-full bg-green-500 rounded" 
              style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
            />
          </div>
          <p className="text-sm">HP: {player.hp}/{player.maxHp}</p>
        </div>

        {/* Moves Section - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gray-100 rounded-b">
          <div className="grid grid-cols-3 gap-1">
            {player.moves.map((move) => (
              <button
                key={move.name}
                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-xs"
                onClick={() => executeMove(move)}
                disabled={player.hp <= 0 || enemy.hp <= 0 || animation.isPlaying}
              >
                {move.name}
              </button>
            ))}
          </div>
        </div>

        {(player.hp <= 0 || enemy.hp <= 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center font-bold text-white text-2xl">
              {player.hp <= 0 ? "Game Over!" : "Victory!"}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
