import { GameState } from './GameState';
import { CharacterManager } from './CharacterManager';

export class GameManager {
  private static instance: GameManager;
  
  private constructor() {}
  
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }
  
  public getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }
  
  public isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }
  
  public logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
  }
  
  public async loadGameFromServer(): Promise<boolean> {
    const token = this.getAuthToken();
    if (!token) return false;
    
    try {
      console.log('Loading game data from server...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/load-game`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const saveData = await response.json();
        console.log('Server data received:', saveData);
        
        const gameState = GameState.getInstance();
        gameState.importSaveData(saveData);
        
        console.log('Game data loaded from server successfully');
        return true;
      } else {
        console.error('Failed to load from server:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load game from server:', error);
    }
    return false;
  }

  public async saveGameToServer(): Promise<boolean> {
    const token = this.getAuthToken();
    if (!token) return false;
    
    try {
      const gameState = GameState.getInstance();
      const saveData = {
        gold: gameState.getGold(),
        collection: Array.from(gameState.getCollection().entries()),
        playerTeam: gameState.getPlayerTeam()
      };
      
      console.log('Saving game data to server:', saveData);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/save-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saveData)
      });
      
      if (response.ok) {
        console.log('Game data saved to server successfully');
        return true;
      } else {
        console.error('Failed to save to server:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to save game to server:', error);
    }
    return false;
  }
  
  public async saveGame(): Promise<void> {
    // Keep local save as backup
    const gameState = GameState.getInstance();
    const saveData = {
      gold: gameState.getGold(),
      collection: Array.from(gameState.getCollection().entries()),
      playerTeam: gameState.getPlayerTeam()
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-game-save', JSON.stringify(saveData));
      
      // Also save to server if authenticated
      if (this.isAuthenticated()) {
        await this.saveGameToServer();
      }
    }
  }
  
  public async loadGame(): Promise<boolean> {
    // Load characters first
    const characterManager = CharacterManager.getInstance();
    await characterManager.loadCharacters();
    
    // Preload all required sprites for the current scene context
    this.preloadSpritesForCurrentContext();
    
    // Try to load from server first if authenticated
    if (this.isAuthenticated()) {
      const success = await this.loadGameFromServer();
      if (success) {
        return true;
      }
      // Fallback to local save if server load fails
      return this.loadLocalGame();
    }
    
    // Load from local storage if not authenticated
    return this.loadLocalGame();
  }

  private preloadSpritesForCurrentContext(): void {
    const characterManager = CharacterManager.getInstance();
    const requiredSprites = characterManager.getAllRequiredSprites();
    
    console.log(`Preparing to preload ${requiredSprites.length} sprites...`);
    
    // This will be handled by individual scenes when they are created
    // Store the sprite data for scenes to access
    if (typeof window !== 'undefined') {
      (window as any).gameSprites = requiredSprites;
    }
  }

  private loadLocalGame(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      const saveData = localStorage.getItem('crypto-game-save');
      if (saveData) {
        const data = JSON.parse(saveData);
        const gameState = GameState.getInstance();
        gameState.importSaveData(data);
        return true;
      }
    } catch (error) {
      console.error('Failed to load local game:', error);
    }
    return false;
  }
}