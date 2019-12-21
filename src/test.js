"use strict";

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

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
  let fireData = {
    radial:{count:16},
  };
  let fireFunc = createFirePattern(fireData);
  let func = (_cannon) => {
    const fc = _cannon.properFrameCount;
    if(fc % 4 === 0){
      _cannon.config({type:"add", direction:5 * (frameCount % 60 < 30 ? 1 : -1)});
      fireFunc(_cannon);
    }
  }
  let ptn = {x:width / 2, y:height / 4, bulletSpeed:8, bulletDirection:90, execute:func};
  //createCannon(ptn);
  // さて・・
  let seed1 = {x:240, y:320, speed:2, direction:90,
  action:[
  {type:"config", mode:"add", direction:2}, "routine", // 略記法・・配列が入ってるので展開して放り込む。
  {type:"config", mode:"add", direction:-2}, "routine",
  {loop:Infinity, back:10}],
  short:{routine:[{type:"fire", name:"radial16"}, {wait:4}, {loop:8, back:3}, {wait:16}]},
  fire:{radial16:{radial:{count:16}}}
  };
  let seed2 = {x:240, y:160,
  action:[{type:"config", mode:"set", speed:[3, 6], direction:[0, 360]}, {type:"fire", name:"u"}, {repeat:2, back:2}, {loop:Infinity, back:3}],
  fire:{u:{}}
  };
  // どうする？？
  let newPtn = parsePatternSeed(seed2);
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
  velocityUpdate(){
		this.velocity.set(this.speed * cos(this.direction), this.speed * sin(this.direction));
  }
	setPattern(_pattern){
    this.properFrameCount = 0;
		this.pattern = _pattern;
    const {x, y, speed, direction, delay} = _pattern;
    this.setPosition(x, y);
    this.setVelocity(speed, direction);
    if(delay !== undefined){ this.setDelay(delay); }else{ this.setDelay(0); }
    this.vanishFlag = false;
	}
	update(){
    if(this.delay > 0){ this.delay--; return; }
    this.pattern.execute(this);
    this.properFrameCount++;
		if(!this.isInFrame()){ this.vanishFlag = true; } // ここではフラグを立てるだけ。直後に破棄。
	}
	eject(){
		if(this.vanishFlag){ this.vanish(); }
	}
	vanish(){
		// 自分をPoolに戻した後で自分を親から排除する
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
	isInFrame(){
		// フレーム外に出たときの排除処理
		if(this.position.x < -10 || this.position.x > width + 10){ return false; }
		if(this.position.y < -10 || this.position.y > height + 10){ return false; }
		return true;
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
    this.bulletSpeed = 1;
    this.bulletDirection = 0;
	}
  setPattern(_pattern){
    this.pattern = _pattern;
    const {x, y, speed, direction} = _pattern;
    this.setPosition(x, y);
    if(speed !== undefined){ this.bulletSpeed = speed; }
    if(direction !== undefined){ this.bulletDirection = direction }
  }
	update(){
    // flagは常にfalseで返るはず・・でないとバグになる。大丈夫なのか心配。
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

function getPlayerDirection(pos, margin = 0){
  const {x, y} = entity.player.position;
  return atan2(y - pos.y, x - pos.x) + margin * random(-1, 1);
}

function randomRange(dataArray){
	// a以上b以下のfloatをランダムで返す(a<b前提)
	// i刻みで値を出すこともできる(たとえば3,6,1なら3,4,5のどれかみたいな)
	// [2]なら2を返す。
	// [3, 5]なら3以上5未満のどれかの実数を返す。
	// [4, 9, 0.2]なら4, 4.2, 4.4, 4.6, ... (9未満)のどれかの実数を返す。
  switch(dataArray.length){
		case 1:
		  return dataArray[0];
		case 2:
		  return dataArray[0] + Math.random() * (dataArray[1] - dataArray[0]);
		case 3:
		  const a = dataArray[0];
			const b = dataArray[1];
			const step = dataArray[2];
			return a + Math.floor(Math.random() * (b - a) / i) * i;
	}
}

// ---------------------------------------------------------------------------------------- //
// Behavior.
// 遊びはこのくらいにして

function go(_bullet){
  // 普通に進む
  _bullet.position.add(_bullet.velocity);
}

function accellerate(param){
  // 加速する
  // acceleration:毎フレームの加速度
  return (_bullet) => {
    _bullet.speed += param.accelleration;
		_bullet.velocityUpdate();
    _bullet.position.add(_bullet.velocity);
  }
}

function decelerate(param){
  // (1-f)倍していってterminalになったら等速
  // friction:毎フレームの減速度合い、terminalSpeed:終端速度
  return (_bullet) => {
    if(_bullet.speed > param.terminalSpeed){
      _bullet.speed *= (1 - param.friction);
		_bullet.velocityUpdate();
    }
    _bullet.position.add(_bullet.velocity);
  }
}

function brakeAccell(param){
  // thresholdフレームだけ(1-f)倍していってそのあとで加速する
  // aimがtrueの場合はカウント消費後に自機狙いになる
  // threshold:減速してる時間、friction:減速の度合い、accelleration:減速後の加速度、
  // aim:デフォルトはfalse, 減速後にエイムするかどうか、margin:エイムの余地、デフォルトは0
  const aim = (param.hasOwnProperty("aim") ? param.aim : false);
  const margin = (param.hasOwnProperty("margin") ? param.margin : 0);
  return (_bullet) => {
    if(_bullet.properFrameCount < param.threshold){
      _bullet.speed *= (1 - param.friction);
    }else if(_bullet.properFrameCount === param.threshold){
      if(aim){ _bullet.direction = getPlayerDirection(_bullet.position, margin); }
    }else{
      _bullet.speed += param.accelleration;
    }
		_bullet.velocityUpdate();
    _bullet.position.add(_bullet.velocity);
  }
}

function curving(param){
  // 一定の角度ずつカーブしていく
  // directionChange: 方向変化
  return (_bullet) => {
    _bullet.direction += param.directionChange;
		_bullet.velocityUpdate();
    _bullet.position.add(_bullet.velocity);
  }
}

function waving(param){
  // 一定の範囲内で微妙に角度を変えながら進む
  // friction:ゆれ
  return (_bullet) => {
    _bullet.direction += param.friction * random(-1, 1);
		_bullet.velocityUpdate();
    _bullet.position.add(_bullet.velocity);
  }
}

function arcGun(param){
  // 普通に放ってから自機狙いに切り替える感じ
  // threshold:曲がるまでの進んでる時間、diffAngle:本来の方向に対するずれ、margin:aimのずれ
  // やっぱり元の方向に戻すようにするか。で、aimと分ける感じで。aim:デフォルトはfalse.
  const aim = (param.hasOwnProperty("aim") ? param.aim : false);
  const margin = (param.hasOwnProperty("margin") ? param.margin : 0);
  return (_bullet) => {
    if(_bullet.properFrameCount === 0){
      _bullet.direction += param.diffAngle;
    }else if(_bullet.properFrameCount === param.threshold){
      if(aim){ _bullet.direction = getPlayerDirection(_bullet.position, margin); }
      else{ _bullet.direction -= param.diffAngle; }
    }
		_bullet.velocityUpdate();
    _bullet.position.add(_bullet.velocity);
  }
}

function homing(param){
  // スピードが落ち着いてから自機狙いで向かってきてある程度のところで消える感じ
  // friction:減速の度合い、terminalSpeed:終端速度、life:消えるまでの時間、margin:ホーミング精度でデフォルト0
  const margin = (param.hasOwnProperty("margin") ? param.margin : 0);
  return (_bullet) => {
    if(_bullet.speed > param.terminalSpeed){
      _bullet.speed *= (1 - param.friction);
    }else{
      _bullet.direction = getPlayerDirection(_bullet.position, margin);
    }
    _bullet.velocityUpdate();
    _bullet.position.add(_bullet.velocity);
    if(_bullet.properFrameCount === param.life){ _bullet.vanishFlag = true; }
  }
}

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
    fitting(patternSeed, _cannon.bulletDirection);
    // 速度を設定
    patternSeed.forEach((ptn) => {
      ptn.speed = _cannon.bulletSpeed;
      ptn.direction = _cannon.bulletDirection;
    })
    // nwayとかradialとかする(data.decorateに情報が入っている)
    if(data.hasOwnProperty("nway")){
      patternSeed = createNWay(data.nway, patternSeed); // とりあえずnway.
    }
    if(data.hasOwnProperty("radial")){
      patternSeed = createRadial(data.radial, patternSeed); // とりあえずradial.
    }
    // positionを設定
    patternSeed.forEach((ptn) => {
      ptn.x += _cannon.position.x;
      ptn.y += _cannon.position.y;
    })
    // data.nameはショットの種類、data.paramは設定するパラメータの内容
    // name指定がない場合は自動的にgoになる。
    patternSeed.forEach((ptn) => {
      if(data.hasOwnProperty("name")){
        ptn.execute = window[data.name](data.param);
      }else{
        ptn.execute = go;
      }
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
  const {x, y, speed, direction} = seed;
  pattern.x = x;
  pattern.y = y;
  if(speed !== undefined){ pattern.speed = speed; }
  if(direction !== undefined){pattern.direction = direction; }
  // action(行動パターン).
  // 先に省略形で書いた部分を展開する。
  let actionArray = getExpansion(seed.short, seed.action);
  // 展開してできたactionArrayのloopとrepeatにbackupInformationを付けて完成
  pattern.action = addBackupInfo(actionArray); // recursion.
  // fire(各種発射メソッド). 関数に変換する。
  // fireの中の名前のキーに対して関数を登録する感じ。
  pattern.fire = {}; // これを用意しておかないとエラーになる
  if(seed.hasOwnProperty("fire")){
    Object.keys(seed.fire).forEach((weaponName) => {
      pattern.fire[weaponName] = createFirePattern(seed.fire[weaponName]);
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
        Object.assign(copyObj, obj);
        actionArray.push(copyObj);
      })
    }else{
      let copyObj = {};
      Object.assign(copyObj, segment); // 念のためコピー
      actionArray.push(copyObj);
    }
  }
  return actionArray;
}

// 応用すれば、一定ターン移動するとかそういうのもbackupで表現できそう（waitの派生形）

// 配列のloopとrepeatのところにbackupプロパティを付け加える処理
function addBackupInfo(data){
  // backupプロパティを追加して返すだけ。
  for(let index = 0; index < data.length; index++){
    let block = data[index];
    if(block.hasOwnProperty("repeat") || block.hasOwnProperty("loop")){
      block.backup = [];
      for(let k = 1; k <= block.back; k++){
        const eachBlock = data[index - k];
        // 該当するindexだけ後ろのセグメントのどのプロパティをどんな値に復元するかのデータを登録する
        ["repeat", "wait", "loop"].forEach((name) => {
          if(eachBlock.hasOwnProperty(name)){
            let obj = {};
            // nameがないとどのプロパティを復元するのか分からないだろ・・
            obj.back = k; obj.name = name; obj[name] = eachBlock[name];
            block.backup.push(obj);
          }
        })
      }
    }
  }
  // オブジェクトをいじったものを返している。
  return data;
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
function executeEachAct(action, _cannon){
  if(action.type === "config"){
    // 今のところfire以外はconfigだけ
    //const param = action.param;
    const {speed, direction} = action;
    if(action.mode === "set"){
      if(speed !== undefined){ _cannon.bulletSpeed = randomRange(speed); }
      if(direction !== undefined){ _cannon.bulletDirection = randomRange(direction); }
    }else if(action.mode === "add"){
      if(speed !== undefined){ _cannon.bulletSpeed += speed; }
      if(direction !== undefined){ _cannon.bulletDirection += direction; }
    }else if(action.mode === "align"){
      // bulletの場合。自身の速度をそのまま適用する。
      // んー・・継承どうしよっかなって感じ。
      _cannon.bulletSpeed = _cannon.speed;
      _cannon.bulletDirection = _cannon.direction;
    }
  }else if(action.type === "fire"){
    // 各種firePattern関数を実行する
    _cannon.pattern.fire[action.name](_cannon);
  }else if(action.type === "vanish"){
     // _bulletに適用することを想定してこんな感じに。vanishFlagを立てる。
    _cannon.vanishFlag = true;
  }else if(action.type === "aim"){
    // bulletDirectionを自機の方向に合わせる
    const margin = (action.hasOwnProperty("margin") ? action.margin : 0);
    _cannon.bulletDirection = getPlayerDirection(_cannon.position, margin);
  }
  // 他にも増やすかもだけど・・
}

// リピーションパラメータの復元
function recovery(backup, action, pivotIndex){
  backup.forEach((data) => {
    action[pivotIndex - data.back][data.name] = data[data.name];
  })
}
