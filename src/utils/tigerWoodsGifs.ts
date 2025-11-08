// Collection of Tiger Woods celebration and iconic moment GIFs
const TIGER_WOODS_GIFS = [
  "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif", // Fist pump
  "https://media.giphy.com/media/26uf4r3EldfX5Ykqk/giphy.gif", // Victory celebration
  "https://media.giphy.com/media/xT8qBhrlHGEgMsv03u/giphy.gif", // Epic swing
  "https://media.giphy.com/media/3o7TKQqGEret4GzqUg/giphy.gif", // Chip shot celebration
  "https://media.giphy.com/media/l0HlQ7LRalQqdWfao/giphy.gif", // Classic fist pump
  "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif", // Masters celebration
];

export const getRandomTigerGif = (): string => {
  return TIGER_WOODS_GIFS[Math.floor(Math.random() * TIGER_WOODS_GIFS.length)];
};
