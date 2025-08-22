import * as Phaser from 'phaser';
import { GameState } from './GameState';
import { CharacterManager } from './CharacterManager';

export class PackScene extends Phaser.Scene {
  private items: Phaser.GameObjects.Container[] = [];
  private isSpinning: boolean = false;
  private selectedItem?: Phaser.GameObjects.Container;
  private selectedCharacter?: any;
  private popupContainer?: Phaser.GameObjects.Container;
  private selectionArrow?: Phaser.GameObjects.Triangle;
  private openPackButton?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private packCost: number = 5;
  private backButton?: Phaser.GameObjects.Text;
  private openPackButtonContainer?: Phaser.GameObjects.Container;

  // Add property for storing mask shape
  private maskShape?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'PackScene' });
  }

  init() {
    // Reset scene state when entering
    this.items = [];
    this.isSpinning = false;
    this.selectedItem = undefined;
    this.selectedCharacter = undefined;
    this.popupContainer = undefined;
    this.selectionArrow = undefined;
    this.openPackButton = undefined;
    this.goldText = undefined;
  }

  preload() {
    // Load sprites dynamically based on character data
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const requiredSprites = characterManager.getAllRequiredSprites();
      
      console.log(`PackScene: Loading ${requiredSprites.length} sprites dynamically`);
      
      requiredSprites.forEach(sprite => {
        if (!this.textures.exists(sprite.key)) {
          this.load.spritesheet(sprite.key, sprite.path, {
            frameWidth: 64,
            frameHeight: 64,
            endFrame: sprite.key.includes('spinning') ? 7 : 3 // 8 frames for spinning, 4 for others
          });
        }
      });
    } else {
      console.warn('PackScene: Characters not loaded, using fallback sprites');
      // Fallback sprites if character data isn't loaded
      this.loadFallbackSprites();
    }
    
    this.load.image('effects', '/sprites/effects.svg');
  }

  private loadFallbackSprites() {
    // Fallback sprites for hero and monster
    const fallbackSprites = [
      'hero-default', 'hero-spinning', 'hero-battle-left', 'hero-battle-right',
      'monster-default', 'monster-spinning', 'monster-battle-left', 'monster-battle-right'
    ];

    fallbackSprites.forEach(spriteKey => {
      if (!this.textures.exists(spriteKey)) {
        this.load.spritesheet(spriteKey, `/sprites/${spriteKey}.png`, {
          frameWidth: 64,
          frameHeight: 64,
          endFrame: spriteKey.includes('spinning') ? 7 : 3
        });
      }
    });
  }

  create() {
    // Create animations for all sprite types
    this.createAnimations();

    // Create professional background
    this.createBackground();

    // Add styled back button
    this.createBackButton();

    // Gold display with frame
    this.createGoldDisplay();

    // Styled title
    this.createTitle();

    // Create spinning area background with glow
    this.createSpinningArea();

    // Create items for the wheel
    this.createItems();

    // Open Pack button with professional styling
    this.createOpenPackButton();

    this.updatePackButton();
  }

  private createBackground() {
    // Professional gradient background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 0, 416, 662);

    // Add decorative stars
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 416;
      const y = Math.random() * 200;
      const size = Math.random() * 1.5 + 0.5;
      stars.fillCircle(x, y, size);
    }

    // Animate stars
    this.tweens.add({
      targets: stars,
      alpha: 0.3,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createBackButton() {
    const backButtonBg = this.add.graphics();
    backButtonBg.fillStyle(0x4A5568, 0.9);
    backButtonBg.fillRoundedRect(10, 10, 80, 35, 8);
    backButtonBg.lineStyle(2, 0x60A5FA, 0.8);
    backButtonBg.strokeRoundedRect(10, 10, 80, 35, 8);

    this.backButton = this.add.text(50, 27, '← Back', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => this.scene.start('HomeScene'))
    .on('pointerover', () => {
      backButtonBg.clear();
      backButtonBg.fillStyle(0x60A5FA, 0.9);
      backButtonBg.fillRoundedRect(10, 10, 80, 35, 8);
      backButtonBg.lineStyle(2, 0x60A5FA, 1);
      backButtonBg.strokeRoundedRect(10, 10, 80, 35, 8);
    })
    .on('pointerout', () => {
      backButtonBg.clear();
      backButtonBg.fillStyle(0x4A5568, 0.9);
      backButtonBg.fillRoundedRect(10, 10, 80, 35, 8);
      backButtonBg.lineStyle(2, 0x60A5FA, 0.8);
      backButtonBg.strokeRoundedRect(10, 10, 80, 35, 8);
    });
  }

  private createGoldDisplay() {
    // Gold frame with professional styling
    const goldFrame = this.add.graphics();
    goldFrame.fillStyle(0x000000, 0.8);
    goldFrame.fillRoundedRect(280, 15, 130, 30, 15);
    goldFrame.lineStyle(2, 0xFFD700, 1);
    goldFrame.strokeRoundedRect(280, 15, 130, 30, 15);

    // Gold icon with glow effect
    const goldIcon = this.add.text(295, 30, '💰', {
      fontSize: '16px'
    }).setOrigin(0, 0.5);

    this.goldText = this.add.text(320, 30, `${GameState.getInstance().getGold()}`, {
      fontSize: '14px',
      color: '#FFD700',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5);

    // Add glow effect to gold text
    this.tweens.add({
      targets: this.goldText,
      alpha: 0.7,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createTitle() {
    // Title with shadow and glow
    const titleShadow = this.add.text(210, 72, '🎁 PACK OPENING 🎁', {
      fontSize: '22px',
      color: '#000000',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.3);

    const titleText = this.add.text(208, 70, '🎁 PACK OPENING 🎁', {
      fontSize: '22px',
      color: '#60A5FA',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(208, 95, 'Discover Amazing Characters', {
      fontSize: '10px',
      color: '#CCCCCC',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Pulsing effect
    this.tweens.add({
      targets: titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createSpinningArea() {
    // Enhanced spinning area with glow
    const spinningAreaBg = this.add.graphics();
    spinningAreaBg.fillStyle(0x1a1a1a, 0.9);
    spinningAreaBg.fillRoundedRect(18, 170, 380, 100, 10);
    spinningAreaBg.lineStyle(3, 0x60A5FA, 0.8);
    spinningAreaBg.strokeRoundedRect(18, 170, 380, 100, 10);

    // Add inner glow effect
    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(0x60A5FA, 0.1);
    innerGlow.fillRoundedRect(28, 180, 360, 80, 8);

    // Create mask for the spinning area - store it for later use
    this.maskShape = this.add.graphics()
      .fillStyle(0xffffff)
      .fillRoundedRect(20, 172, 376, 96, 8)
      .setVisible(false);

    // Enhanced selection marker
    this.selectionArrow = this.add.triangle(217, 175, 0, 15, 8, 0, -8, 0, 0x60A5FA)
      .setDepth(2)
      .setAlpha(0.9);

    // Animate selection arrow
    this.tweens.add({
      targets: this.selectionArrow,
      y: 170,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createItems() {
    const characterManager = CharacterManager.getInstance();
    
    if (!characterManager.isCharactersLoaded()) {
      console.error('Characters not loaded yet');
      return;
    }

    // Create 20 items with randomized characters from the database
    for (let i = 0; i < 20; i++) {
      const randomChar = characterManager.getRandomCharacter();
      const container = this.createItemContainer(randomChar, i * 100 + 600);
      this.items.push(container);
    }

    // Apply mask to all items after they're created
    this.applyMaskToItems();
  }

  private applyMaskToItems() {
    if (this.maskShape && this.items.length > 0) {
      const mask = this.maskShape.createGeometryMask();
      this.items.forEach(item => {
        item.setMask(mask);
      });
    }
  }

  private createItemContainer(char: any, x: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, 220); // Updated Y position to match new spinning area
    
    // Store character data in the container
    container.setData('character', char);
    
    // Background with rarity color
    const bgColor = this.getRarityColor(char.rarity);
    const bg = this.add.rectangle(0, 0, 90, 90, bgColor, 0.3)
      .setStrokeStyle(2, bgColor);
    
    // Create animated sprite and play animation
    const sprite = this.add.sprite(0, -10, char.sprites.default)
      .setScale(0.8);
    sprite.play(char.sprites.default + '-anim');
    
    const name = this.add.text(0, 25, char.name, {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, sprite, name]);
    return container;
  }

  private getRarityColor(rarity: any): number {
    switch (rarity) {
      case 'legendary': return 0xffd700;
      case 'epic': return 0x9400d3;
      case 'rare': return 0x0000ff;
      default: return 0x808080;
    }
  }

  private startSpin() {
    console.log('startSpin called, current state:', this.isSpinning, !!this.popupContainer); // Debug log
    
    if (this.isSpinning || this.popupContainer) return;
    
    this.isSpinning = true;

    // Disable back button during spin
    if (this.backButton) {
      this.backButton.setAlpha(0.5);
      this.backButton.removeInteractive();
    }

    // Time-based spinning with curved slowdown
    const startTime = Date.now();
    const spinDuration = 3000;
    const initialVelocity = -60;
    const minVelocity = -0.05;
    const itemSpacing = 100; // Consistent spacing between items

    // Animation loop with curved slowdown
    const spinLoop = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const currentVelocity = initialVelocity * (1 - easedProgress) + minVelocity * easedProgress;

      this.items.forEach((item, index) => {
        item.x += currentVelocity;
        
        // More predictable wrap around - maintain exact spacing
        if (item.x < -100) {
          // Calculate the total width needed for all items
          const totalWidth = this.items.length * itemSpacing;
          // Place item at the end of the sequence
          item.x = item.x + totalWidth;
        }
      });

      if (progress >= 1) {
        this.stopAndAlign();
      } else {
        requestAnimationFrame(spinLoop);
      }
    };

    spinLoop();
  }

  private stopAndAlign() {
    // Find the item closest to center
    const centerX = 208;
    let closestItem = this.items[0];
    let minDistance = Math.abs(closestItem.x - centerX);

    this.items.forEach(item => {
      const distance = Math.abs(item.x - centerX);
      if (distance < minDistance) {
        minDistance = distance;
        closestItem = item;
      }
    });

    // Get the character data from the selected item
    this.selectedCharacter = closestItem.getData('character');

    // Calculate how much to move to align perfectly
    const alignmentOffset = centerX - closestItem.x;

    // Animate all items to perfect alignment
    this.items.forEach(item => {
      this.tweens.add({
        targets: item,
        x: item.x + alignmentOffset,
        duration: 200,
        ease: 'Quad.easeOut'
      });
    });

    // Set the selected item and show popup after alignment
    this.selectedItem = closestItem;
    this.time.delayedCall(200, () => {
      // Hide arrow before showing popup
      if (this.selectionArrow) {
        this.selectionArrow.setVisible(false);
      }
      this.highlightSelected();
      this.showCharacterPopup();
      this.isSpinning = false;
    });
  }

  private showCharacterPopup() {
    if (!this.selectedCharacter) return;

    // Hide selection arrow when popup is open
    if (this.selectionArrow) {
      this.selectionArrow.setVisible(false);
    }

    // Disable Open Pack button
    if (this.openPackButton) {
      this.openPackButton.setAlpha(0.5);
      this.openPackButton.removeInteractive();
    }

    // Create popup container
    this.popupContainer = this.add.container(208, 250);

    // Background overlay - extended to cover entire screen
    const overlay = this.add.rectangle(0, 0, 800, 800, 0x000000, 0.7)
      .setOrigin(0.5);

    // Popup background
    const popupBg = this.add.rectangle(0, 0, 300, 200, 0x2D3748)
      .setStrokeStyle(3, this.getRarityColor(this.selectedCharacter.rarity));

    // Create animated sprite for popup
    const characterSprite = this.add.sprite(0, -30, this.selectedCharacter.sprites.spinning)
      .setScale(1.5);
    characterSprite.play(this.selectedCharacter.sprites.spinning + '-anim');

    // Character name
    const characterName = this.add.text(0, 20, this.selectedCharacter.name, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Rarity text
    const rarityText = this.add.text(0, 45, this.selectedCharacter.rarity.toUpperCase(), {
      fontSize: '16px',
      color: `#${this.getRarityColor(this.selectedCharacter.rarity).toString(16)}`
    }).setOrigin(0.5);

    // Accept button
    const acceptButton = this.add.text(0, 75, 'Accept', {
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 15, y: 8 },
      fontSize: '18px'
    })
    .setInteractive()
    .setOrigin(0.5)
    .on('pointerdown', () => this.acceptCharacter());

    // Add all elements to popup container
    this.popupContainer.add([overlay, popupBg, characterSprite, characterName, rarityText, acceptButton]);

    // Entrance animation
    this.popupContainer.setScale(0);
    this.tweens.add({
      targets: this.popupContainer,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private acceptCharacter() {
    if (!this.popupContainer || !this.selectedCharacter) return;

    console.log('Adding character to collection:', this.selectedCharacter); // Debug log

    // Add character to collection
    GameState.getInstance().addCharacterToCollection(this.selectedCharacter);

    console.log('Collection size after adding:', GameState.getInstance().getCollectionCount()); // Debug log

    // Exit animation
    this.tweens.add({
      targets: this.popupContainer,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (this.popupContainer) {
          this.popupContainer.destroy();
          this.popupContainer = undefined;
        }
        this.selectedItem = undefined;
        this.selectedCharacter = undefined;
        
        // Show selection arrow again after popup is closed
        if (this.selectionArrow) {
          this.selectionArrow.setVisible(true);
        }
        
        // Re-enable back button
        if (this.backButton) {
          this.backButton.setAlpha(1);
          this.backButton.setInteractive();
        }
        
        // Update displays
        this.updateGoldDisplay();
        this.updatePackButton();
      }
    });
  }

  private highlightSelected() {
    if (!this.selectedItem) return;

    // Add a subtle scale effect for highlighting
    this.tweens.add({
      targets: this.selectedItem,
      scale: 1.1,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        // Don't show arrow here - it will be shown after popup closes
        // Re-enable Open Pack button and update displays
        if (this.openPackButton) {
          this.openPackButton.setInteractive();
          this.updatePackButton();
        }
        
        // Regenerate wheel with new random characters
        this.regenerateWheel();
      }
    });
  }

  private regenerateWheel() {
    // Destroy existing items
    this.items.forEach(item => item.destroy());
    this.items = [];

    // Create new randomized items
    this.createItems();

    // Mask is automatically applied in createItems()
  }

  private resetWheel() {
    // Reset items to original positions
    this.items.forEach((item, index) => {
      item.x = index * 100 + 600;
    });
  }

  private updateGoldDisplay() {
    if (this.goldText) {
      this.goldText.setText(`Gold: ${GameState.getInstance().getGold()}`);
    }
  }

  private updatePackButton() {
    if (this.openPackButtonContainer) {
      const canAfford = GameState.getInstance().getGold() >= this.packCost;
      this.openPackButtonContainer.setAlpha(canAfford ? 1 : 0.5);
      
      if (canAfford) {
        this.openPackButtonContainer.setInteractive();
      } else {
        this.openPackButtonContainer.removeInteractive();
      }
    }
  }

  private createOpenPackButton() {
    const buttonContainer = this.add.container(208, 320);

    // Button background with gradient effect
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x4A5568, 0.9);
    buttonBg.fillRoundedRect(-100, -20, 200, 40, 20);
    buttonBg.lineStyle(3, 0x60A5FA, 0.8);
    buttonBg.strokeRoundedRect(-100, -20, 200, 40, 20);

    this.openPackButton = this.add.text(0, 0, `🎁 Open Pack (${this.packCost} Gold)`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    buttonContainer.add([buttonBg, this.openPackButton]);
    buttonContainer.setSize(200, 40);
    buttonContainer.setInteractive();

    // Enhanced hover effects
    buttonContainer.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x60A5FA, 0.9);
      buttonBg.fillRoundedRect(-100, -20, 200, 40, 20);
      buttonBg.lineStyle(3, 0xffffff, 1);
      buttonBg.strokeRoundedRect(-100, -20, 200, 40, 20);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Back.easeOut'
      });
    });

    buttonContainer.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x4A5568, 0.9);
      buttonBg.fillRoundedRect(-100, -20, 200, 40, 20);
      buttonBg.lineStyle(3, 0x60A5FA, 0.8);
      buttonBg.strokeRoundedRect(-100, -20, 200, 40, 20);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });
    });

    buttonContainer.on('pointerdown', () => {
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => this.tryStartSpin()
      });
    });

    // Store reference for later use
    this.openPackButtonContainer = buttonContainer;
  }

  private tryStartSpin() {
    console.log('tryStartSpin called, isSpinning:', this.isSpinning, 'popupContainer:', !!this.popupContainer);
    
    const gameState = GameState.getInstance();
    
    if (gameState.getGold() >= this.packCost) {
      if (gameState.spendGold(this.packCost)) {
        this.updateGoldDisplay();
        this.updatePackButton();
        this.startSpin();
      }
    } else {
      // Show insufficient funds message
      this.showInsufficientFundsMessage();
    }
  }

  private showInsufficientFundsMessage() {
    const messageBg = this.add.graphics();
    messageBg.fillStyle(0x000000, 0.8);
    messageBg.fillRoundedRect(108, 365, 200, 30, 15);
    messageBg.lineStyle(2, 0xff4444, 1);
    messageBg.strokeRoundedRect(108, 365, 200, 30, 15);

    const message = this.add.text(208, 380, 'Insufficient Gold!', {
      fontSize: '14px',
      color: '#ff4444',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Fade out after 2 seconds
    this.tweens.add({
      targets: [messageBg, message],
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        messageBg.destroy();
        message.destroy();
      }
    });
  }

  private createAnimations() {
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const spriteSets = characterManager.getUniqueSpriteSets();
      
      spriteSets.forEach(spriteSet => {
        // Create animations for each sprite type
        const spriteTypes = ['default', 'battle-left', 'battle-right', 'spinning'];
        
        spriteTypes.forEach(type => {
          const animKey = `${spriteSet}-${type}-anim`;
          const spriteKey = `${spriteSet}-${type}`;
          
          if (!this.anims.exists(animKey) && this.textures.exists(spriteKey)) {
            const frameCount = type === 'spinning' ? 8 : 4;
            const frameRate = type === 'spinning' ? 12 : (type.includes('battle') ? 6 : 8);
            
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: frameCount - 1 }),
              frameRate: frameRate,
              repeat: -1
            });
          }
        });
      });
    } else {
      // Fallback animations
      this.createFallbackAnimations();
    }
  }

  private createFallbackAnimations() {
    // Create fallback animations for hero and monster
    const fallbackAnims = [
      { key: 'hero-default-anim', sprite: 'hero-default', frames: 4, rate: 8 },
      { key: 'hero-spinning-anim', sprite: 'hero-spinning', frames: 8, rate: 12 },
      { key: 'hero-battle-left-anim', sprite: 'hero-battle-left', frames: 4, rate: 6 },
      { key: 'hero-battle-right-anim', sprite: 'hero-battle-right', frames: 4, rate: 6 },
      { key: 'monster-default-anim', sprite: 'monster-default', frames: 4, rate: 8 },
      { key: 'monster-spinning-anim', sprite: 'monster-spinning', frames: 8, rate: 12 },
      { key: 'monster-battle-left-anim', sprite: 'monster-battle-left', frames: 4, rate: 6 },
      { key: 'monster-battle-right-anim', sprite: 'monster-battle-right', frames: 4, rate: 6 }
    ];

    fallbackAnims.forEach(anim => {
      if (!this.anims.exists(anim.key)) {
        this.anims.create({
          key: anim.key,
          frames: this.anims.generateFrameNumbers(anim.sprite, { start: 0, end: anim.frames - 1 }),
          frameRate: anim.rate,
          repeat: -1
        });
      }
    });
  }

  // Add proper cleanup when leaving the scene
  shutdown() {
    // Clean up any running animations or timers
    this.items.forEach(item => item.destroy());
    this.items = [];
    
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = undefined;
    }
    
    // Reset flags
    this.isSpinning = false;
    this.selectedItem = undefined;
    this.selectedCharacter = undefined;
  }
}