import * as Phaser from 'phaser';
import { GameState } from './GameState';
import { CharacterManager } from './CharacterManager';

export class BattleScene extends Phaser.Scene {
  private playerTeam: any[] = [];
  private attackButtons: Phaser.GameObjects.Text[] = [];
  private gameState: 'idle' | 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat' = 'idle';
  private goldText?: Phaser.GameObjects.Text;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private enemySprite?: Phaser.GameObjects.Sprite;
  private currentPlayerCharacter: any;
  private currentEnemyCharacter: any;
  private playerCharacterIndex: number = 0;
  private battlePhase: string = 'player-turn';
  private isAnimating: boolean = false;
  private playerNameText?: Phaser.GameObjects.Text;
  private playerHPText?: Phaser.GameObjects.Text;
  private playerHPBar?: Phaser.GameObjects.Graphics;
  private enemyNameText?: Phaser.GameObjects.Text;
  private enemyHPText?: Phaser.GameObjects.Text;
  private enemyHPBar?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init() {
    // Reset all scene state when entering
    this.playerTeam = [];
    this.attackButtons = [];
    this.gameState = 'idle';
    this.goldText = undefined;
    this.playerSprite = undefined;
    this.enemySprite = undefined;
    this.currentPlayerCharacter = undefined;
    this.currentEnemyCharacter = undefined;
    this.playerCharacterIndex = 0;
    this.battlePhase = 'player-turn';
    this.isAnimating = false;
    this.playerNameText = undefined;
    this.playerHPText = undefined;
    this.playerHPBar = undefined;
    this.enemyNameText = undefined;
    this.enemyHPText = undefined;
    this.enemyHPBar = undefined;
  }

  preload() {
    // Load sprites dynamically based on character data
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const requiredSprites = characterManager.getAllRequiredSprites();
      
      console.log(`BattleScene: Loading ${requiredSprites.length} sprites dynamically`);
      
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
      console.warn('BattleScene: Characters not loaded, using fallback sprites');
      // Load basic sprites as fallback
      const fallbackSprites = [
        'hero-default', 'hero-battle-left', 'hero-battle-right',
        'monster-battle-left', 'monster-battle-right'
      ];

      fallbackSprites.forEach(spriteKey => {
        this.load.spritesheet(spriteKey, `/sprites/${spriteKey}.png`, {
          frameWidth: 64,
          frameHeight: 64,
          endFrame: 3
        });
      });
    }
    
    this.load.image('effects', '/sprites/effects.svg');
  }

  create() {
    // Create animations
    this.createAnimations();

    // Get player's battle team
    this.playerTeam = GameState.getInstance().getPlayerTeam().filter(char => char !== null);
    
    // Check if player has at least one character in their team
    if (this.playerTeam.length === 0) {
      this.showNoTeamMessage();
      return;
    }

    // Initialize character stats and setup battle
    this.initializeCharacterStats();

    // Initialize with first character from team
    this.currentPlayerCharacter = this.playerTeam[0];
    this.playerCharacterIndex = 0;

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

    // Add team indicators
    this.addTeamIndicators();

    // Create UI elements
    this.createBattleUI();

    // Create team roster at bottom
    this.createTeamRoster();

    // Display current player character
    this.displayPlayerCharacter();
    this.displayEnemyCharacter();

    this.updateUI();
  }

  private createBattleUI() {
    // Player name and HP
    this.playerNameText = this.add.text(50, 350, 'Player', {
      fontSize: '16px',
      color: '#ffffff'
    });

    this.playerHPText = this.add.text(50, 370, '100/100', {
      fontSize: '14px',
      color: '#ffffff'
    });

    this.playerHPBar = this.add.graphics();

    // Enemy name and HP
    this.enemyNameText = this.add.text(250, 100, 'Enemy', {
      fontSize: '16px',
      color: '#ffffff'
    });

    this.enemyHPText = this.add.text(250, 120, '100/100', {
      fontSize: '14px',
      color: '#ffffff'
    });

    this.enemyHPBar = this.add.graphics();

    // Create move buttons for current character
    this.createMoveButtonsForCurrentCharacter();
  }

  private createMoveButtonsForCurrentCharacter() {
    // Clear existing move buttons
    this.attackButtons.forEach(button => button.destroy());
    this.attackButtons = [];

    // Ensure character has moves
    if (!this.currentPlayerCharacter || !this.currentPlayerCharacter.moves || this.currentPlayerCharacter.moves.length === 0) {
      console.error('Current character has no moves:', this.currentPlayerCharacter);
      
      // Add default moves if missing
      if (this.currentPlayerCharacter) {
        this.currentPlayerCharacter.moves = [
          { name: 'Basic Attack', damage: 15, description: 'A basic attack' },
          { name: 'Power Strike', damage: 20, description: 'A stronger attack' }
        ];
      } else {
        return;
      }
    }

    // Layout moves in a 2x2 grid covering most of the horizontal space
    const buttonWidth = 180;
    const buttonHeight = 35;
    const horizontalSpacing = 20;
    const verticalSpacing = 5;
    
    // Calculate starting position to center the grid
    const totalWidth = (buttonWidth * 2) + horizontalSpacing;
    const startX = (416 - totalWidth) / 2 + (buttonWidth / 2);
    const startY = 425;

    this.currentPlayerCharacter.moves.forEach((move: any, index: number) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * (buttonWidth + horizontalSpacing);
      const y = startY + row * (buttonHeight + verticalSpacing);
      
      const button = this.add.text(x, y, move.name || 'Unknown Move', {
        backgroundColor: '#4A5568',
        padding: { x: 15, y: 8 },
        color: '#ffffff',
        fontSize: '14px',
        fixedWidth: buttonWidth,
        align: 'center'
      })
      .setInteractive()
      .setOrigin(0.5)
      .on('pointerdown', () => this.executePlayerMove(move));

      this.attackButtons.push(button);
    });
  }

  private executePlayerMove(move: any) {
    if (this.battlePhase !== 'player-turn' || this.isAnimating) return;

    this.isAnimating = true;
    this.battlePhase = 'animating';

    // Ensure move has damage
    const moveDamage = move.damage || 10;
    
    // Calculate damage with proper null checks
    const attackPower = (this.currentPlayerCharacter.stats && this.currentPlayerCharacter.stats.attack) 
      ? this.currentPlayerCharacter.stats.attack 
      : 10;
      
    const damage = Math.max(1, attackPower + moveDamage - this.currentEnemyCharacter.defense);
    
    console.log(`${this.currentPlayerCharacter.name} uses ${move.name} for ${damage} damage`);
    
    this.currentEnemyCharacter.hp = Math.max(0, this.currentEnemyCharacter.hp - damage);

    // Show damage animation
    this.showDamage(300, 180, damage, '#ff4444');

    // Attack animation
    if (this.playerSprite) {
      this.tweens.add({
        targets: this.playerSprite,
        x: this.playerSprite.x + 50,
        duration: 300,
        yoyo: true,
        onComplete: () => {
          this.isAnimating = false;
          this.updateUI();
          this.updateTeamIndicators();
          this.checkBattleEnd();
          
          if (this.battlePhase !== 'battle-end') {
            this.battlePhase = 'enemy-turn';
            this.time.delayedCall(1000, () => this.enemyAttack());
          }
        }
      });
    }
  }

  private createTeamRoster() {
    // Clear any existing roster elements first
    this.children.list
      .filter(child => child.getData('type') === 'roster')
      .forEach(child => child.destroy());

    // Team roster background
    const rosterBg = this.add.rectangle(208, 550, 400, 120, 0x1A202C)
      .setAlpha(0.8)
      .setData('type', 'roster');

    // Title for roster
    this.add.text(208, 525, 'Your Team - Hover to Swap', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5).setData('type', 'roster');

    const startX = 50;
    const spacing = 70;
    const rosterY = 580;
    
    this.playerTeam.forEach((char: any, index: number) => {
      const x = startX + (index * spacing);
      
      // Create container for each team member
      const container = this.add.container(x, rosterY)
        .setData('type', 'roster');

      // Character sprite
      const sprite = this.add.sprite(0, -15, char.sprites.default)
        .setScale(0.6);
      sprite.play(char.sprites.default + '-anim');

      // Character name
      const nameText = this.add.text(0, 10, char.name, {
        fontSize: '8px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // HP text
      const hpText = this.add.text(0, 20, `${char.hp}/${char.stats.hp}`, {
        fontSize: '8px',
        color: char.hp > 0 ? '#00ff00' : '#ff0000'
      }).setOrigin(0.5);

      // Current character indicator
      const indicator = this.add.circle(0, -35, 3, 0xffffff)
        .setVisible(index === this.playerCharacterIndex);

      // Swap button (initially hidden)
      const swapButton = this.add.rectangle(0, -5, 50, 15, 0x4A5568)
        .setAlpha(0.9)
        .setVisible(false);

      const swapText = this.add.text(0, -5, 'SWAP', {
        fontSize: '8px',
        color: '#ffffff'
      }).setOrigin(0.5).setVisible(false);

      // Defeated overlay if character is defeated
      const defeatedOverlay = this.add.rectangle(0, -5, 60, 50, 0x000000)
        .setAlpha(0.7)
        .setVisible(char.hp <= 0);

      container.add([sprite, nameText, hpText, indicator, swapButton, swapText, defeatedOverlay]);

      // Make container interactive
      container.setSize(60, 50);
      container.setInteractive();

      // Store character reference and index
      container.setData('character', char);
      container.setData('index', index);

      // Hover effects
      container.on('pointerover', () => {
        if (char.hp > 0 && index !== this.playerCharacterIndex && this.battlePhase === 'player-turn') {
          swapButton.setVisible(true);
          swapText.setVisible(true);
          sprite.setScale(0.7);
        }
      });

      container.on('pointerout', () => {
        swapButton.setVisible(false);
        swapText.setVisible(false);
        sprite.setScale(0.6);
      });

      // Click to swap
      container.on('pointerdown', () => {
        if (char.hp > 0 && index !== this.playerCharacterIndex && this.battlePhase === 'player-turn') {
          this.switchToCharacter(index);
        }
      });
    });
  }

  private switchToCharacter(newIndex: number) {
    if (this.playerTeam[newIndex].hp <= 0) {
      this.showMessage('Character is defeated!', '#ff6666');
      return;
    }

    // Switch to the selected character
    this.playerCharacterIndex = newIndex;
    this.currentPlayerCharacter = this.playerTeam[newIndex];
    
    this.displayPlayerCharacter();
    this.updateUI();
    this.updateTeamIndicators();
    
    // Refresh roster to update indicators
    this.createTeamRoster();
    
    this.showMessage(`Switched to ${this.currentPlayerCharacter.name}!`, '#66ff66');
  }

  private updateTeamIndicators() {
    // Update enemy indicators (simple version)
    for (let i = 0; i < 5; i++) {
      const indicator = this.children.list.find(
        child => child instanceof Phaser.GameObjects.Arc && 
        child.x === 120 + (i * 25) && 
        child.y === 68
      ) as Phaser.GameObjects.Arc;
      
      if (indicator) {
        // Just show enemy as active (since we only have one enemy)
        indicator.setFillStyle(i === 0 ? 0x4A5568 : 0x333333);
      }
    }

    // Remove the player team indicators update section
  }

  private displayEnemyCharacter() {
    if (this.enemySprite) {
      this.enemySprite.destroy();
    }

    // Create enemy sprite
    this.enemySprite = this.add.sprite(300, 200, this.currentEnemyCharacter.sprites.battleLeft)
      .setScale(2);
    this.enemySprite.play(this.currentEnemyCharacter.sprites.battleLeft + '-anim');
  }

  private showMessage(text: string, color: string) {
    const message = this.add.text(208, 50, text, {
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

  private showDamage(x: number, y: number, damage: number, color: string) {
    const damageText = this.add.text(x, y, `-${damage}`, {
      fontSize: '20px',
      color: color
    }).setOrigin(0.5);

    this.tweens.add({
      targets: damageText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => damageText.destroy()
    });
  }

  private endBattle(victory: boolean) {
    this.battlePhase = 'battle-end';
    
    // Create overlay background
    const overlay = this.add.rectangle(208, 300, 416, 600, 0x000000)
      .setAlpha(0)
      .setDepth(100);
    
    // Create popup container
    const popup = this.add.container(208, 300)
      .setDepth(101)
      .setScale(0.1)
      .setAlpha(0);
    
    // Popup background
    const popupBg = this.add.rectangle(0, 0, 350, 250, 0x2D3748)
      .setStrokeStyle(4, victory ? 0x00ff00 : 0xff0000);
    
    if (victory) {
      const goldReward = 10;
      GameState.getInstance().addGold(goldReward);
      
      const victoryText = this.add.text(0, -60, 'Victory!', {
        fontSize: '48px',
        color: '#00ff00'
      }).setOrigin(0.5);

      const goldText = this.add.text(0, -10, `+${goldReward} Gold!`, {
        fontSize: '24px',
        color: '#FFD700'
      }).setOrigin(0.5);
      
      popup.add([popupBg, victoryText, goldText]);
    } else {
      const defeatText = this.add.text(0, -30, 'Defeat!', {
        fontSize: '48px',
        color: '#ff0000'
      }).setOrigin(0.5);
      
      popup.add([popupBg, defeatText]);
    }

    // Return to home button
    const returnButton = this.add.text(0, 60, 'Return to Home', {
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 20, y: 10 },
      fontSize: '18px'
    })
    .setInteractive()
    .setOrigin(0.5)
    .on('pointerdown', () => this.scene.start('HomeScene'));
    
    popup.add(returnButton);

    // Animate popup appearance
    this.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 300,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: popup,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
      delay: 200
    });
  }

  private showNoTeamMessage() {
    this.add.text(208, 250, 'No characters in battle team!\nGo to Collection to set up your team.', {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // Add back button
    this.add.text(208, 350, 'Back to Home', {
      color: '#ffffff',
      backgroundColor: '#4A5568',
      padding: { x: 20, y: 10 },
      fontSize: '16px'
    })
    .setInteractive()
    .setOrigin(0.5)
    .on('pointerdown', () => this.scene.start('HomeScene'));
  }

  private displayPlayerCharacter() {
    if (this.playerSprite) {
      this.playerSprite.destroy();
    }

    // Create player sprite using team character
    this.playerSprite = this.add.sprite(150, 300, this.currentPlayerCharacter.sprites.battleRight)
      .setScale(2);
    this.playerSprite.play(this.currentPlayerCharacter.sprites.battleRight + '-anim');
  }

  private updateUI() {
    // Update character name
    if (this.playerNameText && this.currentPlayerCharacter) {
      this.playerNameText.setText(this.currentPlayerCharacter.name || 'Unknown Character');
    }

    // Update HP bar with proper null checks
    if (this.playerHPText && this.currentPlayerCharacter) {
      const currentHp = this.currentPlayerCharacter.hp || 0;
      const maxHp = this.currentPlayerCharacter.maxHp || this.currentPlayerCharacter.stats?.hp || 100;
      this.playerHPText.setText(`${currentHp}/${maxHp}`);
    }

    // Update HP bar visual
    if (this.playerHPBar && this.currentPlayerCharacter) {
      const currentHp = this.currentPlayerCharacter.hp || 0;
      const maxHp = this.currentPlayerCharacter.maxHp || this.currentPlayerCharacter.stats?.hp || 100;
      const hpPercent = currentHp / maxHp;
      
      this.playerHPBar.clear();
      this.playerHPBar.fillStyle(0x00ff00);
      this.playerHPBar.fillRect(50, 390, 150 * hpPercent, 10);
    }

    // Update enemy UI
    if (this.currentEnemyCharacter) {
      if (this.enemyNameText) {
        this.enemyNameText.setText(this.currentEnemyCharacter.name);
      }

      if (this.enemyHPText) {
        this.enemyHPText.setText(`${this.currentEnemyCharacter.hp}/${this.currentEnemyCharacter.maxHp}`);
      }

      if (this.enemyHPBar) {
        const hpPercent = this.currentEnemyCharacter.hp / this.currentEnemyCharacter.maxHp;
        this.enemyHPBar.clear();
        this.enemyHPBar.fillStyle(0xff0000);
        this.enemyHPBar.fillRect(250, 140, 150 * hpPercent, 10);
      }
    }

    // Recreate move buttons to ensure they work properly
    this.createMoveButtonsForCurrentCharacter();
  }

  private checkBattleEnd() {
    // Check if all player characters are defeated
    const alivePlayerCharacters = this.playerTeam.filter(char => char.hp > 0);
    
    if (alivePlayerCharacters.length === 0) {
      this.endBattle(false);
    } else if (this.currentEnemyCharacter.hp <= 0) {
      this.endBattle(true);
    }
  }

  private enemyAttack() {
    if (this.battlePhase !== 'enemy-turn' || this.isAnimating) return;

    this.isAnimating = true;
    this.battlePhase = 'animating';

    const damage = Math.max(1, this.currentEnemyCharacter.attack - this.currentPlayerCharacter.stats.defense);
    this.currentPlayerCharacter.hp = Math.max(0, this.currentPlayerCharacter.hp - damage);

    // Show damage animation
    this.showDamage(150, 280, damage, '#ff4444');

    // Attack animation - add null check
    if (this.enemySprite) {
      this.tweens.add({
        targets: this.enemySprite,
        x: this.enemySprite.x - 50,
        duration: 300,
        yoyo: true,
        onComplete: () => {
          this.isAnimating = false;
          this.updateUI();
          this.updateTeamIndicators();
          
          // Check if current character is defeated
          if (this.currentPlayerCharacter.hp <= 0) {
            // Refresh roster to show defeated character
            this.createTeamRoster();
            
            // Try to switch to next available character
            const availableCharacters = this.playerTeam.filter((char: any) => char.hp > 0);
            
            if (availableCharacters.length > 0) {
              // Find next available character
              let nextIndex = (this.playerCharacterIndex + 1) % this.playerTeam.length;
              while (this.playerTeam[nextIndex].hp <= 0) {
                nextIndex = (nextIndex + 1) % this.playerTeam.length;
              }
              
              this.switchToCharacter(nextIndex);
              this.showMessage(`${this.currentPlayerCharacter.name} enters battle!`, '#66ff66');
            }
          } else {
            // Just refresh roster to update HP display
            this.createTeamRoster();
          }
          
          this.checkBattleEnd();
          
          if (this.battlePhase !== 'battle-end') {
            this.battlePhase = 'player-turn';
          }
        }
      });
    }
  }

  private initializeCharacterStats() {
    // Reset HP for all team characters to full at start of battle
    this.playerTeam.forEach(character => {
      // Handle both original characters and newly combined ones
      if (character.stats && character.stats.hp) {
        character.hp = character.stats.hp;
        character.maxHp = character.stats.hp;
      } else {
        // Fallback for any characters missing stats
        console.warn(`Character ${character.name} missing stats, using defaults`);
        character.hp = 100;
        character.maxHp = 100;
        character.stats = character.stats || { hp: 100, attack: 10, defense: 5 };
      }

      // Ensure moves exist
      if (!character.moves || character.moves.length === 0) {
        console.warn(`Character ${character.name} missing moves, adding defaults`);
        character.moves = [
          { name: 'Basic Attack', damage: 15, description: 'A basic attack' },
          { name: 'Power Strike', damage: 20, description: 'A stronger attack' }
        ];
      }

      console.log(`Initialized ${character.name}: HP=${character.hp}/${character.maxHp}, Stats=`, character.stats);
    });

    // Initialize enemy character - try to find "Elepha" from CharacterManager
    const characterManager = CharacterManager.getInstance();
    const elephaCharacter = characterManager.getCharacters().find(char => 
      char.name.toLowerCase() === 'elepha'
    );

    if (elephaCharacter) {
      // Use Elepha as the enemy
      this.currentEnemyCharacter = {
        name: elephaCharacter.name,
        hp: elephaCharacter.stats.hp,
        maxHp: elephaCharacter.stats.hp,
        attack: elephaCharacter.stats.attack,
        defense: elephaCharacter.stats.defense,
        sprites: {
          battleLeft: elephaCharacter.sprites.battleLeft
        },
        moves: elephaCharacter.moves || [
          { name: 'Trunk Slam', damage: 20, description: 'A powerful trunk attack' },
          { name: 'Stomp', damage: 18, description: 'Crushes enemies underfoot' }
        ]
      };
      console.log(`Initialized enemy: ${this.currentEnemyCharacter.name} with HP=${this.currentEnemyCharacter.hp}`);
    } else {
      // Fallback if Elepha is not found
      console.warn('Elepha character not found, using default enemy');
      this.currentEnemyCharacter = {
        name: 'Enemy Monster',
        hp: 100,
        maxHp: 100,
        attack: 25,
        defense: 8,
        sprites: {
          battleLeft: 'monster-battle-left'
        }
      };
    }
  }

  private createAnimations() {
    const characterManager = CharacterManager.getInstance();
    
    if (characterManager.isCharactersLoaded()) {
      const spriteSets = characterManager.getUniqueSpriteSets();
      
      spriteSets.forEach(spriteSet => {
        // Create animations for battle-relevant sprites
        const battleTypes = ['default', 'battle-left', 'battle-right'];
        
        battleTypes.forEach(type => {
          const animKey = `${spriteSet}-${type}-anim`;
          const spriteKey = `${spriteSet}-${type}`;
          
          if (!this.anims.exists(animKey) && this.textures.exists(spriteKey)) {
            const frameRate = type.includes('battle') ? 6 : 8;
            
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: 3 }),
              frameRate: frameRate,
              repeat: -1
            });
          }
        });
      });
    } else {
      // Fallback animations
      const fallbackAnims = [
        { key: 'hero-default-anim', sprite: 'hero-default', rate: 8 },
        { key: 'hero-battle-left-anim', sprite: 'hero-battle-left', rate: 6 },
        { key: 'hero-battle-right-anim', sprite: 'hero-battle-right', rate: 6 },
        { key: 'monster-battle-left-anim', sprite: 'monster-battle-left', rate: 6 },
        { key: 'monster-battle-right-anim', sprite: 'monster-battle-right', rate: 6 }
      ];

      fallbackAnims.forEach(anim => {
        if (!this.anims.exists(anim.key)) {
          this.anims.create({
            key: anim.key,
            frames: this.anims.generateFrameNumbers(anim.sprite, { start: 0, end: 3 }),
            frameRate: anim.rate,
            repeat: -1
          });
        }
      });
    }
  }

  private addTeamIndicators() {
    // Enemy team indicators - moved down to avoid back button overlap
    const enemyY = 60; // Changed from 30 to 60
    this.add.text(20, enemyY, 'Enemy Team:', { 
      color: '#ffffff',
      fontSize: '14px'
    });

    // Show only one enemy indicator since we have one enemy
    this.add.circle(120, enemyY + 8, 8, 0x4A5568)
      .setStrokeStyle(1, 0xffffff);
  }

  shutdown() {
    // Clean up attack buttons
    this.attackButtons.forEach(button => button.destroy());
    this.attackButtons = [];

    // Clean up sprites
    if (this.playerSprite) {
      this.playerSprite.destroy();
      this.playerSprite = undefined;
    }
    
    if (this.enemySprite) {
      this.enemySprite.destroy();
      this.enemySprite = undefined;
    }

    // Clean up graphics
    if (this.playerHPBar) {
      this.playerHPBar.destroy();
      this.playerHPBar = undefined;
    }
    
    if (this.enemyHPBar) {
      this.enemyHPBar.destroy();
      this.enemyHPBar = undefined;
    }

    // Clean up roster elements
    this.children.list
      .filter(child => child.getData && child.getData('type') === 'roster')
      .forEach(child => child.destroy());

    // Reset state
    this.playerTeam = [];
    this.currentPlayerCharacter = undefined;
    this.currentEnemyCharacter = undefined;
    this.isAnimating = false;
  }
}