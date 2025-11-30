# Nightfall Game 🐺

Welcome to Nightfall, a real-time, local multiplayer game of deception and deduction based on the classic party game Werewolf. This is a React application built with Vite, Firebase, and Tailwind CSS.

## 📜 How to Play

Nightfall is a game of social deduction where players are secretly assigned roles on one of two teams: the **Village** or the **Werewolves**.

- The **Villagers'** goal is to identify and eliminate all the werewolves.
- The **Werewolves'** goal is to eliminate villagers until they equal the number of villagers.

The game is played in two alternating phases: **Night** and **Day**.

- **Night 🌙:** Most players are "asleep". Players with special night roles (like Werewolves, the Seer, or the Doctor) "wake up" and perform their actions secretly.
- **Day ☀️:** All surviving players discuss who they suspect is a werewolf. At the end of the day, players vote to eliminate one person.

The game ends when one team achieves its win condition.

## 🔄 Game Flow

The game proceeds through a series of phases, managed by the host.

```
[ LOBBY ]
    |
    V
[ ROLE REVEAL ] (Players learn their roles)
    |
    V
+-> [ NIGHT ]
|   |
|   V
|   (Night actions for roles like Cupid, Werewolf, Seer, Doctor...)
|   |
|   V
|   [ DAY REVEAL ] (Results of the night are announced)
|   |
|   V
|   [ DAY VOTING ] (Players discuss and vote to eliminate someone)
|   |
|   V
|   (Player is eliminated)
|   |
+---+ (Cycle repeats until a win condition is met)
    |
    V
[ GAME OVER ] (Winning team is announced)
```

## 🎭 Roles

Each player is assigned a role with a unique ability.

| Role             | Team/Alignment  | Description                                                                                       |
| ---------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| **Villager**     | Village (Good)  | A regular person. Your goal is to find the werewolves.                                            |
| **Werewolf**     | Werewolf (Evil) | At night, you and your fellow werewolves choose one player to eliminate.                          |
| **Seer**         | Village (Good)  | Each night, you can check one player's true alignment (Good or Evil).                             |
| **Doctor**       | Village (Good)  | Each night, you can choose one person to protect from being eliminated. You can protect yourself. |
| **Hunter**       | Village (Good)  | If you are eliminated, you get to take one other player down with you.                            |
| **Vigilante**    | Village (Good)  | You have one bullet. You can choose to shoot one person at night.                                 |
| **Sorcerer**     | Werewolf (Evil) | You work for the werewolves. Each night, you can check if a player is the Seer.                   |
| **Minion**       | Werewolf (Evil) | You know who the werewolves are, but they don't know you. You win with the werewolves.            |
| **Cupid**        | Neutral         | On the first night, you choose two players to be "lovers." If one dies, the other dies too.       |
| **Doppelgänger** | Neutral         | On the first night, you choose another player. If that player dies, you take on their role.       |
| **Mason**        | Village (Good)  | You know who the other Masons are. You are on the side of the village.                            |
| **Lycan**        | Village (Good)  | You are a villager, but the Seer sees you as a werewolf.                                          |
| **Mayor**        | Village (Good)  | Your vote counts twice during the day. This can be revealed publicly.                             |

## 🛠️ Setup

1.  **Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Open the link (e.g., `http://localhost:5173`) in your browser.

## 🔧 Configuration

The Firebase configuration is located in `src/firebase.js`.

## 📦 Build

To build for production:

```bash
npm run build
```
