import * as Phaser from 'phaser';
import { GameManager } from './GameManager';
import { CharacterManager, Character } from './CharacterManager';
import { GameState } from './GameState';

export class CombinerScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private characterManager!: CharacterManager;
  private selectedSlot1: Character | null = null;
  private selectedSlot2: Character | null = null;
  private slot1Sprite: Phaser.GameObjects.Rectangle | null = null;
  private slot2Sprite: Phaser.GameObjects.Rectangle | null = null;
  private combineButton: Phaser.GameObjects.Text | null = null;
  private characterSprites: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: 'CombinerScene' });
  }

  create() {
    this.gameManager = GameManager.getInstance();
    this.characterManager = CharacterManager.getInstance();

    // Background
    this.add.rectangle(208, 331, 416, 662, 0x2D3748);

    // Title
    this.add.text(208, 50, 'Character Combiner', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Back button
    const backButton = this.add.text(50, 50, '← Back', {
      fontSize: '18px',
      color: '#60A5FA',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    backButton.setInteractive();
    backButton.on('pointerdown', () => {
      this.scene.start('HomeScene');
    });

    // Fusion slots
    this.createFusionSlots();

    // Collection display
    this.createCollectionDisplay();

    // Combine button
    this.createCombineButton();
  }

  private createFusionSlots() {
    // Slot 1
    const slot1 = this.add.rectangle(140, 150, 80, 100, 0x4A5568, 1);
    slot1.setStrokeStyle(2, 0x718096);
    
    this.add.text(140, 210, 'Slot 1', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Slot 2
    const slot2 = this.add.rectangle(276, 150, 80, 100, 0x4A5568, 1);
    slot2.setStrokeStyle(2, 0x718096);
    
    this.add.text(276, 210, 'Slot 2', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Plus symbol between slots
    this.add.text(208, 150, '+', {
      fontSize: '32px',
      color: '#60A5FA',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
  }

  private createCollectionDisplay() {
    this.add.text(208, 260, 'Your Collection', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Display user's collection - use GameState like CollectionScene
    const collection = GameState.getInstance().getCollection();
    const collectedCharacters = Array.from(collection.values());
    const startY = 300;
    const itemsPerRow = 4;
    const spacing = 90;

    collectedCharacters.forEach((collectedChar, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const x = 70 + (col * spacing);
      const y = startY + (row * 120);

      // Character sprite (placeholder for now)
      const sprite = this.add.rectangle(x, y, 60, 80, this.getRarityColor(collectedChar.rarity));
      sprite.setStrokeStyle(2, 0xffffff);
      sprite.setInteractive();

      // Character name
      this.add.text(x, y + 50, collectedChar.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: 70 }
      }).setOrigin(0.5);

      sprite.on('pointerdown', () => {
        this.selectCharacter(collectedChar);
      });

      this.characterSprites.push(sprite);
    });
  }

  private selectCharacter(character: any) {
    if (!this.selectedSlot1) {
      this.selectedSlot1 = character;
      this.updateSlotDisplay(1, character);
    } else if (!this.selectedSlot2 && character.id !== this.selectedSlot1.id) {
      this.selectedSlot2 = character;
      this.updateSlotDisplay(2, character);
    }

    this.updateCombineButton();
  }

  private updateSlotDisplay(slotNumber: number, character: any) {
    const x = slotNumber === 1 ? 140 : 276;
    const y = 150;

    // Remove existing sprite
    if (slotNumber === 1 && this.slot1Sprite) {
      this.slot1Sprite.destroy();
    } else if (slotNumber === 2 && this.slot2Sprite) {
      this.slot2Sprite.destroy();
    }

    // Add character representation
    const sprite = this.add.rectangle(x, y, 70, 90, this.getRarityColor(character.rarity));
    sprite.setStrokeStyle(2, 0xffffff);

    // Add character name
    this.add.text(x, y + 60, character.name, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'Arial',
      wordWrap: { width: 70 }
    }).setOrigin(0.5);

    if (slotNumber === 1) {
      this.slot1Sprite = sprite;
    } else {
      this.slot2Sprite = sprite;
    }

    // Make slot clickable to remove character
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      if (slotNumber === 1) {
        this.selectedSlot1 = null;
        this.slot1Sprite?.destroy();
        this.slot1Sprite = null;
      } else {
        this.selectedSlot2 = null;
        this.slot2Sprite?.destroy();
        this.slot2Sprite = null;
      }
      this.updateCombineButton();
    });
  }

  private createCombineButton() {
    this.combineButton = this.add.text(208, 600, 'Combine Characters', {
      fontSize: '18px',
      color: '#9CA3AF',
      fontFamily: 'Arial',
      backgroundColor: '#4A5568',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.combineButton.setInteractive();
    this.combineButton.on('pointerdown', () => {
      this.combineCharacters();
    });

    this.updateCombineButton();
  }

  private updateCombineButton() {
    if (!this.combineButton) return;

    const canCombine = this.selectedSlot1 && this.selectedSlot2;
    
    if (canCombine) {
      this.combineButton.setStyle({
        color: '#ffffff',
        backgroundColor: '#3B82F6'
      });
    } else {
      this.combineButton.setStyle({
        color: '#9CA3AF',
        backgroundColor: '#4A5568'
      });
    }
  }

  private async combineCharacters() {
    if (!this.selectedSlot1 || !this.selectedSlot2) return;

    try {
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

      if (response.ok) {
        const data = await response.json();
        console.log('🔥 NEW FUSED CHARACTER CREATED! 🔥');
        console.log('==================================');
        console.log(`Name: ${data.fused_character.name}`);
        console.log(`Rarity: ${data.fused_character.rarity}`);
        console.log(`Description: ${data.fused_character.description}`);
        console.log(`Stats:`, data.fused_character.stats);
        console.log(`Abilities:`, data.fused_character.abilities);
        console.log('==================================');

        // Show success message
        this.showCombineResult(data.fused_character);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to combine characters:', response.statusText, errorData);
        this.showErrorMessage(`Failed to combine characters: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Error combining characters:', error);
      this.showErrorMessage('Network error. Please check your connection.');
    }
  }

  private showCombineResult(fusedCharacter: any) {
    // Create a modal-like overlay
    const overlay = this.add.rectangle(208, 331, 416, 662, 0x000000, 0.7);
    const modal = this.add.rectangle(208, 331, 350, 400, 0x2D3748);
    modal.setStrokeStyle(3, 0x60A5FA);

    // Title
    this.add.text(208, 180, '🎉 Fusion Complete! 🎉', {
      fontSize: '20px',
      color: '#60A5FA',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Character info
    this.add.text(208, 220, fusedCharacter.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(208, 250, `Rarity: ${fusedCharacter.rarity}`, {
      fontSize: '14px',
      color: this.getRarityColorHex(fusedCharacter.rarity),
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(208, 280, fusedCharacter.description, {
      fontSize: '12px',
      color: '#E5E7EB',
      fontFamily: 'Arial',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    // Stats
    const stats = fusedCharacter.stats;
    this.add.text(208, 350, `HP: ${stats.base_hp} | ATK: ${stats.base_attack} | DEF: ${stats.base_defense}`, {
      fontSize: '12px',
      color: '#D1D5DB',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Close button
    const closeButton = this.add.text(208, 450, 'Awesome!', {
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
      this.slot1Sprite?.destroy();
      this.slot2Sprite?.destroy();
      this.slot1Sprite = null;
      this.slot2Sprite = null;
      this.updateCombineButton();
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
}