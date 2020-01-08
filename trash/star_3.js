// 最新版(2020/01/05). リストを使ってupdateやdrawを行う流れ。
// えーとね。ほとんど改善が見られないんだね。これがね。・・・。

// 劇的な変化でなければ意味がないからね。

// ObjectPool
// star
// sliderSet
// direction += a + b * cos(c * framecount); // こうだっけ？？

// スライダーで各種パラメータをいじることができます。
// a, b, cをいじって曲線の軌道が変わったりして。

// updateの中で排除できるなら排除して出来ない時にdrawする方針で行ったら速くなりそう。
'use strict';

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

let head = {};
let tail = {};

let isLoop = true;
let showInfo = true;

let capacity = 0;

let runTimeSum = 0;
let runTimeAverage = 0;
let runTimeMax = 0;
const INDENT = 20;
const AVERAGE_CALC_SPAN = 10;
const TEXT_INTERVAL = 30;

let starPool;
let starArray;
let startX = 0;    // 0～400
let startY = 0;     // 0～400
let startSpeed = 1; // 1～21
let startDir = 0;  // 0～360
let a = 0;          // -10～10(0.1刻み)
let b = -2;         // -10～10(0.1刻み)
let c = 1;        // -10～10(0.1刻み)

const STAR_FACTOR = 2.618033988749895; // 1 + 2 * cos(36).
// cosとsinの0, 72, 144, 216, 288における値
const COS_PENTA = [1, 0.30901699437494745, -0.8090169943749473, -0.8090169943749473, 0.30901699437494745];
const SIN_PENTA = [0, 0.9510565162951535, 0.5877852522924732, -0.587785252292473, -0.9510565162951536];

let controller;

function setup() {
	createCanvas(600, 600);
	angleMode(DEGREES);
	noStroke();
	textSize(16);
	starPool = new ObjectPool(() => { return new StarUnit(); }, 600);
	//starArray = new CrossReferenceArray();
	prepareSlider();

	// リスト使ってみる
	head.next = tail;
	tail.next = null;
}

function prepareSlider(){
	controller = new SliderSet();

	let cursorForX = new RectCursor(4, 8);
	cursorForX.setColor();
	let sliderForX = new HorizontalSlider("x", 0, 400, cursorForX, 40, 380, 580);

	let cursorForY = new RectCursor(4, 8);
	cursorForY.setColor();
	let sliderForY = new HorizontalSlider("y", 0, 400, cursorForY, 80, 380, 580);

	let cursorForSpeed = new RectCursor(4, 8);
	cursorForSpeed.setColor();
	let sliderForSpeed = new HorizontalSlider("speed", 1, 21, cursorForSpeed, 120, 380, 580);
	sliderForSpeed.setPosX(410);

	let cursorForDir = new RectCursor(4, 8);
	cursorForDir.setColor();
	let sliderForDir = new HorizontalSlider("direction", 0, 360, cursorForY, 160, 380, 580);
	sliderForDir.setPosX(430);

	let cursorForA = new RectCursor(4, 8);
	cursorForA.setColor();
	let sliderForA = new HorizontalSlider("a", -10, 10, cursorForA, 200, 380, 580);
	sliderForA.setPosX(480);

	let cursorForB = new RectCursor(4, 8);
	cursorForB.setColor();
	let sliderForB = new HorizontalSlider("b", -10, 10, cursorForB, 240, 380, 580);
	sliderForB.setPosX(460);

	let cursorForC = new RectCursor(4, 8);
	cursorForC.setColor();
	let sliderForC = new HorizontalSlider("c", -10, 10, cursorForC, 280, 380, 580);
	sliderForC.setPosX(490);

	controller.registMulti([sliderForX, sliderForY, sliderForSpeed, sliderForDir, sliderForA, sliderForB, sliderForC]);
}

function draw() {
	background(0);

  const runStart = performance.now();
	if(frameCount % 8 === 0){ createStar(); }

	controller.update();
	parameterUpdate();

	controller.display();
	fill(0, 0, 255);
	runThrough();
  const runEnd = performance.now();

	if(showInfo){ showPerformanceInfo(runEnd - runStart); }

	fill(255);
	text("capacity:" + capacity, 20, 20);
	text("x:" + startX, 20, 40);
	text("y:" + startY, 20, 60);
	text("speed:" + startSpeed, 20, 80);
	text("direction:" + startDir, 20, 100);
	const partA = (a === 0 ? "" : (a > 0 ? a.toFixed(1) : "-" + abs(a).toFixed(1)));
	const partB = (b < 0 ? "-" + abs(b).toFixed(1) : (b === 0 ? "" : a === 0 ? b.toFixed(1) : "+" + b.toFixed(1)));
	const partC = (b === 0 ? "" : (c === 0 ? "" : (c > 0 ? "sin(" + (c === 1 ? "" : c.toFixed(1)) + "fc)" : "sin(-" + abs(c).toFixed(1) + "fc)")));
	text(partA + partB + partC, 20, 120);
	text("x", 360, 45);
	text("y", 360, 85);
	text("speed", 320, 125);
	text("direction", 300, 165);
	text("a", 360, 205);
	text("b", 360, 245);
	text("c", 360, 285);
	text("pキーでポーズ(停止)", 380, 360);
	text("cキーでクリア", 380, 320);
}

function parameterUpdate(){
	startX = Math.floor(controller.x);
	startY = Math.floor(controller.y);
	startSpeed = Math.floor(controller.speed);
	startDir = Math.floor(controller.direction);
	a = Math.floor(controller.a * 10) * 0.1;
	b = Math.floor(controller.b * 10) * 0.1;
	c = Math.floor(controller.c * 10) * 0.1;
}

function createStar(){
	let star = starPool.use();
	star.initialize();
	//starArray.add(star);

	star.next = head.next;
  head.next = star;
	capacity++;
}

function runThrough(){
	let previous = head;
	let current = head.next;
	let removeFlag = false;
	let debug = 0;
	while(current.next !== null){
		removeFlag = current.update();
		if(removeFlag){
			// 排除するとき
			previous.next = current.next;
			current.next = null;
			starPool.recycle(current); // 複数ある時はどれも次がnullの時にリサイクルする。
			capacity--;
			current = previous.next;
		}else{
			current.draw();
			previous = current;
			current = current.next;
		}
		debug++;
		if(debug > 1000){ console.log("ERROR!"); noLoop(); break; }
	}
}

// 全部リサイクル
function cleanUp(){
  let current = head.next;
	let debug = 0;
	while(current.next !== null){
		starPool.recycle(current);
		current = current.next;
		debug++;
		if(debug > 1000){ console.log("ERROR!"); noLoop(); break; }
	}
	head.next = tail;
}

// ---------------------------------------------------------------------------------------- //
// PerformanceInfomation.

function showPerformanceInfo(runTime){
  let y = 160; // こうすれば新しいデータを挿入しやすくなる。指定しちゃうといろいろとね・・
  // ほんとは紐付けとかしないといけないんだろうけど。
	fill(255);

  y += TEXT_INTERVAL;
  displayRealNumber(runTime, INDENT, y, "runTime");

  runTimeSum += runTime;
  if(frameCount % AVERAGE_CALC_SPAN === 0){
		runTimeAverage = runTimeSum / AVERAGE_CALC_SPAN;
		runTimeSum = 0;
	}
  y += TEXT_INTERVAL;
  displayRealNumber(runTimeAverage, INDENT, y, "runTimeAverage");
  if(runTimeMax < runTime){ runTimeMax = runTime; }
  y += TEXT_INTERVAL;
  displayRealNumber(runTimeMax, INDENT, y, "runTimeMax");
}

// 表示関数（実数版）
function displayRealNumber(value, x, y, explanation, precision = 4){
  // 与えられた実数を(x, y)の位置に小数点以下precisionまで表示する感じ(explanation:~~~って感じ)
  const valueStr = value.toPrecision(precision);
  const innerText = `${valueStr}ms`;
  text(explanation + ":" + innerText, x, y);
}

// 整数版
function displayInteger(value, x, y, explanation){
  text(explanation + ":" + value, x, y);
}


class StarUnit{
	constructor(){
		this.position = createVector();
		this.velocity = createVector();
		this.initialize();
	}
	initialize(){
		this.position.set(startX, startY);
		this.velocity.set(startSpeed * cos(startDir), startSpeed * sin(startDir));
		this.speed = startSpeed;
		this.direction = startDir;
		this.properFrameCount = 0;
		this.drawFunction = drawStar;
		this.size = 3;
		this.rotationAngle = 0;
		this.rotationSpeed = 4;
		this.vanishFlag = false;
	}
	velocityUpdate(){
		this.velocity.set(this.speed * cos(this.direction), this.speed * sin(this.direction));
	}
	update(){
		this.direction += a + b * sin(c * this.properFrameCount);
		this.velocityUpdate();
		this.position.add(this.velocity);
		this.rotationAngle += this.rotationSpeed;
		this.properFrameCount++;
		const {x, y} = this.position;
		if(x < -200 || x > 800 || y < -200 || y > 800){ this.vanishFlag = true; }
		if(this.properFrameCount > 600){ this.vanishFlag = true; }
		return this.vanishFlag;
	}
	eject(){
		if(this.vanishFlag){ this.vanish(); }
	}
	vanish(){
		//this.belongingArray.remove(this);
    //starPool.recycle(this);
		//return true;
	}
	draw(){
		this.drawFunction(this);
		return this.vanishFlag;
	}
}

function drawStar(star){
	const {x, y} = star.position;
	const {size:r, rotationAngle:direction} = star;
  let u = [];
  let v = [];
  // cos(direction)とsin(direction)だけ求めてあと定数使って加法定理で出せばもっと速くなりそう。
  // またはtriangle5つをquad1つとtriangle1つにすることもできるよね。高速化必要。
  const c = cos(direction);
  const s = sin(direction);
  for(let i = 0; i < 5; i++){
  	u.push([x + (r * STAR_FACTOR) * (c * COS_PENTA[i] - s * SIN_PENTA[i]),
            y + (r * STAR_FACTOR) * (s * COS_PENTA[i] + c * SIN_PENTA[i])]);
  }
  v.push(...[x - r * c, y - r * s]);
  // u1 u4 v(三角形), u0 u2 v u3(鋭角四角形).
  triangle(u[1][0], u[1][1], u[4][0], u[4][1], v[0], v[1]);
  quad(u[0][0], u[0][1], u[2][0], u[2][1], v[0], v[1], u[3][0], u[3][1]);
}

// ---------------------------------------------------------------------------------------- //
// ObjectPool.
// どうやって使うんだっけ・・

class ObjectPool{
	constructor(objectFactory = (() => ({})), initialCapacity = 0){
		this.objPool = [];
		this.nextFreeSlot = null; // 使えるオブジェクトの存在位置を示すインデックス
		this.objectFactory = objectFactory;
		this.grow(initialCapacity);
	}
	use(){
		if(this.nextFreeSlot == null || this.nextFreeSlot == this.objPool.length){
		  this.grow(this.objPool.length || 5); // 末尾にいるときは長さを伸ばす感じ。lengthが未定義の場合はとりあえず5.
		}
		let objToUse = this.objPool[this.nextFreeSlot]; // FreeSlotのところにあるオブジェクトを取得
		this.objPool[this.nextFreeSlot++] = EMPTY_SLOT; // その場所はemptyを置いておく、そしてnextFreeSlotを一つ増やす。
    //objToUse.initialize(); // 個別のイニシャライズ処理を追加
		return objToUse; // オブジェクトをゲットする
	}
	recycle(obj){
		if(this.nextFreeSlot == null || this.nextFreeSlot == -1){
			this.objPool[this.objPool.length] = obj; // 図らずも新しくオブジェクトが出来ちゃった場合は末尾にそれを追加
		}else{
			// 考えづらいけど、this.nextFreeSlotが0のときこれが実行されるとobjPool[-1]にobjが入る。
			// そのあとでrecycleが発動してる間は常に末尾にオブジェクトが増え続けるからFreeSlotは-1のまま。
			// そしてuseが発動した時にその-1にあったオブジェクトが使われてそこにはEMPTY_SLOTが設定される
			this.objPool[--this.nextFreeSlot] = obj;
		}
	}
	grow(count = this.objPool.length){ // 長さをcountにしてcount個のオブジェクトを追加する
		if(count > 0 && this.nextFreeSlot == null){
			this.nextFreeSlot = 0; // 初期状態なら0にする感じ
		}
		if(count > 0){
			let curLen = this.objPool.length; // curLenはcurrent Lengthのこと
			this.objPool.length += Number(count); // countがなんか変でも数にしてくれるからこうしてるみたい？"123"とか。
			// こうするとかってにundefinedで伸ばされるらしい・・長さプロパティだけ増やされる。
			// 基本的にはlengthはpushとか末尾代入（a[length]=obj）で自動的に増えるけどこうして勝手に増やすことも出来るのね。
			for(let i = curLen; i < this.objPool.length; i++){
				// add new obj to pool.
				this.objPool[i] = this.objectFactory();
			}
			return this.objPool.length;
		}
	}
	size(){
		return this.objPool.length;
	}
}

// ---------------------------------------------------------------------------------------- //
// Slider and Cursor.

class Slider{
  constructor(key, minValue, maxValue, cursor){
    this.key = key; // 作るときにキーを
    this.minValue = minValue;
    this.maxValue = maxValue;
    // 円とか三角形とか。offSetは要らないかも。三角形はベクトルでやる。四角形はいわずもがな。
    this.cursor = cursor;
    // activeのとき、カーソルが動く
    this.active = false;
    this.showRail = true; // レールを消したいときはこれ
  }
  activate(){
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  hideRail(){
    // レールを消したいとき
    this.showRail = false;
  }
  setMinValue(newMinValue){
    this.minValue = newMinValue; // min値の変更
  }
  setMaxValue(newMaxValue){
    this.maxValue = newMaxValue; // maxの変更
  }
  setColor(nonActiveColor = color('#4169e1'), activeColor = color('#ff0000')){
    // スライダー経由でカーソルの色を変える感じ。
    this.cursor.setColor(nonActiveColor, activeColor);
  }
  hit(x, y){
    // hit関数。activateするための条件。activeなときにupdateするとスライダー位置が変わり、返す値も変わる仕様。
    return false;
  }
  update(){ /* 継承先により異なる */ }
  display(){
    this.cursor.display(this.sliderPos, this.active); // 円とか三角形。activeで画像指定。
  }
  setImg(nonActiveImg, activeImg){
		this.cursor.setImg(nonActiveImg, activeImg);
	}
  getValue(){ /* 継承先により異なる */ }
}

// 横のスライダー、今回使うのはこっち（変化球ではない）
class HorizontalSlider extends Slider{
  constructor(key, minValue, maxValue, cursor, posY, left, right, topMargin = 10, bottomMargin = 10, offSetX = 0){
    super(key, minValue, maxValue, cursor);
    // 位置関係
    this.posY = posY;
    this.left = left; // 左
    this.right = right; // 右
    this.topMargin = topMargin; // 反応範囲、上
    this.bottomMargin = bottomMargin; // 反応範囲、下
    this.sliderPos = createVector(left, posY);
    this.offSetX = offSetX; // 設置位置によってはmouseXを直接・・以下略。
  }
  update(){
    if(this.active){
      // 横スライダー
      this.sliderPos.set(constrain(mouseX + this.offSetX, this.left, this.right), this.posY);
    }
  }
	display(){
		// 横線。長方形でいいよね。
    if(this.showRail){
		  fill(color('white'));
      noStroke();
		  rect(this.left, this.posY - 2, this.right - this.left, 4);
    }
		super.display();
	}
  hit(x, y){
    const horizontal = (this.left <= x && x <= this.right);
    const vertical = (this.posY - this.topMargin <= y && y <= this.posY + this.bottomMargin);
    return horizontal && vertical;
  }
  setPosX(x){
    this.sliderPos.x = x;
  }
  getValue(){
    // 横スライダー
    return map(this.sliderPos.x, this.left, this.right, this.minValue, this.maxValue);
  }
}

// ---------------------------------------------------------------------------------------- //
// Cursor.
// 円、四角、三角。
// activeとinActiveの画像を渡して共通の処理とするんだけど後でいいや。
// カーソルのhit関数は廃止。スライダーベースで判定しよう。

class Cursor{
  constructor(){
		this.cursorColor = {}; // デフォルト時のカーソルカラー
    this.cursorImg = {};
		this.useOriginalImg = false; // オリジナル画像を使わない場合はデフォルト。
  }
  display(pivotVector, isActive){}
  setColor(nonActiveColor = color('#4169e1'), activeColor = color('#ff0000')){
    // デフォルトはロイヤルブルーとレッド
		this.cursorColor.nonActiveColor = nonActiveColor;
		this.cursorColor.activeColor = activeColor;
	}
  setImg(nonActiveImg, activeImg){
    this.useOriginalImg = true;
		this.cursorImg.nonActiveImg = nonActiveImg;
		this.cursorImg.activeImg = activeImg;
	}
}

class RectCursor extends Cursor{
  constructor(cursorHalfWidth, cursorHalfHeight){
    super();
    this.cursorHalfWidth = cursorHalfWidth;
    this.cursorHalfHeight = cursorHalfHeight;
    this.offSetX = -cursorHalfWidth;
    this.offSetY = -cursorHalfHeight;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
			// 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
			// デフォルト
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
      rect(pivotVector.x + this.offSetX, pivotVector.y + this.offSetY, this.cursorHalfWidth * 2, this.cursorHalfHeight * 2);
		}
  }
}

// ---------------------------------------------------------------------------------------- //
// Cross Reference Array.
// 使い方・・

// 配列クラスを継承して、要素を追加するときに自動的に親への参照が作られるようにしたもの
class CrossReferenceArray extends Array{
	constructor(){
    super();
	}
  add(element){
    this.push(element);
    element.belongingArray = this; // 所属配列への参照
  }
  addMulti(elementArray){
    // 複数の場合
    elementArray.forEach((element) => { this.add(element); })
  }
  remove(element){
    let index = this.indexOf(element, 0);
    this.splice(index, 1); // elementを配列から排除する
  }
  loop(methodName){
		if(this.length === 0){ return; }
    // methodNameには"update"とか"display"が入る。まとめて行う処理。
		for(let i = 0; i < this.length; i++){
			this[i][methodName]();
		}
  }
	loopReverse(methodName){
		if(this.length === 0){ return; }
    // 逆から行う。排除とかこうしないとエラーになる。もうこりごり。
		for(let i = this.length - 1; i >= 0; i--){
			this[i][methodName]();
		}
  }
	clear(){
		this.length = 0;
	}
}

// ---------------------------------------------------------------------------------------- //
// SliderSet.
// activateでマウス位置に応じて場合によってはいずれかのスライダーがactivateされて、
// マウスを動かすとスライダーが動いて値が変化する。
// マウスを離すとinActivateされて色々解除。
// さらにキー登録機能により、キーを元に値を取得することが出来て、
// 動かしたい変数をバインドさせることで特定のプロパティと連動して変化させることができる。

// キー値から直接値を取得したい（たとえば"red"がキーならthis.redで値が出るみたいな）

class SliderSet{
	constructor(){
		this.sliderArray = new CrossReferenceArray();
		this.sliderDict = {};
		this.activeSliderKey = "";
    this.active = false; // activeなスライダーがあるかどうか
	}
	regist(slider){
    // 登録時にキーから接続できるようにして・・さらにキーから値を取得できるようにパスを作る
		this.sliderArray.add(slider);
    this.sliderDict[slider.key] = slider;
    this[slider.key] = slider.getValue();
	}
  registMulti(sliderArray){
    // 複数版
    sliderArray.forEach((slider) => { this.regist(slider); })
  }
	update(){
		this.sliderArray.loop("update");
		// アクティブな場合のみ値変更
		if(this.active){ this[this.activeSliderKey] = this.sliderDict[this.activeSliderKey].getValue(); }
	}
	display(){
		this.sliderArray.loop("display");
	}
	activate(offSetX = 0, offSetY = 0){
		// マウス位置がヒットしたらactivate. ひとつまで。
		this.sliderArray.forEach((eachSlider) => {
			if(eachSlider.hit(mouseX + offSetX, mouseY + offSetY)){
				eachSlider.activate();
        this.active = true;
				this.activeSliderKey = eachSlider.key; // activeなスライダーのキーをセット（これの為にキーを登録した）
				return;
			}
		})
	}
	inActivate(){
		this.sliderArray.loop("inActivate");
		this.activeSliderKey = "";
    this.active = false;
	}
}

// ---------------------------------------------------------------------------------------- //
// KeyAction.

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }else if(key === 'c'){
		// すべてけす
		cleanUp();
	  runTimeMax = 0;
    capacity = 0;
	}else if(key === 'i'){
    if(showInfo){ showInfo = false; return; }
    else{ showInfo = true; return; }
  }
}

// ---------------------------------------------------------------------------------------- //
// interaction.

function mousePressed(){
	controller.activate();
}

function mouseReleased(){
	controller.inActivate();
}
