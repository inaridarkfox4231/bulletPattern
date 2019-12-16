"use strict";

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

let isLoop = true;

let bulletPool;
let entity;

function setup(){
  createCanvas(480, 640);
  angleMode(DEGREES);
  bulletPool = new ObjectPool(() => { return new Bullet(); }, 600);
  entity = new System();
}

function draw(){
  background(220, 220, 255);
  if(frameCount % 10 === 0){
    for(let i = 0; i < 11; i++){
      let ptn = {initialize:setParam(width / 2, height / 4, 4, 65 + 5 * i), execute:go};
      registBullet(ptn);
    }
  }
  entity.update();
  entity.draw();
}

// ---------------------------------------------------------------------------------------- //
// KeyAction.

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }
}

// ---------------------------------------------------------------------------------------- //
// System.
// とりあえずplayerを持たせるだけ

class System{
	constructor(){
		this.player = new SelfUnit();
    this.bulletArray = new CrossReferenceArray();
    // this.cannonArray = ...
	}
	initialize(){
		this.player.initialize();
	}
	update(){
		this.player.update();
    this.bulletArray.loop("update");
    this.bulletArray.loopReverse("eject");
	}
	draw(){
		this.player.draw();
    fill(0, 0, 255);
    this.bulletArray.loop("draw");
	}
  getCapacity(){
    // return this.bulletArray.length;
    return 0;
  }
}

function registBullet(pattern){
  let newBullet = bulletPool.use();
  newBullet.setPattern(pattern);
  entity.bulletArray.add(newBullet);
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
		this.vanishFlag = false; // まずフラグを立ててそれから別処理で破棄
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	setVelocity(speed, angle){
		// angleはdegree指定
		this.speed = speed;
		this.direction = angle;
		this.velocity.set(this.speed * cos(this.direction), this.speed * sin(this.direction));
	}
	setPattern(pattern){
    this.properFrameCount = 0;
		this.pattern = pattern;
    this.pattern.initialize(this);
    this.vanishFlag = false;
	}
	update(){
		this.properFrameCount++;
    this.pattern.execute(this);
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

function setParam(x, y, speed, direction){
  return (_bullet) => { _bullet.setPosition(x, y); _bullet.setVelocity(speed, direction); }
}

// ---------------------------------------------------------------------------------------- //
// Behavior.
// 遊びはこのくらいにして

function go(_bullet){
  // 普通に進む
  _bullet.position.add(_bullet.velocity);
}

function accellerate(accelleration){
  // 加速する
  return (_bullet) => {
    _bullet.speed += accelleration;
    _bullet.setVelocity(_bullet.speed, _bullet.direction);
    _bullet.position.add(_bullet.velocity);
  }
}

function decelerate(friction, terminalSpeed){
  // (1-f)倍していってterminalになったら等速
  return (_bullet) => {
    if(_bullet.speed > terminalSpeed){
      _bullet.speed *= (1 - friction);
      _bullet.setVelocity(_bullet.speed, _bullet.direction);
    }
    _bullet.position.add(_bullet.velocity);
  }
}

function brakeAccell(threshold, friction, accelleration){
  // thresholdフレームだけ(1-f)倍していってそのあとで加速する
  return (_bullet) => {
    if(_bullet.properFrameCount < threshold){
      _bullet.speed *= (1 - friction);
    }else{
      _bullet.speed += accelleration;
    }
    _bullet.setVelocity(_bullet.speed, _bullet.direction);
    _bullet.position.add(_bullet.velocity);
  }
}
