import * as Phaser from 'phaser';
import { GameState } from './GameState';
import { CharacterManager } from './CharacterManager';

export class MarketplaceScene extends Phaser.Scene {
  private goldText?: Phaser.GameObjects.Text;
  private selectedTab: 'buy' | 'sell' = 'buy';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private contentItems: Phaser.GameObjects.Container[] = [];
  private contentContainer?: Phaser.GameObjects.Container;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private minScrollY: number = 0;

  constructor() {
    super({ key: 'MarketplaceScene' });
  }

  preload() {
    // Load sprites dynamically based on character data
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const requiredSprites = characterManager.getAllRequiredSprites();
      
      console.log(`MarketplaceScene: Loading ${requiredSprites.length} sprites dynamically`);
      
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
      console.warn('MarketplaceScene: Characters not loaded, using fallback sprites');
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
    this.createAnimations();

    // Add back button at top left
    this.add.text(20, 20, 'Back', {
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 10, y: 5 },
      fontSize: '16px'
    })
    .setInteractive()
    .setDepth(200) // Higher depth than background
    .on('pointerdown', () => this.scene.start('HomeScene'));

    // Gold display at top right
    this.goldText = this.add.text(396, 20, `Gold: ${GameState.getInstance().getGold()}`, {
      fontSize: '16px',
      color: '#FFD700'
    }).setOrigin(1, 0).setDepth(200);

    // Title
    this.add.text(208, 50, 'Marketplace', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(200);

    // Create scrollable content container
    this.contentContainer = this.add.container(0, 0);

    // Create tabs
    this.createTabs();
    
    // Add a background rectangle to cover scrolled content above tabs
    const headerBg = this.add.rectangle(208, 75, 416, 150, 0x2D3748)
      .setDepth(100); // High depth to cover scrolled content

    // Add drag scrolling (after tabs are created)
    this.setupScrolling();

    // Display initial content
    this.displayContent();
  }

  private setupScrolling() {
    // Use scene-level pointer events for smoother scrolling
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only start dragging if clicking in the content area (below tabs)
      if (pointer.y > 150) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown && this.contentContainer) {
        const deltaY = pointer.y - this.dragStartY;
        const newScrollY = this.scrollY + deltaY;
        
        // Clamp scroll position
        this.scrollY = Phaser.Math.Clamp(newScrollY, this.minScrollY, Math.min(this.maxScrollY, 0));
        this.contentContainer.setY(this.scrollY);
        
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Keep mouse wheel support
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      if (this.contentContainer) {
        const scrollSpeed = 1;
        const newScrollY = this.scrollY - (deltaY * scrollSpeed);
        
        // Apply same clamping logic
        this.scrollY = Phaser.Math.Clamp(newScrollY, this.minScrollY, Math.min(this.maxScrollY, 0));
        this.contentContainer.setY(this.scrollY);
      }
    });
  }

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

  private createTabs() {
    // Clear existing tab buttons
    this.tabButtons.forEach(button => button.destroy());
    this.tabButtons = [];

    // Buy tab
    const buyTab = this.add.text(150, 90, 'Buy', {
      fontSize: '16px',
      color: this.selectedTab === 'buy' ? '#ffffff' : '#888888',
      backgroundColor: this.selectedTab === 'buy' ? '#4A5568' : '#2D3748',
      padding: { x: 15, y: 8 }
    })
    .setInteractive()
    .setOrigin(0.5)
    .setDepth(200) // Higher depth than background
    .on('pointerdown', () => this.switchTab('buy'));

    // Sell tab
    const sellTab = this.add.text(266, 90, 'Sell', {
      fontSize: '16px',
      color: this.selectedTab === 'sell' ? '#ffffff' : '#888888',
      backgroundColor: this.selectedTab === 'sell' ? '#4A5568' : '#2D3748',
      padding: { x: 15, y: 8 }
    })
    .setInteractive()
    .setOrigin(0.5)
    .setDepth(200) // Higher depth than background
    .on('pointerdown', () => this.switchTab('sell'));

    this.tabButtons.push(buyTab, sellTab);
  }

  private switchTab(tab: 'buy' | 'sell') {
    // Don't switch if already on the selected tab
    if (this.selectedTab === tab) {
      return;
    }
    
    this.selectedTab = tab;
    this.createTabs();
    this.displayContent();
  }

  private displayContent() {
    // Clear existing content containers
    this.contentItems.forEach(item => item.destroy());
    this.contentItems = [];
    
    // Clear content container
    if (this.contentContainer) {
      this.contentContainer.removeAll(true);
    }
    
    // Clear any existing content text that's not in the container
    this.children.list
      .filter(child => {
        if (child instanceof Phaser.GameObjects.Text) {
          return child.y >= 130; // Remove the contentContainer comparison
        }
        return false;
      })
      .forEach(child => child.destroy());

    // Reset scroll position
    this.scrollY = 0;
    if (this.contentContainer) {
      this.contentContainer.setY(0);
    }

    if (this.selectedTab === 'buy') {
      this.displayBuyContent();
    } else {
      this.displaySellContent();
    }
  }

  private displayBuyContent() {
    // Generate random characters for sale
    const charactersForSale = this.generateMarketplaceCharacters();
    
    const titleText = this.add.text(208, 130, 'Characters Available for Purchase', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(200); // Higher depth than background

    if (this.contentContainer) {
      const itemsPerRow = 2;
      const itemWidth = 180;
      const itemHeight = 120;
      const startX = (416 - (itemsPerRow * itemWidth)) / 2 + itemWidth / 2;
      const startY = 210;

      charactersForSale.forEach((character, index) => {
        const col = index % itemsPerRow;
        const row = Math.floor(index / itemsPerRow);
        const x = startX + col * itemWidth;
        const y = startY + row * itemHeight;

        const container = this.createMarketplaceItem(character, x, y, 'buy');
        this.contentContainer!.add(container);
        this.contentItems.push(container);
      });

      // Calculate scroll bounds - stop exactly after last row
      const totalRows = Math.ceil(charactersForSale.length / itemsPerRow);
      const lastRowY = startY + ((totalRows - 1) * itemHeight);
      const itemBottomPadding = 50; // Space below each item
      const lastRowBottom = lastRowY + itemBottomPadding;
      const visibleAreaBottom = 500; // Bottom of the visible scrollable area
      
      this.maxScrollY = 0;
      this.minScrollY = Math.min(0, visibleAreaBottom - lastRowBottom);
    }
  }

  private displaySellContent() {
    const gameState = GameState.getInstance();
    const collection = Array.from(gameState.getCollection().values());
    
    const titleText = this.add.text(208, 130, 'Your Characters for Sale', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(200);

    if (collection.length === 0) {
      const noCharsText = this.add.text(208, 300, 'No characters to sell!\nGo to Collection to add characters to your collection first.', {
        fontSize: '16px',
        color: '#888888',
        align: 'center'
      }).setOrigin(0.5);
      
      if (this.contentContainer) {
        this.contentContainer.add(noCharsText);
      }
      
      this.maxScrollY = 0;
      this.minScrollY = 0;
      return;
    }

    if (this.contentContainer) {
      const itemsPerRow = 2;
      const itemWidth = 180;
      const itemHeight = 120;
      const startX = (416 - (itemsPerRow * itemWidth)) / 2 + itemWidth / 2;
      const startY = 210;

      collection.forEach((characterData, index) => {
        const col = index % itemsPerRow;
        const row = Math.floor(index / itemsPerRow);
        const x = startX + col * itemWidth;
        const y = startY + row * itemHeight;

        const container = this.createMarketplaceItem(characterData, x, y, 'sell');
        this.contentContainer!.add(container);
        this.contentItems.push(container);
      });

      // Calculate scroll bounds - stop exactly after last row
      const totalRows = Math.ceil(collection.length / itemsPerRow);
      const lastRowY = startY + ((totalRows - 1) * itemHeight);
      const itemBottomPadding = 50; // Space below each item
      const lastRowBottom = lastRowY + itemBottomPadding;
      const visibleAreaBottom = 500; // Bottom of the visible scrollable area
      
      this.maxScrollY = 0;
      this.minScrollY = Math.min(0, visibleAreaBottom - lastRowBottom);
    }
  }

  private createMarketplaceItem(character: any, x: number, y: number, mode: 'buy' | 'sell') {
    const container = this.add.container(x, y);

    // Check if character is in battle team (for sell mode)
    const gameState = GameState.getInstance();
    const isInBattleTeam = mode === 'sell' && gameState.isCharacterInTeam && gameState.isCharacterInTeam(character.id);

    // Background with rarity color
    const bgColor = this.getRarityColor(character.rarity);
    const bg = this.add.rectangle(0, 0, 160, 100, bgColor, isInBattleTeam ? 0.1 : 0.3)
      .setStrokeStyle(2, isInBattleTeam ? 0x666666 : bgColor);

    // Character sprite
    const sprite = this.add.sprite(0, -20, character.sprites?.default || 'hero-default')
      .setScale(0.8)
      .setAlpha(isInBattleTeam ? 0.5 : 1.0);
    sprite.play((character.sprites?.default || 'hero-default') + '-anim');

    // Character name
    const name = this.add.text(0, 10, character.name, {
      fontSize: '12px',
      color: isInBattleTeam ? '#888888' : '#ffffff'
    }).setOrigin(0.5);

    // Rarity
    const rarity = this.add.text(0, 25, character.rarity.toUpperCase(), {
      fontSize: '10px',
      color: isInBattleTeam ? '#666666' : `#${bgColor.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);

    // Price and button
    let price: number;
    let buttonText: string;
    let buttonColor: number;

    if (mode === 'buy') {
      price = this.calculateBuyPrice(character);
      buttonText = `Buy ${price}g`;
      buttonColor = 0x4A5568;
    } else {
      price = this.calculateSellPrice(character);
      if (isInBattleTeam) {
        buttonText = 'In Team';
        buttonColor = 0x666666;
      } else {
        buttonText = `Sell ${price}g`;
        buttonColor = 0x48BB78;
      }
    }

    // Create button as a rectangle + text instead of styled text
    const buttonBg = this.add.rectangle(0, 40, 80, 20, buttonColor)
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // Prevent scrolling when clicking buttons
        this.isDragging = false;
        
        console.log('BUTTON CLICKED!', mode, character.name);
        
        if (mode === 'buy') {
          this.buyCharacter(character, price);
        } else {
          if (isInBattleTeam) {
            this.showMessage('Cannot sell a character that is in your battle team!', '#ffaa00');
          } else {
            this.sellCharacter(character, price);
          }
        }
      });

    const buttonLabel = this.add.text(0, 40, buttonText, {
      fontSize: '11px',
      color: isInBattleTeam ? '#888888' : '#ffffff'
    }).setOrigin(0.5);

    // Add "IN TEAM" overlay for battle team characters
    if (isInBattleTeam) {
      const teamOverlay = this.add.text(0, -20, 'IN TEAM', {
        fontSize: '8px',
        color: '#ffaa00',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      
      container.add([bg, sprite, name, rarity, buttonBg, buttonLabel, teamOverlay]);
    } else {
      container.add([bg, sprite, name, rarity, buttonBg, buttonLabel]);
    }

    return container;
  }

  private generateMarketplaceCharacters() {
    const characterManager = CharacterManager.getInstance();
    
    if (!characterManager.isCharactersLoaded()) {
      console.error('Characters not loaded yet');
      return [];
    }

    const characters = [];
    
    // Generate 16 random characters for the marketplace
    for (let i = 0; i < 16; i++) {
      const character = characterManager.getRandomCharacter();
      
      // Create a marketplace-specific character with unique ID
      const marketplaceChar = {
        ...character,
        id: `marketplace_${Date.now()}_${i}`, // Keep unique ID for marketplace
        originalId: character.id // Store original character ID
      };

      characters.push(marketplaceChar);
    }

    return characters;
  }

  private calculateBuyPrice(character: any): number {
    const rarityPrices = {
      common: 50,
      rare: 100,
      epic: 200,
      legendary: 400
    };
    return rarityPrices[character.rarity as keyof typeof rarityPrices];
  }

  private calculateSellPrice(character: any): number {
    // Sell for 70% of buy price
    return Math.floor(this.calculateBuyPrice(character) * 0.7);
  }

  private buyCharacter(character: any, price: number) {
    const gameState = GameState.getInstance();
    const currentGold = gameState.getGold();
    
    if (currentGold >= price) {
      const success = gameState.spendGold(price);
      
      if (success) {
        gameState.addCharacterToCollection(character);
        this.showMessage(`Purchased ${character.name} for ${price} gold!`, '#66ff66');
        this.updateGoldDisplay();
        
        if (this.selectedTab === 'buy') {
          this.displayContent();
        }
      }
    } else {
      this.showMessage('Not enough gold!', '#ff6666');
    }
  }

  private sellCharacter(character: any, price: number) {
    console.log('sellCharacter called:', character.name, price);
    
    const gameState = GameState.getInstance();
    
    // Check if character is in player's team
    if (gameState.isCharacterInTeam && gameState.isCharacterInTeam(character.id)) {
      this.showMessage('Cannot sell a character that is in your battle team!', '#ffaa00');
      return;
    }
    
    // Remove character from collection and add gold
    const success = gameState.removeCharacterFromCollection(character.id);
    console.log('Remove character success:', success);
    
    if (success) {
      gameState.addGold(price);
      console.log('Gold added, new total:', gameState.getGold());
      
      this.showMessage(`Sold ${character.name} for ${price} gold!`, '#66ff66');
      this.updateGoldDisplay();
      
      // Refresh sell content to show updated collection
      if (this.selectedTab === 'sell') {
        this.displayContent();
      }
    } else {
      this.showMessage('Failed to sell character!', '#ff6666');
    }
  }

  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 0xffd700;
      case 'epic': return 0x9400d3;
      case 'rare': return 0x0000ff;
      default: return 0x808080;
    }
  }

  private showMessage(text: string, color: string) {
    const message = this.add.text(208, 60, text, {
      fontSize: '12px',
      color: color,
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);

    // Fade out after 3 seconds
    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 3000,
      onComplete: () => message.destroy()
    });
  }

  private updateGoldDisplay() {
    if (this.goldText) {
      this.goldText.setText(`Gold: ${GameState.getInstance().getGold()}`);
    }
  }
}