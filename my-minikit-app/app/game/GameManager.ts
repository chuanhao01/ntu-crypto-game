import { GameState } from './GameState';

export class GameManager {
  private static instance: GameManager;
  
  private constructor() {}
  
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }
  
  public saveGame(): void {
    const gameState = GameState.getInstance();
    const saveData = {
      gold: gameState.getGold(),
      collection: Array.from(gameState.getCollection().entries()),
      playerTeam: gameState.getPlayerTeam()
    };
    
    localStorage.setItem('crypto-game-save', JSON.stringify(saveData));
  }
  
  public loadGame(): boolean {
    try {
      const saveData = localStorage.getItem('crypto-game-save');
      if (saveData) {
        const data = JSON.parse(saveData);
        const gameState = GameState.getInstance();
        
        // Load the data
        gameState.importSaveData(data);
        return true;
      }
    } catch (error) {
      console.error('Failed to load game:', error);
    }
    return false;
  }
}
