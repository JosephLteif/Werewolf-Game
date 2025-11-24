# Code Refactoring Summary

## Files Created

### 1. `src/constants.js`
- Exports `ROLES` object with all role definitions
- Exports `PHASES` object with all game phases
- Exports `appId` configuration

### 2. `src/utils.js`
- `generateRoomCode()` - Generates random 4-character room codes
- `calculateGameBalance(gameState, ROLES)` - Calculates game balance and returns:
  - balanceWeight
  - balanceColor
  - balanceText
  - villagersCount
  - totalRolesNeeded
  - playersCount

### 3. `src/components/NightActionUI.jsx`
- Reusable component for night action phases
- Handles player selection (single or multi-select)
- Displays countdown timer
- Supports skip functionality

### 4. `src/components/DeadScreen.jsx`
- Component for dead players and game over screen
- Shows winning team and players
- Displays game log for spectators

## Next Steps to Complete Refactoring

### Update `src/App.jsx`:
1. Add imports:
   ```javascript
   import { ROLES, PHASES, appId } from './constants';
   import { generateRoomCode, calculateGameBalance } from './utils';
   import { NightActionUI } from './components/NightActionUI';
   import { DeadScreen } from './components/DeadScreen';
   ```

2. Remove duplicate definitions:
   - Remove `ROLES` object (lines 14-37)
   - Remove `PHASES` object (lines 39-55)
   - Remove `appId` constant (line 8)
   - Remove `generateRoomCode` function (line 58)
   - Remove `NightActionUI` function (lines 1720-1861)
   - Remove `DeadScreen` function (lines 1863-1960)

3. Update balance calculation in Lobby:
   - Replace the inline balance calculation with:
   ```javascript
   const balanceData = calculateGameBalance(gameState, ROLES);
   const { balanceWeight, balanceColor, balanceText, villagersCount } = balanceData;
   ```

## Benefits
- **Better Organization**: Related code is grouped together
- **Reusability**: Components can be easily reused
- **Maintainability**: Easier to find and update specific functionality
- **Smaller Files**: Main App.jsx will be significantly smaller
- **Testing**: Individual components can be tested in isolation
