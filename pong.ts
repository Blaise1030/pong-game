import { fromEvent, interval, merge, Observable, Subscription } from 'rxjs';
import { map, scan } from 'rxjs/operators'
class Paddle1YChanges { constructor(public readonly newY: number) { } }
class Paddle2YChanges { }
class PaddleUpgrade { constructor(public readonly x: number, public readonly y: number) { } }
class SlowMyBall { constructor(public readonly x: number, public readonly y: number) { } }
class RunBall { }
interface BallState { svgType: String, cx: number, cy: number, r: number, fill: String, vx: number, vy: number }
interface PaddleState { svgType: String, x: number, y: number, width: number, height: number, fill: String }
interface ScoreBoardState { svgType: String, x: number, y: number, 'font-size': String, fill: String }
interface UpgradeStates { svgType: String, x: number, y: number, fill: String, width: number, height: number }
interface GameState {
  playerScore: number,
  computerScore: number,
  uiStates: {
    ballState: BallState,
    paddle1State: PaddleState,
    paddle2State: PaddleState,
    scoreBoardState: ScoreBoardState,
    paddleSizeIncreaseState: UpgradeStates,
    slowMyBallState: UpgradeStates,
  },
}
function initialGameState(): GameState {
  // This is the initial state for the whole game
  return {
    playerScore: 0,
    computerScore: 0,
    uiStates: {
      ballState: { svgType: 'circle', cx: 350, cy: 250, r: 8, fill: 'white', vx: 1.2, vy: 0 },
      paddle1State: { svgType: 'rect', x: 10, y: 215, width: 8, height: 70, fill: 'white' },
      paddle2State: { svgType: 'rect', x: 682, y: 215, width: 8, height: 70, fill: 'white' },
      scoreBoardState: { svgType: 'text', x: 285, y: 80, fill: 'white', 'font-size': '70px' },
      paddleSizeIncreaseState: { svgType: 'rect', x: 0, y: 0, fill: 'red', width: 0, height: 0 },
      slowMyBallState: { svgType: 'rect', x: 0, y: 0, fill: 'blue', width: 0, height: 0 },
    },
  }
}
function speedProgression(n: number): number {
  // This returns the distance where the computer paddle will start following the ball 
  return (n <= 3) ? 400 : (n > 3 && n <= 6) ? 200 : (n > 6) ? 0 : null;
}
function onYCollision1(bs: BallState): BallState {
  // Returns a new ball state when the ball collides with the ceiling or floor
  return {
    ...bs,
    cx: bs.cx - bs.vx,
    cy: bs.cy + bs.vy,
    vy: -bs.vy
  }
}
function onTravelX1(acc: BallState, paddle: PaddleState): BallState {
  // In charge of ball collisions on paddles as well as keeping the ball running to the next position
  if (acc.cx + acc.r <= paddle.x + paddle.width && acc.cx + acc.r >= paddle.x
    || acc.cx - acc.r <= paddle.x + paddle.width && acc.cx - acc.r >= paddle.x) {
    if (acc.cy > paddle.y && acc.cy <= paddle.y + paddle.height / 4)
      return ({ ...acc, cx: acc.cx + acc.vx, cy: acc.cy - acc.vy, vx: -acc.vx - 0.1, vy: acc.vy + 0.3 });
    if (acc.cy > paddle.y + paddle.height / 4 && acc.cy < paddle.y + paddle.height / 2)
      return ({ ...acc, cx: acc.cx + acc.vx, cy: acc.cy - acc.vy, vx: -acc.vx - 0.1, vy: acc.vy + 0.1 })
    if (acc.cy === paddle.y + paddle.height / 2)
      return ({ ...acc, cx: acc.cx + acc.vx, cy: acc.cy - acc.vy, vx: -acc.vx - 0.1 })
    if (acc.cy > paddle.y + paddle.height / 2 && acc.cy <= paddle.y + 3 * paddle.height / 4)
      return ({ ...acc, cx: acc.cx + acc.vx, cy: acc.cy - acc.vy, vx: -acc.vx - 0.1, vy: acc.vy - 0.1 })
    if (acc.cy >= paddle.y + 3 * paddle.height / 4 && acc.cy <= paddle.y + paddle.height)
      return ({ ...acc, cx: acc.cx + acc.vx, cy: acc.cy - acc.vy, vx: -acc.vx - 0.1, vy: acc.vy - 0.3 });
  }
  return { ...acc, cx: acc.cx - acc.vx, cy: acc.cy - acc.vy }
}
function onBallHitsPaddleUpgrade(gs: GameState): GameState {
  // Updates the game state when the ball hits the upgrade paddle red square
  return ({
    ...gs,
    uiStates: {
      ...gs.uiStates,
      paddle1State: {
        ...gs.uiStates.paddle1State, height: 2 * gs.uiStates.paddle1State.height
      },
      ballState: onTravelX1(gs.uiStates.ballState, gs.uiStates.ballState.vx > 0 ?
        gs.uiStates.paddle1State :
        gs.uiStates.paddle2State),
      paddleSizeIncreaseState: {
        ...gs.uiStates.paddleSizeIncreaseState, x: 0, y: 0, width: 0, height: 0
      }
    }
  })
}
function onBallHitsSlowDown(gs: GameState): GameState {
  // Updates the game state when the ball hits the slow Ball down blue square
  return ({
    ...gs,
    uiStates: {
      ...gs.uiStates,
      ballState: { ...gs.uiStates.ballState, vx: uiStateAccess(gs, 'ballState', 'vx') < 0 ? -1 : 1 },
      paddleSizeIncreaseState: gs.uiStates.paddleSizeIncreaseState,
      slowMyBallState: { ...gs.uiStates.slowMyBallState, x: 0, y: 0, width: 0, height: 0 }
    }
  })
}
function updatePaddle1Pos(gs: GameState, yVal: number): GameState {
  // Returns a new game state with a updated y value for the player's paddle
  return ({
    ...gs, uiStates:
    {
      ...gs.uiStates,
      paddle1State:
      {
        ...gs.uiStates.paddle1State, y: yVal
      }
    }
  })
}
function updatePaddle2Pos(gs: GameState, up: Boolean): GameState {
  // Updates the computer's paddle eg. either going up by one px or down
  return {
    ...gs, uiStates: {
      ...gs.uiStates, paddle2State: {
        ...gs.uiStates.paddle2State,
        y: up ? uiStateAccess(gs, 'paddle2State', 'y') + 1 : uiStateAccess(gs, 'paddle2State', 'y') - 1
      }
    }
  }
}
function computerAI(gs: GameState): GameState {
  // This function will return a new game state depends of the position of the ball on the canvas 
  // as well as the distance where the paddle will start following the ball
  if (uiStateAccess(gs, 'ballState', 'cy') <
    uiStateAccess(gs, 'paddle2State', 'y') + uiStateAccess(gs, 'paddle2State', 'height') / 2
    && uiStateAccess(gs, 'paddle2State', 'y') > 5
    && uiStateAccess(gs, 'ballState', 'cx') >= speedProgression(gs.playerScore))
    return updatePaddle2Pos(gs, false)
  else if (uiStateAccess(gs, 'ballState', 'cy') >
    uiStateAccess(gs, 'paddle2State', 'y') + uiStateAccess(gs, 'paddle2State', 'height') / 2
    && uiStateAccess(gs, 'paddle2State', 'y') + uiStateAccess(gs, 'paddle2State', 'height') < 495
    && uiStateAccess(gs, 'ballState', 'cx') >= speedProgression(gs.playerScore))
    return updatePaddle2Pos(gs, true)
  else
    return gs
}
function paddleUpgradeSpots(gs: GameState, newX: number, newY: number): GameState {
  // This functions returns a new game state with the new position of the red square
  return {
    ...gs, uiStates: {
      ...gs.uiStates,
      paddle1State: {
        ...gs.uiStates.paddle1State,
        height: 70,
      },
      paddleSizeIncreaseState: {
        ...gs.uiStates.paddleSizeIncreaseState,
        x: newX, y: newY, width: 25, height: 25,
      }
    }
  }
}
function slowBallSpots(gs: GameState, newX: number, newY: number): GameState {
  // Returns a new game state with a updated blue square
  return {
    ...gs, uiStates: {
      ...gs.uiStates,
      paddle1State: {
        ...gs.uiStates.paddle1State,
        height: 70,
      },
      slowMyBallState: {
        ...gs.uiStates.slowMyBallState,
        x: newX, y: newY, width: 25, height: 25,
      }
    }
  }
}
function reduceGameState(acc: GameState, changes: Paddle1YChanges | Paddle2YChanges | RunBall | PaddleUpgrade | SlowMyBall): GameState {
  // This takes in changes and merge them into a new game state 
  if (changes instanceof Paddle1YChanges)
    return updatePaddle1Pos(acc, changes.newY);
  if (changes instanceof Paddle2YChanges)
    return computerAI(acc);
  if (changes instanceof RunBall)
    return updateBallPos(acc);
  if (changes instanceof PaddleUpgrade)
    return paddleUpgradeSpots(acc, changes.x, changes.y)
  if (changes instanceof SlowMyBall)
    return slowBallSpots(acc, changes.x, changes.y)
}
function renderEngine(gs: GameState, canvas: String): Array<Element> {
  /* This function renders all UI component states, the canvas will be cleared before rendering. */
  document.getElementById('canvas').innerHTML = '';
  return Object.entries(gs.uiStates).map(
    ([key, UIAttr]) => {
      return Object.entries(UIAttr)
        .reduce(
          (acc: Element, [key, value], index: number) => {
            acc.setAttribute(key, String(value));
            acc.innerHTML = String(gs.playerScore + ':' + gs.computerScore)
            return acc
          }, document.createElementNS(document.getElementById(String(canvas))
            .namespaceURI, String(UIAttr.svgType))
        )
    }
  )
}
function uiStateAccess(gs: GameState, element: string, attr: string): number {
  // This function just allows faster access to attributes of the ui elements 
  return gs.uiStates[element][attr]
};
function ballEngine(): Observable<RunBall> {
  // This function returns a stream of RunBall in every interval 
  return interval(1).pipe(map((_) => new RunBall()))
}
function paddle2Engine(): Observable<Paddle2YChanges> {
  // Similar to ballEngine this function returns a stream of Paddle2YChanges
  return interval(1).pipe(map((_) => new Paddle2YChanges()))
}
function spawnPaddleUpgrade(): Observable<PaddleUpgrade> {
  // This stream is in charge to produce a stream of PaddleUpgarde which will have random coordinates
  // on the canvas in every 30 seconds, this helps us spawn red squares over the canvas 
  return interval(30000).pipe(map((_) => new PaddleUpgrade(300 + Math.random() * 100, Math.random() * 500)))
}
function spawnSlowMyBall(): Observable<SlowMyBall> {
  // This stream is in charge to produce a stream of SlowMyBall which will have random coordinates
  // on the canvas in every 32 seconds, this helps us spawn blue square over the canvas
  return interval(32000).pipe(map((_) => new SlowMyBall(300 + Math.random() * 100, Math.random() * 500)))
}
function playerMouse(): Observable<Paddle1YChanges> {
  // This function produces a stream of PaddleIYChanges based on the mouse event on the canvas
  return fromEvent<MouseEvent>(document.getElementById('canvas'), 'mousemove')
    .pipe(map(({ clientY }) => new Paddle1YChanges(clientY - 105)))
}
function updateBallPos(gs: GameState): GameState {
  // This function will detect the conditions of the ball and returns a new game state based on those conditions
  // For example, if the ball has collided with paddles, collided with the ceiling or floor, collided with power ups
  // or if someone has won the match
  if (uiStateAccess(gs, 'ballState', 'cx') > uiStateAccess(gs, 'paddleSizeIncreaseState', 'x') &&
    uiStateAccess(gs, 'ballState', 'cx') < uiStateAccess(gs, 'paddleSizeIncreaseState', 'x')
    + uiStateAccess(gs, 'paddleSizeIncreaseState', 'width') &&
    uiStateAccess(gs, 'ballState', 'cy') > uiStateAccess(gs, 'paddleSizeIncreaseState', 'y') &&
    uiStateAccess(gs, 'ballState', 'cy') < uiStateAccess(gs, 'paddleSizeIncreaseState', 'y')
    + uiStateAccess(gs, 'paddleSizeIncreaseState', 'height')
    && uiStateAccess(gs, 'ballState', 'vx') < 0)
    return onBallHitsPaddleUpgrade(gs); 
  else if ((uiStateAccess(gs, 'ballState', 'cx') > uiStateAccess(gs, 'slowMyBallState', 'x') &&
    uiStateAccess(gs, 'ballState', 'cx') < uiStateAccess(gs, 'slowMyBallState', 'x')
    + uiStateAccess(gs, 'slowMyBallState', 'width') &&
    uiStateAccess(gs, 'ballState', 'cy') > uiStateAccess(gs, 'slowMyBallState', 'y') &&
    uiStateAccess(gs, 'ballState', 'cy') < uiStateAccess(gs, 'slowMyBallState', 'y')
    + uiStateAccess(gs, 'slowMyBallState', 'height')))
    return onBallHitsSlowDown(gs);
  else if (gs.uiStates.ballState.cy - gs.uiStates.ballState.r < 0 || gs.uiStates.ballState.cy + gs.uiStates.ballState.r > 500)
    return { ...gs, uiStates: { ...gs.uiStates, ballState: onYCollision1(gs.uiStates.ballState) } };
  else if (gs.uiStates.ballState.cx < 0 || gs.uiStates.ballState.cx > 700)
    return someoneScores(gs)
  // If nothing happens
  return {
    ...gs, uiStates: {
      ...gs.uiStates, ballState: onTravelX1(gs.uiStates.ballState, gs.uiStates.ballState.vx > 0 ?
        gs.uiStates.paddle1State :
        gs.uiStates.paddle2State)
    }
  };
}
function someoneScores(gs: GameState): GameState {
  // This function detects who scores and updates the corresponding game state
  if (gs.uiStates.ballState.cx < 0 && gs.computerScore + 1 === 7) {
    alert('Oops Loser !')
    return initialGameState()
  }
  else if (gs.uiStates.ballState.cx > 0 && gs.playerScore + 1 === 7) {
    alert('You won !')
    return initialGameState()
  }
  return gs.uiStates.ballState.cx < 0 ? {
    uiStates: {
      ...initialGameState().uiStates,
      paddle1State: {
        ...initialGameState().uiStates.paddle1State,
        height: uiStateAccess(gs, 'paddle1State', 'height')
      },
      paddleSizeIncreaseState: gs.uiStates.paddleSizeIncreaseState,
      slowMyBallState: gs.uiStates.slowMyBallState
    },
    computerScore: gs.computerScore + 1, playerScore: gs.playerScore
  } : {
      uiStates: {
        ...initialGameState().uiStates,
        paddle1State: {
          ...initialGameState().uiStates.paddle1State,
          height: uiStateAccess(gs, 'paddle1State', 'height')
        },
        paddleSizeIncreaseState: gs.uiStates.paddleSizeIncreaseState,
        slowMyBallState: gs.uiStates.slowMyBallState
      },
      playerScore: gs.playerScore + 1, computerScore: gs.computerScore
    }
}
function pong() {
  // Our game merges different streams and feeds it to scan the updates the changes.
  merge(
    playerMouse(),
    paddle2Engine(),
    ballEngine(),
    spawnPaddleUpgrade(),
    spawnSlowMyBall())
    .pipe(scan(reduceGameState, initialGameState()))
    .subscribe((e: GameState) => renderEngine(e, 'canvas')
      .forEach((e: Element) => document.getElementById('canvas').appendChild(e))
    );
}
export default pong;

if (typeof window != 'undefined')
  window.onload = () => {
    pong();
  }



