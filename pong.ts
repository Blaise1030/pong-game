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
interface PaddleUpgradeState { svgType: String, x: number, y: number, fill: String, width: number, height: number }
interface SlowMyBallState { svgType: String, x: number, y: number, fill: String, width: number, height: number }
interface GameState {
  playerScore: number,
  computerScore: number,
  uiStates: {
    ballState: BallState,
    paddle1State: PaddleState,
    paddle2State: PaddleState,
    scoreBoardState: ScoreBoardState,
    paddleSizeIncreaseState: PaddleUpgradeState
    slowMyBallState: SlowMyBallState,
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
      slowMyBallState: { svgType: 'rect', x: 0, y: 0, fill: 'blue', width: 0, height: 0 }
    },
  }
}
function speedProgression(n: number): number {
  return (n <= 3) ?
    400 : (n > 3 && n <= 6) ?
      200 : (n > 6) ? 0 : null;
}
function onYCollision1(acc: BallState): BallState {
  return {
    ...acc,
    cx: acc.cx - acc.vx,
    cy: acc.cy + acc.vy,
    vy: -acc.vy
  }

}
function onTravelX1(acc: BallState, paddle: PaddleState): BallState {
  /* This function returns a new ball state depends on which part the paddle is hit.
  If it is not hit, the ball will keep traveling in a straight line */
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
function onBallHitsPaddleUpgrade(gs: GameState) {
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
function updateBallPos(gs: GameState): GameState {
  /* Updates the ball positions for the function reduceGameState */
  if (gs.uiStates.ballState.cy - gs.uiStates.ballState.r < 0
    || gs.uiStates.ballState.cy + gs.uiStates.ballState.r > 500) {
    return { ...gs, uiStates: { ...gs.uiStates, ballState: onYCollision1(gs.uiStates.ballState) } };
  }
  if (gs.uiStates.ballState.cx < 0)
    return {
      uiStates: {
        ...initialGameState().uiStates,
        paddle1State: {
          ...initialGameState().uiStates.paddle1State,
          height: uiStateAccess(gs, 'paddle1State', 'height')
        },
        paddleSizeIncreaseState: gs.uiStates.paddleSizeIncreaseState
      },
      computerScore: gs.computerScore + 1, playerScore: gs.playerScore
    }
  if (gs.uiStates.ballState.cx > 700)
    return {
      uiStates: {
        ...initialGameState().uiStates
        , paddle1State: {
          ...initialGameState().uiStates.paddle1State,
          height: uiStateAccess(gs, 'paddle1State', 'height')
        }
        , paddleSizeIncreaseState: gs.uiStates.paddleSizeIncreaseState
      },
      playerScore: gs.playerScore + 1, computerScore: gs.computerScore
    }
  if (uiStateAccess(gs, 'ballState', 'cx') > uiStateAccess(gs, 'paddleSizeIncreaseState', 'x') &&
    uiStateAccess(gs, 'ballState', 'cx') < uiStateAccess(gs, 'paddleSizeIncreaseState', 'x')
    + uiStateAccess(gs, 'paddleSizeIncreaseState', 'width') &&
    uiStateAccess(gs, 'ballState', 'cy') > uiStateAccess(gs, 'paddleSizeIncreaseState', 'y') &&
    uiStateAccess(gs, 'ballState', 'cy') < uiStateAccess(gs, 'paddleSizeIncreaseState', 'y')
    + uiStateAccess(gs, 'paddleSizeIncreaseState', 'height')
    && uiStateAccess(gs, 'ballState', 'vx') < 0)
    return onBallHitsPaddleUpgrade(gs);
  return {
    ...gs, uiStates: {
      ...gs.uiStates, ballState: onTravelX1(gs.uiStates.ballState, gs.uiStates.ballState.vx > 0 ?
        gs.uiStates.paddle1State :
        gs.uiStates.paddle2State)
    }
  };
}
function updatePaddle1Pos(gs: GameState, yVal: number): GameState {
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

function slowBallSpots(gs:GameState,newX:number,newY:number):GameState{
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
  /* This functaion returns a new game state with changes applied */
  if (changes instanceof Paddle1YChanges)
    return updatePaddle1Pos(acc, changes.newY);
  if (changes instanceof Paddle2YChanges)
    return computerAI(acc);
  if (changes instanceof RunBall)
    return updateBallPos(acc);
  if (changes instanceof PaddleUpgrade)
    return paddleUpgradeSpots(acc, changes.x, changes.y)
  if (changes instanceof SlowMyBall)
    return slowBallSpots(acc,changes.x,changes.y)
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
            if (index === 3)
              acc.innerHTML = String(gs.playerScore + ':' + gs.computerScore)
            return acc
          }, document.createElementNS(document.getElementById(String(canvas))
            .namespaceURI, String(UIAttr.svgType))
        )
    }
  )
}
function wins(a: number, b: number) {
  function createSVGElements(svg: string, svgElement: string, elementAttributes) {
    return Object.entries(elementAttributes).reduce(
      (acc: Element, [key, value], index: number) => {
        acc.setAttribute(key, String(value));
        document.getElementById(svg).appendChild(acc);
        return acc
      }, document.createElementNS(document.getElementById(svg).namespaceURI, svgElement));
  }
  document.getElementById('canvas').innerHTML = ''
  const [message, _, buttonString] = ([
    [{ x: '43%', y: '50%', fill: 'white' }, "text"],
    [{ x: '295', y: '270', fill: 'white', width: 100, height: 40, onclick: "location.reload()" }, "rect"],
    [{ x: '307', y: '295', fill: 'black', onclick: "location.reload()" }, "text"]
  ].map(([attr, elem]) => createSVGElements("canvas", String(elem), attr)));
  a > b ? message.innerHTML = "You R Good !" : message.innerHTML = "Game Over";
  buttonString.innerHTML = 'Play Again'
}
function uiStateAccess(gs: GameState, element: string, attr: string): number {
  return gs.uiStates[element][attr]
};
function ballEngine(): Observable<RunBall> {
  return interval(1).pipe(map((_) => new RunBall()))
}
function paddle2Engine(): Observable<Paddle2YChanges> {
  return interval(1).pipe(map((_) => new Paddle2YChanges()))
}
function spawnPaddleUpgrade(): Observable<PaddleUpgrade> {
  return interval(30000).pipe(map((_) => new PaddleUpgrade(300 + Math.random() * 100, Math.random() * 500)))
}
function spawnSlowMyBall(): Observable<SlowMyBall> {
  return interval(30000).pipe(map((_) => new SlowMyBall(300 + Math.random() * 100, Math.random() * 500)))
}
function playerMouse(): Observable<Paddle1YChanges> {
  return fromEvent<MouseEvent>(document.getElementById('canvas'), 'mousemove')
    .pipe(map(({ clientY }) => new Paddle1YChanges(clientY - 35)))
}
function renderingResolver(e: GameState, stream: Subscription): void {
  renderEngine(e, 'canvas')
    .forEach((e: Element) => document.getElementById('canvas').appendChild(e));
  if (e.computerScore === 9 || e.playerScore === 9) {
    stream.unsubscribe();
    wins(e.playerScore, e.computerScore);
  }
}
function pong() {
  const stream = merge(
    playerMouse(),
    paddle2Engine(),
    ballEngine(),
    spawnPaddleUpgrade(),
    spawnSlowMyBall())
    .pipe(scan(reduceGameState, initialGameState()))
    .subscribe((e: GameState) => renderingResolver(e, stream));
}
export default pong;

if (typeof window != 'undefined')
  window.onload = () => {
    pong();
  }


