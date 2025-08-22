import * as Phaser from 'phaser';
import { GameState } from './GameState';

export class HomeScene extends Phaser.Scene {
  private goldText?: Phaser.GameObjects.Text;
  private titleText?: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    // Create animated background
    this.createBackground();

    // Gold display with stylish frame
    this.createGoldDisplay();

    // Main title with glow effect
    this.createTitle();

    // Navigation buttons with hover effects
    this.createNavigationButtons();

    // Add floating particles for ambiance
    this.createParticleEffects();
  }

  private createBackground() {
    // Gradient background - use simple fill instead of gradient
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 0, 416, 662);

    // Add some decorative elements
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 416;
      const y = Math.random() * 300;
      const size = Math.random() * 2 + 0.5;
      stars.fillCircle(x, y, size);
    }

    // Animated twinkling effect
    this.tweens.add({
      targets: stars,
      alpha: 0.3,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createGoldDisplay() {
    // Gold frame background
    const goldFrame = this.add.graphics();
    goldFrame.fillStyle(0x000000, 0.7);
    goldFrame.fillRoundedRect(250, 15, 160, 30, 15);
    goldFrame.lineStyle(2, 0xFFD700, 1);
    goldFrame.strokeRoundedRect(250, 15, 160, 30, 15);

    // Gold icon
    const goldIcon = this.add.text(260, 30, '💰', {
      fontSize: '16px'
    }).setOrigin(0, 0.5);

    // Gold text
    this.goldText = this.add.text(285, 30, `${GameState.getInstance().getGold()}`, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5);
  }

  private createTitle() {
    // Main title with shadow
    const titleShadow = this.add.text(210, 102, 'MonMons', {
      fontSize: '28px',
      color: '#000000',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.3);

    this.titleText = this.add.text(208, 100, 'MonMons', {
      fontSize: '28px',
      color: '#FFD700',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(208, 130, 'Collect • Combine • Conquer', {
      fontSize: '12px',
      color: '#CCCCCC',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Pulsing glow effect on title
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createNavigationButtons() {
    const buttonConfigs = [
      { text: '⚔️ BATTLE', scene: 'BattleScene', y: 200, color: 0xFF4444, desc: 'Fight epic battles' },
      { text: '🎁 OPEN PACKS', scene: 'PackScene', y: 260, color: 0x44FF44, desc: 'Discover new characters' },
      { text: '📚 COLLECTION', scene: 'CollectionScene', y: 320, color: 0x4444FF, desc: 'Manage your team' },
      { text: '🔬 FUSION LAB', scene: 'CombinerScene', y: 380, color: 0xFF44FF, desc: 'Create powerful hybrids' },
      { text: '🏪 MARKETPLACE', scene: 'MarketplaceScene', y: 440, color: 0xFFAA00, desc: 'Trade with others' }
    ];

    buttonConfigs.forEach((config, index) => {
      this.createStylishButton(config, index);
    });
  }

  private createStylishButton(config: any, index: number) {
    const container = this.add.container(208, config.y);

    // Button background with simple solid color instead of gradient
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(config.color, 0.8);
    buttonBg.fillRoundedRect(-140, -20, 280, 40, 20);
    
    // Button border
    buttonBg.lineStyle(2, 0xffffff, 0.8);
    buttonBg.strokeRoundedRect(-140, -20, 280, 40, 20);

    // Button text
    const buttonText = this.add.text(0, -3, config.text, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Description text
    const descText = this.add.text(0, 12, config.desc, {
      fontSize: '10px',
      color: '#CCCCCC',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    container.add([buttonBg, buttonText, descText]);
    container.setSize(280, 40);
    container.setInteractive();

    // Hover effects
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Back.easeOut'
      });
      
      // Add glow effect
      buttonBg.clear();
      buttonBg.fillStyle(config.color, 1.0);
      buttonBg.fillRoundedRect(-140, -20, 280, 40, 20);
      buttonBg.lineStyle(3, 0xffffff, 1);
      buttonBg.strokeRoundedRect(-140, -20, 280, 40, 20);
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });

      // Reset normal appearance
      buttonBg.clear();
      buttonBg.fillStyle(config.color, 0.8);
      buttonBg.fillRoundedRect(-140, -20, 280, 40, 20);
      buttonBg.lineStyle(2, 0xffffff, 0.8);
      buttonBg.strokeRoundedRect(-140, -20, 280, 40, 20);
    });

    container.on('pointerdown', () => {
      // Click animation
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.scene.start(config.scene);
        }
      });
    });

    // Stagger animation entrance
    container.setAlpha(0);
    container.setY(config.y + 50);
    
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: config.y,
      duration: 600,
      delay: index * 150,
      ease: 'Back.easeOut'
    });

    this.buttons.push(container);
  }

  private createParticleEffects() {
    // Create floating orbs
    for (let i = 0; i < 10; i++) {
      const orb = this.add.circle(
        Math.random() * 416,
        Math.random() * 662,
        Math.random() * 3 + 2,
        0x44AAFF,
        0.3
      );

      // Floating animation
      this.tweens.add({
        targets: orb,
        y: orb.y - 100,
        duration: Math.random() * 3000 + 2000,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });

      // Fade animation
      this.tweens.add({
        targets: orb,
        alpha: 0.1,
        duration: Math.random() * 2000 + 1000,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }
  }

  update() {
    // Update gold display with animation
    if (this.goldText) {
      const currentGold = GameState.getInstance().getGold();
      const displayedText = this.goldText.text;
      const displayedGold = displayedText ? parseInt(displayedText) : 0;
      
      if (currentGold !== displayedGold) {
        // Animate gold change
        this.tweens.add({
          targets: { value: displayedGold },
          value: currentGold,
          duration: 800,
          onUpdate: (tween) => {
            const value = Math.round(tween.getValue());
            if (this.goldText) {
              this.goldText.setText(`${value}`);
            }
          },
          ease: 'Power2.easeOut'
        });
      }
    }
  }
}
