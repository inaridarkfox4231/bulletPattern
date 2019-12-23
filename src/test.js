"use strict";

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

const INF = Infinity; // 長いので

let isLoop = true;
let showInfo = true;

let drawTimeSum = 0;
let drawTimeAverage = 0;
const AVERAGE_CALC_SPAN = 30;

let bulletPool;
let entity;

let testCannon;

function preload(){
  /* NOTHING */
}

function setup(){
  createCanvas(480, 640);
  angleMode(DEGREES);
  textSize(16);
  //preparePattern(); // jsonからあれこれするみたい(?)
  bulletPool = new ObjectPool(() => { return new Bullet(); }, 600);
  entity = new System();

  //createCannon(ptn);
  // さて・・
  // 加速するようになった。あとは・・んー。
  // 速いアクセルと遅いアクセルの合わせ技。こんなことも自由自在。
  let seed1 = {
    position:[240, 320], shotVelocity:[2, 90],
    action:[
      ["shotBehavior", "set", "lowAccell"],
      ["shotDirection", "add", 2], "routine", ["shotBehavior", "clear"],
      ["shotBehavior", "set", "highAccell"],
      ["shotDirection", "add", -2], "routine", ["shotBehavior", "clear"],
      {loop:INF, back:-1}],
    short:{routine:[["fire", "radial16"], {wait:4}, {loop:8, back:3}, {wait:16}]},
    fire:{radial16:{radial:{count:16}}},
    behavior:{
      lowAccell:["accellerateBehavior", {accelleration:0.05}],
      highAccell:["accellerateBehavior", {accelleration:0.1}]
    }
  };
  let seed2 = {
    position:[240, 160],
    action:[["shotSpeed", "set", [3, 6]], ["shotDirection", "set", [0, 360]], ["fire", "u"], {repeat:2, back:3}, {loop:INF, back:-1}],
    fire:{u:{}}
  };
  let seed3 = {
    position:[240, 160], shotVelocity:[2, 90],
    action:[["shotDirection", "set", [0, 360]], ["fire", "rad16way7"], {wait:60}, {loop:INF, back:-1}],
    fire:{rad16way7:{radial:{count:16}, nway:{count:7, interval:2}}}
  }
  // ホーミング要らない気がしてきたな・・どう使うんだ。とりあえず
  // waysを放った後自機狙い8発を延々と繰り返すパターン。
  let seed4 = {
    position:[240, 40], shotVelocity:[2, 90],
    action:[["aim"], ["fire", "way13"], ["aim"], ["fire", "go"], {wait:8}, {loop:8, back:3}, {wait:16}, {loop:INF, back:-1}],
    fire:{way13:{nway:{count:13, interval:6}}, go:{}}
  }
  // バリエーションが欲しい・・貧弱極まりなくてつまんない
  let seed5 = {
    position:[240, 320], shotVelocity:[2, 90],
    action:[["shotDirection", "set", [0, 360]], ["fire", "way27"], ["aim"], ["fire", "go"], {wait:5}, {loop:6, back:3}, {wait:30}, {loop:INF, back:-1}],
    fire:{way27:{nway:{count:27, interval:10}}, go:{}}
  }
  // waysてんこもり
  let seed6 = {
    position:[240, 80], shotVelocity:[4, 90],
    action:[["aim"], ["fire", "way5"], {wait:8},
            ["aim"], ["fire", "way9"], {wait:8},
            ["aim"], ["fire", "way13"], {wait:8},
            ["aim"], ["fire", "way17"], {wait:8},
            {wait:32}, {loop:INF, back:-1}],
    fire:{way5:{nway:{count:5, interval:6}}, way9:{nway:{count:9, interval:6}},
          way13:{nway:{count:13, interval:6}}, way17:{nway:{count:17, interval:6}}}
  }
  // カミソリ
  let seed7 = {
    position:[240, 320], shotVelocity:[4, 90],
    action:[["aim", 30], ["fire", "circle4"], {wait:8}, {loop:8, back:-1}, {wait:32}, {loop:INF, back:-1}],
    fire:{circle4:{formation:{type:"points", p:[[0, -50]]}, radial:{count:16}}}
  }
  // circularBehavior試してみよう
  // spiralBehavior試してみよう
  let seed8 = {
    position:[240, 320], shotVelocity:[4, 90],
    action:[["shotBehavior", "set", "spir"], ["fire", "oct"], "routine", "intervalShot",
            ["shotBehavior", "set", "spirInv"], ["fire", "octInv"], "routine", "intervalShot",
            {loop:INF, back:-1}],
    short:{routine:[{wait:16}, {loop:8, back:2}, {wait:32}, ["shotBehavior", "clear"]],
           intervalShot:[["aim", 30], ["fire", "radial8"], {wait:4}, {loop:8, back:3}, {wait:32}, ["shotDirection", "set", 90]]},
    fire:{radial8:{radial:{count:8}},
          oct:{formation:{type:"points", p:[[0, -50]]}, radial:{count:8}},
          octInv:{formation:{type:"points", p:[[0, 50]]}, radial:{count:8}}},
    behavior:{spir:["spiralBehavior", {radius:50, radiusIncrement:0.5}],
              spirInv:["spiralBehavior", {radius:50, radiusIncrement:0.5, clockwise:false}]}
  }
  // どうする？？
  let newPtn = parsePatternSeed(seed8);
  console.log(newPtn);
  //noLoop();
  createCannon(newPtn);
  // これを・・ね。
  // 得られたpatternをcreateCannonに放り込んでupdateで実行させる。
}

function draw(){
  background(220, 220, 255);

	const updateStart = performance.now(); // 時間表示。
  entity.update();
  const updateEnd = performance.now();
	const drawStart = performance.now(); // 時間表示。
  entity.draw();
  const drawEnd = performance.now();
	if(showInfo){ showPerformanceInfo(updateEnd - updateStart, drawEnd - drawStart); }
}

// ---------------------------------------------------------------------------------------- //
// PerformanceInfomation.

function showPerformanceInfo(updateTime, drawTime){
	fill(0);
	text("using:" + entity.getCapacity(), 40, 40);
  const updateTimeStr = updateTime.toPrecision(4);
  const updateInnerText = `${updateTimeStr}ms`;
  text("updateTime:" + updateInnerText, 40, 80);
  const drawTimeStr = drawTime.toPrecision(4);
  const drawInnerText = `${drawTimeStr}ms`;
  text("drawTime:" + drawInnerText, 40, 120);
	drawTimeSum += drawTime;
	if(frameCount % AVERAGE_CALC_SPAN === 0){
		drawTimeAverage = drawTimeSum / AVERAGE_CALC_SPAN;
		drawTimeSum = 0;
	}
	const drawTimeAverageStr = drawTimeAverage.toPrecision(4);
  const drawTimeAverageInnerText = `${drawTimeAverageStr}ms`;
  text("drawTimeAverage:" + drawTimeAverageInnerText, 40, 160);
}

// ---------------------------------------------------------------------------------------- //
// KeyAction.

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }else if(key === 'i'){
    if(showInfo){ showInfo = false; return; }
    else{ showInfo = true; return; }
  }
}

// ---------------------------------------------------------------------------------------- //
// System.
// とりあえずplayerを持たせるだけ

class System{
	constructor(){
		this.player = new SelfUnit();
    this.bulletArray = new CrossReferenceArray();
    this.cannonArray = new CrossReferenceArray();
	}
	initialize(){
		this.player.initialize();
    this.bulletArray.loopReverse("vanish");
    this.cannonArray.clear();
	}
	update(){
		this.player.update();
    this.cannonArray.loop("update");
    this.bulletArray.loop("update");
    this.bulletArray.loopReverse("eject");
	}
	draw(){
		this.player.draw();
    fill(0, 0, 255);
    this.bulletArray.loop("draw");
    this.cannonArray.loop("draw");
	}
  getCapacity(){
    return this.bulletArray.length;
  }
}

function createBullet(pattern){
  let newBullet = bulletPool.use();
  newBullet.setPattern(pattern);
  entity.bulletArray.add(newBullet);
}

function createCannon(pattern){
  let newCannon = new Cannon();
  newCannon.setPattern(pattern);
  entity.cannonArray.add(newCannon);
}

// ---------------------------------------------------------------------------------------- //
// Player.

class SelfUnit{
	constructor(){
		this.position = createVector(0, 0);
		this.initialize();
	}
	initialize(){
		this.position.set(width / 2, height * 7 / 8);
		this.speed = 4;
		this.rotationAngle = 0;
		this.rotationSpeed = 2;
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	update(){
		this.rotationAngle += this.rotationSpeed;
	  if(keyIsDown(LEFT_ARROW)){ this.position.x -= this.speed; }
		else if(keyIsDown(RIGHT_ARROW)){ this.position.x += this.speed; }
		else if(keyIsDown(UP_ARROW)){ this.position.y -= this.speed; }
		else if(keyIsDown(DOWN_ARROW)){ this.position.y += this.speed; }
	  this.frameIn();
	}
	frameIn(){
		this.position.x = constrain(this.position.x, 0, width);
		this.position.y = constrain(this.position.y, 0, height);
	}
	draw(){
		const {x, y} = this.position;
		const c = cos(this.rotationAngle) * 16;
		const s = sin(this.rotationAngle) * 16;
		stroke(0);
		noFill();
		strokeWeight(2);
		quad(x + c, y + s, x - s, y + c, x - c, y - s, x + s, y - c);
		strokeWeight(4);
		point(x, y);
    noStroke();
	}
}

// ---------------------------------------------------------------------------------------- //
// Bullet.

class Bullet{
	constructor(){
		this.direction = 0;
		this.speed = 0;
		this.position = createVector(0, 0);
		this.velocity = createVector(0, 0);
		this.properFrameCount = 0;
		this.pattern = undefined;
    this.delay = 0; // ディレイ。
		this.vanishFlag = false; // まずフラグを立ててそれから別処理で破棄
    this.behaviorList = [];
    // this.shotSpeed = 1;
    // this.shotDirection = 0;
    // this.shotBehavior = {};
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	setVelocity(speed, angle){
		// angleはdegree指定
		this.speed = speed;
		this.direction = angle;
		this.velocityUpdate();
	}
  setDelay(delayCount){
    this.delay = delayCount;
  }
  setOptionalBehavior(behavior){
    // behaviorは関数の配列
    behavior.forEach((eachBehavior) => {
      this.behaviorList.unshift(eachBehavior); // 先頭から入れていく
    })
  }
  velocityUpdate(){
		this.velocity.set(this.speed * cos(this.direction), this.speed * sin(this.direction));
  }
	setPattern(_pattern){
    this.properFrameCount = 0;
		this.pattern = _pattern;
    const {x, y, speed, direction, delay, behavior} = _pattern;
    this.setPosition(x, y);
    this.setVelocity(speed, direction);
    if(delay !== undefined){ this.setDelay(delay); }else{ this.setDelay(0); }
    this.behaviorList.push(goBehavior); // default
    this.behaviorList.push(frameOutBehavior); // default
    if(behavior !== undefined){
      this.setOptionalBehavior(_pattern.behavior);
    }
    this.vanishFlag = false;
	}
	update(){
    if(this.delay > 0){ this.delay--; return; }
    //this.pattern.move(this);
    this.behaviorList.forEach((behavior) => {
      behavior(this);
    })
    this.properFrameCount++;
		//if(!this.isInFrame()){ this.vanishFlag = true; } // ここではフラグを立てるだけ。直後に破棄。
	}
	eject(){
		if(this.vanishFlag){ this.vanish(); }
	}
	vanish(){
		// 自分をPoolに戻した後で自分を親から排除する
    this.behaviorList = []; // behaviorListのクリーンアップ
		this.belongingArray.remove(this);
		bulletPool.recycle(this);
	}
	draw(){
		// push/popは遅いのでやめる
		// とりあえず三角形だけど別のバージョンも考えたい、あと色とか変えたいな。
		const x = this.position.x;
		const y = this.position.y;
		const c = cos(this.direction);
		const s = sin(this.direction);
		triangle(x + 6 * c, y + 6 * s, x - 6 * c + 3 * s, y - 6 * s - 3 * c, x - 6 * c - 3 * s, y - 6 * s + 3 * c);
	}
}

// ---------------------------------------------------------------------------------------- //
// Cannon.
// 何をする？bulletを作る。bulletは何を作る？bulletを作る。

class Cannon{
  constructor(){
		this.position = createVector();
    // this.delay = 0; // delayあった方がいいかなって思って
		this.initialize();
	}
  setPosition(x, y){
    this.position.set(x, y);
  }
	initialize(){
		// これはbodyに関する情報
		this.rotationAngle = 0;
		this.rotationSpeed = 2;
		// フレームカウント
		this.properFrameCount = 0;
		// 弾丸の発射の仕方について
		this.pattern = undefined;
    this.shotSpeed = 1;
    this.shotDirection = 0;
    this.shotBehavior = {}; // bulletにセットする付加的なふるまい（関数列）
	}
  setPattern(_pattern){
    this.pattern = _pattern;
    const {x, y, shotSpeed, shotDirection, shotBehavior} = _pattern;
    this.setPosition(x, y);
    if(shotSpeed !== undefined){ this.shotSpeed = shotSpeed; }
    if(shotDirection !== undefined){ this.shotDirection = shotDirection; }
    if(shotBehavior !== undefined){ this.shotBehavior = shotBehavior; } // 関数列
  }
	update(){
    // flagは常にfalseで返るはず・・でないとバグになる。大丈夫なのか心配。
    // patternの実行の仕方。actionの各成分を逐一実行していく。indexが滑る。
    // 実行ごとにflagが返り、falseのときに抜ける。
    let debug = 0; // デバッグモード
    let continueFlag = true;
    while(continueFlag){
      const currentIndex = this.pattern.index;
      const currentAction = this.pattern.action[currentIndex];
      continueFlag = execute(this, currentAction);
      debug++; // デバッグモード
      if(debug > 10000){ break; } // デバッグモード
    }
    this.properFrameCount++;
    // bullet関連のupdate.
		this.rotationAngle += this.rotationSpeed; // 本体の回転
	}
	draw(){
		const {x, y} = this.position;
		const c = cos(this.rotationAngle) * 20;
		const s = sin(this.rotationAngle) * 20;
		fill(120);
		quad(x + c, y + s, x - s, y + c, x - c, y - s, x + s, y - c);
	}
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
// Utility.

// 自機方向の取得
function getPlayerDirection(pos, margin = 0){
  const {x, y} = entity.player.position;
  return atan2(y - pos.y, x - pos.x) + margin * random(-1, 1);
}

// 自機方向の2乗の取得
function getPlayerDistSquare(pos){
  const {x, y} = entity.player.position;
  return pow(pos.x - x, 2) + pow(pos.y - y, 2);
}

function getNumber(data){
  // dataが単なる数ならそれを返す。
  // [2, 4]とかなら2から4までのどれかの実数を返す。
  // [2, 8, 0.2]とかなら2以上8未満の0.2刻みの（2, 2.2, 2.4, ...）どれかを返す。
  if(typeof(data) === "number"){ return data; }
  switch(data.length){
		case 2:
		  return random(data[0], data[1]);
		case 3:
		  const a = data[0];
			const b = data[1];
			const step = data[2];
			return a + Math.floor(random((b - a) / step)) * step;
	}
}

// ---------------------------------------------------------------------------------------- //
// Behavior.
// ああこれbehaviorか。配列に入れて毎フレーム実行するやつや・・goとかもそうよね。
// せいぜいデフォのgoの他はaccellerate, decelerate, brakeAccell, raidくらいか。組み合わせる。
// 組み合わせるのでもういちいちあれ（位置に速度プラス）を書かない。

// 画面外で消える
function frameOutBehavior(_bullet){
  const {x, y} = _bullet.position;
  if(x < -width * 0.2 || x > width * 1.2 || y < -height * 0.2 || y > height * 1.2){ _bullet.vanishFlag = true; }
}

// 速度の方向に進む
function goBehavior(_bullet){
  _bullet.position.add(_bullet.velocity);
}

// 加速
// accelleration
function accellerateBehavior(param){
  return (_bullet) => {
    _bullet.speed += param.accelleration;
    _bullet.velocityUpdate();
  }
}

// 一定時間減速
// friction, terminalSpeed
function decelerateBehavior(param){
  return (_bullet) => {
    if(_bullet.speed > param.terminalSpeed){
      _bullet.speed *= (1 - param.friction);
      _bullet.velocityUpdate();
    }
  }
}

// 一定時間減速したのち加速
// threshold, friction, accelleration
function brakeAccellBehavior(param){
  return (_bullet) => {
    if(_bullet.properFrameCount < param.threshold){
      _bullet.speed *= (1 - param.friction);
    }else{
      _bullet.speed += param.accelleration;
    }
  }
}

// ホーミング(一定フレームおきにこっち方向に進路を合わせる感じ)
// しきい値を超えると直進(デフォは60)
// refleshSpan, threshold, margin
function homingBehavior(param){
  const margin = (param.hasOwnProperty("margin") ? param.margin : 0);
  const threshold = (param.hasOwnProperty("threshold") ? param.threshold : 60);
  return (_bullet) => {
    const fc = _bullet.properFrameCount;
    if(fc % param.refleshSpan === 0 && fc < threshold){
      _bullet.direction = getPlayerDirection(_bullet.position, margin);
      _bullet.velocityUpdate();
    }
  }
}

// レイド（近付くと加速）
// 2乗の値を設定（10000なら100以内みたいな）
// raidDistSquare, accelleration
function raidBehavior(param){
  return (_bullet) => {
    if(getPlayerDistSquare(_bullet.position) < param.raidDistSquare){
      _bullet.speed += param.accelleration;
      _bullet.velocityUpdate();
    }
  }
}

// formationで速度の方向を円の接線方向にしてradiusで増やせばそれっぽくなるよ。
// 円の接線方向に発射される弾丸を中心の周りに巻き付ける処理ですね。
// radius, clockwise
function circularBehavior(param){
  if(!param.hasOwnProperty("clockwise")){ param.clockwise = true; }
  const clockwiseFactor = (param.clockwise ? 1 : -1);
  return (_bullet) => {
    _bullet.direction += asin(_bullet.speed / param.radius) * clockwiseFactor;
    _bullet.velocityUpdate();
  }
}

// 螺旋を描きながら発散するやつ。
// 半径が線型に増加していく、速さは一定。
// radius, radiusIncrement, clockwise
function spiralBehavior(param){
  if(!param.hasOwnProperty("clockwise")){ param.clockwise = true; }
  const clockwiseFactor = (param.clockwise ? 1 : -1);
  return (_bullet) => {
    const r = param.radius + _bullet.properFrameCount * param.radiusIncrement;
    _bullet.direction += asin(_bullet.speed / r) * clockwiseFactor;
    _bullet.velocityUpdate();
  }
}

// 螺旋を描きながら


// プレーヤーに近付くと加速するくらいだったら作ってもいいかな(raidBehavior)

// あとはプレイヤーが近付くとバーストするとか面白そう（いい加減にしろ）
// 画面の端で3回反射するまで動き続けるとか面白そう。
// 放物軌道とか・・
// 画面の端を走って下まで行って直進してプレイヤーと縦で重なると2倍速でぎゅーんって真上に（以下略）

// ---------------------------------------------------------------------------------------- //
// createFirePattern.
// 各種パターンの生成。そのうちdelayとかstealthとか実装したい。
// delay:一定時間止まってからスタートする。
// stealth:一定時間の間姿が見えない（当たり判定も存在しない）・・トラップみたいなのイメージしてる。
// stealthとホーミングやディレイを組み合わせたら面白いものが出来そう。

function getFormation(param){
  let ptnArray = [];
  switch(param.type){
    case "default":
      // その場に1個
      ptnArray.push({x:0, y:0});
      break;
    case "points":
      // 指定した場所. xArrayとyArrayは同じ長さにしておくこと。
      // たとえば射出方向に対して時計回り90°方向30の位置に置こうと思ったら[0, 30]を指定する感じ。
      for(let i = 0; i < param.p.length; i++){
        ptnArray.push({x:param.p[i][0], y:param.p[i][1]});
      }
      break;
    case "frontVertical":
      // 射出方向に横一列
      for(let i = 0; i < param.count; i++){
        ptnArray.push({x:param.distance, y:(i - (param.count - 1) / 2) * param.interval});
      }
      break;
    case "frontHorizontal":
      // 射出方向に縦一列
      for(let i = 0; i < param.count; i++){
        ptnArray.push({x:param.distance + i * param.interval, y:0});
      }
      break;
    case "wedge":
      // 射出方向のどこかから対称にV字(2n+1個)
      ptnArray.push({x:param.distance, y:0});
      for(let i = 1; i < param.count; i++){
        ptnArray.push({x:param.distance + i * param.diffX, y:i * param.diffY});
        ptnArray.push({x:param.distance + i * param.diffX, y:-i * param.diffY});
      }
      break;
    case "randomCircle":
      // 中心から一定の円形の範囲内でランダムにいくつか
      for(let i = 0; i < param.count; i++){
        let r = random(0, param.radius);
        let theta = random(0, 360);
        ptnArray.push({x:r * cos(theta), y:r * sin(theta)});
      }
      break;
  }
  return ptnArray;
}

function fitting(posArray, direction){
  // posArrayをすべてdirectionだけ回転させる
  posArray.forEach((pos) => {
    const {x, y} = pos;
    pos.x = x * cos(direction) - y * sin(direction);
    pos.y = y * cos(direction) + x * sin(direction);
  })
}

// いわゆるnway.
// countが個数、intervalは角度のインターバル。
function createNWay(param, ptnArray){
  let newArray = [];
  // x, yは指定角度だけ回転させる、あとdirectionも。
  ptnArray.forEach((ptn) => {
    for(let i = 0; i < param.count; i++){
      const diffAngle = (i - (param.count - 1) / 2) * param.interval;
      const {x, y, direction} = ptn;
      let newPtn = {speed:ptn.speed};
      newPtn.x = x * cos(diffAngle) - y * sin(diffAngle);
      newPtn.y = y * cos(diffAngle) + x * sin(diffAngle);
      newPtn.direction = direction + diffAngle;
      newArray.push(newPtn);
    }
  })
  return newArray;
}

// いわゆるradial.
// countが角度の個数.
function createRadial(param, ptnArray){
  let newArray = [];
  // diffAngleに360/param.countを使うだけ。
  ptnArray.forEach((ptn) => {
    for(let i = 0; i < param.count; i++){
      const diffAngle = 360 * i / param.count;
      const {x, y, direction} = ptn;
      let newPtn = {speed:ptn.speed};
      newPtn.x = x * cos(diffAngle) - y * sin(diffAngle);
      newPtn.y = y * cos(diffAngle) + x * sin(diffAngle);
      newPtn.direction = direction + diffAngle;
      newArray.push(newPtn);
    }
  })
  return newArray;
}

// いわゆるline.
// 速さを増しながら複数用意する感じ
function createLine(param, ptnArray){ /* 工事中 */ }

// この関数をたとえば4フレームに1回とかすることでいろいろ実現できるよって感じのあれ。
// data.formation:{}フォーメーションを決める
//   type:default・・普通に真ん中に1個（formation未指定の場合はこれになる）
//   type:frontVertical・・
// data.delay:{}準備中
// data.nwayやらdata.radialやら存在するならそれを考慮・・準備中。
// data.name:ショットの種類
// data.param:{}ショットに付随する追加パラメータ
function createFirePattern(data){
  return (_cannon) => {
    // dataはjson形式、これを解釈することで、1フレームにCannonがbulletを発射する関数を作る。
    // formationの取得。なお、formationプロパティが無い時は自動的にデフォルトになる。
    let patternSeed = [];
    if(data.hasOwnProperty("formation")){
      patternSeed = getFormation(data.formation);
    }else{
      patternSeed = [{x:0, y:0}]; }
    // 必要ならdata.delayに基づいてディレイ
    // この時点で[{x:~~, y:~~}]の列ができている。回転させて正面にもってくる。
    fitting(patternSeed, _cannon.shotDirection);
    // 速度を設定
    patternSeed.forEach((ptn) => {
      ptn.speed = _cannon.shotSpeed;
      ptn.direction = _cannon.shotDirection;
    })
    // nwayとかradialとかする(data.decorateに情報が入っている)
    if(data.hasOwnProperty("nway")){
      patternSeed = createNWay(data.nway, patternSeed); // とりあえずnway.
    }
    if(data.hasOwnProperty("radial")){
      patternSeed = createRadial(data.radial, patternSeed); // とりあえずradial.
    }
    // positionとbehaviorを設定
    patternSeed.forEach((ptn) => {
      ptn.x += _cannon.position.x;
      ptn.y += _cannon.position.y;
      // ptn.behavior = _cannon.shotBehavior; // ここで登録
      // Object.values()はvalueだけを抜き出して配列にする。
      ptn.behavior = Object.values(_cannon.shotBehavior);
    })
    // data.nameはショットの種類、data.paramは設定するパラメータの内容
    // name指定がない場合は自動的にgoになる。
    // ここを廃止してbehaviorListのデータを_cannonから取得してセットする形にするとか。
    // ptn.behavior = _cannon.shotBehavior;
    patternSeed.forEach((ptn) => {
      createBullet(ptn);
    })
    // お疲れさまでした。
  }
}

// ---------------------------------------------------------------------------------------- //
// parse.
// patternの核となるaction部分を作る、あるいは実行する処理。
// 前半はパース部分、後半は各セグメントに対するexecute部分。

// パース関数
// 配列を返すやつと本体と二つ必要なんですよね。
// sample:{x:~~, y:~~, speed:~~(あれば), direction, action:~~, あればfire:~~みたいな。}
// x, y, speed, directionのところはそのままコピーする感じでOK.
// fire:{名前:seed}みたいな感じにしようね。
// type:"fire"とかtype:"config"とかしたいの。
// たとえば type:"fire", name:"random_2_1"みたいな感じ
// fire.random_2_1:関数
function parsePatternSeed(seed){
  let pattern = {};
  // position, velocity, shotVelocity. 初期設定。
  // delay, shotDelay, behaviorも追加することになりそう。
  if(seed.hasOwnProperty("position")){
    pattern.x = seed.position[0];
    pattern.y = seed.position[1];
  }
  if(seed.hasOwnProperty("velocity")){
    if(seed.velocity[0] !== "-"){ pattern.speed = seed.velocity[0]; }
    if(seed.velocity[1] !== "-"){ pattern.direction = seed.velocity[1]; }
  }
  if(seed.hasOwnProperty("shotVelocity")){
    if(seed.shotVelocity[0] !== "-"){ pattern.shotSpeed = seed.shotVelocity[0]; }
    if(seed.shotVelocity[1] !== "-"){ pattern.shotDirection = seed.shotVelocity[1]; }
  }
  // action(行動パターン).
  // 先に省略形で書いた部分を展開する。
  // ただしshortプロパティは存在しない場合もあるので注意する。
  let actionArray = (seed.hasOwnProperty("short") ? getExpansion(seed.short, seed.action) : seed.action);

  // 略記法で書かれたactionArrayを翻訳する感じ。オプションも付けられる高性能。
  pattern.action = createAction(actionArray);
  // fire(各種発射メソッド). 関数に変換する。
  // fireの中の名前のキーに対して関数を登録する感じ。
  pattern.fire = {}; // これを用意しておかないとエラーになる
  if(seed.hasOwnProperty("fire")){
    Object.keys(seed.fire).forEach((weaponName) => {
      pattern.fire[weaponName] = createFirePattern(seed.fire[weaponName]);
    })
  }
  pattern.behavior = {};
  if(seed.hasOwnProperty("behavior")){
    // [name, param]という配列形式になっている。
    // for example: ["accellerate", {accelleration:0.1}]
    Object.keys(seed.behavior).forEach((behaviorName) => {
      const content = seed.behavior[behaviorName];
      pattern.behavior[behaviorName] = window[content[0]](content[1]);
    })
  }
  // って感じ？
  pattern.index = 0; // 配列実行時に使うcurrentIndex. これを付け加えて完成。
  return pattern;
}

// 展開関数
// ここは再帰を使って下位区分までstringを配列に出来るように工夫する必要がある。
// 名前空間・・seed.shortに入れておいて逐次置き換える感じ。
// seed.shortにはショートカット配列が入ってて、それを元にseed.actionの内容を展開して
// 一本の配列を再帰的に構成する流れ。要はstringが出てくるたびにshortから引っ張り出してassignでクローンして
// 放り込んでいくだけ。
function getExpansion(shortcut, action){
  let actionArray = [];
  for(let i = 0; i < action.length; i++){
    const segment = action[i];
    if(typeof(segment) === "string"){
      const segmentArray = getExpansion(shortcut, shortcut[segment]);
      segmentArray.forEach((obj) => {
        let copyObj = {};
        // 配列をアサインでクローンすると配列にならずにlengthとかも失われるようです。
        Object.assign(copyObj, obj);
        if(obj.hasOwnProperty("length")){ copyObj.length = obj.length; }
        actionArray.push(copyObj);
      })
    }else{
      let copyObj = {};
      Object.assign(copyObj, segment); // 念のためコピー
      // なので、lengthがある場合はコピーします。
      if(segment.hasOwnProperty("length")){ copyObj.length = segment.length; }
      actionArray.push(copyObj);
    }
  }
  //console.log(actionArray);
  return actionArray;
}

// 応用すれば、一定ターン移動するとかそういうのもbackupで表現できそう（waitの派生形）

// 配列のloopとrepeatのところにbackupプロパティを付け加える処理
// ではなく、略記で書かれたaction配列を正式な形にパースする処理。
function createAction(data){
  let finalArray = [];
  // backupプロパティを追加して返すだけ。
  for(let index = 0; index < data.length; index++){
    const block = data[index];
    let segment = {};
    if(block.hasOwnProperty("repeat") || block.hasOwnProperty("loop")){
      Object.assign(segment, block);
      // ここですね。ここで、block.back === -1ならsegment.backをindexにする。
      // 先頭に戻れ、という指示。
      // というか-nで先頭から（1ベースで）n番目、という風にしてもいい。
      // たとえば-3ならindexが2の所に戻る感じ。
      if(block.back < 0){ segment.back += index + 1; }
      segment.backup = [];
      // ここsegment.backとしないとエラーになるよね。そりゃそうだ。
      for(let k = 1; k <= segment.back; k++){
        const eachBlock = data[index - k];
        // 該当するindexだけ後ろのセグメントのどのプロパティをどんな値に復元するかのデータを登録する
        ["repeat", "wait", "loop"].forEach((name) => {
          if(eachBlock.hasOwnProperty(name)){
            let obj = {};
            // nameがないとどのプロパティを復元するのか分からないだろ・・
            obj.back = k;
            obj.name = name;
            obj[name] = eachBlock[name];
            segment.backup.push(obj);
          }
        })
      }
    }else if(block.hasOwnProperty("length")){
      // 配列の場合は先頭をtypeにしてあとは適当に。
      segment.type = block[0];
      setProp(segment, block); // typeの内容により場合分けする。
    }else{
      // waitの場合。普通にコピーするだけ。
      Object.assign(segment, block);
    }
    // segmentをpush.
    finalArray.push(segment);
  }
  // オブジェクトをいじったものを返している。
  return finalArray;
}

// configやめて。shotSpeedChangeにして。色々。
function setProp(segment, block){
  const type = block[0];
  if(type === "shotSpeed" || type === "shotDirection" || type === "speed" || type === "direction"){
    segment.mode = block[1];
    segment[type + "Change"] = block[2];
    return;
  }
  switch(type){
    case "shotBehavior":
      segment.mode = block[1];
      segment.name = block[2];
      break;
    case "fire":
      segment.name = block[1];
      break;
    case "vanish":
      break;
    case "aim":
      if(block[1] !== "-"){ segment.margin = block[1]; }
      break;
  }
}

// executeはここで。こうする、bulletにも適用したい・・
// だからCannonのexecuteとかそこらへんは無くすかもね。
function execute(_cannon, action){
  if(action.hasOwnProperty("wait")){
    // waitを減らすだけ。正なら抜ける。0なら次へ。
    action.wait--;
    if(action.wait > 0){ return false; }
    else{
      _cannon.pattern.index++;
      return true;
    }
  }
  if(action.hasOwnProperty("type")){
    // nameの内容に応じた行動を実行して次へ。
    executeEachAct(action, _cannon);
    _cannon.pattern.index++;
    return true;
  }
  if(action.hasOwnProperty("repeat")){
    // 同じターン内の繰り返し
    action.repeat--;
    if(action.repeat > 0){
      recovery(action.backup, _cannon.pattern.action, _cannon.pattern.index);
      _cannon.pattern.index -= action.back;
    }else{
      _cannon.pattern.index++;
    }
    return true;
  }
  if(action.hasOwnProperty("loop")){
    // repeatと違ってループをさかのぼるときにターンを抜ける
    action.loop--;
    if(action.loop > 0){
      recovery(action.backup, _cannon.pattern.action, _cannon.pattern.index);
      _cannon.pattern.index -= action.back;
      return false; // ここが違う。
    }else{
      _cannon.pattern.index++;
      return true; // infinite loopの場合ここは存在しない
    }
  }
}

// switchで書き直したいね。
// config廃止しました。
function executeEachAct(action, _cannon){
  const type = action.type;
  if(type === "shotSpeed" || type === "shotDirection" || type === "speed" || type === "direction"){
    // ショットの速さ、方向を変える場合
    const change = getNumber(action[type + "Change"]);
    if(action.mode === "set"){
      _cannon[type] = change;
    }else if(action.mode === "add"){
      _cannon[type] += change;
    }
    return;
  }
  switch(type){
    case "shotBehavior":
      if(action.mode === "set"){
        _cannon.shotBehavior[action.name] = _cannon.pattern.behavior[action.name];
      }else if(action.mode === "delete"){
        delete _cannon.shotBehavior[action.name];
      }else if(action.mode === "clear"){
        _cannon.shotBehavior = {};
      }
      break;
    case "fire":
      // 各種firePattern関数を実行する
      _cannon.pattern.fire[action.name](_cannon);
      break;
    case "vanish":
      // _bulletに適用することを想定してこんな感じに。vanishFlagを立てる。
      _cannon.vanishFlag = true;
      break;
    case "aim":
      // bulletDirectionを自機の方向に合わせる
      const margin = (action.hasOwnProperty("margin") ? action.margin : 0);
      _cannon.shotDirection = getPlayerDirection(_cannon.position, margin);
      break;
  }
  // 他にも増やすかもだけど・・
}

// リピーションパラメータの復元
function recovery(backup, action, pivotIndex){
  backup.forEach((data) => {
    action[pivotIndex - data.back][data.name] = data[data.name];
  })
}
