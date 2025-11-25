# Nightfall Game - Project Overview for Gemini

This document provides a comprehensive overview of the "Nightfall Game" project, a multiplayer Werewolf game built using modern web technologies. It is intended to serve as a guide for understanding the project's structure, technologies, and development practices.

## Project Overview

**Purpose**: "Nightfall" is a real-time, local multiplayer Werewolf-style game. Players join a room, get assigned roles (Werewolf, Doctor, Seer, etc.), and interact through night actions and day voting phases until one team achieves its win condition.

**Key Technologies**:
*   **Frontend**: React.js (with Vite for fast development), Tailwind CSS for styling, Lucide React for icons.
*   **Backend/Data**: Firebase (Authentication for user identity, Realtime Database for real-time game state synchronization).
*   **Development Tools**: ESLint for code quality, Vitest for testing.

**Architecture**:
The application follows a component-based architecture typical of React applications.
*   **`App.jsx`**: The main application component that orchestrates game flow, manages user authentication, and renders different "screens" based on the current game phase (`PHASES`).
*   **Components**: Divided into `screens` (e.g., `LobbyScreen`, `NightActionScreen`, `DayVoteScreen`) and `modals` (`RoleInfoModal`).
*   **Custom Hooks**: Extensive use of custom React hooks (`useAuth`, `useGameState`, `useGameLogic`) to encapsulate reusable logic and state management.
    *   `useAuth`: Handles user authentication with Firebase.
    *   `useGameState`: Manages the retrieval and synchronization of game state from Firebase Realtime Database.
    *   `useGameLogic`: Contains the core game rules, role assignments, night action resolution, day voting mechanics, and win condition checks.
*   **Firebase Integration**: `firebase.js` initializes Firebase and exposes `auth` and `rtdb` instances. `rooms.js` provides functions for creating, joining, and subscribing to game rooms, managing the real-time database interactions.
*   **Constants**: `constants/roles.js` and `constants/phases.js` define the game's roles and distinct phases, ensuring consistency throughout the application.

## Building and Running

The project uses `npm` for package management and `Vite` for development and building.

**1. Install Dependencies**:
```bash
npm install
```

**2. Run Locally (Development Mode)**:
This command starts the development server.
```bash
npm run dev
```
The application will typically be accessible at `http://localhost:5173`.

**3. Linting**:
Run ESLint to check for code quality and style issues.
```bash
npm run lint
```

**4. Testing**:
Execute unit and integration tests using Vitest.
```bash
npm run test
```

**5. Build for Production**:
This command bundles the application for deployment.
```bash
npm run build
```

**6. Preview Production Build**:
Serves the production build locally.
```bash
npm run preview
```

## Development Conventions

*   **Code Quality**: ESLint is used to enforce code style and catch potential errors.
*   **Testing**: Vitest is configured for unit and component testing, encouraging a test-driven or behavior-driven development approach.
*   **Modularization**: The codebase is organized into logical directories such as `components`, `hooks`, `constants`, and `services` to promote modularity and maintainability.
*   **State Management**: Game state and user-specific data are managed through a combination of React's `useState`, `useEffect`, and custom hooks, with Firebase Realtime Database as the single source of truth for persistent game state.
*   **Constants**: Key game data like roles and phases are defined as constants, improving readability and reducing magic strings.

**Note on Code Duplication**:
It has been observed that the `generateRoomCode` function is duplicated in both `src/rooms.js` and `src/utils.js`. It is recommended to consolidate this function into a single, shared utility file (e.g., `src/utils/index.js` or `src/utils.js` after moving it there exclusively) to avoid redundancy and ensure consistency.

---
This `GEMINI.md` provides a foundation for understanding the "Nightfall Game" project. For detailed implementation, refer to the individual source files.
