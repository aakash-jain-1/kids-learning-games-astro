// Dinosaur card deck. Ported from games/dinosaurs-game.html lines 256-272.
// Typed so TypeScript catches typos in diet and missing fields.
//
// Quiz (post-migration polish, 2026-05-08): 5 multiple-choice
// questions about the deck content. First non-story consumer of the
// shared `src/lib/quiz.ts` controller — all answers are facts that
// appear verbatim in the card `f` text, so a child who has flipped
// through the deck (or had a parent read it) should be able to score
// 100 % from memory. Per-game LocalStorage key: `dinosaurs_quiz_v1`.

import type { QuizQuestion } from '@/lib/quiz';

export type Diet = 'carnivore' | 'herbivore' | 'omnivore';

export interface DinosaurCard {
  e: string;
  n: string;
  diet: Diet;
  f: string;
}

export interface DietFilter {
  key: 'all' | Diet;
  label: string;
}

export const ALL_CARDS: readonly DinosaurCard[] = [
  { e: '🦖', n: 'T-Rex', diet: 'carnivore', f: 'T-Rex was the most fearsome hunter EVER! Its jaws could crush solid bone, and its teeth were as sharp as knives. Every other dinosaur ran away when T-Rex came stomping. ROAAR!' },
  { e: '🦏', n: 'Triceratops', diet: 'herbivore', f: 'Triceratops means THREE-HORNED FACE! It had two long horns above its eyes and one on its nose. Its huge bony neck frill helped it impress friends — and its skull was as long as a whole car!' },
  { e: '🦒', n: 'Brachiosaurus', diet: 'herbivore', f: 'Brachiosaurus had a neck as tall as a FIVE-STOREY BUILDING! Just like a giant giraffe, it stretched up to munch leaves from the very tops of the tallest trees. Nom nom nom!' },
  { e: '🦕', n: 'Stegosaurus', diet: 'herbivore', f: 'Stegosaurus had two rows of huge diamond-shaped plates on its back — like a built-in crown! Its spiky tail could punch holes in big predators. But its tiny brain? Only the size of a WALNUT!' },
  { e: '🐾', n: 'Velociraptor', diet: 'carnivore', f: 'Velociraptor means QUICK THIEF! It was only turkey-sized but super clever, with a sharp hooked claw on each foot. And the BIG surprise — Velociraptors were actually covered in FEATHERS!' },
  { e: '🦅', n: 'Pterodactyl', diet: 'carnivore', f: 'Pterodactyl was not a dinosaur — it was a FLYING REPTILE! It soared on giant leathery wings and swooped down to snatch fish from rivers. The biggest ones had wings wider than a small plane!' },
  { e: '🐍', n: 'Diplodocus', diet: 'herbivore', f: 'Diplodocus was one of the LONGEST animals ever — up to 27 metres, longer than two school buses! It could crack its long whip-like tail so hard it made a SONIC BOOM to scare away enemies!' },
  { e: '🛡️', n: 'Ankylosaurus', diet: 'herbivore', f: "Ankylosaurus was a living TANK! Its whole body was covered in thick armour plates from nose to tail. And its tail had a giant bony club — one big swing could SHATTER T-Rex's leg!" },
  { e: '🐢', n: 'Spinosaurus', diet: 'carnivore', f: 'Spinosaurus was BIGGER than T-Rex — the largest meat-eating dinosaur ever! It swam in rivers to hunt fish as big as cars. Its giant back sail stuck out of the water to warn others to stay away!' },
  { e: '🦎', n: 'Iguanodon', diet: 'herbivore', f: 'Iguanodon was one of the VERY FIRST dinosaurs scientists ever found! It had a special spike on its thumb — like a dino pocketknife — that it used to pull branches down and grab tasty leaves!' },
  { e: '🎺', n: 'Parasaurolophus', diet: 'herbivore', f: 'Parasaurolophus had a long hollow tube on its head just like a TROMBONE! It blew air through it to make a deep BOOMING HONK heard by its whole herd from far, far away. The loudest dinosaur!' },
  { e: '👾', n: 'Allosaurus', diet: 'carnivore', f: 'Allosaurus was the KING of the Jurassic! It hunted giant dinosaurs like Stegosaurus and Diplodocus. It could swing its top jaw down like an axe to take enormous chomping bites — bigger than your head!' },
  { e: '🪨', n: 'Pachycephalosaurus', diet: 'omnivore', f: 'Pachycephalosaurus had the THICKEST skull ever — 25 cm of solid rock-hard bone! Males would run at full speed and HEAD-BUTT each other like living battering rams to see who was strongest!' },
  { e: '🐦', n: 'Compsognathus', diet: 'carnivore', f: 'Compsognathus was only the size of a CHICKEN — one of the smallest dinosaurs ever! But this tiny terror was lightning fast and chased lizards and bugs like a speedy little dino cheetah!' },
  { e: '🦣', n: 'Mammoth', diet: 'herbivore', f: 'The Woolly Mammoth lived in the freezing ICE AGE! It had a thick warm coat, giant curved tusks as long as a car, and was as big as an elephant. Early cave people painted pictures of them on cave walls!' },
];

export const FILTERS: readonly DietFilter[] = [
  { key: 'all', label: 'All 🦖' },
  { key: 'carnivore', label: '🥩 Carnivore' },
  { key: 'herbivore', label: '🌿 Herbivore' },
  { key: 'omnivore', label: '🍽️ Omnivore' },
];

export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'Which dinosaur had three horns on its face and a huge bony neck frill?',
    opts: ['T-Rex', 'Triceratops', 'Stegosaurus', 'Velociraptor'],
    ans: 1,
  },
  {
    q: 'Which was one of the LONGEST dinosaurs ever, with a whip-like tail that could make a sonic BOOM?',
    opts: ['Brachiosaurus', 'Spinosaurus', 'Diplodocus', 'Iguanodon'],
    ans: 2,
  },
  {
    q: 'Pterodactyl was actually NOT a dinosaur — what was it?',
    opts: ['A swimming reptile', 'A flying reptile', 'A giant bird', 'A baby T-Rex'],
    ans: 1,
  },
  {
    q: 'Which dinosaur was only the size of a turkey and was actually covered in FEATHERS?',
    opts: ['Compsognathus', 'Allosaurus', 'Velociraptor', 'Pachycephalosaurus'],
    ans: 2,
  },
  {
    q: 'Which big furry animal lived during the freezing ICE AGE and was painted by early cave people?',
    opts: ['Mammoth', 'Ankylosaurus', 'Spinosaurus', 'Parasaurolophus'],
    ans: 0,
  },
];
