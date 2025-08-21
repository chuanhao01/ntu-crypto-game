"use client";

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { BattleScene } from '../game/BattleScene';
import { HomeScene } from '../game/HomeScene';
import { PackScene } from '../game/PackScene';
import { CollectionScene } from '../game/CollectionScene';
import { MarketplaceScene } from '../game/MarketplaceScene';
import { GameManager } from '../game/GameManager';
import { Card } from './DemoComponents';
import { Link } from './Link';

export function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gameManager = GameManager.getInstance();
    const authenticated = gameManager.isAuthenticated();
    
    setIsAuthenticated(authenticated);
    setIsLoading(false);

    if (authenticated && !gameRef.current && containerRef.current) {
      // Clear any existing content in the container
      containerRef.current.innerHTML = '';
      
      // Load game data first, then initialize Phaser game
      gameManager.loadGame().then(() => {
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: 416,
          height: 662,
          parent: containerRef.current!,
          backgroundColor: '#2D3748',
          scene: [HomeScene, BattleScene, PackScene, CollectionScene, MarketplaceScene],
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          },
          render: {
            pixelArt: true,
            antialias: false,
            roundPixels: true
          }
        };

        gameRef.current = new Phaser.Game(config);
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <p className="text-[var(--app-foreground-muted)]">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card title="Login Required">
        <div className="text-center space-y-4">
          <p className="text-[var(--app-foreground-muted)]">
            You need to login to start playing Crypto Battler!
          </p>
          <div className="space-y-2">
            <Link href="/login" variant="primary" size="md">
              Login to Play
            </Link>
            <p className="text-sm text-[var(--app-foreground-muted)]">
              Don't have an account?{" "}
              <Link href="/signup" variant="ghost" size="sm">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return <div ref={containerRef} style={{ width: '326.667px', height: '520px', margin: '0 auto' }} />;
}
