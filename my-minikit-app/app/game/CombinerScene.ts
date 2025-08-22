import * as Phaser from 'phaser';
import { GameManager } from './GameManager';
import { CharacterManager, Character } from './CharacterManager';
import { GameState } from './GameState';

export class CombinerScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private characterManager!: CharacterManager;
  private selectedSlot1: Character | null = null;
  private selectedSlot2: Character | null = null;
  private slot1Container: Phaser.GameObjects.Container | null = null;
  private slot2Container: Phaser.GameObjects.Container | null = null;
  private combineButton: Phaser.GameObjects.Text | null = null;
  private characterSprites: Phaser.GameObjects.Container[] = [];
  private draggedCharacter?: any;
  private dragSprite?: Phaser.GameObjects.Sprite;
  private detailPopup?: Phaser.GameObjects.Container;
  private fusionSlots: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'CombinerScene' });
  }

  init() {
    // Reset all scene state when entering
    this.selectedSlot1 = null;
    this.selectedSlot2 = null;
    this.slot1Container = null;
    this.slot2Container = null;
    this.combineButton = null;
    this.characterSprites = [];
    this.draggedCharacter = undefined;
    this.dragSprite = undefined;
    this.detailPopup = undefined;
    this.fusionSlots = [];
    this.loadingOverlay = null;
    this.loadingText = null;
    this.combineButtonContainer = undefined;
    this.combineButtonBg = undefined;
  }

  preload() {
    // Load sprites dynamically based on character data
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const requiredSprites = characterManager.getAllRequiredSprites();
      
      console.log(`CombinerScene: Loading ${requiredSprites.length} sprites dynamically`);
      
      requiredSprites.forEach(sprite => {
        if (!this.textures.exists(sprite.key)) {
          this.load.spritesheet(sprite.key, sprite.path, {
            frameWidth: 64,
            frameHeight: 64,
            endFrame: sprite.key.includes('spinning') ? 7 : 3
          });
        }
      });
    } else {
      console.warn('CombinerScene: Characters not loaded, using fallback sprites');
      // Load basic sprites as fallback
      this.load.spritesheet('hero-default', '/sprites/hero-default.png', {
        frameWidth: 64,
        frameHeight: 64,
        endFrame: 3
      });
      
      this.load.spritesheet('monster-default', '/sprites/monster-default.png', {
        frameWidth: 64,
        frameHeight: 64,
        endFrame: 3
      });
    }
  }

  create() {
    // Clean up any existing event listeners first
    this.cleanupEventListeners();

    // Create animations first
    this.createAnimations();

    this.gameManager = GameManager.getInstance();
    this.characterManager = CharacterManager.getInstance();

    // Professional background
    this.createBackground();

    // Styled title and back button
    this.createHeaderSection();

    // Fusion slots
    this.createFusionSlots();

    // Collection display
    this.createCollectionDisplay();

    // Combine button
    this.createCombineButton();
  }

  private cleanupEventListeners() {
    // Remove any lingering drag event listeners
    this.input.off('pointermove', this.onDrag, this);
    this.input.off('pointerup', this.onDrop, this);
    
    // Clean up any existing drag sprite
    if (this.dragSprite) {
      this.dragSprite.destroy();
      this.dragSprite = undefined;
    }
    
    // Reset drag state
    this.draggedCharacter = undefined;
  }

  private createBackground() {
    // Professional gradient background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 0, 416, 662);

    // Decorative elements
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * 416;
      const y = Math.random() * 300;
      const size = Math.random() * 1.5 + 0.5;
      stars.fillCircle(x, y, size);
    }

    this.tweens.add({
      targets: stars,
      alpha: 0.3,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createHeaderSection() {
    // Styled back button
    const backButtonBg = this.add.graphics();
    backButtonBg.fillStyle(0x4A5568, 0.9);
    backButtonBg.fillRoundedRect(10, 10, 80, 35, 8);
    backButtonBg.lineStyle(2, 0xFF44FF, 0.8);
    backButtonBg.strokeRoundedRect(10, 10, 80, 35, 8);

    const backButton = this.add.text(50, 27, '← Back', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => this.scene.start('HomeScene'))
    .on('pointerover', () => {
      backButtonBg.clear();
      backButtonBg.fillStyle(0xFF44FF, 0.9);
      backButtonBg.fillRoundedRect(10, 10, 80, 35, 8);
      backButtonBg.lineStyle(2, 0xFF44FF, 1);
      backButtonBg.strokeRoundedRect(10, 10, 80, 35, 8);
    })
    .on('pointerout', () => {
      backButtonBg.clear();
      backButtonBg.fillStyle(0x4A5568, 0.9);
      backButtonBg.fillRoundedRect(10, 10, 80, 35, 8);
      backButtonBg.lineStyle(2, 0xFF44FF, 0.8);
      backButtonBg.strokeRoundedRect(10, 10, 80, 35, 8);
    });

    // Professional title
    const titleShadow = this.add.text(210, 52, '🔬 FUSION LAB', {
      fontSize: '20px',
      color: '#000000',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.3);

    const titleText = this.add.text(208, 50, '🔬 FUSION LAB', {
      fontSize: '20px',
      color: '#FF44FF',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(208, 70, 'Create Powerful Hybrids', {
      fontSize: '10px',
      color: '#CCCCCC',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Animated title
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

  private createFusionSlots() {
    // Enhanced fusion slots with glow effects
    const slot1 = this.createEnhancedFusionSlot(140, 150, 'Slot 1', 0);
    this.fusionSlots.push(slot1);

    const slot2 = this.createEnhancedFusionSlot(276, 150, 'Slot 2', 1);
    this.fusionSlots.push(slot2);

    // Animated plus symbol
    const plusSymbol = this.add.text(208, 150, '+', {
      fontSize: '32px',
      color: '#FF44FF',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add glow effect to plus
    this.tweens.add({
      targets: plusSymbol,
      alpha: 0.6,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createEnhancedFusionSlot(x: number, y: number, label: string, slotIndex: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Enhanced slot background with glow
    const slotBg = this.add.graphics();
    slotBg.fillStyle(0x4A5568, 0.8);
    slotBg.fillRoundedRect(-40, -50, 80, 100, 10);
    slotBg.lineStyle(2, 0xFF44FF, 0.6);
    slotBg.strokeRoundedRect(-40, -50, 80, 100, 10);

    // Animated inner glow
    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(0xFF44FF, 0.1);
    innerGlow.fillRoundedRect(-35, -45, 70, 90, 8);

    // Enhanced label
    const labelBg = this.add.graphics();
    labelBg.fillStyle(0x000000, 0.8);
    labelBg.fillRoundedRect(-25, 45, 50, 15, 5);
    
    const labelText = this.add.text(0, 52, label, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    container.add([slotBg, innerGlow, labelBg, labelText]);
    container.setSize(80, 100);
    container.setInteractive();
    container.setData('slotIndex', slotIndex);
    container.setData('slotBg', slotBg);
    container.setData('innerGlow', innerGlow);

    // Enhanced visual feedback with stored references
    container.on('pointerover', () => {
      if (this.draggedCharacter) {
        slotBg.clear();
        slotBg.fillStyle(0x4A5568, 0.8);
        slotBg.fillRoundedRect(-40, -50, 80, 100, 10);
        slotBg.lineStyle(3, 0x00ff00, 1);
        slotBg.strokeRoundedRect(-40, -50, 80, 100, 10);
        
        innerGlow.clear();
        innerGlow.fillStyle(0x00ff00, 0.2);
        innerGlow.fillRoundedRect(-35, -45, 70, 90, 8);
      }
    });

    container.on('pointerout', () => {
      slotBg.clear();
      slotBg.fillStyle(0x4A5568, 0.8);
      slotBg.fillRoundedRect(-40, -50, 80, 100, 10);
      slotBg.lineStyle(2, 0xFF44FF, 0.6);
      slotBg.strokeRoundedRect(-40, -50, 80, 100, 10);
      
      innerGlow.clear();
      innerGlow.fillStyle(0xFF44FF, 0.1);
      innerGlow.fillRoundedRect(-35, -45, 70, 90, 8);
    });

    return container;
  }

  private createCollectionDisplay() {
    // Enhanced collection title
    const collectionBg = this.add.graphics();
    collectionBg.fillStyle(0x000000, 0.6);
    collectionBg.fillRoundedRect(58, 245, 300, 30, 15);
    collectionBg.lineStyle(2, 0xFF44FF, 0.6);
    collectionBg.strokeRoundedRect(58, 245, 300, 30, 15);

    this.add.text(208, 260, 'Your Collection (Drag to combine)', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Display user's collection with proper sprites
    const collection = GameState.getInstance().getCollection();
    const collectedCharacters = Array.from(collection.values());
    const startY = 340;
    const itemsPerRow = 4;
    const itemWidth = 90;
    const itemHeight = 120;

    collectedCharacters.forEach((collectedChar, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const x = 50 + (col * itemWidth);
      const y = startY + (row * itemHeight);

      const container = this.createCharacterItem(collectedChar, x, y);
      this.characterSprites.push(container);
    });

    // Show empty state if no characters
    if (collectedCharacters.length === 0) {
      this.add.text(208, 360, 'No characters collected yet!\nOpen some packs to get started.', {
        fontSize: '14px',
        color: '#888888',
        fontFamily: 'Arial',
        align: 'center'
      }).setOrigin(0.5);
    }
  }

  private createCharacterItem(character: any, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Background with rarity color
    const bgColor = this.getRarityColor(character.rarity);
    const bg = this.add.rectangle(0, 0, 80, 100, bgColor, 0.3)
      .setStrokeStyle(2, bgColor);

    // Character sprite with animation
    const sprite = this.add.sprite(0, -15, character.sprites.default)
      .setScale(0.8);
    
    // Play animation if it exists
    const animKey = character.sprites.default + '-anim';
    if (this.anims.exists(animKey)) {
      sprite.play(animKey);
    }

    // Character name
    const name = this.add.text(0, 15, character.name, {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'Arial',
      wordWrap: { width: 75 }
    }).setOrigin(0.5);

    // Rarity text
    const rarity = this.add.text(0, 28, character.rarity.toUpperCase(), {
      fontSize: '7px',
      color: `#${bgColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Stats display
    const statsText = this.add.text(0, 38, `HP:${character.stats.hp} ATK:${character.stats.attack}`, {
      fontSize: '7px',
      color: '#cccccc',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Count indicator if more than 1
    if (character.count > 1) {
      const countBg = this.add.circle(30, -35, 6, 0x000000, 0.8);
      const countText = this.add.text(30, -35, `x${character.count}`, {
        fontSize: '7px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      container.add([countBg, countText]);
    }

    container.add([bg, sprite, name, rarity, statsText]);

    // Make container interactive
    container.setSize(80, 100);
    container.setInteractive();
    container.setData('character', character);

    let isDragging = false;
    let dragStartTime = 0;

    // Drag and drop functionality
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        // Right click for character details
        this.showCharacterDetails(character);
      } else {
        // Left click - prepare for potential drag
        isDragging = false;
        dragStartTime = Date.now();
        this.startDrag(character, pointer);
      }
    });

    container.on('pointermove', () => {
      if (Date.now() - dragStartTime > 100) { // 100ms threshold for drag
        isDragging = true;
      }
    });

    container.on('pointerup', () => {
      // If it wasn't a drag, treat as click
      if (!isDragging && Date.now() - dragStartTime < 200) {
        this.showCharacterDetails(character);
      }
    });

    // Hover effects
    container.on('pointerover', () => {
      if (!this.draggedCharacter) {
        container.setScale(1.05);
        bg.setAlpha(0.5);
      }
    });

    container.on('pointerout', () => {
      if (!this.draggedCharacter) {
        container.setScale(1.0);
        bg.setAlpha(0.3);
      }
    });

    return container;
  }

  private startDrag(character: any, pointer: Phaser.Input.Pointer) {
    console.log('Starting drag for character:', character.name); // Debug log
    
    // Clean up any existing drag first
    this.cleanupEventListeners();
    
    this.draggedCharacter = character;
    
    // Create visual drag sprite
    this.dragSprite = this.add.sprite(pointer.x, pointer.y, character.sprites.default)
      .setScale(0.8)
      .setAlpha(0.8)
      .setDepth(1000);
    
    const animKey = character.sprites.default + '-anim';
    if (this.anims.exists(animKey)) {
      this.dragSprite.play(animKey);
    }

    // Set up pointer move and up events
    this.input.on('pointermove', this.onDrag, this);
    this.input.on('pointerup', this.onDrop, this);
  }

  private onDrag(pointer: Phaser.Input.Pointer) {
    if (this.dragSprite) {
      this.dragSprite.setPosition(pointer.x, pointer.y);
    }
  }

  private onDrop(pointer: Phaser.Input.Pointer) {
    console.log('Drop detected at position:', pointer.x, pointer.y); // Debug log
    
    if (!this.draggedCharacter || !this.dragSprite) return;

    // Check if dropped on a fusion slot
    const droppedOnSlot = this.getFusionSlotAtPosition(pointer.x, pointer.y);
    console.log('Dropped on slot:', droppedOnSlot); // Debug log
    
    if (droppedOnSlot !== -1) {
      this.addToFusionSlot(droppedOnSlot, this.draggedCharacter);
    } else {
      console.log('Not dropped on any slot'); // Debug log
    }

    // Clean up drag
    this.cleanupEventListeners();
  }

  private getFusionSlotAtPosition(x: number, y: number): number {
    // Use the known positions of the fusion slots instead of getBounds()
    const slot1Bounds = {
      x: 140 - 40, // slot1 x position minus half width
      y: 150 - 50, // slot1 y position minus half height  
      width: 80,
      height: 100
    };
    
    const slot2Bounds = {
      x: 276 - 40, // slot2 x position minus half width
      y: 150 - 50, // slot2 y position minus half height
      width: 80, 
      height: 100
    };
    
    // Add padding for easier drop detection
    const padding = 30;
    
    // Check slot 1
    if (x >= slot1Bounds.x - padding && 
        x <= slot1Bounds.x + slot1Bounds.width + padding && 
        y >= slot1Bounds.y - padding && 
        y <= slot1Bounds.y + slot1Bounds.height + padding) {
      return 0;
    }
    
    // Check slot 2
    if (x >= slot2Bounds.x - padding && 
        x <= slot2Bounds.x + slot2Bounds.width + padding && 
        y >= slot2Bounds.y - padding && 
        y <= slot2Bounds.y + slot2Bounds.height + padding) {
      return 1;
    }
    
    return -1;
  }

  private addToFusionSlot(slotIndex: number, character: any) {
    if (slotIndex === 0) {
      // Check if it's the same character as slot 2
      if (this.selectedSlot2 && this.selectedSlot2.name === character.name && this.selectedSlot2.rarity === character.rarity) {
        this.showMessage('Cannot combine the same character!', '#ff6666');
        return;
      }
      this.selectedSlot1 = character;
      this.updateFusionSlotDisplay(0, character);
    } else if (slotIndex === 1) {
      // Check if it's the same character as slot 1
      if (this.selectedSlot1 && this.selectedSlot1.name === character.name && this.selectedSlot1.rarity === character.rarity) {
        this.showMessage('Cannot combine the same character!', '#ff6666');
        return;
      }
      this.selectedSlot2 = character;
      this.updateFusionSlotDisplay(1, character);
    }

    this.updateCombineButton();
    this.showMessage('Character added to fusion slot!', '#66ff66');
  }

  private updateFusionSlotDisplay(slotIndex: number, character: any) {
    const slot = this.fusionSlots[slotIndex];
    
    // Clear existing character display
    const existingChar = slot.list.find(child => child.getData && child.getData('isCharacter'));
    if (existingChar) {
      existingChar.destroy();
    }

    // Create character display
    const charContainer = this.add.container(0, -10);
    charContainer.setData('isCharacter', true);

    // Character sprite with animation
    const sprite = this.add.sprite(0, 0, character.sprites.default)
      .setScale(0.7);
    
    const animKey = character.sprites.default + '-anim';
    if (this.anims.exists(animKey)) {
      sprite.play(animKey);
    }

    // Character name
    const name = this.add.text(0, 25, character.name, {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'Arial',
      wordWrap: { width: 70 }
    }).setOrigin(0.5);

    // Remove button
    const removeBtn = this.add.circle(30, -30, 8, 0xff4444)
      .setAlpha(0.8)
      .setInteractive();
    
    const removeX = this.add.text(30, -30, 'X', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    removeBtn.on('pointerdown', () => {
      if (slotIndex === 0) {
        this.selectedSlot1 = null;
      } else {
        this.selectedSlot2 = null;
      }
      charContainer.destroy();
      this.updateCombineButton();
      this.showMessage('Character removed from slot!', '#ffaa00');
    });

    charContainer.add([sprite, name, removeBtn, removeX]);
    slot.add(charContainer);
  }

  private showMessage(text: string, color: string) {
    // Enhanced message with professional styling
    const messageBg = this.add.graphics();
    messageBg.fillStyle(0x000000, 0.9);
    messageBg.fillRoundedRect(58, 220, 300, 30, 15);
    messageBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1);
    messageBg.strokeRoundedRect(58, 220, 300, 30, 15);

    const message = this.add.text(208, 235, text, {
      fontSize: '12px',
      color: color,
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Entrance animation
    messageBg.setScale(0);
    message.setScale(0);
    
    this.tweens.add({
      targets: [messageBg, message],
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Fade out after 2 seconds
        this.tweens.add({
          targets: [messageBg, message],
          alpha: 0,
          duration: 2000,
          delay: 2000,
          onComplete: () => {
            messageBg.destroy();
            message.destroy();
          }
        });
      }
    });
  }

  private showCharacterDetails(character: any) {
    if (this.detailPopup) {
      this.detailPopup.destroy();
    }

    // Create popup container
    this.detailPopup = this.add.container(208, 290);

    // Background overlay
    const overlay = this.add.rectangle(0, 0, 800, 800, 0x000000, 0.8)
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => this.closeCharacterDetails());

    // Popup background - increased height for better spacing
    const bgColor = this.getRarityColor(character.rarity);
    const popupBg = this.add.rectangle(0, 10, 350, 525, 0x2D3748)
      .setStrokeStyle(3, bgColor);

    // Character sprite (larger) - moved up 5px
    const characterSprite = this.add.sprite(0, -180, character.sprites.default)
      .setScale(2.0);
    
    const animKey = character.sprites.default + '-anim';
    if (this.anims.exists(animKey)) {
      characterSprite.play(animKey);
    }

    // Character name - moved up 5px
    const characterName = this.add.text(0, -110, character.name, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Rarity text - moved up 5px
    const rarityText = this.add.text(0, -85, character.rarity.toUpperCase(), {
      fontSize: '16px',
      color: `#${bgColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Stats section - moved up 5px
    const statsTitle = this.add.text(-150, -55, 'STATS:', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });

    const hpText = this.add.text(-150, -35, `HP: ${character.stats.hp}`, {
      fontSize: '14px',
      color: '#ff4444',
      fontFamily: 'Arial'
    });

    const attackText = this.add.text(-150, -15, `Attack: ${character.stats.attack}`, {
      fontSize: '14px',
      color: '#ffaa00',
      fontFamily: 'Arial'
    });

    const defenseText = this.add.text(-150, 5, `Defense: ${character.stats.defense}`, {
      fontSize: '14px',
      color: '#4444ff',
      fontFamily: 'Arial'
    });

    // Moves section - moved up 5px
    const movesTitle = this.add.text(-150, 35, 'MOVES:', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });

    const moveTexts: Phaser.GameObjects.Text[] = [];
    character.moves.forEach((move: any, index: number) => {
      const yOffset = 55 + (index * 50); // Moved up 5px (60 - 5 = 55)
      
      const moveText = this.add.text(-150, yOffset, `${move.name}`, {
        fontSize: '14px',
        color: '#00ff88',
        fontFamily: 'Arial'
      });

      const damageText = this.add.text(-150, yOffset + 15, `Damage: ${move.damage}`, {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'Arial'
      });

      const descText = this.add.text(-150, yOffset + 30, move.description, {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'Arial',
        wordWrap: { width: 280 }
      });

      moveTexts.push(moveText, damageText, descText);
    });

    // Close button - position unchanged
    const closeButton = this.add.text(145, -250, 'X', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#ff4444',
      padding: { x: 8, y: 4 },
      fontFamily: 'Arial'
    })
    .setInteractive()
    .on('pointerdown', () => this.closeCharacterDetails());

    // Add all elements to popup
    this.detailPopup.add([
      overlay, 
      popupBg, 
      characterSprite, 
      characterName, 
      rarityText,
      statsTitle,
      hpText,
      attackText,
      defenseText,
      movesTitle,
      closeButton,
      ...moveTexts
    ]);

    // Entrance animation
    this.detailPopup.setScale(0);
    this.tweens.add({
      targets: this.detailPopup,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private closeCharacterDetails() {
    if (!this.detailPopup) return;

    this.tweens.add({
      targets: this.detailPopup,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (this.detailPopup) {
          this.detailPopup.destroy();
          this.detailPopup = undefined;
        }
      }
    });
  }

  private createCombineButton() {
    const buttonContainer = this.add.container(208, 600);

    // Enhanced button with animation
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x4A5568, 0.9);
    buttonBg.fillRoundedRect(-120, -25, 240, 50, 25);
    buttonBg.lineStyle(3, 0xFF44FF, 0.8);
    buttonBg.strokeRoundedRect(-120, -25, 240, 50, 25);

    this.combineButton = this.add.text(0, 0, '⚡ Combine Characters', {
      fontSize: '16px',
      color: '#9CA3AF',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    buttonContainer.add([buttonBg, this.combineButton]);
    buttonContainer.setSize(240, 50);
    buttonContainer.setInteractive();

    // Store references for updateCombineButton
    this.combineButtonContainer = buttonContainer;
    this.combineButtonBg = buttonBg;

    buttonContainer.on('pointerover', () => {
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Back.easeOut'
      });
    });

    buttonContainer.on('pointerout', () => {
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
        onComplete: () => this.combineCharacters()
      });
    });

    this.updateCombineButton();
  }

  private updateCombineButton() {
    if (!this.combineButton || !this.combineButtonBg) return;

    const canCombine = this.selectedSlot1 && this.selectedSlot2;
    
    if (canCombine) {
      this.combineButton.setStyle({ color: '#ffffff' });
      this.combineButtonBg.clear();
      this.combineButtonBg.fillStyle(0x3B82F6, 0.9);
      this.combineButtonBg.fillRoundedRect(-120, -25, 240, 50, 25);
      this.combineButtonBg.lineStyle(3, 0x60A5FA, 1);
      this.combineButtonBg.strokeRoundedRect(-120, -25, 240, 50, 25);
    } else {
      this.combineButton.setStyle({ color: '#9CA3AF' });
      this.combineButtonBg.clear();
      this.combineButtonBg.fillStyle(0x4A5568, 0.9);
      this.combineButtonBg.fillRoundedRect(-120, -25, 240, 50, 25);
      this.combineButtonBg.lineStyle(3, 0xFF44FF, 0.8);
      this.combineButtonBg.strokeRoundedRect(-120, -25, 240, 50, 25);
    }
  }

  private async combineCharacters() {
    if (!this.selectedSlot1 || !this.selectedSlot2) return;

    try {
      // Show loading message
      this.showLoadingMessage('Combining characters...');

      // Debug log the selected characters
      console.log('Selected Character 1:', this.selectedSlot1);
      console.log('Selected Character 2:', this.selectedSlot2);

      // Get the actual character IDs from CharacterManager based on the collected character data
      const char1 = this.characterManager.getCharacters().find(c => 
        c.name === this.selectedSlot1!.name && c.rarity === this.selectedSlot1!.rarity
      );
      const char2 = this.characterManager.getCharacters().find(c => 
        c.name === this.selectedSlot2!.name && c.rarity === this.selectedSlot2!.rarity
      );

      if (!char1 || !char2) {
        console.error('Could not find matching characters in database:', { char1, char2 });
        this.hideLoadingMessage();
        this.showErrorMessage('Character data not found. Please try again.');
        return;
      }

      const requestBody = {
        character1_id: char1.id,
        character2_id: char2.id
      };

      console.log('Sending request body:', requestBody);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/combine-characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.gameManager.getAuthToken()}`
        },
        body: JSON.stringify(requestBody)
      });

      this.hideLoadingMessage();

      if (response.ok) {
        const data = await response.json();
        console.log('🔥 NEW FUSED CHARACTER CREATED! 🔥');
        console.log('==================================');
        console.log(`Name: ${data.fused_character.name}`);
        console.log(`Rarity: ${data.fused_character.rarity}`);
        console.log(`Description: ${data.fused_character.description}`);
        console.log(`Stats:`, data.fused_character.stats);
        console.log(`Abilities:`, data.fused_character.abilities);
        console.log('New character data for collection:', data.new_character_data);
        console.log('Consumed characters:', data.consumed_characters);
        console.log('==================================');

        // Show success message first
        this.showCombineResult(data.fused_character, data.consumed_characters);
        
        // Reload all data to ensure consistency
        console.log('Reloading character data and user collection...');
        await this.characterManager.loadCharacters();
        await this.gameManager.loadGameFromServer();
        
        console.log('Data reloaded successfully');
        
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to combine characters:', response.statusText, errorData);
        this.showErrorMessage(`Failed to combine characters: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      this.hideLoadingMessage();
      console.error('Error combining characters:', error);
      this.showErrorMessage('Network error. Please check your connection.');
    }
  }

  private showLoadingMessage(message: string) {
    // Remove existing loading message
    this.hideLoadingMessage();
    
    this.loadingOverlay = this.add.rectangle(208, 331, 416, 662, 0x000000, 0.7);
    this.loadingText = this.add.text(208, 331, message, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
  }

  private hideLoadingMessage() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
    }
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = null;
    }
  }

  private showCombineResult(fusedCharacter: any, consumedCharacters?: any[]) {
    // Create a modal-like overlay
    const overlay = this.add.rectangle(208, 331, 416, 662, 0x000000, 0.7);
    const modal = this.add.rectangle(208, 331, 350, 450, 0x2D3748);
    modal.setStrokeStyle(3, 0x60A5FA);

    // Title
    this.add.text(208, 150, '🎉 Fusion Complete! 🎉', {
      fontSize: '20px',
      color: '#60A5FA',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Character info
    this.add.text(208, 190, fusedCharacter.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(208, 220, `Rarity: ${fusedCharacter.rarity}`, {
      fontSize: '14px',
      color: this.getRarityColorHex(fusedCharacter.rarity),
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(208, 250, fusedCharacter.description, {
      fontSize: '12px',
      color: '#E5E7EB',
      fontFamily: 'Arial',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    // Stats
    const stats = fusedCharacter.stats;
    this.add.text(208, 320, `HP: ${stats.base_hp} | ATK: ${stats.base_attack} | DEF: ${stats.base_defense}`, {
      fontSize: '12px',
      color: '#D1D5DB',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Show consumed characters info
    if (consumedCharacters && consumedCharacters.length > 0) {
      this.add.text(208, 350, 'Characters Consumed:', {
        fontSize: '12px',
        color: '#EF4444',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      consumedCharacters.forEach((consumed, index) => {
        const yPos = 370 + (index * 15);
        const statusText = consumed.remaining_count > 0 
          ? `${consumed.name} (${consumed.remaining_count} remaining)`
          : `${consumed.name} (completely consumed)`;
        
        this.add.text(208, yPos, statusText, {
          fontSize: '10px',
          color: consumed.remaining_count > 0 ? '#FBBF24' : '#EF4444',
          fontFamily: 'Arial'
        }).setOrigin(0.5);
      });
    }

    // Success message about addition
    this.add.text(208, 410, 'New character added to your collection!', {
      fontSize: '12px',
      color: '#10B981',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Close button
    const closeButton = this.add.text(208, 480, 'Awesome!', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#3B82F6',
      padding: { x: 20, y: 8 }
    }).setOrigin(0.5);

    closeButton.setInteractive();
    closeButton.on('pointerdown', () => {
      overlay.destroy();
      modal.destroy();
      
      // Reset slots
      this.selectedSlot1 = null;
      this.selectedSlot2 = null;
      this.updateCombineButton();
      
      // Refresh the collection display to show updated counts and new character
      this.scene.restart();
    });
  }

  private showErrorMessage(message: string) {
    const errorText = this.add.text(208, 550, message, {
      fontSize: '14px',
      color: '#EF4444',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      errorText.destroy();
    });
  }

  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 0xF59E0B;
      case 'epic': return 0x8B5CF6;
      case 'rare': return 0x3B82F6;
      case 'common': return 0x6B7280;
      default: return 0x6B7280;
    }
  }

  private getRarityColorHex(rarity: string): string {
    switch (rarity) {
      case 'legendary': return '#F59E0B';
      case 'epic': return '#8B5CF6';
      case 'rare': return '#3B82F6';
      case 'common': return '#6B7280';
      default: return '#6B7280';
    }
  }

  // Add loading message properties
  private loadingOverlay: Phaser.GameObjects.Rectangle | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  
  // Add properties for enhanced button (remove duplicate declarations if they exist elsewhere)
  private combineButtonContainer?: Phaser.GameObjects.Container;
  private combineButtonBg?: Phaser.GameObjects.Graphics;

  private createAnimations() {
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const spriteSets = characterManager.getUniqueSpriteSets();
      
      spriteSets.forEach(spriteSet => {
        const animKey = `${spriteSet}-default-anim`;
        const spriteKey = `${spriteSet}-default`;
        
        if (!this.anims.exists(animKey) && this.textures.exists(spriteKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
          });
        }
      });
    } else {
      // Fallback animations
      if (!this.anims.exists('hero-default-anim')) {
        this.anims.create({
          key: 'hero-default-anim',
          frames: this.anims.generateFrameNumbers('hero-default', { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1
        });
      }

      if (!this.anims.exists('monster-default-anim')) {
        this.anims.create({
          key: 'monster-default-anim',
          frames: this.anims.generateFrameNumbers('monster-default', { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1
        });
      }
    }
  }

  shutdown() {
    // Clean up event listeners
    this.cleanupEventListeners();

    // Clean up fusion slots
    this.fusionSlots.forEach(slot => {
      slot.removeAllListeners();
      slot.destroy();
    });
    this.fusionSlots = [];

    // Clean up character sprites
    this.characterSprites.forEach(sprite => {
      sprite.removeAllListeners();
      sprite.destroy();
    });
    this.characterSprites = [];

    // Clean up popup
    if (this.detailPopup) {
      this.detailPopup.destroy();
      this.detailPopup = undefined;
    }

    // Clean up loading overlay
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
    }
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = null;
    }

    // Clean up button references
    if (this.combineButtonContainer) {
      this.combineButtonContainer.removeAllListeners();
      this.combineButtonContainer.destroy();
      this.combineButtonContainer = undefined;
    }

    // Reset all state
    this.selectedSlot1 = null;
    this.selectedSlot2 = null;
    this.slot1Container = null;
    this.slot2Container = null;
    this.combineButton = null;
    this.draggedCharacter = undefined;
    this.dragSprite = undefined;
    this.combineButtonBg = undefined;
  }
}