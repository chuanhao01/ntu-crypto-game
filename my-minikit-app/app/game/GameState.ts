import { CharacterManager, Character } from './CharacterManager';

interface CollectedCharacter {
  id: string;
  originalId?: number; // Reference to the database character
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  sprites: {
    default: string;
    spinning: string;
    battleLeft: string;
    battleRight: string;
  };
  obtainedAt: Date;
  count: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
  };
  moves: Array<{ name: string; damage: number; description?: string }>;
}

export class GameState {
  private static instance: GameState;
  private gold: number = 100;
  private collection: Map<string, CollectedCharacter> = new Map();
  private playerTeam: (CollectedCharacter | null)[] = [null, null, null, null, null];
  private saveTimeout?: NodeJS.Timeout;

  private constructor() {}

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public getGold(): number {
    return this.gold;
  }

  public spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.autoSave();
      return true;
    }
    return false;
  }

  public addGold(amount: number): void {
    this.gold += amount;
    this.autoSave();
  }

  public addCharacterToCollection(character: Character | any): void {
    const characterId = `${character.name}-${character.rarity}`;
    
    if (this.collection.has(characterId)) {
      const existing = this.collection.get(characterId)!;
      existing.count++;
    } else {
      // Handle both stat formats: {hp, attack, defense} and {base_hp, base_attack, base_defense}
      let stats = { hp: 100, attack: 10, defense: 5 }; // Default values
      
      if (character.stats) {
        if (character.stats.hp !== undefined) {
          // Standard format: hp, attack, defense
          stats = {
            hp: character.stats.hp,
            attack: character.stats.attack,
            defense: character.stats.defense
          };
        } else if (character.stats.base_hp !== undefined) {
          // Database format: base_hp, base_attack, base_defense
          stats = {
            hp: character.stats.base_hp,
            attack: character.stats.base_attack,
            defense: character.stats.base_defense
          };
        }
      }
      
      // Ensure moves exist
      const moves = character.moves || character.abilities || [
        { name: 'Basic Attack', damage: 15, description: 'A basic attack' },
        { name: 'Power Strike', damage: 20, description: 'A stronger attack' }
      ];

      const collectedChar: CollectedCharacter = {
        id: characterId,
        originalId: character.originalId || character.id,
        name: character.name,
        rarity: character.rarity,
        sprites: character.sprites,
        obtainedAt: new Date(),
        count: 1,
        stats: stats,  // Always use the hp/attack/defense format
        moves: moves
      };
      
      console.log(`Adding character to collection:`, {
        name: collectedChar.name,
        stats: collectedChar.stats,
        moves: collectedChar.moves
      });
      
      this.collection.set(characterId, collectedChar);
    }
    this.autoSave();
  }

  public removeCharacterFromCollection(characterId: string): boolean {
    if (this.collection.has(characterId)) {
      const character = this.collection.get(characterId)!;
      
      if (character.count > 1) {
        character.count--;
      } else {
        this.collection.delete(characterId);
      }
      this.autoSave();
      return true;
    }
    return false;
  }

  public isCharacterInTeam(characterId: string): boolean {
    return this.playerTeam.some(teamChar => teamChar && teamChar.id === characterId);
  }

  public getCollection(): Map<string, CollectedCharacter> {
    return this.collection;
  }

  public getPlayerTeam(): (CollectedCharacter | null)[] {
    return [...this.playerTeam];
  }

  public setPlayerTeamSlot(slotIndex: number, character: CollectedCharacter | null): boolean {
    if (slotIndex >= 0 && slotIndex < 5) {
      this.playerTeam[slotIndex] = character;
      this.autoSave();
      return true;
    }
    return false;
  }

  public removeFromPlayerTeam(slotIndex: number): boolean {
    if (slotIndex >= 0 && slotIndex < 5) {
      this.playerTeam[slotIndex] = null;
      this.autoSave();
      return true;
    }
    return false;
  }

  public getCollectionCount(): number {
    return this.collection.size;
  }

  public exportSaveData(): any {
    return {
      gold: this.gold,
      collection: Array.from(this.collection.entries()),
      playerTeam: this.playerTeam
    };
  }

  public importSaveData(data: any): void {
    try {
      this.gold = data.gold || 100;
      
      // Handle collection data properly
      if (data.collection && Array.isArray(data.collection)) {
        this.collection.clear();
        data.collection.forEach(([key, character]: [string, any]) => {
          // Ensure dates are properly handled
          if (character.obtainedAt && typeof character.obtainedAt === 'string') {
            character.obtainedAt = new Date(character.obtainedAt);
          }
          this.collection.set(key, character);
        });
      }
      
      // Handle player team data
      if (data.playerTeam && Array.isArray(data.playerTeam)) {
        this.playerTeam = [...data.playerTeam];
        // Ensure we have exactly 5 slots
        while (this.playerTeam.length < 5) {
          this.playerTeam.push(null);
        }
      } else {
        this.playerTeam = [null, null, null, null, null];
      }
      
      console.log('Game data loaded successfully:', {
        gold: this.gold,
        collectionSize: this.collection.size,
        teamMembers: this.playerTeam.filter(char => char !== null).length
      });
      
    } catch (error) {
      console.error('Error importing save data:', error);
      // Reset to defaults on error
      this.gold = 100;
      this.collection.clear();
      this.playerTeam = [null, null, null, null, null];
    }
  }

  private autoSave(): void {
    // Add debouncing to prevent too frequent saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      import('./GameManager').then(({ GameManager }) => {
        GameManager.getInstance().saveGame().catch(error => {
          console.error('Auto-save failed:', error);
        });
      });
    }, 1000); // Wait 1 second before saving
  }
}