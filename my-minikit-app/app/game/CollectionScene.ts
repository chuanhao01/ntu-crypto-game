import * as Phaser from 'phaser';
import { GameState } from './GameState';

export class CollectionScene extends Phaser.Scene {
  private goldText?: Phaser.GameObjects.Text;
  private collectionItems: Phaser.GameObjects.Container[] = [];
  private detailPopup?: Phaser.GameObjects.Container;
  private teamSlots: Phaser.GameObjects.Container[] = [];
  private draggedCharacter?: any;
  private dragSprite?: Phaser.GameObjects.Sprite;
  private maxScrollY: number = 0;

  constructor() {
    super({ key: 'CollectionScene' });
  }

  preload() {
    // Load sprite sheets for collection display
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

  init() {
    // Reset scene state when entering
    this.collectionItems = [];
    this.teamSlots = [];
    this.draggedCharacter = undefined;
    this.dragSprite = undefined;
    this.detailPopup = undefined;
    this.goldText = undefined;
  }

  create() {
    // Create animations
    this.createAnimations();

    // Add back button at top left
    this.add.text(20, 20, 'Back', {
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 10, y: 5 },
      fontSize: '16px'
    })
    .setInteractive()
    .on('pointerdown', () => this.scene.start('HomeScene'));

    // Gold display at top right
    this.goldText = this.add.text(396, 20, `Gold: ${GameState.getInstance().getGold()}`, {
      fontSize: '16px',
      color: '#FFD700'
    }).setOrigin(1, 0);

    // Title
    this.add.text(208, 50, 'Collection', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Always show team at the top
    this.createTeamSection();
    
    // Show all characters below
    this.displayAllCharacters();
  }

  shutdown() {
    // Clean up drag and drop listeners
    this.input.off('pointermove', this.onDrag, this);
    this.input.off('pointerup', this.onDrop, this);
    this.input.off('pointerup', this.onDropFromTeam, this);

    // Clean up any existing drag sprite
    if (this.dragSprite) {
      this.dragSprite.destroy();
      this.dragSprite = undefined;
    }

    // Clean up popup
    if (this.detailPopup) {
      this.detailPopup.destroy();
      this.detailPopup = undefined;
    }

    // Reset state
    this.draggedCharacter = undefined;
    this.collectionItems = [];
    this.teamSlots = [];
  }

  private createTeamSlot(index: number, x: number, y: number, character: any) {
    const container = this.add.container(x, y);

    // Slot background with rarity color if character exists
    const bgColor = character ? this.getRarityColor(character.rarity) : 0x2D3748;
    const slotBg = this.add.rectangle(0, 0, 65, 85, bgColor, character ? 0.3 : 0.8)
      .setStrokeStyle(2, character ? bgColor : 0x4A5568);

    if (character) {
      // Character sprite
      const sprite = this.add.sprite(0, -10, character.sprites.default)
        .setScale(0.6);
      sprite.play(character.sprites.default + '-anim');

      // Character name
      const name = this.add.text(0, 25, character.name, {
        fontSize: '8px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // Rarity indicator - small colored dot in top right
      const rarityDot = this.add.circle(25, -30, 4, this.getRarityColor(character.rarity))
        .setStrokeStyle(1, 0xffffff);

      // Remove button - small X in top left
      const removeButton = this.add.circle(-25, -30, 6, 0xff4444)
        .setStrokeStyle(1, 0xffffff);
      const removeX = this.add.text(-25, -30, 'X', {
        fontSize: '8px',
        color: '#ffffff'
      }).setOrigin(0.5);

      container.add([slotBg, sprite, name, rarityDot, removeButton, removeX]);

      let isDragging = false;
      let dragStartTime = 0;

      // Make character in slot draggable and clickable
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          // Right click for character details
          this.showCharacterDetails(character);
        } else {
          // Check if clicking on remove button area
          const localPoint = container.getLocalPoint(pointer.x, pointer.y);
          if (localPoint.x >= -31 && localPoint.x <= -19 && localPoint.y >= -36 && localPoint.y <= -24) {
            // Clicked on remove button
            this.removeFromTeam(index);
          } else {
            // Left click to start potential drag
            isDragging = false;
            dragStartTime = Date.now();
            this.startDragFromTeam(character, index, pointer);
          }
        }
      });

      container.on('pointermove', () => {
        if (Date.now() - dragStartTime > 100) { // 100ms threshold for drag
          isDragging = true;
        }
      });
    } else {
      // Empty slot
      const emptyText = this.add.text(0, 0, 'Empty', {
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);

      container.add([slotBg, emptyText]);
    }

    // Make slot interactive for dropping
    container.setSize(65, 85);
    container.setInteractive();
    container.setData('slotIndex', index);
    container.setData('slotBg', slotBg);

    // Visual feedback for drop zones
    container.on('pointerover', () => {
      if (this.draggedCharacter) {
        slotBg.setStrokeStyle(3, 0x00ff00);
      }
    });

    container.on('pointerout', () => {
      const originalColor = character ? this.getRarityColor(character.rarity) : 0x4A5568;
      slotBg.setStrokeStyle(2, originalColor);
    });

    return container;
  }

  private createTeamSection() {
    const playerTeam = GameState.getInstance().getPlayerTeam();
    
    // Team section title - mark as team element
    const titleText = this.add.text(208, 80, 'Battle Team (Drag characters here)', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    titleText.setData('type', 'team-element');

    // Create 5 team slots
    const slotWidth = 70;
    const startX = 35 + (416 - (5 * slotWidth + 4 * 10)) / 2;
    const teamY = 140;

    for (let i = 0; i < 5; i++) {
      const x = startX + (slotWidth + 10) * i;
      const slot = this.createTeamSlot(i, x, teamY, playerTeam[i] || null);
      slot.setData('type', 'team-element');
      this.teamSlots.push(slot);
    }
  }

  private displayAllCharacters() {
    const collection = GameState.getInstance().getCollection();
    const characters = Array.from(collection.values());
    
    // Characters section title
    this.add.text(208, 200, `All Characters (${characters.length})`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const itemsPerRow = 3;
    const itemWidth = 120;
    const itemHeight = 120;
    const startX = (416 - (itemsPerRow * itemWidth)) / 2 + itemWidth / 2;
    const startY = 270;

    characters.forEach((character, index) => {
      const col = index % itemsPerRow;
      const row = Math.floor(index / itemsPerRow);
      const x = startX + col * itemWidth;
      const y = startY + row * itemHeight;

      const container = this.createDraggableCharacterItem(character, x, y);
      this.collectionItems.push(container);
    });

    // Calculate scroll if needed
    const totalRows = Math.ceil(characters.length / itemsPerRow);
    const totalHeight = totalRows * itemHeight;
    const availableHeight = 200; // Reduced because team takes space
    this.maxScrollY = Math.max(0, totalHeight - availableHeight);

    // Show empty state if no characters
    if (characters.length === 0) {
      this.add.text(208, 320, 'No characters collected yet!\nOpen some packs to get started.', {
        fontSize: '16px',
        color: '#888888',
        align: 'center'
      }).setOrigin(0.5);
    }
  }

  private createDraggableCharacterItem(character: any, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Background with rarity color
    const bgColor = this.getRarityColor(character.rarity);
    const bg = this.add.rectangle(0, 0, 100, 100, bgColor, 0.3)
      .setStrokeStyle(2, bgColor);

    // Character sprite
    const sprite = this.add.sprite(0, -15, character.sprites.default)
      .setScale(1.0);
    sprite.play(character.sprites.default + '-anim');

    // Character name
    const name = this.add.text(0, 20, character.name, {
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Rarity text
    const rarity = this.add.text(0, 35, character.rarity.toUpperCase(), {
      fontSize: '9px',
      color: `#${bgColor.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);

    // Count indicator if more than 1
    if (character.count > 1) {
      const countBg = this.add.circle(35, -35, 8, 0x000000, 0.8);
      const countText = this.add.text(35, -35, `x${character.count}`, {
        fontSize: '8px',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add([countBg, countText]);
    }

    container.add([bg, sprite, name, rarity]);

    // Make container interactive for dragging and clicking
    container.setSize(100, 100);
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
    this.draggedCharacter = character;
    
    // Create visual drag sprite
    this.dragSprite = this.add.sprite(pointer.x, pointer.y, character.sprites.default)
      .setScale(0.8)
      .setAlpha(0.8)
      .setDepth(1000);
    this.dragSprite.play(character.sprites.default + '-anim');

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
    if (!this.draggedCharacter || !this.dragSprite) return;

    // Check if dropped on a team slot
    const droppedOnSlot = this.getTeamSlotAtPosition(pointer.x, pointer.y);
    
    if (droppedOnSlot !== -1) {
      this.addToTeamSlot(droppedOnSlot, this.draggedCharacter);
    }

    // Clean up drag
    this.dragSprite.destroy();
    this.dragSprite = undefined;
    this.draggedCharacter = undefined;

    // Remove event listeners
    this.input.off('pointermove', this.onDrag, this);
    this.input.off('pointerup', this.onDrop, this);
  }

  private onDropFromTeam(pointer: Phaser.Input.Pointer) {
    if (!this.draggedCharacter || !this.dragSprite) return;

    const fromSlotIndex = this.draggedCharacter.fromTeamSlot;
    const droppedOnSlot = this.getTeamSlotAtPosition(pointer.x, pointer.y);
    
    if (droppedOnSlot !== -1 && droppedOnSlot !== fromSlotIndex) {
      // Dropped on a different team slot
      this.swapOrMoveTeamSlots(fromSlotIndex, droppedOnSlot);
    }
    // If dropped outside team area or on same slot, do nothing (character stays)

    // Clean up drag
    this.dragSprite.destroy();
    this.dragSprite = undefined;
    delete this.draggedCharacter.fromTeamSlot;
    this.draggedCharacter = undefined;

    // Remove event listeners
    this.input.off('pointermove', this.onDrag, this);
    this.input.off('pointerup', this.onDropFromTeam, this);
  }

  private getTeamSlotAtPosition(x: number, y: number): number {
    for (let i = 0; i < this.teamSlots.length; i++) {
      const slot = this.teamSlots[i];
      const bounds = slot.getBounds();
      if (bounds.contains(x, y)) {
        return i;
      }
    }
    return -1;
  }

  private startDragFromTeam(character: any, fromSlotIndex: number, pointer: Phaser.Input.Pointer) {
    this.draggedCharacter = character;
    this.draggedCharacter.fromTeamSlot = fromSlotIndex; // Track which slot it came from
    
    // Create visual drag sprite
    this.dragSprite = this.add.sprite(pointer.x, pointer.y, character.sprites.default)
      .setScale(0.8)
      .setAlpha(0.8)
      .setDepth(1000);
    this.dragSprite.play(character.sprites.default + '-anim');

    // Set up pointer move and up events
    this.input.on('pointermove', this.onDrag, this);
    this.input.on('pointerup', this.onDropFromTeam, this);
  }

  private swapOrMoveTeamSlots(fromSlot: number, toSlot: number) {
    const playerTeam = GameState.getInstance().getPlayerTeam();
    const characterAtFrom = playerTeam[fromSlot];
    const characterAtTo = playerTeam[toSlot];

    if (characterAtTo) {
      // Swap characters
      GameState.getInstance().setPlayerTeamSlot(fromSlot, characterAtTo);
      GameState.getInstance().setPlayerTeamSlot(toSlot, characterAtFrom);
      this.showMessage('Characters swapped!', '#66ff66');
    } else {
      // Move to empty slot
      GameState.getInstance().setPlayerTeamSlot(fromSlot, null);
      GameState.getInstance().setPlayerTeamSlot(toSlot, characterAtFrom);
      this.showMessage('Character moved!', '#66ff66');
    }

    this.refreshTeamDisplay();
  }

  private addToTeamSlot(slotIndex: number, character: any) {
    // Check if character is already in team (but allow moving within team)
    const playerTeam = GameState.getInstance().getPlayerTeam();
    const existingSlotIndex = playerTeam.findIndex(teamChar => 
      teamChar && teamChar.id === character.id
    );

    if (existingSlotIndex !== -1 && existingSlotIndex !== slotIndex) {
      // Character is already in team but in different slot - move it
      this.swapOrMoveTeamSlots(existingSlotIndex, slotIndex);
      return;
    } else if (existingSlotIndex !== -1 && existingSlotIndex === slotIndex) {
      // Same character dropped on same slot - do nothing
      this.showMessage('Character is already in this slot!', '#ffaa00');
      return;
    }

    // New character being added to team
    const characterAtSlot = playerTeam[slotIndex];
    if (characterAtSlot) {
      // Slot occupied - show message asking if they want to replace
      this.showReplaceConfirmation(slotIndex, character, characterAtSlot);
    } else {
      // Empty slot - add character
      const success = GameState.getInstance().setPlayerTeamSlot(slotIndex, character);
      if (success) {
        this.refreshTeamDisplay();
        this.showMessage('Character added to team!', '#66ff66');
      }
    }
  }

  private showReplaceConfirmation(slotIndex: number, newCharacter: any, existingCharacter: any) {
    // For now, automatically replace. Could add confirmation dialog later
    GameState.getInstance().setPlayerTeamSlot(slotIndex, newCharacter);
    this.refreshTeamDisplay();
    this.showMessage(`${existingCharacter.name} replaced with ${newCharacter.name}!`, '#ffaa00');
  }

  private removeFromTeam(slotIndex: number) {
    GameState.getInstance().removeFromPlayerTeam(slotIndex);
    this.refreshTeamDisplay();
    this.showMessage('Character removed from team!', '#ff6666');
  }

  private refreshTeamDisplay() {
    // Clear existing team slots properly
    this.teamSlots.forEach(slot => {
      slot.removeAllListeners();
      slot.destroy();
    });
    this.teamSlots = [];

    // Clear any existing team section elements
    this.children.list.forEach(child => {
      if (child.getData && child.getData('type') === 'team-element') {
        child.destroy();
      }
    });

    // Recreate team section
    this.createTeamSection();
  }

  private showMessage(text: string, color: string) {
    const message = this.add.text(208, 180, text, {
      fontSize: '14px',
      color: color,
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    // Fade out after 2 seconds
    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 2000,
      onComplete: () => message.destroy()
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
    characterSprite.play(character.sprites.default + '-anim');

    // Character name - moved up 5px
    const characterName = this.add.text(0, -110, character.name, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Rarity text - moved up 5px
    const rarityText = this.add.text(0, -85, character.rarity.toUpperCase(), {
      fontSize: '16px',
      color: `#${bgColor.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);

    // Stats section - moved up 5px
    const statsTitle = this.add.text(-150, -55, 'STATS:', {
      fontSize: '16px',
      color: '#ffffff'
    });

    const hpText = this.add.text(-150, -35, `HP: ${character.stats.hp}`, {
      fontSize: '14px',
      color: '#ff4444'
    });

    const attackText = this.add.text(-150, -15, `Attack: ${character.stats.attack}`, {
      fontSize: '14px',
      color: '#ffaa00'
    });

    const defenseText = this.add.text(-150, 5, `Defense: ${character.stats.defense}`, {
      fontSize: '14px',
      color: '#4444ff'
    });

    // Moves section - moved up 5px
    const movesTitle = this.add.text(-150, 35, 'MOVES:', {
      fontSize: '16px',
      color: '#ffffff'
    });

    const moveTexts: Phaser.GameObjects.Text[] = [];
    character.moves.forEach((move: any, index: number) => {
      const yOffset = 55 + (index * 50); // Moved up 5px (60 - 5 = 55)
      
      const moveText = this.add.text(-150, yOffset, `${move.name}`, {
        fontSize: '14px',
        color: '#00ff88'
      });

      const damageText = this.add.text(-150, yOffset + 15, `Damage: ${move.damage}`, {
        fontSize: '12px',
        color: '#cccccc'
      });

      const descText = this.add.text(-150, yOffset + 30, move.description, {
        fontSize: '10px',
        color: '#888888',
        wordWrap: { width: 280 }
      });

      moveTexts.push(moveText, damageText, descText);
    });

    // Close button - position unchanged
    const closeButton = this.add.text(145, -250, 'X', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#ff4444',
      padding: { x: 8, y: 4 }
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

  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 0xffd700;
      case 'epic': return 0x9400d3;
      case 'rare': return 0x0000ff;
      default: return 0x808080;
    }
  }

  private createAnimations() {
    // Hero default animation
    if (!this.anims.exists('hero-default-anim')) {
      this.anims.create({
        key: 'hero-default-anim',
        frames: this.anims.generateFrameNumbers('hero-default', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    // Monster default animation
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