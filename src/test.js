"use strict";

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

const INF = Infinity; // 長いので
const AREA_WIDTH = 480;
const AREA_HEIGHT = 640; // あとでCanvasSizeをこれよりおおきく・・もしくは横かもだけど。んー。

let isLoop = true;
let showInfo = true;

let drawTimeSum = 0;
let drawTimeAverage = 0;
const AVERAGE_CALC_SPAN = 30;

let unitPool;
let entity;

//let testCannon;

function preload(){
  /* NOTHING */
}

function setup(){
  createCanvas(AREA_WIDTH, AREA_HEIGHT);
  angleMode(DEGREES);
  textSize(16);
  //preparePattern(); // jsonからあれこれするみたい(?)
  //bulletPool = new ObjectPool(() => { return new Bullet(); }, 600);
  unitPool = new ObjectPool(() => { return new Unit(); }, 800);
  entity = new System();

  // createCannon(ptn);
  // さて・・
  // 加速するようになった。あとは・・んー。
  // 速いアクセルと遅いアクセルの合わせ技。こんなことも自由自在。
  /*
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
      lowAccell:["accellerateBehavior", {accelleration:0.05}], // これを
      highAccell:["accellerateBehavior", {accelleration:0.1}]
    }
  };
  let seed2 = {
    position:[240, 160],
    action:[["shotSpeed", "set", [3, 6]], ["shotDirection", "set", [0, 360]], ["fire", "u"], {loop:2, back:3}, {wait:1}, {loop:INF, back:-1}],
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
  }*/
  // 回転砲台
  let seed1_1 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90,
    action:{main:[{shotDirection:["add", 5]}, {fire:"u"}, {wait:4}, {loop:INF, back:-1}]},
    fireDef:{u:{}}
  }
  // 双回転砲台
  let seed1_2 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90,
    action:{main:[{shotDirection:["add", 5]}, {fire:"u"}, {shotDirection:["mirror", 90]},{fire:"u"},
                  {wait:4}, {shotDirection:["mirror", 90]}, {loop:INF, back:-1}]},
    fireDef:{u:{}}
  }
  // いったりきたりしながら下に向けて発射. ディレイをかけて。さらにアクセルをかけて。
  let seed1_3 = {
    x:0.2, y:0.2, speed:4, direction:0, shotSpeed:4, shotDirection:90, shotDelay:30, shotBehavior:["accell"],
    action:{main:[{fire:"u"}, {wait:4}, {loop:16, back:2}, {wait:16}, {direction:["mirror", 90]}, {loop:INF, back:-1}]},
    fireDef:{u:{}}, behaviorDef:{accell:["accellerate", {accelleration:0.2}]}
  }
  // 四角形に沿って移動（初めて作ったやつ）
  let seed1_4 = {
    x:0.2, y:0.2, speed:4, direction:0,
    action:{main:[{wait:50}, {direction:["add", 90]}, {loop:INF, back:-1}]}
  }
  // 簡単な分裂
  let seed1_5 = {
    x:0.5, y:0.1, shotSpeed:4, shotDirection:90,
    action:{main:[{shotAction:["set", "split2_0"]}, {fire:"way2"}, {wait:4}, {loop:INF, back:-2}],
            split2_0:[{shotAction:["set", "split2_1"]}, "split2"],
            split2_1:[{shotAction:["set", "split2_2"]}, "split2"],
            split2_2:["split2"]
           },
    short:{split2:[{wait:30}, {fire:"way2"}, {vanish:1}]},
    fireDef:{way2:{nway:{count:2, interval:30}}}
  }
  // FALさんの分裂
  let seed1_6 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90,
    action:{main:[{shotAction:["set", "split2_0"]}, {fire:"radial7"}, {wait:4}, {loop:8, back:2},
                  {wait:32}, {shotDirection:["add", 15]}, {loop:INF, back:-2}],
            split2_0:[{shotAction:["set", "split2_1"]}, "split2"],
            split2_1:[{shotAction:["set", "split2_2"]}, "split2"],
            split2_2:["split2"]
           },
    short:{split2:[{wait:20}, {fire:"way2"}, {vanish:1}]},
    fireDef:{radial7:{radial:{count:7}}, way2:{nway:{count:2, interval:120}}}
  }

  // どうする？？
  let newPtn = parsePatternSeed(seed1_6);
  console.log(newPtn);
  //noLoop();
  //createCannon(newPtn);
  createUnit(newPtn, "cannon");
  // これを・・ね。
  // 得られたpatternをcreateCannonに放り込んでupdateで実行させる。
}

function draw(){
  background(entity.backgroundColor);

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

// bulletとcannonはunitという名称で統一する。その上で、
// 描画関連の速さ向上のためにbulletとcannonに便宜上分ける感じ。
// bullet作るのもunit作るのも同じcreateUnitという関数で統一する。

class System{
	constructor(){
		this.player = new SelfUnit();
    this.bulletArray = new CrossReferenceArray();
    this.cannonArray = new CrossReferenceArray();
    this.bulletColor = color(0, 0, 255);
    this.cannonColor = color(100, 100, 255);
    this.backgroundColor = color(220, 220, 255);
	}
	initialize(){
		this.player.initialize();
    this.bulletArray.loopReverse("vanish");
    this.cannonArray.loopReverse("vanish");
	}
	update(){
		this.player.update();
    this.cannonArray.loop("update");
    this.bulletArray.loop("update");
    this.cannonArray.loop("eject");
    this.bulletArray.loopReverse("eject");
	}
	draw(){
		this.player.draw();
    fill(this.bulletColor);
    this.bulletArray.loop("draw");
    fill(this.cannonColor);
    this.cannonArray.loop("draw");
	}
  getCapacity(){
    return this.bulletArray.length + this.cannonArray.length;
  }
}

function createUnit(pattern, typeName){
  let newUnit = unitPool.use();
  newUnit.setPattern(pattern);
  switch(typeName){
    case "bullet":
      entity.bulletArray.add(newUnit);
      newUnit.setDrawFunction(drawBullet);
      break;
    case "cannon":
      entity.cannonArray.add(newUnit);
      newUnit.setDrawFunction(drawCannon);
      newUnit.rotationSpeed = 2;
      newUnit.rotationAngle = 0;
      break;
  }
}

// 廃止
function createBullet(pattern){
  let newBullet = bulletPool.use();
  newBullet.setPattern(pattern);
  entity.bulletArray.add(newBullet);
}

// 廃止
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
		this.position.set(AREA_WIDTH * 0.5, AREA_HEIGHT * 0.875);
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
// Bullet.廃止.

class Bullet{
	constructor(){
    // self property.
		this.position = createVector(0, 0);
		this.direction = 0;
		this.speed = 0;
		this.velocity = createVector(0, 0);
		//this.pattern = undefined; // 廃止する方向で。
    this.delay = 0; // ディレイ。
    this.behaviorList = [];
    this.action = [];
    this.actionIndex = 0;
    this.loopCounter = [];
    this.loopCounterIndex = 0;
    // shot property.
    this.shotSpeed = 1;
    this.shotDirection = 0;
    this.shotDelay = 0;
    this.shotBehavior = {};
    this.shotAction = []; // 最大で一つ。
    // properFrameCount.
		this.properFrameCount = 0;
    // vanish.
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
		//this.pattern = _pattern;
    const {x, y, speed, direction, delay, behavior, action} = _pattern;
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
// Cannon.廃止.
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
		//this.pattern = undefined; // actionがあれば十分なので廃止する方向で。
    this.shotSpeed = 1;
    this.shotDirection = 0;
    this.shotBehavior = {}; // bulletにセットする付加的なふるまい（関数列）
    this.action = [];
    this.actionIndex = 0;
	}
  setPattern(_pattern){
    //this.pattern = _pattern;
    const {x, y, shotSpeed, shotDirection, shotBehavior, action} = _pattern;
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
      if(debug > 100){ break; } // デバッグモード
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
// Unit.
// BulletとCannonの挙動をまとめる試み

class Unit{
  constructor(){
    this.position = createVector();
    this.velocity = createVector();
    this.defaultBehavior = [goBehavior, frameOutBehavior]; // デフォルト。固定。
    this.initialize();
  }
  initialize(){
    // vanishの際に呼び出される感じ
    // 動きに関する固有のプロパティ
    this.position.set(0, 0);
    this.velocity.set(0, 0);
    this.speed = 0;
    this.direction = 0;
    this.delay = 0;
    this.behavior = {}; // オブジェクトにし、各valueを実行する形とする。
    this.action = []; // 各々の行動はcommandと呼ばれる（今までセグメントと呼んでいたもの）
    this.actionIndex = 0; // 処理中のcommandのインデックス
    this.loopCounter = []; // loopCounterIndex === lengthの際に0をpushするように仕向ける。
    this.loopCounterIndex = 0; // 処理中のloopCounterのインデックス
    // bulletを生成する際に使うプロパティ
    this.shotSpeed = 0;
    this.shotDirection = 0;
    this.shotDelay = 0;
    this.shotBehavior = {};
    this.shotAction = [];
    // その他の挙動を制御する固有のプロパティ
    this.drawFunction = drawBullet; // 親かどうかで変化（一応drawBulletとかdrawCannonをセットする）。デフォdrawBullet.
    this.properFrameCount = 0;
    this.vanishFlag = false; // trueなら、消す。
    this.hide = false; // 隠したいとき // appearでも作る？disappearとか。それも面白そうね。ステルス？・・・
  }
  setPosition(x, y){
    this.position.set(x, y);
  }
  setVelocity(speed, direction){
    this.velocity.set(speed * cos(direction), speed * sin(direction));
  }
  velocityUpdate(){
    this.velocity.set(this.speed * cos(this.direction), this.speed * sin(this.direction));
  }
  setDrawFunction(f){
    this.drawFunction = f;
  }
  setPattern(ptn){
    const {x, y, behavior, shotBehavior} = ptn;
    // この時点でもうx, yはキャンバス内のどこかだしspeedとかその辺もちゃんとした数だし(getNumber通し済み)
    // behaviorとshotBehaviorもちゃんと{name:関数, ...}形式になっている。
    this.position.set(x, y);
    ["speed", "direction", "delay", "shotSpeed", "shotDirection", "shotDelay"].forEach((name) => {
      if(ptn[name] !== undefined){ this[name] = ptn[name]; } // ランダムを考慮
    })
    this.velocityUpdate(); // 速度が決まる場合を考慮する
    if(behavior !== undefined){
      this.behavior = {};
      Object.assign(this.behavior, behavior); // 自分が実行するbehavior. 付け外しできるようオブジェクトで。
    }
    if(shotBehavior !== undefined){
      Object.assign(this.shotBehavior, shotBehavior); // オブジェクトのコピー
    }
    this.action = ptn.action; // action配列
  }
  eject(){
    if(this.vanishFlag){ this.vanish(); }
  }
  vanish(){
    this.initialize();
    this.belongingArray.remove(this);
    unitPool.recycle(this); // 名称をunitPoolに変更
  }
  update(){
    // ディレイ処理
    if(this.delay > 0){ this.delay--; return; }
    // ビヘイビアの実行
    Object.values(this.behavior).forEach((behavior) => {
      behavior(this);
    })
    // デフォルトビヘイビア実行
    this.defaultBehavior.forEach((behavior) => { behavior(this); })
    // アクションの実行
    if(this.action.length > 0){
      let debug = 0; // デバッグモード
      let continueFlag = true;
      while(continueFlag){
        const command = this.action[this.actionIndex];
        //console.log("actionIndex", this.actionIndex);
        //console.log("frameCount", frameCount);
        continueFlag = execute(this, command); // flagがfalseを返すときに抜ける
        //console.log(continueFlag);
        debug++; // デバッグモード
        if(debug > 100){ console.log("INFINITE LOOP ERROR!!"); noLoop(); break; } // デバッグモード
      }
    }
    // 回転する場合は回転角を更新
    if(this.rotationAngle !== undefined){ this.rotationAngle += this.rotationSpeed; }
    // カウントの進行
    this.properFrameCount++;
  }
  loopCheck(limit){
    //console.log(limit);
    // 該当するloopCounterを増やしてlimitに達するならインデックスを先に進める。
    if(this.loopCounterIndex === this.loopCounter.length){ this.loopCounter.push(0); }
    this.loopCounter[this.loopCounterIndex]++;
    if(this.loopCounter[this.loopCounterIndex] < limit){ return false; }
    this.loopCounterIndex++; // loopCounterのインデックスはlimitに達した場合だけ増やす。
    return true;
  }
  loopBack(back){
    // actionIndexをback回だけ戻す。countプロパティを持つcommandにさしかかるたびに
    // loopCounterIndexを1つ戻してそこを0に置き換える。
    for(let i = 1; i <= back; i++){
      const command = this.action[this.actionIndex - i];
      if(command.hasOwnProperty("count")){
        this.loopCounterIndex--;
        this.loopCounter[this.loopCounterIndex] = 0;
      }
    }
    this.actionIndex -= back; // 戻すのは最後。コードの可読性を上げるため。
  }
  draw(){
    this.drawFunction(this);
  }
}

// ---------------------------------------------------------------------------------------- //
// drawFunction. bullet, cannon用の描画関数.

function drawBullet(bullet){
  // とりあえず三角形だけど別のバージョンも考えたい、あと色とか変えたいな。
  const {x, y} = bullet.position;
  const c = cos(bullet.direction);
  const s = sin(bullet.direction);
  triangle(x + 6 * c, y + 6 * s, x - 6 * c + 3 * s, y - 6 * s - 3 * c, x - 6 * c - 3 * s, y - 6 * s + 3 * c);
}

function drawCannon(cannon){
  // directionの方向に正方形のひとつの頂点が来る感じでお願い
  // やっぱrotationAngle復活
  const {x, y} = cannon.position;
  const c = cos(cannon.rotationAngle) * 20;
  const s = sin(cannon.rotationAngle) * 20;
  quad(x + c, y + s, x - s, y + c, x - c, y - s, x + s, y - c);
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

// Objectから最初のキーを取り出す
function getTopKey(obj){
  let keyArray = Object.keys(obj);
  if(keyArray.length > 0){ return keyArray[0]; }
  return "";
}

// ---------------------------------------------------------------------------------------- //
// Behavior.
// ああこれbehaviorか。配列に入れて毎フレーム実行するやつや・・goとかもそうよね。
// せいぜいデフォのgoの他はaccellerate, decelerate, brakeAccell, raidくらいか。組み合わせる。
// 組み合わせるのでもういちいちあれ（位置に速度プラス）を書かない。

// 画面外で消える
function frameOutBehavior(_bullet){
  const {x, y} = _bullet.position;
  if(x < -AREA_WIDTH * 0.2 || x > AREA_WIDTH * 1.2 || y < -AREA_HEIGHT * 0.2 || y > AREA_HEIGHT * 1.2){ _bullet.vanishFlag = true; }
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

// ホーミングの仕様を変えたい。徐々に角度がこっちを向くように変化していく、具体的には
// 1°ずつとか、0.5°ずつとかそんな風に。2°ずつとか。今の仕様だと180°いきなりがちゃん！って感じだから。
// そこをね・・あと、ある程度それやったらもう角度変えないとかそういう感じにするのもあり。
// そういうホーミングをレイドと組み合わせると強力なショットに（以下略）
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
  return (unit) => {
    if(getPlayerDistSquare(unit.position) < param.raidDistSquare){
      unit.speed += param.accelleration;
      unit.velocityUpdate();
    }
  }
}

// formationで速度の方向を円の接線方向にしてradiusで増やせばそれっぽくなるよ。
// 円の接線方向に発射される弾丸を中心の周りに巻き付ける処理ですね。
// radius, clockwise
function circularBehavior(param){
  if(!param.hasOwnProperty("clockwise")){ param.clockwise = true; }
  const clockwiseFactor = (param.clockwise ? 1 : -1);
  return (unit) => {
    unit.direction += asin(unit.speed / param.radius) * clockwiseFactor;
    unit.velocityUpdate();
  }
}

// 螺旋を描きながら発散するやつ。
// 半径が線型に増加していく、速さは一定。
// radius, radiusIncrement, clockwise
function spiralBehavior(param){
  if(!param.hasOwnProperty("clockwise")){ param.clockwise = true; }
  const clockwiseFactor = (param.clockwise ? 1 : -1);
  return (unit) => {
    const r = param.radius + unit.properFrameCount * param.radiusIncrement;
    unit.direction += asin(unit.speed / r) * clockwiseFactor;
    unit.velocityUpdate();
  }
}

// プレーヤーに近付くと加速するくらいだったら作ってもいいかな(raidBehavior)

// あとはプレイヤーが近付くとバーストするとか面白そう（いい加減にしろ）
// 画面の端で3回反射するまで動き続けるとか面白そう。
// 放物軌道とか・・
// 画面の端を走って下まで行って直進してプレイヤーと縦で重なると2倍速でぎゅーんって真上に（以下略）

// 一定フレームごとにスイッチ入ってぎゅーんって自機の前に移動する（easing）のを周期的に繰り返すなど

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
      // 指定した場所. p[[x1, y1], [x2, y2], [x3, y3]]みたいな。
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
// data.nwayやらdata.radialやら存在するならそれを考慮・・準備中。
// dataに入ってるのはformationとnwayやradial, lineなどの情報だけ。あとは全部・・そうです。
// つまり配置関連の情報がdataで挙動についてはunitに全部入ってるからそっちを使うことになる。
// 完成したbulletのたとえばshotdelayなどもaction内で制御することになるわけ。
function createFirePattern(data){
  return (unit) => {
    // bulletにセットするパターンを作ります。既に実行形式。setとactionしかない。
    // 一番最初にcannonにセットするやつと違って余計なものが排除された純粋なパターン。
    // dataに入ってるのはまずformationプロパティ、ない場合はデフォルト、自分の場所に1個。
    // formationがなくてもx, yプロパティがあれば(x, y)にひとつだけっていうのが実現するように仕様変更して。
    // 位置指定
    let ptnArray = [];
    if(data.hasOwnProperty("formation")){
      // 指定する場合
      ptnArray = getFormation(data.formation);
    }else if(data.hasOwnProperty("x") && data.hasOwnProperty("y")){
      // 1点の場合
      ptnArray = [{x:x, y:y}];
    }else{
      // デフォルト
      ptnArray = [{x:0, y:0}];
    }
    // この時点で[{x:~~, y:~~}]の列ができている。回転させて正面にもってくる。
    // このとき発射方向に合わせて回転する。
    fitting(ptnArray, unit.shotDirection);
    // 速度を設定
    // ここ、同じ方向当てはめるようになってるけど、いっせいにある角度だけ
    // 回転させるようにするとかのオプションがあってもいいかもしれない。
    ptnArray.forEach((ptn) => {
      ptn.speed = unit.shotSpeed;
      // ptn.direction = unit.shotDirection;
      ptn.direction = unit.shotDirection + (data.hasOwnProperty("bend") ? data.bend : 0);
      // たとえば90°ずつ曲げるとか, -90°ずつ曲げるとか。30°とかね。
    })
    // nwayとかradialとかする(data.decorateに情報が入っている)
    if(data.hasOwnProperty("nway")){
      ptnArray = createNWay(data.nway, ptnArray); // とりあえずnway.
    }
    if(data.hasOwnProperty("radial")){
      ptnArray = createRadial(data.radial, ptnArray); // とりあえずradial.
    }
    // この時点でこれ以上ptnは増えないのでdelayとbehaviorをまとめて設定する
    // 実行形式のpatternを作る。略形式じゃないやつ。あれにはfireとかいろいろ入ってるけど、
    // ここで作るのはそういうのが入ってない、完全版。
    ptnArray.forEach((ptn) => {
      ptn.x += unit.position.x;
      ptn.y += unit.position.y;
      ptn.delay = unit.shotDelay; // ディレイ
      ptn.behavior = {}; // ビヘイビア
      Object.assign(ptn.behavior, unit.shotBehavior); // アサインで作らないとコピー元がいじられてしまうの
      // あとでObject.values使ってあれにする。
      ptn.shotSpeed = ptn.speed; // 基本、同じ速さ。
      ptn.shotDirection = ptn.direction; // 基本、飛んでく方向だろうと。
      ptn.shotDelay = 0; // デフォルト
      ptn.shotBehavior = {}; // デフォルト
      ptn.action = unit.shotAction; // 無くても[]が入るだけ
    })
    ptnArray.forEach((ptn) => {
      createUnit(ptn, "bullet"); // 作るのは、bullet.
    })
    // お疲れさまでした。
  }
}

// ---------------------------------------------------------------------------------------- //
// parse.
// やり直し。ほぼ全部書き換え。
// 簡略形式のpatternSeedってやつをいっちょまえのpatternに翻訳する処理。
// 段階を踏んで実行していく。
// step1: x, y, speed, direction, delay, shotSpeed, shotDirection, shotDelayは、
// 2, 3, [3, 6], [1, 10, 1]みたく設定
// behavior, shotBehaviorの初期設定は略系は["name1", "name2", ...]みたくしてオブジェクトに変換する、
// だから最初にやるのはfireとbehaviorを関数にする、それで、setterのところを完成させる。
// step2: short展開
// step3: action展開
// step4: commandの略系を実行形式に直す
// step5: commandの実行関数を作る（execute(unit, command)
// ↑ここ言葉の乱用でセグメント部分もactionって名前になっちゃってるけど、
// actionの部分部分はcommandって名前で統一しようね。

// ああーそうか、setでくくらないとbehaviorんとこごっちゃになってしまう・・
// だから略形式ではset:{....}, action:{....}, fire, short, behaviorってしないとまずいのね。

// 略系で書かれたパターンはパターンシードと呼ぶことにする。
function parsePatternSeed(seed){
  let ptn = {}; // 返すやつ
  let data = {}; // 補助データ(関数化したfireやbehaviorを入れる)
  // setter部分(behavior以外)
  const {x, y} = seed;
  // x, yは0.4や0.3や[0.1, 0.9]や[0.4, 0.8, 0.05]みたいなやつ。
  // ここでもう数にしてしまおうね。
  ptn.x = getNumber(x) * AREA_WIDTH;
  ptn.y = getNumber(y) * AREA_HEIGHT;
  ["speed", "direction", "delay", "shotSpeed", "shotDirection", "shotDelay"].forEach((propName) => {
    if(seed[propName] !== undefined){ ptn[propName] = getNumber(seed[propName]); }
  })
  // fireDef, behaviorDefの展開
  // Defを展開してdata.fire, data.behaviorにnameの形で放り込む
  // fireはseed.fireDef.name1:パターンデータ, .name2:パターンデータみたいな感じ。
  data.fire = {};
  if(seed.fireDef !== undefined){
    Object.keys(seed.fireDef).forEach((name) => {
      // いろいろ
      let fireFunc = createFirePattern(seed.fireDef[name])
      data.fire[name] = fireFunc;
    })
  }

  // behaviorは...Behaviorの...だけ名前に入ってるからそこ補ってからwindow[...]でOK
  data.behavior = {};
  if(seed.behaviorDef !== undefined){
    Object.keys(seed.behaviorDef).forEach((name) => {
      // seed.behaviorDef.name1:["関数名(Behavior除く)", パラメータ]という感じ。
      let behaviorFunc = window[seed.behaviorDef[name][0] + "Behavior"](seed.behaviorDef[name][1]);
      data.behavior[name] = behaviorFunc;
    })
  }

  // behavior部分(「name:関数」からなるオブジェクト)(valuesを取ってリストに放り込む)
  if(seed.behavior !== undefined){
    ptn.behavior = {};
    seed.behavior.forEach((name) => {
      ptn.behavior[name] = data.behavior[name];
    })
  }
  // shotBehavior部分(「name:関数」・・同じ)
  if(seed.shotBehavior !== undefined){
    ptn.shotBehavior = {};
    seed.shotBehavior.forEach((name) => {
      ptn.shotBehavior[name] = data.behavior[name];
    })
    // 実行形式内のbehaviorは普通にセッター部分だから問題ないけど。
    // あとはactionを作って完成。seedをいろいろいじる。
  }

  // ここでseed.actionのキー配列を取得
  const actionKeys = Object.keys(seed.action);

  // actionの各valueの展開(main, その他, その他, ...)
  if(seed.hasOwnProperty("short")){
    actionKeys.forEach((name) => {
      seed.action[name] = getExpansion(seed.short, seed.action[name]);
    })
  }

  // actionの内容を実行形式にする・・
  // 配列内のactionコマンドに出てくる文字列はすべて後者のものを参照しているので、
  // キー配列で後ろから見ていって・・
  // 得られた翻訳結果は順繰りにdata.actionに放り込んでいくイメージ。
  data.action = {}; // これがないと記法的にアウト
  for(let i = actionKeys.length - 1; i >= 0; i--){
    data.action[actionKeys[i]] = createAction(data, seed.action[actionKeys[i]]);
  }
  // 配列はもう出てこないのでcreateActionの内容も大幅に書き換えることになる。
  // たとえば2番目のactionの配列を実行形式にするのに3番目以降のactionの実行形式のデータが使えるとかそういう感じ。
  // 最終的にdata.action.mainが求めるactionとなる。
  ptn.action = data.action.main;
  return ptn;
}

// ---------------------------------------------------------------------------------------- //
// parse.
// patternの核となるaction部分を作る、あるいは実行する処理。
// 前半はパース部分、後半は各セグメントに対するexecute部分。

// パース関数
// パターンシードをパターンにします。セットする生のパターンを略記法のjsonから生成します。
// 配列を返すやつと本体と二つ必要なんですよね。
// sample:{x:~~, y:~~, speed:~~(あれば), direction, action:~~, あればfire:~~みたいな。}
// x, y, speed, directionのところはそのままコピーする感じでOK.
// fire:{名前:seed}みたいな感じにしようね。
// type:"fire"とかtype:"config"とかしたいの。
// たとえば type:"fire", name:"random_2_1"みたいな感じ
// fire.random_2_1:関数

// 大幅に、変える。
/*
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

  // 略記法で書かれたactionArrayを翻訳する感じ。オプションも付けられる高性能。
  pattern.action = createAction(actionArray);

  pattern.index = 0; // 配列実行時に使うcurrentIndex. これを付け加えて完成。
  return pattern;
}
*/

// 展開関数作り直し。
// ここは再帰を使って下位区分までstringを配列に出来るように工夫する必要がある。
// 名前空間・・seed.shortに入れておいて逐次置き換える感じ。
// seed.shortにはショートカット配列が入ってて、それを元にseed.actionの内容を展開して
// 一本の配列を再帰的に構成する流れ。要はstringが出てくるたびにshortから引っ張り出してassignでクローンして
// 放り込んでいくだけ。
// action内のmainやらなんやらすべてに対して適用。
function getExpansion(shortcut, action){
  let actionArray = [];
  for(let i = 0; i < action.length; i++){
    const command = action[i];
    if(typeof(command) === "string"){
      const commandArray = getExpansion(shortcut, shortcut[command]);
      commandArray.forEach((obj) => {
        // objはオブジェクトなので普通にアサイン
        let copyObj = {};
        Object.assign(copyObj, obj);
        actionArray.push(copyObj);
      })
    }else{
      // stringでなければオブジェクト
      let copyObj = {};
      Object.assign(copyObj, command);
      actionArray.push(copyObj);
    }
  }
  //console.log(actionArray);
  return actionArray;
}

// 応用すれば、一定ターン移動するとかそういうのもbackupで表現できそう（waitの派生形）

// やり直し
function createAction(data, targetAction){
  // targetActionの翻訳に出てくるactionのところの文字列はactionのプロパティネームで、
  // そこについては翻訳が終わっているのでそれをそのまま使えるイメージ。dataにはfireとbehaviorの
  // 翻訳関数が入っている。
  let actionArray = [];
  for(let index = 0; index < targetAction.length; index++){
    const command = targetAction[index];
    actionArray.push(interpretCommand(data, command, index));
  }
  return actionArray;
}

// 翻訳。
// 1.セット系
// speed, shotSpeed, direction, shotDirectionについては"set"と"add"... {speed:["set", [3, 7]]}
// {behavior:["add", "circle1"]} {shotBehavior:["add", "spiral7"]} こういうの {shotBehavior:["clear"]}
// {fire:"radial16way7"}とかね。
function interpretCommand(data, command, index){
  let result = {};
  const _type = getTopKey(command); // 最初のキーがそのままtypeになる。
  result.type = _type;
  if(["speed", "direction", "shotSpeed", "shotDirection"].includes(_type)){
    result.mode = command[_type][0]; // "set" or "add" or "mirror" or etc...
    result[_type + "Change"] = command[_type][1]; // 3とか[2, 9]とか[1, 10, 1]
    return result;
  }
  if(_type === "shotDelay"){
    // {shotDelay:60}とか{shotDelay:0}みたいな。
    result.delayCount = command.shotDelay;
    return result;
  }
  if(["behavior", "shotBehavior"].includes(_type)){
    result.mode = command[_type][0]; // "add" or "remove" or "clear". "clear"は全部消すやつ。
    // [1]には名前が入っててそれをプロパティ名にする。
    if(result.mode === "add" || result.mode === "remove"){
      result.name = command[_type][1]; // 名前は必要
      result.behavior = data.behavior[result.name]; // ビヘイビア本体
    }
    return result;
  }
  if(_type === "fire"){
    result.fire = data.fire[command.fire]; // fire:名前, の名前を関数にするだけ。
    return result;
  }
  // action.
  // {action:["set", エイリアス]} "set" or "clear".
  if(_type === "shotAction"){
    result.mode = command[_type][0];
    if(result.mode === "set"){
      result.shotAction = data.action[command[_type][1]];
    }
    return result;
  }
  // あとはwait, loop, aim, vanish, triggerなど。triggerは未準備なのでまた今度でいい。手前の3つやってね。
  // backとかjumpとかswitchも面白そう。
  // そのあとexecute作ったらデバッグに移る。
  if(_type === "wait"){
    // {wait:3}のような形。
    result.count = command.wait;
    return result;
  }
  if(_type === "loop"){
    // {loop:10, back:5}のような形。
    result.count = command.loop;
    // たとえば-1なら先頭、のように負の場合はindex+1を加える感じ。
    result.back = (command.back >= 0 ? command.back : command.back + index + 1);
    return result;
  }
  if(_type === "aim"){ result.margin = command.aim; return result; } // 狙う際のマージン
  if(_type === "vanish"){ result.vanishDelay = command.vanish; return result; } // 消えるまでのディレイ
}

function execute(unit, command){
  //console.log(command);
  const _type = command.type;
  if(["speed", "direction", "shotSpeed", "shotDirection"].includes(_type)){
    // speedとかshotDirectionとかいじる
    let newParameter = getNumber(command[_type + "Change"]);
    if(command.mode === "set"){
      unit[_type] = newParameter;
    }else if(command.mode === "add"){
      unit[_type] += newParameter;
    }else if(command.mode === "mirror"){
      // 角度限定。角度をθ → 2a-θにする。speedでは使わないでね。
      unit[_type] = 2 * newParameter - unit[_type];
    }
    if(["speed", "direction"].includes(_type)){ unit.velocityUpdate(); }
    unit.actionIndex++;
    return true; // ループは抜けない
  }
  if(_type === "shotDelay"){
    // shotDelayをいじる
    unit.shotDelay = command.delayCount;
    unit.actionIndex++;
    return true; // ループは抜けない
  }
  if(["behavior", "shotBehavior"].includes(_type)){
    // 自分やショットにセットするビヘイビアの付け外し
    if(command.mode === "add"){
      unit[_type][command.name] = command.behavior;
    }else if(command.mode === "remove"){
      delete unit[_type][command.name];
    }else if(command.mode === "clear"){
      unit[_type] = {};
    }
    unit.actionIndex++;
    return true; // ループは抜けない
  }
  if(_type === "fire"){
    // fire忘れてた
    command.fire(unit);
    unit.actionIndex++;
    return true; // 発射したら次へ！
  }
  // shotにactionをセットする場合
  if(_type === "shotAction"){
    if(command.mode === "set"){
      unit.shotAction = command.shotAction;
    }else if(command.mode === "clear"){
      unit.shotAction = [];
    }
    unit.actionIndex++;
    return true;
  }
  if(_type === "wait"){
    // loopCounterを1増やす。countと一致した場合だけloopCounterとcurrentのインデックスを同時に増やす。
    // loopCheckは該当するカウントを1増やしてlimitに達したらtrueを返すもの。
    if(unit.loopCheck(command.count)){
      unit.actionIndex++;
    }
    return false; // ループを抜ける
  }
  if(_type === "loop"){
    if(unit.loopCheck(command.count)){
      unit.actionIndex++;
    }else{
      // バック処理(INFの場合常にこっち)
      unit.loopBack(command.back);
    }
    return true; // ループは抜けない
  }
  if(_type === "aim"){
    // marginの揺れ幅でエイムする。
    unit.direction = getPlayerDirection(unit.position, command.margin);
    unit.velocityUpdate();
    unit.actionIndex++;
    return true; // ループを抜ける
  }
  if(_type === "vanish"){
    // vanishDelayまで何もしない、そのあと消える。デフォルトは1. {vanish:1}ですぐ消える。
    if(unit.loopCheck(command.vanishDelay)){ unit.vanishFlag = true; }
    return false; // ループを抜ける
  }
}

// 配列のloopとrepeatのところにbackupプロパティを付け加える処理
// ではなく、略記で書かれたaction配列を正式な形にパースする処理。
// backがあるときにbackupを用意するので、あそこは「"back"を持つとき」の方がいいかもね。
// いやほら、trigger用意するから・・配列を関数に変換する作業も発生する。
/*
function createAction(data){
  let finalArray = [];
  // backupプロパティを追加して返すだけ。
  for(let index = 0; index < data.length; index++){
    const block = data[index];
    let segment = {};
    if(block.hasOwnProperty("loop")){
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
        ["wait", "loop"].forEach((name) => {
          if(eachBlock.hasOwnProperty(name)){
            let obj = {};
            // nameがないとどのプロパティを復元するのか分からないだろ・・
            // や、全部countにしちゃえばいいやん・・
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
*/

/*
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
      // だからここにsegment.behavior = 「behavior関数」って書いた方がいいって
      segment.mode = block[1];
      segment.name = block[2];
      break;
    case "fire":
      // ここにsegment.fire = 「fire関数」ってやるべきだろ
      segment.name = block[1];
      break;
    case "vanish":
      break;
    case "aim":
      if(block[1] !== "-"){ segment.margin = block[1]; }
      break;
  }
}
*/

// executeはここで。こうする、bulletにも適用したい・・
// だからCannonのexecuteとかそこらへんは無くすかもね。
// ここスイッチで書きたいな・・どうにかならない？
// {loop:4, back:5}を実行形式にするとき{type:"loop", count:4, back:5}みたいにするとか。
// すべての命令がtype:~~~から始まるようにすればいける。
// たとえばfireも{type:"fire", shot:関数}とか。
// {type:"loop"か"repeat", count:数, back:数}

/*
function execute(_cannon, action){
  if(action.hasOwnProperty("wait")){
    // waitを減らすだけ。正なら抜ける。0なら次へ。
    action.wait--;
    if(action.wait === 0){ _cannon.pattern.index++; }
    return false; // waitは必ず抜ける
  }
  if(action.hasOwnProperty("type")){
    // nameの内容に応じた行動を実行して次へ。
    executeEachAct(action, _cannon);
    _cannon.pattern.index++;
    return true;
  }
  if(action.hasOwnProperty("loop")){
    // repeatと違ってループをさかのぼるときにターンを抜ける
    action.loop--;
    if(action.loop > 0){
      recovery(action.backup, _cannon.pattern.action, _cannon.pattern.index);
      _cannon.pattern.index -= action.back;
      //return false; // ここが違う。
    }else{
      _cannon.pattern.index++;
      //return true; // infinite loopの場合ここは存在しない
    }
    return true; // loopは必ず抜ける
  }
}
*/

// switchで書き直したいね。
// config廃止しました。
/*
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
*/

/*
function recovery(_cannon, back){
  const cur = _cannon.currentIndex;
  for(let i = 1; i <= back; i++){
    const curAction = _cannon.action[cur - i];
    _cannon.backup[cur - i] = (curAction.hasOwnProperty("count") ? curAction.count : 0);
  }
}

使う時はrecovery(_cannon, action.back)みたいにする。
_cannon.backupの作り方。
どうせcreateFireActionが作る関数内で作るので、actionから1回だけ作ってあとはそれぞれにコピーすればいい。
countがなければ0, あればcount値を入れて配列作るだけ。簡単！
*/
