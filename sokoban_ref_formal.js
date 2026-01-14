// Sokoban Web Game
// Based on the Python implementation from env.py

class SokobanGame {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 27;
        this.moves = 0;
        this.gameComplete = false;
        this.levelComplete = false;
        this.restartCount = 0; // Track restarts per level
        this.maxRestarts = 10; // Maximum restarts allowed per level
        this.isTransitioning = false; // Prevent multiple level transitions
        this.successfulLevels = 0; // Track number of successfully completed levels
        this.allowNextLevel = true; // Allow automatic level progression
        
        // Data collection properties
        this.playerData = [];
        this.lastTimestamp = Date.now();
        this.sessionStartTime = Date.now();
        this.participantName = "";
        this.levelOutcomes = []; // Track success/failure for each level
        
        // Character mappings from the Python implementation
        this.charToNum = {
            ' ': 0,  // floor
            '#': 1,  // wall
            '&': 2,  // player
            'B': 3,  // box
            '.': 4,  // target
            'X': 5   // box on target
        };
        
        // Action mappings - only arrow keys allowed
        this.actions = {
            'ArrowUp': [-1, 0],
            'ArrowDown': [1, 0],
            'ArrowLeft': [0, -1],
            'ArrowRight': [0, 1]
        };

        this.practicelevels = {
            1: `######
#.  .#
#    #
# BB #
#&   #
######`,
            2: `#########
#   #   #
#   B &.#
#   #   #
#   #   #
#########`,
            3: `########
#.   B #
# B   .#
# &   B#
#      #
#     .#
########`,
        };
        
        // All level data from levels/ folder
        this.levels = {
            1: `#########
##  ...##
## & ####
###B    #
#   #B# #
# B #   #
#   #####
#########`,
            2: `########
##& ####
## B  ##
### # ##
#.# #  #
#.B  # #
#.   B #
########`,
            3: `########
#.B&  ##
###   ##
#.##  ##
# #   ##
#B XB  #
#   .  #
########`,
            4: `######
#.X  #
#.B  #
#&B  #
###  #
######`,
            5: `#########
# . . . #
#   B   #
#   B   #
#   B   #
#       #
#   &   #
#########`,
            6: `#######
# .   #
# # # #
# # # #
# B&  #
#     #
#######`,
            7: `########
#  . . #
#    # #
## # # #
##  B  #
##  B& #
##     #
########`,
            8: `########
### ..&#
### BB #
#### ###
#### ###
#    ###
# #   ##
#   # ##
###   ##
########`,
            9: `######
# .###
#  ###
#X&  #
#  B #
#  ###
######`,//10 in 35
            10:`#######
#&   ##
# BB  #
# #. .#
#     #
#######`,//12 in 35
            11: `########
#      #
# .XXB&#
#      #
#####  #
########`,//14 in 35
            12: `#########
#     ###
#  &BB..#
#### ## #
###     #
###  ####
###  ####
#########`,//16 in 35
            13: `############
#    ###   #
# BB     #&#
# B #...   #
#   ########
############`,//18 in 35
            14: `######
# & ##
#...##
#BBB##
#    #
#    #
######`,//20 in 35
            15: `#######
#   ###
# & ###
# BB###
##. . #
##    #
#######`,//21 in 35
            16: `########
#  #####
# BB B #
#      #
## ## ##
#...#&##
# ### ##
#      #
#  #   #
########`,//22 in 35
            17: `########
#   .. #
#  &BB #
##### ##
####  ##
####  ##
####  ##
########`,//23 in 35
            18: `##########
#&  #.   #
#.# # ## #
# B  B  .#
#B###B## #
#      #B#
# B   ...#
##########`,//24 in 35            
            19: `###########
###     ###
# B B   ###
# ### #####
# & . .   #
#   ###   #
###########`,//26 in 35
            20: `#########
# & #   #
# B B   #
##B### ##
#  ...  #
#   #   #
######  #
#########`,//28 in 35
            21: `#########
#&      #
#       #
# BBB...#
#    ####
#    ####
#########`,//29 in 35
            22: `#########
#    ####
# ## ####
#  .B.###
# #B&B###
# #.B.  #
# # ### #
#       #
#########`,//30 in 35
            23: `##########
###.     #
#    B # #
#.   B   #
#    B B##
#   . .&##
##########`,//33 in 35
            
            24: `#######
#.##  #
#B    #
#.X&B #
#. B ##
#######`//35 in 35
        };
        
        this.currentState = null;
        this.initialState = null;
        
        // Create shuffled order for main game levels (1-24)
        this.shuffledMainLevels = this.createShuffledMainLevels();
        
        this.init();
    }
    
    createShuffledMainLevels() {
        // Create array of numbers 1-24
        const levels = Array.from({length: 24}, (_, i) => i + 1);
        
        // Fisher-Yates shuffle algorithm
        for (let i = levels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [levels[i], levels[j]] = [levels[j], levels[i]];
        }
        
        console.log('Shuffled main game levels:', levels);
        return levels;
    }
    
    init() {
        this.setupEventListeners();
        this.showNameInput();
    }
    
    showNameInput() {
        // Create and show name input modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #2c3e50;">欢迎来到Sokoban推箱子游戏!</h2>
            <p style="margin-bottom: 20px; color: #7f8c8d;">在正式游戏前，请先完成练习关卡</p>
            <p style="margin-bottom: 20px; color: #7f8c8d;">输入昵称（游戏编号）以进入游戏：</p>
            <input type="text" id="participant-name-input" placeholder="昵称（游戏编号）" 
                   style="width: 100%; padding: 12px; border: 2px solid #bdc3c7; border-radius: 8px; font-size: 16px; margin-bottom: 20px;">
            <button id="start-game-btn" class="btn btn-primary" style="width: 100%;">开始练习关卡</button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Focus on input and handle enter key
        const nameInput = document.getElementById('participant-name-input');
        const startBtn = document.getElementById('start-game-btn');
        
        nameInput.focus();
        
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startBtn.click();
            }
        });
        
        startBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (name) {
                this.participantName = name;
                document.body.removeChild(modal);
                this.loadLevel(1);
            } else {
                alert('请正确输入昵称（编号）！');
                nameInput.focus();
            }
        });
    }
    
    // Data collection methods
    recordPlayerAction(action, oldBoxPos, newBoxPos) {
        const currentTimestamp = Date.now();
        const reactionTime = currentTimestamp - this.lastTimestamp;
        
        const actionData = {
            problem_idx: this.getOriginalLevelNum(),
            game_id: this.currentLevel,
            arrow_key: action,
            box_id: oldBoxPos ? this.getBoxId(oldBoxPos) : null,
            old_box_pos: oldBoxPos,
            new_box_pos: newBoxPos,
            timestamp: currentTimestamp,
            reaction_time: reactionTime,
            player_pos: [...this.currentState.player],
            session_time: currentTimestamp - this.sessionStartTime
        };
        
        this.playerData.push(actionData);
        this.lastTimestamp = currentTimestamp;
        
        // Log the action for debugging
        console.log('Action recorded:', actionData);
    }
    
    recordSpecialAction(actionType) {
        const currentTimestamp = Date.now();
        const reactionTime = currentTimestamp - this.lastTimestamp;
        
        const specialActionData = {
            problem_idx: this.getOriginalLevelNum(),
            game_id: this.currentLevel,
            arrow_key: actionType,
            box_id: null,
            old_box_pos: null,
            new_box_pos: null,
            timestamp: currentTimestamp,
            reaction_time: reactionTime,
            player_pos: [...this.currentState.player],
            session_time: currentTimestamp - this.sessionStartTime
        };
        
        this.playerData.push(specialActionData);
        this.lastTimestamp = currentTimestamp;
        
        // Log the special action for debugging
        console.log('Special action recorded:', specialActionData);
    }
    
    recordLevelOutcome(success) {
        const currentTimestamp = Date.now();
        const levelOutcome = {
            level: this.currentLevel,
            original_level: this.getOriginalLevelNum(),
            success: success,
            moves: this.moves,
            restarts: this.restartCount,
            timestamp: currentTimestamp,
            session_time: currentTimestamp - this.sessionStartTime
        };
        
        this.levelOutcomes.push(levelOutcome);
        console.log('Level outcome recorded:', levelOutcome);
    }
    
    getBoxId(position) {
        // Find the box index based on position
        return this.currentState.boxes.findIndex(box => 
            box[0] === position[0] && box[1] === position[1]
        );
    }
    
    getOriginalLevelNum() {
        // Get the original level number for the current level
        if (this.currentLevel <= 3) {
            // Practice levels - return the same number
            return this.currentLevel;
        } else {
            // Main game levels - get from shuffled array
            const shuffledIndex = this.currentLevel - 4; // Convert to 0-based index
            return this.shuffledMainLevels[shuffledIndex];
        }
    }
    
    exportPlayerData() {
        const dataToExport = {
            participant_name: this.participantName,
            session_info: {
                start_time: this.sessionStartTime,
                end_time: Date.now(),
                total_duration: Date.now() - this.sessionStartTime,
                total_moves: this.playerData.length,
                levels_played: [...new Set(this.playerData.map(action => action.problem_idx))],
                successful_levels: this.successfulLevels,
                total_levels: 24, // Only count main game levels (4-27), not practice levels
                success_rate: (this.successfulLevels / 24 * 100).toFixed(1) + '%'
            },
            level_outcomes: this.levelOutcomes,
            actions: this.playerData
        };
        
        // Create and download JSON file
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `sokoban_${this.participantName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Player data exported:', dataToExport);
    }
    
    autoSaveData() {
        // Automatically save data when all levels are completed
        if (this.gameComplete) {
            console.log('All 24 levels completed! Auto-saving data...');
            this.exportPlayerData();
        }
    }
    
    
    setupEventListeners() {
        // Global event blocker during transitions
        document.addEventListener('keydown', (event) => {
            // Block all events during transitions
            if (this.isTransitioning) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            
            if (this.actions[event.key]) {
                event.preventDefault();
                this.handleMove(this.actions[event.key], event.key);
            } else if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                this.resetLevel();
            }
        });
        
        // Global click blocker during transitions
        document.addEventListener('click', (event) => {
            // Allow continue button even during transitions
            if (event.target.id === 'continue-main-game-btn') {
                this.continueToMainGame();
                return;
            }
            
            // Block all other events during transitions
//            if (this.isTransitioning) {
//                event.preventDefault();
//                event.stopPropagation();
//                return;
//            }
            if (event.target.id==='next-level-btn'){
                this.goToNextLevel();
                return;
            }
            
            if (event.target.id === 'export-data-btn') {
                this.exportPlayerData();
            }
        });
        
        // Block other potential events during transitions
        document.addEventListener('keyup', (event) => {
            if (this.isTransitioning) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        });
        
        document.addEventListener('keypress', (event) => {
            if (this.isTransitioning) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        });
    }
    
    layoutToBoard(layoutStr) {
        const lines = layoutStr.split('\n').filter(line => line.length > 0);
        const maxWidth = Math.max(...lines.map(line => line.length));
        
        // Pad lines to max width with walls (like Python implementation)
        const paddedLines = lines.map(line => line.padEnd(maxWidth, '#'));
        
        return paddedLines.map(line => 
            line.split('').map(char => this.charToNum[char] || 0)
        );
    }
    
    boardToState(board) {
        // Create fixed board (walls, floors, targets)
        const fixedBoard = board.map(row => 
            row.map(cell => {
                switch(cell) {
                    case 0: return 0; // floor
                    case 1: return 1; // wall
                    case 2: return 0; // player -> floor
                    case 3: return 0; // box -> floor
                    case 4: return 4; // target
                    case 5: return 4; // box on target -> target
                    default: return 0;
                }
            })
        );
        
        // Find player position
        let playerPos = null;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j] === 2) {
                    playerPos = [i, j];
                    break;
                }
            }
            if (playerPos) break;
        }
        
        // Find box positions
        const boxPositions = [];
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j] === 3 || board[i][j] === 5) {
                    boxPositions.push([i, j]);
                }
            }
        }
        
        return {
            fixed: fixedBoard,
            player: playerPos,
            boxes: boxPositions
        };
    }
    
    loadLevel(levelNum) {
        // Handle practice levels (1-3) and main game levels (4-27)
        let levelData = null;
        
        if (levelNum >= 1 && levelNum <= 3) {
            // Load from practice levels
            levelData = this.practicelevels[levelNum];
        } else if (levelNum >= 4 && levelNum <= this.maxLevel) {
            // Load from main game levels using shuffled order
            const shuffledIndex = levelNum - 4; // Convert to 0-based index for shuffled array
            const originalLevelNum = this.shuffledMainLevels[shuffledIndex];
            levelData = this.levels[originalLevelNum];
        }
        
        if (!levelData) {
            return;
        }
        
        this.currentLevel = levelNum;
        this.moves = 0;
        this.levelComplete = false;
        this.gameComplete = false;
        this.restartCount = 0; // Reset restart count for new level
        this.isTransitioning = false; // Reset transition flag
        this.allowNextLevel = true; // Allow next level progression
        
        const board = this.layoutToBoard(levelData);
        this.currentState = this.boardToState(board);
        this.initialState = JSON.parse(JSON.stringify(this.currentState));
        
        // Record "start" trial at the beginning of each level
        this.recordSpecialAction("start");
        
        this.updateUI();
        this.renderBoard();
    }
    
    resetLevel() {
        // Prevent reset during transitions
        if (this.isTransitioning) {
            return;
        }
        
        // Check if restart limit exceeded
        if (this.restartCount >= this.maxRestarts) {
            // Record failed completion
            this.recordLevelOutcome(false);
            // Only save data if this is the last level (27)
            if (this.currentLevel === this.maxLevel) {
                //this.autoSaveData();
                // Also automatically click the export data button
                const exportBtn = document.getElementById('export-data-btn');
                if (exportBtn) {
                    exportBtn.click();
                }
            }
            this.showFailureMessage();
            return;
        }
        
        this.restartCount++;
        this.currentState = JSON.parse(JSON.stringify(this.initialState));
        this.moves = 0;
        this.levelComplete = false;
        
        // Record "restart" trial after pressing reset
        this.recordSpecialAction("restart");
        
        this.updateUI();
        this.renderBoard();
    }
    
    isValidAction(state, action) {
        const [dy, dx] = action;
        const [playerY, playerX] = state.player;
        const newY = playerY + dy;
        const newX = playerX + dx;
        
        // Check bounds
        if (newY < 0 || newY >= state.fixed.length || 
            newX < 0 || newX >= state.fixed[0].length) {
            return false;
        }
        
        // Check if new position is a wall
        if (state.fixed[newY][newX] === 1) {
            return false;
        }
        
        // Check if new position has a box
        const boxAtNewPos = state.boxes.find(box => box[0] === newY && box[1] === newX);
        if (boxAtNewPos) {
            // Check if box can be pushed
            const newBoxY = newY + dy;
            const newBoxX = newX + dx;
            
            // Check bounds for box
            if (newBoxY < 0 || newBoxY >= state.fixed.length || 
                newBoxX < 0 || newBoxX >= state.fixed[0].length) {
                return false;
            }
            
            // Check if box destination is wall
            if (state.fixed[newBoxY][newBoxX] === 1) {
                return false;
            }
            
            // Check if there's another box at box destination
            const boxAtBoxDest = state.boxes.find(box => box[0] === newBoxY && box[1] === newBoxX);
            if (boxAtBoxDest) {
                return false;
            }
        }
        
        return true;
    }
    
    handleMove(action, keyPressed) {
        if (this.levelComplete || this.isTransitioning || !this.isValidAction(this.currentState, action)) {
            return;
        }
        
        const [dy, dx] = action;
        const [playerY, playerX] = this.currentState.player;
        const newY = playerY + dy;
        const newX = playerX + dx;
        
        // Check if pushing a box
        const boxIndex = this.currentState.boxes.findIndex(box => box[0] === newY && box[1] === newX);
        let oldBoxPos = null;
        let newBoxPos = null;
        
        if (boxIndex !== -1) {
            // Move the box
            oldBoxPos = [newY, newX];
            newBoxPos = [newY + dy, newX + dx];
            this.currentState.boxes[boxIndex] = newBoxPos;
        }
        
        // Move the player
        this.currentState.player = [newY, newX];
        this.moves++;
        
        // Record the action
        this.recordPlayerAction(keyPressed, oldBoxPos, newBoxPos);
        
        // Check if level is complete
        if (this.checkSolved()) {
            this.levelComplete = true;
            // Record successful completion
            this.recordLevelOutcome(true);
            // Only count main game levels (4-27) as successful levels, not practice levels (1-3)
            if (this.currentLevel >= 4) {
                this.successfulLevels++; // Increment successful levels count
            }
            console.log(`Level ${this.currentLevel} completed successfully! Total successful levels: ${this.successfulLevels}`);
            if (this.currentLevel === this.maxLevel) {
                this.gameComplete = true;
                // Save data first before showing completion message
                //this.autoSaveData();
                // Also automatically click the export data button
                const exportBtn = document.getElementById('export-data-btn');
                if (exportBtn) {
                    exportBtn.click();
                }
                // Show completion message after data is saved
                setTimeout(() => {
                    this.showCompletionMessage();
                }, 500);
            } else {
                this.showCompletionMessage();
            }
        }
        
        this.updateUI();
        this.renderBoard();
    }
    
    checkSolved() {
        // Get all target positions
        const targets = [];
        for (let i = 0; i < this.currentState.fixed.length; i++) {
            for (let j = 0; j < this.currentState.fixed[i].length; j++) {
                if (this.currentState.fixed[i][j] === 4) {
                    targets.push([i, j]);
                }
            }
        }
        
        // Check if all boxes are on targets
        return this.currentState.boxes.every(box => 
            targets.some(target => target[0] === box[0] && target[1] === box[1])
        );
    }
    
    showCompletionMessage() {
        const levelCompleteDiv = document.getElementById('level-complete');
        const gameCompleteDiv = document.getElementById('game-complete');
        const practiceCompleteDiv = document.getElementById('practice-complete');
        
        if (this.gameComplete) {
            // Update successful levels display
            document.getElementById('success-levels').textContent = this.successfulLevels;
            console.log(`Game completed! Displaying successful levels: ${this.successfulLevels}/24`);
            
            // Set transition flag for game completion
            this.isTransitioning = true;
            gameCompleteDiv.style.display = 'block';
            setTimeout(() => {
                gameCompleteDiv.style.display = 'none';
                this.isTransitioning = false;
            }, 5000);
        } else if (this.levelComplete) {
            // Check if this is practice level 3 - show practice completion modal
            if (this.currentLevel === 3) {
                console.log('Practice level 3 completed - showing practice completion modal');
                this.isTransitioning = true;
                practiceCompleteDiv.style.display = 'flex';
                // Don't auto-advance, wait for user to click continue button
            } else {
                console.log(`level ${this.currentLevel} completed`);
                // Set transition flag to block all events during success transition
                this.isTransitioning = true;
                levelCompleteDiv.style.display = 'flex';
                // advance to next level after continue button is clicked
                   
            }
        }
    }
    
    showFailureMessage() {
        const failureDiv = document.getElementById('level-failure');
        const levelCompleteDiv = document.getElementById('level-complete');
        const gameCompleteDiv = document.getElementById('game-complete');
        const practiceCompleteDiv = document.getElementById('practice-complete');
        
        console.log(`showFailureMessage() called for level ${this.currentLevel}`);
        
        // Set transition flag to block all events
        this.isTransitioning = true;
        
        // Hide any existing completion messages
        levelCompleteDiv.style.display = 'none';
        gameCompleteDiv.style.display = 'none';
        
        // Record failure action
        this.recordSpecialAction("failure");
        
        // Check if this is practice level 2 - show practice completion modal
        if (this.currentLevel === 3) {
            console.log('Practice level 3 failed - showing practice completion modal');
            practiceCompleteDiv.style.display = 'flex';
            // Don't auto-advance, wait for user to click continue button
        } else if (this.currentLevel >= this.maxLevel) {
            // Update failure message for last level
            const failureMessage = document.getElementById('failure-message');
            failureMessage.textContent = 'Game completed. Saving data...';
            
            // If failing at the last level, mark game as complete and save data
            this.gameComplete = true;
            // Save data first before showing completion message
            //this.autoSaveData();
            // Show completion message after data is saved
            setTimeout(() => {
                failureDiv.style.display = 'none';
                // Update successful levels display
                document.getElementById('success-levels').textContent = this.successfulLevels;
                console.log(`Game completed via failure at level 27! Displaying successful levels: ${this.successfulLevels}/24`);
                gameCompleteDiv.style.display = 'block';
            }, 500);
        } else {
            // Auto-advance to next level after 1 second
            console.log(`Failure in level ${this.currentLevel}, wait for user to click continue button`);
            this.isTransitioning = true;
            // Show failure message
            failureDiv.style.display = 'flex';
            
//            // Show failure message
//            failureDiv.style.display = 'block';
//            // Auto-advance to next level after 1 second
//            console.log(`Setting timeout to auto-advance from level ${this.currentLevel} in 1 second`);
//            setTimeout(() => {
//                console.log(`Timeout triggered - attempting to auto-advance from level ${this.currentLevel}`);
//                failureDiv.style.display = 'none';
//                // Directly load the next level
//                const nextLevelNum = this.currentLevel + 1;
//                console.log(`Directly loading level ${nextLevelNum}`);
//                this.loadLevel(nextLevelNum);
//            }, 1000);
        }
    }
    
    continueToMainGame() {
        console.log('Continue to main game button clicked');
        console.log('Current level before transition:', this.currentLevel);
        const practiceCompleteDiv = document.getElementById('practice-complete');
        
        // Hide the practice completion modal
        practiceCompleteDiv.style.display = 'none';
        
        // Hide the How to Play instructions
        const howToPlayDiv = document.getElementById('how-to-play');
        if (howToPlayDiv) {
            howToPlayDiv.style.display = 'none';
        }
        
        // Reset transition flag
        this.isTransitioning = false;
        
        // Load level 4 (main game starts)
        console.log('Loading level 4 to start main game');
        this.loadLevel(4);
        console.log('Level loaded, current level is now:', this.currentLevel);
    }
    
    goToNextLevel(){
        console.log(`next level button clicked`);
        console.log(`advance into level ${this.currentLevel+1}`);
        const levelCompleteDiv = document.getElementById('level-complete');
        levelCompleteDiv.style.display = 'none';
        
        // load the next level
        const nextLevelNum = this.currentLevel + 1;
        console.log(`loading level ${nextLevelNum}`);
        
        this.isTransitioning = false;
        this.loadLevel(nextLevelNum);
    }
    
    renderBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        
        const board = this.currentState.fixed;
        const cols = board[0].length;
        
        gameBoard.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
        
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Determine cell type and content
                const cellType = board[i][j];
                const isPlayer = this.currentState.player[0] === i && this.currentState.player[1] === j;
                const boxAtPos = this.currentState.boxes.find(box => box[0] === i && box[1] === j);
                const isTarget = cellType === 4;
                
                if (cellType === 1) {
                    // Wall
                    cell.classList.add('wall');
                } else if (isPlayer) {
                    // Player
                    cell.classList.add('player');
                    if (isTarget) {
                        // Player on target - only show red star, no target symbol
                        cell.classList.add('target');
                    } else {
                        cell.classList.add('floor');
                    }
                    // Create player indicator (star)
                    const playerIndicator = document.createElement('div');
                    playerIndicator.textContent = '★';
                    playerIndicator.style.cssText = `
                        color: red;
                        font-size: 24px;
                        font-weight: bold;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                    `;
                    cell.appendChild(playerIndicator);
                } else if (boxAtPos) {
                    // Box
                    if (isTarget) {
                        cell.classList.add('box-on-target');
                    } else {
                        cell.classList.add('box');
                    }
                } else if (isTarget) {
                    // Target
                    cell.classList.add('target');
                } else {
                    // Floor
                    cell.classList.add('floor');
                }
                
                gameBoard.appendChild(cell);
            }
        }
    }
    
    updateUI() {
        // Update level display based on current level
        let levelDisplay = '';
        if (this.currentLevel <= 3) {
            // Practice levels
            levelDisplay = `练习关卡 ${this.currentLevel}`;
        } else {
            // Main game levels (4-27 map to 1-24, but display in sequential order)
            const mainGameLevel = this.currentLevel - 3;
            levelDisplay = `${mainGameLevel}/24`;
        }
        document.getElementById('current-level').textContent = levelDisplay;
        
        document.getElementById('final-moves').textContent = this.moves;
        const restartsLeft = this.maxRestarts - this.restartCount;
        document.getElementById('restart-count').textContent = restartsLeft;
        
        // Only hide completion messages if level is not complete
        if (!this.levelComplete && !this.gameComplete) {
            document.getElementById('level-complete').style.display = 'none';
            document.getElementById('game-complete').style.display = 'none';
            document.getElementById('level-failure').style.display = 'none';
        }
    }
    
    nextLevel() {
        console.log(`nextLevel() called - isTransitioning: ${this.isTransitioning}, allowNextLevel: ${this.allowNextLevel}, currentLevel: ${this.currentLevel}, maxLevel: ${this.maxLevel}`);
        
        // Only allow if not in transition and next level is allowed
        if (this.isTransitioning || !this.allowNextLevel) {
            console.log('nextLevel() blocked - isTransitioning or allowNextLevel is false');
            return;
        }
        
        if (this.currentLevel < this.maxLevel) {
            console.log(`Proceeding to load level ${this.currentLevel + 1}`);
            // Hide completion message
            document.getElementById('level-complete').style.display = 'none';
            this.loadLevel(this.currentLevel + 1);
        } else {
            console.log('Already at max level, cannot advance');
        }
    }
    
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new SokobanGame();
});

// Make game available globally for button onclick handlers
window.game = game;
