"use client";

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { BattleScene } from '../game/BattleScene';
import { HomeScene } from '../game/HomeScene';
import { PackScene } from '../game/PackScene';
import { CollectionScene } from '../game/CollectionScene';
import { MarketplaceScene } from '../game/MarketplaceScene';

export function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 416,
      height: 600, // Increased height for team roster
      parent: 'game-container',
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

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="game-container" />;
}
