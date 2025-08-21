import * as Phaser from 'phaser';
import { GameState } from './GameState';

export class HomeScene extends Phaser.Scene {
  private goldText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    // Gold display at top right
    this.goldText = this.add.text(396, 20, `Gold: ${GameState.getInstance().getGold()}`, {
      fontSize: '16px',
      color: '#FFD700'
    }).setOrigin(1, 0);

    // Title
    this.add.text(208, 100, 'MonMon', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Create buttons
    const buttonStyle = {
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 20, y: 10 },
      fontSize: '20px'
    };

    // Battle button
    this.add.text(208, 180, 'Battle', buttonStyle)
      .setInteractive()
      .setOrigin(0.5)
      .on('pointerdown', () => this.scene.start('BattleScene'));

    // Open Packs button
    this.add.text(208, 230, 'Open Packs', buttonStyle)
      .setInteractive()
      .setOrigin(0.5)
      .on('pointerdown', () => this.scene.start('PackScene'));

    // Collection button
    this.add.text(208, 280, 'Collection', buttonStyle)
      .setInteractive()
      .setOrigin(0.5)
      .on('pointerdown', () => this.scene.start('CollectionScene'));

    // Marketplace button
    this.add.text(208, 330, 'Marketplace', buttonStyle)
      .setInteractive()
      .setOrigin(0.5)
      .on('pointerdown', () => this.scene.start('MarketplaceScene'));
  }

  update() {
    // Update gold display
    if (this.goldText) {
      this.goldText.setText(`Gold: ${GameState.getInstance().getGold()}`);
    }
  }
}
