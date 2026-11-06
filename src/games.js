// Lista de jocuri. Pune fișierele .swf în public/games/ și adaugă câte o intrare aici.
// "swf" este calea din folderul public (ex: "/games/nume.swf").
// "thumb" poate fi o imagine din public/thumbs/ (ex: "/thumbs/nume.png"); dacă lipsește, se folosește emoji + culoare.

export const CATEGORIES = ['Toate', 'Acțiune', 'Aventură', 'Puzzle', 'Sport', 'Strategie', 'Arcade']

export const GAMES = [
  { id: 'space-blaster', title: 'Space Blaster', category: 'Acțiune', swf: '/games/space-blaster.swf', emoji: '🚀', color: '#6d28d9', description: 'Distruge navele inamice și supraviețuiește cât mai mult.' },
  { id: 'dungeon-quest', title: 'Dungeon Quest', category: 'Aventură', swf: '/games/dungeon-quest.swf', emoji: '🗡️', color: '#b45309', description: 'Explorează temnițe și găsește comoara ascunsă.' },
  { id: 'block-drop', title: 'Block Drop', category: 'Puzzle', swf: '/games/block-drop.swf', emoji: '🧩', color: '#0e7490', description: 'Potrivește blocurile și completează liniile.' },
  { id: 'penalty-kick', title: 'Penalty Kick', category: 'Sport', swf: '/games/penalty-kick.swf', emoji: '⚽', color: '#15803d', description: 'Marchează cât mai multe goluri din penalty.' },
  { id: 'tower-defense', title: 'Tower Defense', category: 'Strategie', swf: '/games/tower-defense.swf', emoji: '🏰', color: '#9f1239', description: 'Construiește turnuri și oprește valurile de inamici.' },
  { id: 'snake-retro', title: 'Snake Retro', category: 'Arcade', swf: '/games/snake-retro.swf', emoji: '🐍', color: '#4d7c0f', description: 'Clasicul șarpe, cu un strop de nostalgie.' },
  { id: 'ninja-run', title: 'Ninja Run', category: 'Acțiune', swf: '/games/ninja-run.swf', emoji: '🥷', color: '#334155', description: 'Fugi, sari și evită obstacolele ca un adevărat ninja.' },
  { id: 'island-escape', title: 'Island Escape', category: 'Aventură', swf: '/games/island-escape.swf', emoji: '🏝️', color: '#0369a1', description: 'Rezolvă ghicitori și scapă de pe insula misterioasă.' },
]
