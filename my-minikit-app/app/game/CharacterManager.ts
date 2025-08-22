export interface Character {
  id: number;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  character_type: 'hero' | 'monster' | 'mage' | 'archer' | 'assassin' | 'tank' | 'healer' | 'demon' | 'dragon' | 'undead' | 'beast' | 'elemental';
  sprites: {
    default: string;
    spinning: string;
    battleLeft: string;
    battleRight: string;
  };
  stats: {
    hp: number;
    attack: number;
    defense: number;
  };
  moves?: Array<{ name: string; damage: number; description: string }>;
}

export class CharacterManager {
  private static instance: CharacterManager;
  private characters: Character[] = [];
  private isLoaded: boolean = false;
  private spriteTypes = ['default', 'spinning', 'battle-left', 'battle-right'];

  private constructor() {}

  public static getInstance(): CharacterManager {
    if (!CharacterManager.instance) {
      CharacterManager.instance = new CharacterManager();
    }
    return CharacterManager.instance;
  }

  public async loadCharacters(): Promise<boolean> {
    try {
      console.log('Loading characters from server...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/characters`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process characters to ensure proper structure
        this.characters = data.characters.map((char: any) => ({
          id: char.id,
          name: char.name,
          rarity: char.rarity,
          character_type: char.character_type,
          sprites: char.sprites,
          stats: {
            // Always use hp/attack/defense format for consistency
            hp: char.stats.hp || 100,
            attack: char.stats.attack || 10,
            defense: char.stats.defense || 5
          },
          moves: char.moves || [
            { name: 'Basic Attack', damage: 15, description: 'A basic attack' },
            { name: 'Power Strike', damage: 20, description: 'A stronger attack' }
          ]
        }));
        
        this.isLoaded = true;
        console.log(`Loaded ${this.characters.length} characters from server`);
        
        // Log sample character to verify format
        if (this.characters.length > 0) {
          console.log('Sample character after loading:', {
            name: this.characters[0].name,
            stats: this.characters[0].stats,
            moves: this.characters[0].moves
          });
        }
        
        return true;
      } else {
        console.error('Failed to load characters:', response.status);
        this.loadDefaultCharacters();
        return false;
      }
    } catch (error) {
      console.error('Error loading characters:', error);
      this.loadDefaultCharacters();
      return false;
    }
  }

  public getCharacters(): Character[] {
    return [...this.characters];
  }

  public getCharacterById(id: number): Character | undefined {
    return this.characters.find(char => char.id === id);
  }

  public getRandomCharacter(): Character {
    if (this.characters.length === 0) {
      throw new Error('No characters loaded');
    }
    
    // Weighted random selection based on rarity
    const rarityWeights = {
      'legendary': 5,
      'epic': 15,
      'rare': 30,
      'common': 50
    };

    const weightedChars: Character[] = [];
    this.characters.forEach(char => {
      const weight = rarityWeights[char.rarity] || 50;
      for (let i = 0; i < weight; i++) {
        weightedChars.push(char);
      }
    });

    return weightedChars[Math.floor(Math.random() * weightedChars.length)];
  }

  public getCharactersByRarity(rarity: string): Character[] {
    return this.characters.filter(char => char.rarity === rarity);
  }

  public isCharactersLoaded(): boolean {
    return this.isLoaded;
  }

  public getUniqueSpriteSets(): string[] {
    const spriteSets = new Set<string>();
    this.characters.forEach(char => {
      // Extract sprite set from the default sprite path
      const spriteSet = char.sprites.default.replace('-default', '');
      spriteSets.add(spriteSet);
    });
    return Array.from(spriteSets);
  }

  public getAllRequiredSprites(): Array<{key: string, path: string}> {
    const sprites: Array<{key: string, path: string}> = [];
    const spriteSets = this.getUniqueSpriteSets();
    
    spriteSets.forEach(spriteSet => {
      this.spriteTypes.forEach(type => {
        const key = `${spriteSet}-${type}`;
        const path = `/sprites/${key}.png`;
        sprites.push({ key, path });
      });
    });

    return sprites;
  }

  private loadDefaultCharacters(): void {
    console.log('Loading default characters as fallback');
    // Fallback characters if server is unavailable
    this.characters = [
      {
        id: 1,
        name: 'Default Hero',
        rarity: 'common',
        character_type: 'hero',
        sprites: {
          default: 'hero-default',
          spinning: 'hero-spinning',
          battleLeft: 'hero-battle-left',
          battleRight: 'hero-battle-right'
        },
        stats: { hp: 90, attack: 12, defense: 10 },
        moves: [
          { name: 'Slash', damage: 15, description: 'A quick sword strike' },
          { name: 'Shield Bash', damage: 12, description: 'Strike with shield' }
        ]
      },
      {
        id: 2,
        name: 'Default Monster',
        rarity: 'common',
        character_type: 'monster',
        sprites: {
          default: 'monster-default',
          spinning: 'monster-spinning',
          battleLeft: 'monster-battle-left',
          battleRight: 'monster-battle-right'
        },
        stats: { hp: 75, attack: 15, defense: 6 },
        moves: [
          { name: 'Claw', damage: 14, description: 'Sharp claw attack' },
          { name: 'Bite', damage: 16, description: 'Vicious bite' }
        ]
      }
    ];
    this.isLoaded = true;
  }
}