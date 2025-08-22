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

    // Menu buttons
    const buttonStyle = {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 20, y: 15 }
    };

    const buttonSpacing = 70;
    const startY = 280;

    // Battle button (moved to first position)
    const battleButton = this.add.text(208, startY, 'Battle', buttonStyle).setOrigin(0.5);
    battleButton.setInteractive();
    battleButton.on('pointerdown', () => {
      this.scene.start('BattleScene');
    });

    // Open Pack button
    const openPackButton = this.add.text(208, startY + buttonSpacing, 'Open Pack', buttonStyle).setOrigin(0.5);
    openPackButton.setInteractive();
    openPackButton.on('pointerdown', () => {
      this.scene.start('PackScene');
    });

    // Collection button  
    const collectionButton = this.add.text(208, startY + buttonSpacing * 2, 'Collection', buttonStyle).setOrigin(0.5);
    collectionButton.setInteractive();
    collectionButton.on('pointerdown', () => {
      this.scene.start('CollectionScene');
    });

    // Combiner button
    const combinerButton = this.add.text(208, startY + buttonSpacing * 3, 'Combiner', buttonStyle).setOrigin(0.5);
    combinerButton.setInteractive();
    combinerButton.on('pointerdown', () => {
      this.scene.start('CombinerScene');
    });

    // Marketplace button
    const marketplaceButton = this.add.text(208, startY + buttonSpacing * 4, 'Marketplace', buttonStyle).setOrigin(0.5);
    marketplaceButton.setInteractive();
    marketplaceButton.on('pointerdown', () => {
      this.scene.start('MarketplaceScene');
    });
  }

  update() {
    // Update gold display
    if (this.goldText) {
      this.goldText.setText(`Gold: ${GameState.getInstance().getGold()}`);
    }
  }
}
