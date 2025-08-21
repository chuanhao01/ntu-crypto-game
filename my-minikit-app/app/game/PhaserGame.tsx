import * as Phaser from 'phaser';
import { GameState } from './GameState';
import { HomeScene } from './HomeScene';
import { PackScene } from './PackScene';
import { CollectionScene } from './CollectionScene';
import { BattleScene } from './BattleScene';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 416,
  height: 520,
  backgroundColor: '#2c3e50',
  scene: [
    HomeScene,
    PackScene,
    CollectionScene,
    BattleScene
  ]
};

export class Game extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}

window.addEventListener('load', () => {
  const game = new Game(gameConfig);
});