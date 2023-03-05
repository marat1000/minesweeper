import './sass/style.scss';

const BOARD_SIZE = 16;
const BOMB_QUANTITY = 40;
const TILE_SIZE = 30;
const DIGITS = {
  0: `zero`,
  1: `one`,
  2: `two`,
  3: `three`,
  4: `four`,
  5: `five`,
  6: `six`,
  7: `seven`,
  8: `eight`,
  9: `nine`,
} as const;

const restartBtn = document.querySelector(`.btn`);
const board = document.querySelector(`.board`) as HTMLElement;
const timerHundreds = document.querySelector(".timer__hundreds");
const timerTens = document.querySelector(".timer__tens");
const timerSeconds = document.querySelector(".timer__seconds");


let firstClick = true;
let gameOver = false;
let tiles: NodeListOf<HTMLDivElement>;
let bombs: string[] = [];
let mistakenBombs: string[] = [];
let numbers: string[] = [];
let quantityMarkedBombs = 0;
let quantityUnMarkedBombs = BOMB_QUANTITY;
let startTime: number;
let elapsedTime = 0;
let timerInterval: NodeJS.Timer;


setup();

function setup() {
  for (let i = 0; i < BOARD_SIZE ** 2; i++) {
    const tile = document.createElement(`div`);
    tile.classList.add(`tile`);
    board.appendChild(tile);
  }
  tiles = document.querySelectorAll(`.tile`);
  board.style.width = BOARD_SIZE * TILE_SIZE + `px`;

  document.documentElement.style.setProperty(`--tileSize`, `${TILE_SIZE}px`);
  document.documentElement.style.setProperty(`--boardSize`, `${BOARD_SIZE * TILE_SIZE}px`);
  quantityMarkedBombs = 0;
  quantityUnMarkedBombs = BOMB_QUANTITY;
  printCounterBombs(quantityUnMarkedBombs);
  let x = 0;
  let y = 0;
  tiles.forEach((tile, i) => {
    tile.setAttribute(`data-tile`, `${x},${y}`);
    x++;
    if (x >= BOARD_SIZE) {
      x = 0;
      y++;
    }

    tile.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      mark(tile);
    });

    tile.addEventListener(`mousedown`, function (e) {
      if (gameOver) return;
      if (e.button === 0 && !tile.classList.contains(`tile--checked`)) {
        restartBtn?.classList.add(`btn--dismay`);
      }
    });

    tile.addEventListener(`mouseout`, function (e) {
      restartBtn?.classList.remove(`btn--dismay`);
    });

    tile.addEventListener(`click`, function (e) {
      if (firstClick) {
        processFirstClick(tile);
        firstClick = false;
        startTimer();
      }
      clickTile(tile);
      restartBtn?.classList.remove(`btn--dismay`);
    });
  });
}

restartBtn?.addEventListener(`click`, function (e) {
  e.preventDefault();
  restart();
});

function restart() {
  gameOver = false;
  firstClick = true;
  bombs = [];
  mistakenBombs = [];
  numbers = [];
  restartBtn?.classList.remove(`btn--defeat`, `btn--win`, `btn--dismay`);
  tiles.forEach(tile => {
    tile.remove();
  });
  setup();
  resetTimer();
}

function createRandomArray() {
  const arr = new Array(BOARD_SIZE ** 2 - 1);
  arr.fill(false);
  arr.fill(true, 0, BOMB_QUANTITY);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    if (arr[i] !== arr[j]) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

function processFirstClick(firstTile: HTMLDivElement) {
  const coordinates = (firstTile.getAttribute(`data-tile`) as string).split(`,`);
  const x = parseInt(coordinates[0]);
  const y = parseInt(coordinates[1]);
  const firstClickPosition = BOARD_SIZE * y + x;
  const randomArray = createRandomArray();
  randomArray.splice(firstClickPosition, 0, false);
  tiles.forEach((tile, i) => {
    const coordinates = tile.getAttribute(`data-tile`) as string;
    const coords = coordinates.split(`,`);
    const x = parseInt(coords[0]);
    const y = parseInt(coords[1]);
    if (randomArray[i]) {
      bombs.push(coordinates);
      if (x > 0) numbers.push(`${x - 1},${y}`);
      if (x < BOARD_SIZE - 1) numbers.push(`${x + 1},${y}`);
      if (y > 0) numbers.push(`${x},${y - 1}`);
      if (y < BOARD_SIZE - 1) numbers.push(`${x},${y + 1}`);
      if (x > 0 && y > 0) numbers.push(`${x - 1},${y - 1}`);
      if (x < BOARD_SIZE - 1 && y < BOARD_SIZE - 1) numbers.push(`${x + 1},${y + 1}`);
      if (y > 0 && x < BOARD_SIZE - 1) numbers.push(`${x + 1},${y - 1}`);
      if (x > 0 && y < BOARD_SIZE - 1) numbers.push(`${x - 1},${y + 1}`);
    }
  });
  numbers.forEach(number => {
    const coords = number.split(`,`);
    const tile = document.querySelectorAll(`[data-tile="${parseInt(coords[0])},${parseInt(coords[1])}"]`)[0];
    let dataNumber = parseInt(tile.getAttribute(`data-number`) as string);
    if (!dataNumber) dataNumber = 0;
    tile.setAttribute(`data-number`, String(dataNumber + 1));
  });
}

function mark(tile: HTMLDivElement) {
  if (gameOver || tile.classList.contains(`tile--checked`)) return;
  if (!tile.classList.contains(`tile--flagged`) && !tile.classList.contains(`tile--questioned`)) {
    tile.classList.add(`tile--flagged`);
    quantityMarkedBombs++;
    quantityUnMarkedBombs = quantityMarkedBombs >= BOMB_QUANTITY ? 0 : quantityUnMarkedBombs - 1;
    printCounterBombs(quantityUnMarkedBombs);
    if (!bombs.includes(tile.getAttribute(`data-tile`) as string)) {
      mistakenBombs.push(tile.getAttribute(`data-tile`) as string);
    }
  } else if (tile.classList.contains(`tile--flagged`)) {
    tile.classList.remove(`tile--flagged`);
    tile.classList.add(`tile--questioned`);
    quantityMarkedBombs--;
    quantityUnMarkedBombs = quantityMarkedBombs >= BOMB_QUANTITY ? 0 : quantityUnMarkedBombs + 1;
    printCounterBombs(quantityUnMarkedBombs);
    mistakenBombs = mistakenBombs.filter(item => item !== tile.getAttribute(`data-tile`));
  } else {
    tile.classList.remove(`tile--questioned`);
  }
}

function clickTile(tile: HTMLDivElement) {
  if (gameOver) return;
  if (tile.classList.contains(`tile--checked`) || tile.classList.contains(`tile--flagged`) || tile.classList.contains(`tile--questioned`)) return;
  const coordinates = tile.getAttribute(`data-tile`) as string;
  if (bombs.includes(coordinates)) {
    endGame(tile);
  } else {
    const number = Number(tile.getAttribute(`data-number`));
    if (number !== 0) {
      tile.classList.add(`tile--checked`);
      tile.classList.add(`tile--${DIGITS[number as keyof typeof DIGITS]}`);
      setTimeout(() => {
        checkWin();
      }, 100);
      return;
    }
    checkTile(tile, coordinates);
  }
  tile.classList.add(`tile--checked`);
}

function checkTile(tile: HTMLDivElement, coordinates: string) {
  const coords = coordinates.split(`,`);
  const x = parseInt(coords[0]);
  const y = parseInt(coords[1]);
  setTimeout(() => {
    if (x > 0) {
      const targetW = document.querySelectorAll(`[data-tile="${x - 1},${y}"`)[0] as HTMLDivElement;
      clickTile(targetW);
    }
    if (x < BOARD_SIZE - 1) {
      const targetE = document.querySelectorAll(`[data-tile="${x + 1},${y}"`)[0] as HTMLDivElement;
      clickTile(targetE);
    }
    if (y > 0) {
      const targetN = document.querySelectorAll(`[data-tile="${x},${y - 1}"]`)[0] as HTMLDivElement;
      clickTile(targetN);
    }
    if (y < BOARD_SIZE - 1) {
      const targetS = document.querySelectorAll(`[data-tile="${x},${y + 1}"]`)[0] as HTMLDivElement;
      clickTile(targetS);
    }
    if (x > 0 && y > 0) {
      const targetNW = document.querySelectorAll(`[data-tile="${x - 1},${y - 1}"`)[0] as HTMLDivElement;
      clickTile(targetNW);
    }
    if (x < BOARD_SIZE - 1 && y < BOARD_SIZE - 1) {
      const targetSE = document.querySelectorAll(`[data-tile="${x + 1},${y + 1}"`)[0] as HTMLDivElement;
      clickTile(targetSE);
    }
    if (y > 0 && x < BOARD_SIZE - 1) {
      const targetNE = document.querySelectorAll(`[data-tile="${x + 1},${y - 1}"]`)[0] as HTMLDivElement;
      clickTile(targetNE);
    }
    if (x > 0 && y < BOARD_SIZE - 1) {
      const targetSW = document.querySelectorAll(`[data-tile="${x - 1},${y + 1}"`)[0] as HTMLDivElement;
      clickTile(targetSW);
    }
  }, 10);
}

function endGame(tile: HTMLDivElement) {
  restartBtn?.classList.add(`btn--defeat`);
  tile.classList.add(`tile--defeat`);
  gameOver = true;
  pauseTimer();
  tiles.forEach(tile => {
    const coordinate = tile.getAttribute(`data-tile`) as string;
    if (bombs.includes(coordinate)) {
      tile.classList.remove(`tile--flagged`);
      tile.classList.add(`tile--checked`, `tile--bomb`);
    }
    if (mistakenBombs.includes(coordinate)) {
      tile.classList.add(`tile--mistaken-bomb`);
    }
  });
}

function checkWin() {
  let win = true;
  tiles.forEach(tile => {
    const coordinates = tile.getAttribute(`data-tile`) as string;
    if (!tile.classList.contains(`tile--checked`) && !bombs.includes(coordinates)) win = false;
  });
  if (win) {
    restartBtn?.classList.add(`btn--win`);
    let i = 0;
    while (i !== bombs.length) {
      const tile = document.querySelector(`div[data-tile="${bombs[i]}"]`);
      tile?.classList.add(`tile--bomb`);
      i++;
    }
    gameOver = true;
    pauseTimer();
  }
}

function printCounterBombs(bombQuantity: number) {
  const hundreds = document.querySelector(".counter__hundreds");
  const tens = document.querySelector(".counter__tens");
  const ones = document.querySelector(".counter__ones");
  if (hundreds && tens && ones) {
    const digits = String(bombQuantity).padStart(3, `0`).split(``).map(Number);
    removeClassByPrefix(hundreds, `digit--`);
    removeClassByPrefix(tens, `digit--`);
    removeClassByPrefix(ones, `digit--`);
    hundreds.classList.add(`digit--${DIGITS[digits[0] as keyof typeof DIGITS]}`)
    tens.classList.add(`digit--${DIGITS[digits[1] as keyof typeof DIGITS]}`)
    ones.classList.add(`digit--${DIGITS[digits[2] as keyof typeof DIGITS]}`)
  }
}

function timeToArray(time: number) {
  const diffInHundreds = time / 100000;
  const hundreds = Math.floor(diffInHundreds);

  const diffInTens = (diffInHundreds - hundreds) * 10;
  const tens = Math.floor(diffInTens);

  const diffInSeconds = (diffInTens - tens) * 10;
  const seconds = Math.floor(diffInSeconds);

  const formattedH = Number(hundreds.toString().padStart(1, "0"));
  const formattedT = Number(tens.toString().padStart(1, "0"));
  const formattedS = Number(seconds.toString().padStart(1, "0"));

  return [formattedH, formattedT, formattedS];
}

function removeClassByPrefix(node: Element, prefix: string) {
  const regx = new RegExp('\\b' + prefix + '[^ ]*[ ]?\\b', 'g');
  node.className = node.className.replace(regx, '');
}

function printTimer(digits: number[]) {
  if (timerHundreds && timerTens && timerSeconds) {
    removeClassByPrefix(timerHundreds, `digit--`);
    removeClassByPrefix(timerTens, `digit--`);
    removeClassByPrefix(timerSeconds, `digit--`);
    timerHundreds.classList.add(`digit--${DIGITS[digits[0] as keyof typeof DIGITS]}`);
    timerTens.classList.add(`digit--${DIGITS[digits[1] as keyof typeof DIGITS]}`);
    timerSeconds.classList.add(`digit--${DIGITS[digits[2] as keyof typeof DIGITS]}`);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(function printTime() {
    elapsedTime = Date.now() - startTime;
    printTimer(timeToArray(elapsedTime));
  }, 200);
}

function pauseTimer() {
  clearInterval(timerInterval);
}

function resetTimer() {
  clearInterval(timerInterval);
  printTimer([0, 0, 0]);
  elapsedTime = 0;
}
