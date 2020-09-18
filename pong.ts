import { interval, pipe, fromEvent, Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';


interface ballAttribute { 'svgElement': string, 'cx': number, 'cy': number, 'r': number, 'vx': number, 'vy': number, 'fill': '#FFFFFF' }
interface paddleAttribute { 'svgElement': string, 'x': number, 'y': number, 'height': number, 'width': number, 'fill': '#FFFFFF' }

// These are all initial values of the ui elements 
const initialBallAttribute=(): ballAttribute =>({ 'svgElement': 'circle', 'cx': 300, 'cy': 300, 'r': 8, 'vx': 1, 'vy': 0, 'fill': '#FFFFFF'});
const initialPaddle1Attribute=():paddleAttribute=>({ 'svgElement': 'rect', 'x': 10, 'y': 265, 'height': 70, 'width': 8, 'fill': '#FFFFFF' });
const initialPaddle2Attribute = ():paddleAttribute=>({ 'svgElement': 'rect', 'x': 582, 'y': 265, 'height': 70, 'width': 8, 'fill': '#FFFFFF' });


function renderEngine(elementAttr: ballAttribute | paddleAttribute): Element {
  // Renders the html elements in the svg
  document.getElementById('canvas').innerHTML = ''
  return Object.entries(elementAttr).reduce(
    (acc: Element, [key, value], index: number) => {
      acc.setAttribute(key, String(value));
      return acc
    },
    document.createElementNS(document.getElementById('canvas').namespaceURI, elementAttr.svgElement)
  )
}

// function changesPaddle1Position():Observable<paddleAttribute>{
//   return fromEvent<MouseEvent>(document.getElementById('canvas'),'mousemove').pipe(map(({clientY})=>clientY))
// }


function pong() {
  document.getElementById('canvas').appendChild(renderEngine(initialPaddle1Attribute()))
  document.getElementById('canvas').appendChild(renderEngine(initialBallAttribute()))
  document.getElementById('canvas').appendChild(renderEngine(initialPaddle2Attribute()))

  fromEvent<MouseEvent>(document.getElementById('canvas'),'mousemove')
  .pipe(scan((acc:paddleAttribute,value:MouseEvent,index:number)=>
  {return {...acc,y:value.clientY}},initialPaddle1Attribute()))
  .subscribe((e:paddleAttribute)=>document.getElementById('canvas').appendChild(renderEngine(e)))

}
if (typeof window != 'undefined')
  window.onload = () => {
    pong();
  }


