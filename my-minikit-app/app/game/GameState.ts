interface CollectedCharacter {
  id: string;
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
      return true;
    }
    return false;
  }

  public addGold(amount: number): void {
    this.gold += amount;
  }

  public addCharacterToCollection(character: any): void {
    const characterId = `${character.name}-${character.rarity}`;
    
    if (this.collection.has(characterId)) {
      const existing = this.collection.get(characterId)!;
      existing.count++;
    } else {
      const stats = this.generateCharacterStats(character);
      const moves = this.generateCharacterMoves(character);
      
      const collectedChar: CollectedCharacter = {
        id: characterId,
        name: character.name,
        rarity: character.rarity,
        sprites: character.sprites,
        obtainedAt: new Date(),
        count: 1,
        stats: stats,
        moves: moves
      };
      this.collection.set(characterId, collectedChar);
    }
  }

  public removeCharacterFromCollection(characterId: string): boolean {
    if (this.collection.has(characterId)) {
      const character = this.collection.get(characterId)!;
      
      if (character.count > 1) {
        character.count--;
        return true;
      } else {
        this.collection.delete(characterId);
        return true;
      }
    }
    return false;
  }

  public isCharacterInTeam(characterId: string): boolean {
    return this.playerTeam.some(teamChar => teamChar && teamChar.id === characterId);
  }

  private generateCharacterStats(character: any): { hp: number; attack: number; defense: number } {
    const baseStats = {
      common: { hp: 80, attack: 12, defense: 8 },
      rare: { hp: 100, attack: 15, defense: 10 },
      epic: { hp: 130, attack: 20, defense: 15 },
      legendary: { hp: 180, attack: 28, defense: 22 }
    };

    const rarity = character.rarity as keyof typeof baseStats;
    const base = baseStats[rarity] || baseStats.common;
    const isHero = character.name.toLowerCase().includes('hero');
    
    if (isHero) {
      return {
        hp: base.hp + 10,
        attack: base.attack,
        defense: base.defense + 2
      };
    } else {
      return {
        hp: base.hp - 5,
        attack: base.attack + 3,
        defense: base.defense
      };
    }
  }

  private generateCharacterMoves(character: any): Array<{ name: string; damage: number; description: string }> {
    const isHero = character.name.toLowerCase().includes('hero');
    const rarity = character.rarity as 'common' | 'rare' | 'epic' | 'legendary';
    
    if (isHero) {
      const heroMoves = [
        { name: 'Slash', damage: 15, description: 'A quick sword strike' },
        { name: 'Holy Light', damage: 18, description: 'Divine magic attack' }
      ];
      
      if (rarity === 'legendary' || rarity === 'epic') {
        heroMoves.push({ name: 'Divine Wrath', damage: 25, description: 'Powerful ultimate ability' });
      }
      
      return heroMoves;
    } else {
      const monsterMoves = [
        { name: 'Claw', damage: 14, description: 'Sharp claw attack' },
        { name: 'Bite', damage: 16, description: 'Vicious bite' }
      ];
      
      if (rarity === 'legendary' || rarity === 'epic') {
        monsterMoves.push({ name: 'Rampage', damage: 24, description: 'Devastating berserker attack' });
      }
      
      return monsterMoves;
    }
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
      return true;
    }
    return false;
  }

  public removeFromPlayerTeam(slotIndex: number): boolean {
    if (slotIndex >= 0 && slotIndex < 5) {
      this.playerTeam[slotIndex] = null;
      return true;
    }
    return false;
  }

  public getCollectionCount(): number {
    return this.collection.size;
  }

  public importSaveData(data: any): void {
    this.gold = data.gold || 100;
    this.collection = new Map(data.collection || []);
    this.playerTeam = data.playerTeam || [null, null, null, null, null];
  }

  public exportSaveData(): any {
    return {
      gold: this.gold,
      collection: Array.from(this.collection.entries()),
      playerTeam: this.playerTeam
    };
  }
}
