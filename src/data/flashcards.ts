/**
 * Flashcard decks for the Flashcards game.
 *
 * Each card has one of four visual variants, picked by the presence of
 * specific fields:
 *   - `img`         → Fluent UI 3D emoji PNG (with emoji fallback on error)
 *   - `num`         → big numeral (for the numbers deck)
 *   - `shape`       → CSS-drawn shape (for rectangle / oval)
 *   - otherwise     → plain emoji from the `e` field
 *
 * Consumers compose the full image URL as
 * `${FLUENT_IMG_BASE}${card.img}`. The base lives in `@/data/fluent` —
 * import it from there directly.
 *
 * Quiz (post-migration polish, 2026-05-08, Track 1 batch 2): 5
 * multiple-choice questions exercising cross-deck recognition (the whole
 * point of a 14-deck flashcards game). Fourth non-story consumer of
 * `src/lib/quiz.ts` — completes the card-machine sweep. Storage key:
 * `flashcards_quiz_v1`.
 */

import type { QuizQuestion } from '@/lib/quiz';

const E = (code: number): string => String.fromCodePoint(code);

export type CssShape = 'rect' | 'oval';

export interface FlashCard {
  /** Display name shown under the card */
  n: string;
  /** Fun fact read aloud on press */
  f: string;
  /** Plain emoji (always provided; used as fallback when img/shape/num fail) */
  e?: string;
  /** Relative path inside fluentui-emoji to a 3D PNG */
  img?: string;
  /** Hex codepoint used by the emoji fallback when the image fails to load */
  code?: string;
  /** Big numeral — triggers num-face rendering */
  num?: string;
  /** CSS-drawn shape — triggers shape-face rendering */
  shape?: CssShape;
}

export interface Deck {
  /** Short snake-case-ish id used in state + URL hash */
  key: string;
  /** Pill label shown in the category bar (emoji + text) */
  label: string;
  /** Cards in this deck, in display order */
  cards: readonly FlashCard[];
}

export const DECKS: readonly Deck[] = [
  {
    key: 'animals',
    label: `${E(0x1f43e)} Animals`,
    cards: [
      { img: 'Dog/3D/dog_3d.png', code: '1F415', e: E(0x1f415), n: 'Dog', f: 'Dogs are loyal pets that love to play and cuddle!' },
      { img: 'Cat/3D/cat_3d.png', code: '1F408', e: E(0x1f408), n: 'Cat', f: 'Cats purr softly when they feel happy.' },
      { img: 'Elephant/3D/elephant_3d.png', code: '1F418', e: E(0x1f418), n: 'Elephant', f: 'Elephants are the biggest land animals on Earth.' },
      { img: 'Lion/3D/lion_3d.png', code: '1F981', e: E(0x1f981), n: 'Lion', f: 'Lions are called the King of the Jungle!' },
      { img: 'Tiger/3D/tiger_3d.png', code: '1F405', e: E(0x1f405), n: 'Tiger', f: 'Tigers have beautiful orange and black stripes.' },
      { img: 'Giraffe/3D/giraffe_3d.png', code: '1F992', e: E(0x1f992), n: 'Giraffe', f: 'Giraffes have the longest necks of any animal.' },
      { img: 'Koala/3D/koala_3d.png', code: '1F428', e: E(0x1f428), n: 'Koala', f: 'Koalas sleep up to 22 hours every single day!' },
      { img: 'Zebra/3D/zebra_3d.png', code: '1F993', e: E(0x1f993), n: 'Zebra', f: 'Every zebra has a completely unique stripe pattern.' },
      { img: 'Bear/3D/bear_3d.png', code: '1F43B', e: E(0x1f43b), n: 'Bear', f: 'Bears hibernate all winter long to stay warm.' },
      { img: 'Frog/3D/frog_3d.png', code: '1F438', e: E(0x1f438), n: 'Frog', f: 'Frogs can jump 20 times their own body length!' },
      { img: 'Penguin/3D/penguin_3d.png', code: '1F427', e: E(0x1f427), n: 'Penguin', f: 'Penguins cannot fly but swim very fast underwater.' },
      { img: 'Fox%20Face/3D/fox_face_3d.png', code: '1F98A', e: E(0x1f98a), n: 'Fox', f: 'Foxes are very clever and quick animals.' },
      { img: 'Rabbit/3D/rabbit_3d.png', code: '1F407', e: E(0x1f407), n: 'Rabbit', f: 'Rabbits have big ears and can hop very far!' },
      { img: 'Monkey/3D/monkey_3d.png', code: '1F412', e: E(0x1f412), n: 'Monkey', f: 'Monkeys are playful and cleverly swing on trees!' },
      { img: 'Panda/3D/panda_3d.png', code: '1F43C', e: E(0x1f43c), n: 'Panda', f: 'Pandas eat bamboo all day and are black and white.' },
      { img: 'Kangaroo/3D/kangaroo_3d.png', code: '1F998', e: E(0x1f998), n: 'Kangaroo', f: 'Kangaroos carry their babies in a cosy pouch!' },
      { img: 'Horse/3D/horse_3d.png', code: '1F40E', e: E(0x1f40e), n: 'Horse', f: 'Horses run very fast and love to gallop in fields!' },
      { img: 'Pig/3D/pig_3d.png', code: '1F416', e: E(0x1f416), n: 'Pig', f: 'Pigs are very smart and love to roll in mud to cool off.' },
      { img: 'Cow/3D/cow_3d.png', code: '1F404', e: E(0x1f404), n: 'Cow', f: 'Cows give us the milk we drink every day!' },
      { img: 'Wolf/3D/wolf_3d.png', code: '1F43A', e: E(0x1f43a), n: 'Wolf', f: 'Wolves howl at the moon and live in family packs.' },
      { img: 'Crocodile/3D/crocodile_3d.png', code: '1F40A', e: E(0x1f40a), n: 'Crocodile', f: 'Crocodiles are reptiles that love swimming in rivers.' },
      { img: 'Turtle/3D/turtle_3d.png', code: '1F422', e: E(0x1f422), n: 'Turtle', f: 'Turtles carry their cosy home on their back!' },
      { img: 'Camel/3D/camel_3d.png', code: '1F42A', e: E(0x1f42a), n: 'Camel', f: 'Camels store fat in their humps for energy in the desert.' },
      { img: 'Hippopotamus/3D/hippopotamus_3d.png', code: '1F99B', e: E(0x1f99b), n: 'Hippo', f: 'Hippos are huge animals that love to swim in rivers.' },
      { img: 'Ewe/3D/ewe_3d.png', code: '1F411', e: E(0x1f411), n: 'Sheep', f: 'Sheep have fluffy wool coats that keep them warm in winter!' },
      { img: 'Goat/3D/goat_3d.png', code: '1F410', e: E(0x1f410), n: 'Goat', f: 'Goats are curious animals that love to climb on rocks!' },
      { img: 'Deer/3D/deer_3d.png', code: '1F98C', e: E(0x1f98c), n: 'Deer', f: 'Deer are graceful animals that run swiftly through forests.' },
      { img: 'Gorilla/3D/gorilla_3d.png', code: '1F98D', e: E(0x1f98d), n: 'Gorilla', f: 'Gorillas are the biggest and strongest apes on Earth!' },
      { img: 'Mouse%20Face/3D/mouse_face_3d.png', code: '1F42D', e: E(0x1f42d), n: 'Mouse', f: 'Mice are tiny and nibble on seeds and cheese!' },
      { img: 'Hamster/3D/hamster_3d.png', code: '1F439', e: E(0x1f439), n: 'Hamster', f: 'Hamsters stuff food in their big chubby cheeks!' },
      { img: 'Raccoon/3D/raccoon_3d.png', code: '1F99D', e: E(0x1f99d), n: 'Raccoon', f: 'Raccoons have black eye patches like little masked bandits!' },
      { img: 'Otter/3D/otter_3d.png', code: '1F9A6', e: E(0x1f9a6), n: 'Otter', f: "Otters hold hands while sleeping so they don't float away!" },
      { img: 'Hedgehog/3D/hedgehog_3d.png', code: '1F994', e: E(0x1f994), n: 'Hedgehog', f: 'Hedgehogs have hundreds of sharp spines on their back!' },
      { img: 'Llama/3D/llama_3d.png', code: '1F999', e: E(0x1f999), n: 'Llama', f: 'Llamas are friendly animals from South America!' },
      { img: 'Bison/3D/bison_3d.png', code: '1F9AC', e: E(0x1f9ac), n: 'Bison', f: 'Bisons are huge and strong with a big hump on their shoulders.' },
      { img: 'Leopard/3D/leopard_3d.png', code: '1F406', e: E(0x1f406), n: 'Leopard', f: 'Leopards have spots and can climb trees with their prey!' },
    ],
  },
  {
    key: 'birds',
    label: `${E(0x1f99c)} Birds`,
    cards: [
      { img: 'Parrot/3D/parrot_3d.png', code: '1F99C', e: E(0x1f99c), n: 'Parrot', f: 'Parrots can copy human speech perfectly!' },
      { img: 'Eagle/3D/eagle_3d.png', code: '1F985', e: E(0x1f985), n: 'Eagle', f: 'Eagles have incredibly sharp eyesight.' },
      { img: 'Owl/3D/owl_3d.png', code: '1F989', e: E(0x1f989), n: 'Owl', f: 'Owls can turn their heads almost all the way around.' },
      { img: 'Peacock/3D/peacock_3d.png', code: '1F99A', e: E(0x1f99a), n: 'Peacock', f: 'Peacocks fan out their beautiful colourful feathers.' },
      { img: 'Flamingo/3D/flamingo_3d.png', code: '1F9A9', e: E(0x1f9a9), n: 'Flamingo', f: 'Flamingos are pink because they eat pink shrimp!' },
      { img: 'Duck/3D/duck_3d.png', code: '1F986', e: E(0x1f986), n: 'Duck', f: 'Ducks have waterproof feathers and love water.' },
      { img: 'Swan/3D/swan_3d.png', code: '1F9A2', e: E(0x1f9a2), n: 'Swan', f: 'Swans mate for life — they are very loyal birds.' },
      { img: 'Rooster/3D/rooster_3d.png', code: '1F413', e: E(0x1f413), n: 'Rooster', f: 'Roosters crow loudly to welcome the sunrise.' },
      { img: 'Bird/3D/bird_3d.png', code: '1F426', e: E(0x1f426), n: 'Sparrow', f: 'Sparrows are tiny birds that chirp merrily all day.' },
      { img: 'Turkey/3D/turkey_3d.png', code: '1F983', e: E(0x1f983), n: 'Turkey', f: 'Turkeys have colourful feathers and a fan-shaped tail!' },
      { img: 'Baby%20Chick/3D/baby_chick_3d.png', code: '1F424', e: E(0x1f424), n: 'Chick', f: 'Baby chicks are fluffy yellow birds that say cheep cheep!' },
      { img: 'Hatching%20Chick/3D/hatching_chick_3d.png', code: '1F423', e: E(0x1f423), n: 'Hatching Egg', f: 'A chick hatches by pecking its way out of a shell!' },
      { img: 'Dove/3D/dove_3d.png', code: '1F54A', e: E(0x1f54a), n: 'Dove', f: 'Doves are gentle white birds and a symbol of peace.' },
      { img: 'Bat/3D/bat_3d.png', code: '1F987', e: E(0x1f987), n: 'Bat', f: 'Bats are the only mammals that can truly fly — they sleep upside down!' },
    ],
  },
  {
    key: 'food',
    label: `${E(0x1f34e)} Food`,
    cards: [
      { e: E(0x1f34e), n: 'Apple', f: 'Apples come in red, green and yellow colours.' },
      { e: E(0x1f34c), n: 'Banana', f: 'Bananas are a great energy-packed snack!' },
      { e: E(0x1f355), n: 'Pizza', f: 'Pizza was invented in Italy a long time ago.' },
      { e: E(0x1f366), n: 'Ice Cream', f: 'Ice cream is made from chilled milk and cream.' },
      { e: E(0x1f369), n: 'Donut', f: 'Donuts have a fun round hole in the middle!' },
      { e: E(0x1f955), n: 'Carrot', f: 'Carrots are orange and help keep your eyes healthy.' },
      { e: E(0x1f353), n: 'Strawberry', f: 'Strawberries are sweet, juicy red fruits.' },
      { e: E(0x1f33d), n: 'Corn', f: 'Corn grows very tall on a stalk in the field.' },
      { e: E(0x1f349), n: 'Watermelon', f: 'Watermelon is mostly water — perfect on a hot day!' },
      { e: E(0x1f354), n: 'Burger', f: 'Burgers have a soft bun, a patty and yummy toppings.' },
      { e: E(0x1f9c1), n: 'Cupcake', f: 'Cupcakes are little cakes with frosting on top.' },
      { e: E(0x1f36b), n: 'Chocolate', f: 'Chocolate is made from cacao beans from the jungle.' },
      { e: E(0x1f347), n: 'Grapes', f: 'Grapes grow in big bunches on a vine!' },
      { e: E(0x1f352), n: 'Cherry', f: 'Cherries are tiny, sweet and bright red fruits.' },
      { e: E(0x1f34b), n: 'Lemon', f: 'Lemons are sour and yellow — great for lemonade!' },
      { e: E(0x1f34d), n: 'Pineapple', f: 'Pineapples are spiky outside and sweet inside.' },
      { e: E(0x1f36a), n: 'Cookie', f: 'Cookies are yummy baked treats with chocolate chips!' },
      { e: E(0x1f95a), n: 'Egg', f: 'Eggs come from hens and are full of protein!' },
      { e: E(0x1f32d), n: 'Hot Dog', f: 'Hot dogs are sausages tucked snugly in a soft bun.' },
      { e: E(0x1f96e), n: 'Mango', f: 'Mangoes are juicy tropical fruits — the king of fruits!' },
      { e: E(0x1f34a), n: 'Orange', f: 'Oranges are round, juicy and full of vitamin C!' },
      { e: E(0x1f351), n: 'Peach', f: 'Peaches are soft, fuzzy and wonderfully sweet!' },
      { e: E(0x1f350), n: 'Pear', f: 'Pears are green and sweet — great in a lunchbox!' },
      { e: E(0x1f345), n: 'Tomato', f: 'Tomatoes are red and juicy — they are actually fruits!' },
      { e: E(0x1f966), n: 'Broccoli', f: 'Broccoli is a green veggie that looks like a tiny tree!' },
      { e: E(0x1f344), n: 'Mushroom', f: 'Mushrooms grow in forests and taste great in cooking!' },
      { e: E(0x1f9c0), n: 'Cheese', f: 'Cheese is made from milk and comes in many flavours!' },
      { e: E(0x1f95b), n: 'Milk', f: 'Milk from cows makes us strong and healthy!' },
      { e: E(0x1f35e), n: 'Bread', f: 'Bread is baked in an oven and is warm and fluffy!' },
      { e: E(0x1f32e), n: 'Taco', f: 'Tacos are a Mexican food with a crunchy shell!' },
      { e: E(0x1f363), n: 'Sushi', f: 'Sushi is a Japanese food made with rice and fish!' },
      { e: E(0x1f36d), n: 'Lollipop', f: 'Lollipops are sweet round sweets on a stick!' },
      { e: E(0x1f36f), n: 'Honey', f: 'Honey is made by busy bees and is golden and sweet!' },
      { e: E(0x1f37f), n: 'Popcorn', f: 'Popcorn pops when corn kernels get really hot!' },
      { e: E(0x1f967), n: 'Pie', f: 'Pies have a yummy filling baked inside a pastry crust!' },
    ],
  },
  {
    key: 'shapes',
    label: `${E(0x1f537)} Shapes`,
    cards: [
      { e: E(0x2b55), n: 'Circle', f: 'A circle is perfectly round with no corners at all.' },
      { e: E(0x2b1c), n: 'Square', f: 'A square has 4 perfectly equal sides and 4 corners.' },
      { e: E(0x1f53a), n: 'Triangle', f: 'A triangle has 3 sides and 3 sharp corners.' },
      { shape: 'rect', e: E(0x25ac), n: 'Rectangle', f: 'A rectangle has 4 sides — two long and two short.' },
      { e: E(0x1f4a0), n: 'Diamond', f: 'A diamond shape is like a square tilted on its side.' },
      { e: E(0x2b50), n: 'Star', f: 'A star has 5 pointy tips and lights up the night sky!' },
      { e: E(0x2764) + E(0xfe0f), n: 'Heart', f: 'A heart shape is the universal symbol of love.' },
      { e: E(0x1f536), n: 'Hexagon', f: 'A hexagon has 6 sides — just like a honeycomb cell!' },
      { e: E(0x1f319), n: 'Crescent', f: 'A crescent looks like the shape of the new moon.' },
      { shape: 'oval', e: E(0x1f95a), n: 'Oval', f: 'An oval is like a stretched circle — just like an egg!' },
      { e: E(0x2795), n: 'Plus', f: 'A plus sign has 4 lines — we use it to add numbers!' },
      { e: E(0x27a1) + E(0xfe0f), n: 'Arrow', f: 'An arrow points to show us which way to go!' },
      { e: E(0x1f6d1), n: 'Octagon', f: 'An octagon has 8 sides — just like a stop sign!' },
    ],
  },
  {
    key: 'colors',
    label: `${E(0x1f308)} Colors`,
    cards: [
      { e: E(0x1f534), n: 'Red', f: 'Red is the colour of juicy apples and fire trucks!' },
      { e: E(0x1f7e0), n: 'Orange', f: 'Orange is the colour of a ripe, sweet orange fruit.' },
      { e: E(0x1f7e1), n: 'Yellow', f: 'Yellow is the bright colour of the sunny sun.' },
      { e: E(0x1f7e2), n: 'Green', f: 'Green is the colour of fresh grass and leaves.' },
      { e: E(0x1f535), n: 'Blue', f: 'Blue is the colour of the wide sky and deep ocean.' },
      { e: E(0x1f7e3), n: 'Purple', f: 'Purple is made by mixing red and blue together.' },
      { e: E(0x26aa), n: 'White', f: 'White contains all the colours of the rainbow!' },
      { e: E(0x26ab), n: 'Black', f: 'Black absorbs all light — that is why it looks dark.' },
      { e: E(0x1f7e4), n: 'Brown', f: 'Brown is the colour of chocolate and wooden tables.' },
      { e: E(0x1fa77), n: 'Pink', f: 'Pink is a soft and pretty mix of red and white.' },
      { e: E(0x1fa76), n: 'Grey', f: 'Grey is a calm colour — like clouds on a rainy day.' },
      { e: E(0x1f7e1), n: 'Gold', f: 'Gold is a shiny yellow colour — like a treasure chest!' },
    ],
  },
  {
    key: 'numbers',
    label: `${E(0x1f522)} Numbers`,
    cards: [
      { num: '0', n: 'Zero', f: 'Zero means nothing at all — but it is very important!' },
      { num: '1', n: 'One', f: 'One — there is only one sun in our solar system!' },
      { num: '2', n: 'Two', f: 'Two — you have two eyes to see the beautiful world!' },
      { num: '3', n: 'Three', f: 'Three — a tricycle has three wheels!' },
      { num: '4', n: 'Four', f: 'Four — a dog has four legs to run super fast!' },
      { num: '5', n: 'Five', f: 'Five — you have five fingers on one hand!' },
      { num: '6', n: 'Six', f: 'Six — a honeycomb cell has six sides!' },
      { num: '7', n: 'Seven', f: 'Seven — a rainbow has seven beautiful colours!' },
      { num: '8', n: 'Eight', f: 'Eight — a spider has eight legs!' },
      { num: '9', n: 'Nine', f: 'Nine — cats are said to have nine lives!' },
      { num: '10', n: 'Ten', f: 'Ten — ten fingers on both your hands combined!' },
      { num: '11', n: 'Eleven', f: 'Eleven — a football team has eleven players!' },
      { num: '12', n: 'Twelve', f: 'Twelve — there are twelve months in a whole year!' },
      { num: '13', n: 'Thirteen', f: "Thirteen — a baker's dozen has thirteen treats!" },
      { num: '14', n: 'Fourteen', f: 'Fourteen — two weeks have fourteen days in total!' },
      { num: '15', n: 'Fifteen', f: 'Fifteen — a quarter of an hour is fifteen minutes!' },
      { num: '16', n: 'Sixteen', f: 'Sixteen — sixteen crayons fit in a small crayon box!' },
      { num: '17', n: 'Seventeen', f: 'Seventeen — seventeen candles would make a bright cake!' },
      { num: '18', n: 'Eighteen', f: 'Eighteen — eighteen holes make a full golf course!' },
      { num: '19', n: 'Nineteen', f: 'Nineteen — nineteen steps from here to the garden gate!' },
      { num: '20', n: 'Twenty', f: 'Twenty — twenty toes on five friendly frogs!' },
    ],
  },
  {
    key: 'vehicles',
    label: `${E(0x1f697)} Vehicles`,
    cards: [
      { e: E(0x1f697), n: 'Car', f: 'Cars carry families to different places on roads.' },
      { e: E(0x1f68c), n: 'Bus', f: 'Buses carry many people together at once.' },
      { e: E(0x1f682), n: 'Train', f: 'Trains run on special metal tracks across the land.' },
      { e: E(0x2708) + E(0xfe0f), n: 'Airplane', f: 'Airplanes fly high up in the sky above the clouds!' },
      { e: E(0x1f6a2), n: 'Ship', f: 'Big ships sail across vast oceans.' },
      { e: E(0x1f691), n: 'Ambulance', f: 'Ambulances rush sick people to hospital quickly.' },
      { e: E(0x1f692), n: 'Fire Truck', f: 'Fire trucks carry water to put out blazing fires.' },
      { e: E(0x1f681), n: 'Helicopter', f: 'Helicopters can hover perfectly still in the air.' },
      { e: E(0x1f6b2), n: 'Bicycle', f: 'Bicycles have two wheels and need you to pedal!' },
      { e: E(0x1f680), n: 'Rocket', f: 'Rockets blast off and travel into outer space!' },
      { e: E(0x1f3cd) + E(0xfe0f), n: 'Motorcycle', f: 'Motorcycles are fast two-wheeled vehicles!' },
      { e: E(0x1f69c), n: 'Tractor', f: 'Tractors are big and strong and work on farms.' },
      { e: E(0x1f695), n: 'Taxi', f: 'Taxis are yellow cars you can hire for a ride.' },
      { e: E(0x1f693), n: 'Police Car', f: 'Police cars help keep everyone safe on the roads.' },
      { e: E(0x1f69a), n: 'Truck', f: 'Trucks carry heavy loads across long distances.' },
      { e: E(0x26f5), n: 'Sailboat', f: 'Sailboats use the wind to glide across the water.' },
      { e: E(0x1f6f4), n: 'Scooter', f: 'Scooters are small two-wheeled rides — great for kids!' },
      { e: E(0x1f6f9), n: 'Skateboard', f: 'Skateboards have four wheels and need great balance!' },
      { e: E(0x1f690), n: 'Van', f: 'Vans are big boxy vehicles that carry lots of people.' },
      { e: E(0x1f68a), n: 'Tram', f: 'Trams run on rails along city streets.' },
      { e: E(0x1f6f6), n: 'Canoe', f: 'Canoes are narrow boats you paddle on rivers!' },
      { e: E(0x1f6a0), n: 'Cable Car', f: 'Cable cars hang from wires and climb steep hills!' },
      { e: E(0x26f4) + E(0xfe0f), n: 'Ferry', f: 'Ferries carry cars and people across water.' },
      { e: E(0x1f6f8), n: 'Flying Saucer', f: 'A flying saucer is a round spacecraft from outer space!' },
    ],
  },
  {
    key: 'sea',
    label: `${E(0x1f30a)} Sea Animals`,
    cards: [
      { img: 'Tropical%20Fish/3D/tropical_fish_3d.png', code: '1F420', e: E(0x1f420), n: 'Clownfish', f: 'Clownfish are bright orange and live in sea anemones!' },
      { img: 'Fish/3D/fish_3d.png', code: '1F41F', e: E(0x1f41f), n: 'Fish', f: 'Fish breathe underwater through special organs called gills!' },
      { img: 'Spouting%20Whale/3D/spouting_whale_3d.png', code: '1F433', e: E(0x1f433), n: 'Whale', f: 'Whales are the biggest animals that have ever lived on Earth!' },
      { img: 'Dolphin/3D/dolphin_3d.png', code: '1F42C', e: E(0x1f42c), n: 'Dolphin', f: 'Dolphins are very smart and love to jump and play in waves!' },
      { img: 'Shark/3D/shark_3d.png', code: '1F988', e: E(0x1f988), n: 'Shark', f: 'Sharks are powerful fish with rows of very sharp teeth.' },
      { img: 'Octopus/3D/octopus_3d.png', code: '1F419', e: E(0x1f419), n: 'Octopus', f: 'Octopuses have 8 amazing arms and are incredibly clever!' },
      { img: 'Crab/3D/crab_3d.png', code: '1F980', e: E(0x1f980), n: 'Crab', f: 'Crabs walk sideways and have powerful pincers!' },
      { img: 'Lobster/3D/lobster_3d.png', code: '1F99E', e: E(0x1f99e), n: 'Lobster', f: 'Lobsters live on the ocean floor and have 10 legs!' },
      { img: 'Blowfish/3D/blowfish_3d.png', code: '1F421', e: E(0x1f421), n: 'Blowfish', f: 'Blowfish puff up like a spiky ball when they are scared!' },
      { img: 'Squid/3D/squid_3d.png', code: '1F991', e: E(0x1f991), n: 'Squid', f: 'Squids shoot ink at enemies to escape quickly!' },
      { img: 'Seal/3D/seal_3d.png', code: '1F9AD', e: E(0x1f9ad), n: 'Seal', f: 'Seals are playful and can balance balls on their noses!' },
      { img: 'Shrimp/3D/shrimp_3d.png', code: '1F990', e: E(0x1f990), n: 'Shrimp', f: 'Shrimps are tiny sea creatures that swim backwards!' },
      { img: 'Turtle/3D/turtle_3d.png', code: '1F422', e: E(0x1f422), n: 'Sea Turtle', f: 'Sea turtles swim thousands of miles across the ocean!' },
      { img: 'Spiral%20Shell/3D/spiral_shell_3d.png', code: '1F41A', e: E(0x1f41a), n: 'Shell', f: 'Shells are the cosy homes of snails and other sea creatures!' },
    ],
  },
  {
    key: 'insects',
    label: `${E(0x1f41b)} Insects`,
    cards: [
      { img: 'Honeybee/3D/honeybee_3d.png', code: '1F41D', e: E(0x1f41d), n: 'Bee', f: 'Bees make honey and carry pollen to help flowers grow!' },
      { img: 'Butterfly/3D/butterfly_3d.png', code: '1F98B', e: E(0x1f98b), n: 'Butterfly', f: 'Butterflies start as caterpillars then grow beautiful wings!' },
      { img: 'Lady%20Beetle/3D/lady_beetle_3d.png', code: '1F41E', e: E(0x1f41e), n: 'Ladybug', f: 'Ladybugs are red with black spots and eat harmful insects!' },
      { img: 'Ant/3D/ant_3d.png', code: '1F41C', e: E(0x1f41c), n: 'Ant', f: 'Ants are tiny but can carry 50 times their own body weight!' },
      { img: 'Snail/3D/snail_3d.png', code: '1F40C', e: E(0x1f40c), n: 'Snail', f: 'Snails carry their shell house everywhere they go!' },
      { img: 'Bug/3D/bug_3d.png', code: '1F41B', e: E(0x1f41b), n: 'Caterpillar', f: 'Caterpillars munch leaves before turning into butterflies!' },
      { img: 'Spider/3D/spider_3d.png', code: '1F577', e: E(0x1f577), n: 'Spider', f: 'Spiders spin silky webs to catch their food!' },
      { img: 'Cricket/3D/cricket_3d.png', code: '1F997', e: E(0x1f997), n: 'Cricket', f: 'Crickets make music by rubbing their wings together!' },
      { img: 'Mosquito/3D/mosquito_3d.png', code: '1F99F', e: E(0x1f99f), n: 'Mosquito', f: 'Mosquitoes make a loud buzz with their very fast wings.' },
      { img: 'Beetle/3D/beetle_3d.png', code: '1FAB2', e: E(0x1fab2), n: 'Beetle', f: 'Beetles are the most common insects in the whole world!' },
      { img: 'Cockroach/3D/cockroach_3d.png', code: '1FAB3', e: E(0x1fab3), n: 'Cockroach', f: 'Cockroaches can run very fast and have been here since dinosaurs!' },
      { img: 'Worm/3D/worm_3d.png', code: '1FAB1', e: E(0x1fab1), n: 'Worm', f: 'Worms dig through soil and help plants grow strong roots!' },
    ],
  },
  {
    key: 'bodyparts',
    label: `${E(0x1f9d2)} Body Parts`,
    cards: [
      { img: 'Eyes/3D/eyes_3d.png', code: '1F440', e: E(0x1f440), n: 'Eyes', f: 'Your eyes help you see all the beautiful colours in the world!' },
      { img: 'Ear/3D/ear_3d.png', code: '1F442', e: E(0x1f442), n: 'Ear', f: 'Your ears help you hear music, birds singing, and people talking!' },
      { img: 'Nose/3D/nose_3d.png', code: '1F443', e: E(0x1f443), n: 'Nose', f: 'Your nose helps you smell yummy food and beautiful flowers!' },
      { img: 'Mouth/3D/mouth_3d.png', code: '1F444', e: E(0x1f444), n: 'Mouth', f: 'Your mouth helps you eat, talk, sing, and smile!' },
      { img: 'Tongue/3D/tongue_3d.png', code: '1F445', e: E(0x1f445), n: 'Tongue', f: 'Your tongue helps you taste sweet, sour, salty, and yummy things!' },
      { img: 'Tooth/3D/tooth_3d.png', code: '1F9B7', e: E(0x1f9b7), n: 'Tooth', f: 'Your teeth help you chew food — brush them every day!' },
      { img: 'Raised%20Hand/3D/raised_hand_3d.png', code: '270B', e: E(0x270b), n: 'Hand', f: 'Your hands help you hold things, wave hello, and draw pictures!' },
      { img: 'Thumbs%20Up/3D/thumbs_up_3d.png', code: '1F44D', e: E(0x1f44d), n: 'Thumb', f: 'Your thumb is special — it helps you grab and hold things!' },
      { img: 'Victory%20Hand/3D/victory_hand_3d.png', code: '270C', e: E(0x270c), n: 'Fingers', f: 'You have ten fingers — five on each hand — to grab and point!' },
      { img: 'Flexed%20Biceps/3D/flexed_biceps_3d.png', code: '1F4AA', e: E(0x1f4aa), n: 'Arm', f: 'Your arms help you hug, reach high, and carry things!' },
      { img: 'Leg/3D/leg_3d.png', code: '1F9B5', e: E(0x1f9b5), n: 'Leg', f: 'Your legs help you walk, run, jump, and dance!' },
      { img: 'Foot/3D/foot_3d.png', code: '1F9B6', e: E(0x1f9b6), n: 'Foot', f: 'Your feet help you stand, walk, run, and kick a ball!' },
      { img: 'Brain/3D/brain_3d.png', code: '1F9E0', e: E(0x1f9e0), n: 'Brain', f: 'Your brain helps you think, learn, remember, and dream!' },
      { img: 'Anatomical%20Heart/3D/anatomical_heart_3d.png', code: '1FAC0', e: E(0x1fac0), n: 'Heart', f: 'Your heart pumps blood all around your body — it never stops!' },
      { img: 'Bone/3D/bone_3d.png', code: '1F9B4', e: E(0x1f9b4), n: 'Bone', f: 'You have 206 bones inside your body that hold you up!' },
    ],
  },
  {
    key: 'emotions',
    label: `${E(0x1f60a)} Emotions`,
    cards: [
      { img: 'Grinning%20Face/3D/grinning_face_3d.png', code: '1F600', e: E(0x1f600), n: 'Happy', f: 'You feel happy when you play with your friends and family!' },
      { img: 'Crying%20Face/3D/crying_face_3d.png', code: '1F622', e: E(0x1f622), n: 'Sad', f: 'It is okay to feel sad sometimes — a hug always helps!' },
      { img: 'Enraged%20Face/3D/enraged_face_3d.png', code: '1F621', e: E(0x1f621), n: 'Angry', f: 'When you feel angry, take a deep breath and count to five!' },
      { img: 'Face%20with%20Open%20Mouth/3D/face_with_open_mouth_3d.png', code: '1F62E', e: E(0x1f62e), n: 'Surprised', f: 'You feel surprised when something unexpected happens!' },
      { img: 'Fearful%20Face/3D/fearful_face_3d.png', code: '1F628', e: E(0x1f628), n: 'Scared', f: 'Everyone feels scared sometimes — being brave means trying anyway!' },
      { img: 'Smiling%20Face%20with%20Heart-Eyes/3D/smiling_face_with_heart-eyes_3d.png', code: '1F60D', e: E(0x1f60d), n: 'Love', f: 'You feel love when you care about someone very much!' },
      { img: 'Thinking%20Face/3D/thinking_face_3d.png', code: '1F914', e: E(0x1f914), n: 'Thinking', f: 'You make a thinking face when you are figuring something out!' },
      { img: 'Sleepy%20Face/3D/sleepy_face_3d.png', code: '1F62A', e: E(0x1f62a), n: 'Sleepy', f: 'You feel sleepy when your body needs rest — time for bed!' },
      { img: 'Confused%20Face/3D/confused_face_3d.png', code: '1F615', e: E(0x1f615), n: 'Confused', f: 'You feel confused when something does not make sense yet!' },
      { img: 'Face%20with%20Tears%20of%20Joy/3D/face_with_tears_of_joy_3d.png', code: '1F602', e: E(0x1f602), n: 'Laughing', f: 'You laugh so hard that happy tears come out of your eyes!' },
      { img: 'Worried%20Face/3D/worried_face_3d.png', code: '1F61F', e: E(0x1f61f), n: 'Worried', f: 'You feel worried when you are not sure what will happen next!' },
      { img: 'Disappointed%20Face/3D/disappointed_face_3d.png', code: '1F61E', e: E(0x1f61e), n: 'Disappointed', f: 'You feel disappointed when things do not go the way you hoped.' },
      { img: 'Hugging%20Face/3D/hugging_face_3d.png', code: '1F917', e: E(0x1f917), n: 'Caring', f: 'A warm hug shows someone you care about them!' },
      { img: 'Star-Struck/3D/star-struck_3d.png', code: '1F929', e: E(0x1f929), n: 'Excited', f: 'You feel excited when something amazing is about to happen!' },
      { img: 'Yawning%20Face/3D/yawning_face_3d.png', code: '1F971', e: E(0x1f971), n: 'Bored', f: 'You feel bored when there is nothing fun to do — try drawing!' },
    ],
  },
  {
    key: 'opposites',
    label: `${E(0x1f504)} Opposites`,
    cards: [
      { e: E(0x2b06) + E(0xfe0f), n: 'Up', f: 'Up means going higher — like a bird flying into the sky!' },
      { e: E(0x2b07) + E(0xfe0f), n: 'Down', f: 'Down means going lower — like a ball rolling down a hill!' },
      { e: E(0x1f506), n: 'Big', f: 'An elephant is big — it is the largest land animal!' },
      { e: E(0x1f505), n: 'Small', f: 'An ant is small — but it can carry 50 times its weight!' },
      { e: E(0x1f525), n: 'Hot', f: 'The sun is hot — it warms the whole Earth!' },
      { e: E(0x2744) + E(0xfe0f), n: 'Cold', f: 'Snow is cold — it turns water into fluffy white flakes!' },
      { e: E(0x1f31e), n: 'Day', f: 'During the day, the sun shines and everything is bright!' },
      { e: E(0x1f31a), n: 'Night', f: 'At night, the moon and stars come out in the dark sky!' },
      { e: E(0x1f3c3), n: 'Fast', f: 'A cheetah is fast — it can run faster than a car in a city!' },
      { e: E(0x1f422), n: 'Slow', f: 'A turtle is slow — but it always reaches where it is going!' },
      { e: E(0x1f4aa), n: 'Strong', f: 'An elephant is strong — it can push down a whole tree!' },
      { e: E(0x1fab6), n: 'Light', f: 'A feather is light — it floats gently in the air!' },
      { e: E(0x1f603), n: 'Happy', f: 'You feel happy when you laugh and play with your friends!' },
      { e: E(0x1f622), n: 'Sad', f: 'You feel sad when something makes you want to cry!' },
      { e: E(0x1f4e2), n: 'Loud', f: 'Thunder is loud — it makes a big booming sound!' },
      { e: E(0x1f910), n: 'Quiet', f: 'A library is quiet — everyone whispers softly there!' },
      { e: E(0x2b50), n: 'New', f: 'A new toy is shiny and has never been played with before!' },
      { e: E(0x1f9f8), n: 'Old', f: 'An old teddy bear is soft and full of happy memories!' },
    ],
  },
  {
    key: 'instruments',
    label: `${E(0x1f3b5)} Instruments`,
    cards: [
      { img: 'Guitar/3D/guitar_3d.png', code: '1F3B8', e: E(0x1f3b8), n: 'Guitar', f: 'A guitar has strings that you strum to make music!' },
      { img: 'Drum/3D/drum_3d.png', code: '1F941', e: E(0x1f941), n: 'Drum', f: 'You hit a drum with sticks to make a loud beat!' },
      { img: 'Trumpet/3D/trumpet_3d.png', code: '1F3BA', e: E(0x1f3ba), n: 'Trumpet', f: 'A trumpet is a shiny brass horn that plays loud and bright!' },
      { img: 'Violin/3D/violin_3d.png', code: '1F3BB', e: E(0x1f3bb), n: 'Violin', f: 'A violin sings sweetly when you slide a bow across its strings!' },
      { img: 'Saxophone/3D/saxophone_3d.png', code: '1F3B7', e: E(0x1f3b7), n: 'Saxophone', f: 'A saxophone makes smooth jazzy sounds and is made of brass!' },
      { img: 'Piano%20Keys/3D/piano_keys_3d.png', code: '1F3B9', e: E(0x1f3b9), n: 'Piano', f: 'A piano has black and white keys that play different notes!' },
      { img: 'Banjo/3D/banjo_3d.png', code: '1FA95', e: E(0x1fa95), n: 'Banjo', f: 'A banjo has a round body and strings that make a twangy sound!' },
      { img: 'Accordion/3D/accordion_3d.png', code: '1FA97', e: E(0x1fa97), n: 'Accordion', f: 'An accordion is squeezed in and out to push air through reeds!' },
      { img: 'Long%20drum/3D/long_drum_3d.png', code: '1FA98', e: E(0x1fa98), n: 'Bongo', f: 'Bongos are small drums you play with your hands!' },
      { img: 'Maracas/3D/maracas_3d.png', code: '1FA87', e: E(0x1fa87), n: 'Maracas', f: 'Maracas are shakers filled with tiny beads that rattle!' },
      { img: 'Flute/3D/flute_3d.png', code: '1FA88', e: E(0x1fa88), n: 'Flute', f: 'A flute is a long thin pipe you blow across to make gentle music!' },
      { e: E(0x1f514), n: 'Bell', f: 'Bells ring with a clear ding-dong sound when you shake them!' },
      { e: E(0x1f3b6), n: 'Xylophone', f: 'A xylophone has colourful bars you hit with mallets to play tunes!' },
      { e: E(0x1f3bc), n: 'Harp', f: 'A harp has many strings you pluck gently to make dreamy music!' },
    ],
  },
  {
    key: 'rhyming',
    label: `${E(0x1f4ac)} Rhyming`,
    cards: [
      { e: E(0x1f431), n: 'Cat – Hat', f: 'The cat sat on the mat and wore a funny hat!' },
      { e: E(0x1f415), n: 'Dog – Log', f: 'The dog sat on a log near a pond in the fog!' },
      { e: E(0x1f41d), n: 'Bee – Tree', f: 'The busy bee flew up to the tall tree!' },
      { e: E(0x1f42d), n: 'Mouse – House', f: 'The little mouse lived in a tiny house!' },
      { e: E(0x1f438), n: 'Frog – Bog', f: 'The frog jumped into the squishy bog!' },
      { e: E(0x1f411), n: 'Sheep – Sleep', f: 'Count the sheep to help you fall asleep!' },
      { e: E(0x2b50), n: 'Star – Car', f: 'I saw a star while riding in the car!' },
      { e: E(0x1f319), n: 'Moon – Spoon', f: 'Hey diddle diddle, the dish ran away with the spoon under the moon!' },
      { e: E(0x1f382), n: 'Cake – Lake', f: 'Let us eat cake by the beautiful blue lake!' },
      { e: E(0x1f380), n: 'Bow – Snow', f: 'She tied a big bow and played in the snow!' },
      { e: E(0x1f451), n: 'King – Ring', f: 'The king wore a golden ring and started to sing!' },
      { e: E(0x1f4d6), n: 'Book – Cook', f: 'The cook read a book about how to bake!' },
      { e: E(0x1f3b5), n: 'Song – Long', f: 'We sang a song that was very long!' },
      { e: E(0x2600) + E(0xfe0f), n: 'Sun – Fun', f: 'Playing in the sun is so much fun!' },
    ],
  },
] as const;

/** Look up a deck by its `key`; falls back to the first deck. */
export function getDeck(key: string): Deck {
  return DECKS.find((d) => d.key === key) ?? DECKS[0]!;
}

// Cross-deck recognition quiz. Each question mixes options from
// different decks (animal vs food vs vehicle vs shape, etc.) so the
// child practises the *category boundary* the flashcard game is
// teaching, rather than memorising a single deck.
export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'Which of these is a FRUIT?',
    opts: ['Lion', 'Apple', 'Triangle', 'Trumpet'],
    ans: 1,
  },
  {
    q: 'Which of these is a VEHICLE?',
    opts: ['Banana', 'Crocodile', 'Bicycle', 'Square'],
    ans: 2,
  },
  {
    q: 'Which of these is an INSECT?',
    opts: ['Eagle', 'Butterfly', 'Dolphin', 'Apple'],
    ans: 1,
  },
  {
    q: 'Which of these is a SHAPE?',
    opts: ['Penguin', 'Pizza', 'Star', 'Drum'],
    ans: 2,
  },
  {
    q: 'Which of these is a MUSICAL INSTRUMENT?',
    opts: ['Tiger', 'Train', 'Strawberry', 'Guitar'],
    ans: 3,
  },
];
