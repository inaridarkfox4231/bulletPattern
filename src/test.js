"use strict";

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

const INF = Infinity; // 長いので
const AREA_WIDTH = 480;
const AREA_HEIGHT = 640; // あとでCanvasSizeをこれよりおおきく・・もしくは横かもだけど。んー。

let isLoop = true;
let showInfo = true;

let drawTimeSum = 0;
let drawTimeAverage = 0;
let usingUnitMax = 0;
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
  unitPool = new ObjectPool(() => { return new Unit(); }, 1024);
  entity = new System();

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
  // FALさんの分裂(7)
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
  // burstSweeping.(FALさんの4)
  // 回転しながら弾をばらまく。
  // これでいいでしょ。角速度2πだから2秒で1周する。12°ずつ方向変化、速度は2.
  let seed1_7 = {
    x:0.5, y:0.5, shotSpeed:2*Math.PI, shotDirection:0, shotBehavior:["circle"],
    action:{
      main:[{shotAction:["set", "sweep"]}, {fire:"rad2"}, {wait:INF}],
      sweep:[{hide:true}, {shotSpeed:["set", 2]}, {shotDirection:["add", 12]}, {fire:"u"}, {wait:1}, {loop:INF, back:-2}]
    },
    fireDef:{u:{}, rad2:{formation:{type:"points", p:[[120, 0]]}, bend:90, radial:{count:2}}},
    behaviorDef:{circle:["circular", {radius:120}]}
  }
  // 失われたパターン1
  let seed2_1 = {
    x:0.5, y:0.5, shotSpeed:1, shotDirection:90,
    action:{
      main:[{shotBehavior:["add", "lowAccell"]}, {shotDirection:["add", 4]}, "routine",
            {shotBehavior:["add", "highAccell"]}, {shotDirection:["add", -4]}, "routine", {loop:INF, back:-1}]
    },
    short:{routine:[{fire:"radial16"}, {wait:4}, {loop:8, back:3}, {wait:16}, {shotBehavior:["clear"]}]},
    fireDef:{radial16:{radial:{count:16}}},
    behaviorDef:{
      lowAccell:["accellerate", {accelleration:0.05}],
      highAccell:["accellerate", {accelleration:0.1}]
    }
  }
  // lineのテスト(nwayと組み合わせる)
  // さらにホーミングマシンガンを組み合わせて逃げ場のない感じに。
  let seed2_2 = {
    x:0.5, y:0.5,
    action:{
      main:[{shotSpeed:["set",2]}, {aim:0}, {fire:"line3_8_6"}, {wait:4},
            {shotSpeed:["set", 5]}, {aim:10}, {fire:"u"}, {wait:4}, {loop:29,back:3}, {loop:INF,back:-1}]
      },
    fireDef:{u:{}, line3_8_6:{nway:{count:7, interval:5}, radial:{count:8}, line:{count:6,upSpeed:0.3}}}
  }
  // FALさんの1
  let seed2_3 = {
    x:0.5, y:0.5,
    action:{
      main:[{shotSpeed:["set", [3, 6]]}, {shotDirection:["set", [0, 360]]}, {fire:"u"},
            {loop:2, back:-1}, {wait:1}, {loop:INF, back:-1}]
    },
    fireDef:{u:{}}
  }
  // FALさんの2
  let seed2_4 = {
    x:0.5, y:0.5, shotSpeed:2,
    action:{
      main:[{shotDirection:["set", [0, 360]]}, {fire:"fire"}, {wait:60}, {loop:INF, back:-1}]
    },
    fireDef:{fire:{radial:{count:16}, nway:{count:7, interval:2}}}
  }
  // FALさんの3
  let seed2_5 = {
    x:0.5, y:0.5, shotSpeed:2,
    action:{
      main:[{shotDirection:["add", 2]}, "attack", {shotDirection:["add", -2]}, "attack", {loop:INF, back:-1}]
    },
    short:{attack:[{fire:"radial16"}, {wait:4}, {loop:8, back:3}, {wait:16}]},
    fireDef:{radial16:{radial:{count:16}}}
  }
  // FALさんの5
  // kindをcannonに指定すると複数のcannonを生成してそれぞれに挙動させることができる
  let seed2_6 = {
    x:0.5, y:0.3, shotSpeed:96*PI/180, shotDirection:90,
    action:{
      main:[{shotAction:["set", "cannon1"]}, {shotBehavior:["add", "circle"]}, {fire:"setCannon1"},
            {shotBehavior:["clear"]}, {shotAction:["set", "cannon2"]}, {shotBehavior:["add", "circleInv"]},
            {fire:"setCannon2"}, {vanish:1}
           ],
      cannon1:["cannonMain"], cannon2:[{wait:48}, "cannonMain"]
    },
    short:{cannonMain:[{shotSpeed:["set", 5]}, {aim:0}, {fire:"line7"}, {wait:4}, {loop:8, back:3},
                       {wait:64}, {loop:INF, back:5}]},
    fireDef:{setCannon1:{formation:{type:"points", p:[[48, 0]]}, bend:90, kind:"cannon"},
             setCannon2:{formation:{type:"points", p:[[48, 0]]}, bend:-90, kind:"cannon"},
             line7:{line:{count:7, upSpeed:0.3}}},
    behaviorDef:{circle:["circular", {radius:96, clockwise:true}],
                 circleInv:["circular", {radius:96, clockwise:false}]}
  }
  // FALさんの6.
  // margin120であらぬ方向に3wayを発射して(interval45°)速さ5で30フレーム進んでから
  // margin30でこっちに向かって・・んー。2フレームに1発、0.5ずつ速くしていって飛ばす感じ。(??)
  let seed2_7 = {
    x:0.5, y:0.3, shotSpeed:5,
    action:{
      main:[{aim:120}, {shotAction:["set", "burst"]}, {fire:"way3"}, {wait:30}, {loop:INF, back:-1}],
      burst:[{wait:30}, {aim:10}, {shotAction:["set", "burst2"]}, {fire:"u"}, {vanish:1}],
      burst2:[{shotSpeed:["add", 0.5]}, {fire:"u"}, {wait:2}, {loop:24, back:3}, {vanish:1}]
    },
    fireDef:{u:{}, way3:{nway:{count:3, interval:45}}}
  }
  // shotDelayが新しくなったんで使ってみる.
  // 直線状に弾丸を配置していっせいにばーーーーーーーん！
  let seed2_8 = {
    x:0.5, y:0.2, shotSpeed:4,
    action:{
      main:[{aim:120}, {shotAction:["set", "sub1"]}, {fire:"u"}, {wait:30}, {loop:INF, back:-1}],
      sub1:[{wait:30}, {aim:10}, {shotAction:["set", "trap"]}, {fire:"u"}, {vanish:1}],
      trap:[{shotDelay:["set", 120]}, {shotDelay:["add", -3]}, {shotDirection:["add", 15]}, {fire:"u"}, {wait:3}, {loop:40, back:4}, {vanish:1}]
    },
    fireDef:{u:{}},
  }
  // homingBehaviorが新しくなったので試してみる.
  // radial12と組み合わせる感じで。
  let seed2_9 = {
    x:0.5, y:0.3, shotSpeed:6, shotBehavior:["decele"],
    action:{
      main:[{shotDirection:["set", [0, 360]]}, {shotAction:["set", "delayHom"]},
            {fire:"radial12"}, {wait:30}, {loop:INF, back:4}],
      delayHom:[{wait:60}, {behavior:["add", "hom1"]}, {wait:INF}]
    },
    fireDef:{radial12:{radial:{count:12}}},
    behaviorDef:{decele:["decelerate", {terminalSpeed:1, friction:0.05}],
                 hom1:["homing", {rotationSpeed:2, threshold:120}]}
  }
  // FALさんの8, 多分だけど円周上をぐるぐるまわる16個の砲台が
  // 6フレームおきに120°間隔で2way発射を4回を16フレームおきにやってる？
  // とりま、16発回らせてみますか。
  // できたかな？
  let seed2_10 = {
    x:0.5, y:0.5, shotSpeed:0.5*PI, shotDirection:0, shotBehavior:["circ120"],
    action:{
      main:[{hide:true}, {shotAction:["set", "way2"]}, {fire:"radial16"}, {wait:INF}],
      way2:[{shotSpeed:["set", 2]}, {fire:"way2"}, {wait:6}, {loop:4, back:2}, {wait:16}, {loop:INF, back:-2}]
    },
    fireDef:{
      radial16:{formation:{type:"points", p:[[120, 0]]}, radial:{count:16}, bend:90},
      way2:{nway:{count:2, interval:120}}
    },
    behaviorDef:{circ120:["circular", {radius:120}]}
  }

  // FALさんの9, これは16個の方向に

  // どうする？？
  let newPtn = parsePatternSeed(seed2_10);
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
  if(usingUnitMax < entity.getCapacity()){ usingUnitMax = entity.getCapacity(); }
  text("usingUnitMax:" + usingUnitMax, 40, 200);
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
    // ↑ここを、統一して、updateは同じArrayにして、それとは別に、
    // 描画用にfill色でオブジェクトで分ける・・{red:{color:~~, array:~~}, blue:{color:~~, array:~~}}
    // みたくして、fill(red) red.array描画 fill(blue) blue.array描画 以下略。
    // こっちで予め色とかオブジェクトとか用意しておいて名前からアクセスできるようにしといて、
    // その名前を各unitにも持たせておいてvanishの際にピンポイントで配列にアクセスして排除（そういう関数作る）。
    // 登録もその名前経由で、それであとはfireFunc作るときにオプションで色指定できるようにするだけ。
    // イメージ的には{fire:"fire", color:"dkblue"}みたいな感じ。this.colorName = "dkblue".
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
        continueFlag = execute(this, command); // flagがfalseを返すときに抜ける
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
    if(this.hide){ return; } // hide === trueのとき描画しない
    this.drawFunction(this);
  }
}

// ---------------------------------------------------------------------------------------- //
// drawFunction. bullet, cannon用の描画関数.
// もっと形増やしたい。剣とか槍とか手裏剣とか。3つ4つの三角形や四角形がくるくるしてるのとか面白いかも。
// で、色とは別にすれば描画の負担が減るばかりかさらにバリエーションが増えて一石二鳥。

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

// 0～360の値2つに対して角度としての距離を与える
function directionDist(d1, d2){
  return min(abs(d1 - d2), 360 - abs(d1 - d2));
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
    _bullet.velocityUpdate();
  }
}

// ホーミングの仕様を変えたい。徐々に角度がこっちを向くように変化していく、具体的には
// 1°ずつとか、0.5°ずつとかそんな風に。2°ずつとか。今の仕様だと180°いきなりがちゃん！って感じだから。
// そこをね・・あと、ある程度それやったらもう角度変えないとかそういう感じにするのもあり。
// そういうホーミングをレイドと組み合わせると強力なショットに（以下略）

// ホーミング。徐々にこちらに方向を揃えてくる。
// rotationSpeed(1フレーム当たりの回転角の上限), threshold(角度変化が行われる範囲).
function homingBehavior(param){
  const {rotationSpeed, threshold} = param;
  return (unit) => {
    if(unit.properFrameCount > threshold){ return; }
    const targetDir = getPlayerDirection(unit.position);
    const currentDir = unit.direction;
    if(directionDist(targetDir, currentDir) < rotationSpeed){
      unit.direction = targetDir;
    }else{
      if(directionDist(targetDir, currentDir + rotationSpeed) < directionDist(targetDir, currentDir)){
        unit.direction += rotationSpeed;
      }else{
        unit.direction -= rotationSpeed;
      }
    }
    unit.velocityUpdate();
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
// radius, clockwise.
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
// countが弾ひとつからいくつ作るか、upSpeedはまんまの意味。
function createLine(param, ptnArray){
  let newArray = [];
  ptnArray.forEach((ptn) => {
    for(let i = 0; i < param.count; i++){
      let obj = {};
      Object.assign(obj, ptn);
      obj.speed += i * param.upSpeed;
      newArray.push(obj);
    }
  })
  return newArray;
}

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
    if(data.hasOwnProperty("line")){
      ptnArray = createLine(data.line, ptnArray); // なんかline.
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
    // ここでdata.kindが未定義の場合は必然的に"bullet", "cannon"も指定できる。
    if(!data.hasOwnProperty("kind")){ data.kind = "bullet"; }
    ptnArray.forEach((ptn) => {
      createUnit(ptn, data.kind); // 作るのは、基本的にbullet.
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
  if(["speed", "direction", "shotSpeed", "shotDirection", "shotDelay"].includes(_type)){
    result.mode = command[_type][0]; // "set" or "add" or "mirror" or etc...
    result[_type + "Change"] = command[_type][1]; // 3とか[2, 9]とか[1, 10, 1]
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
  if(_type === "hide"){
    // 隠れる. trueのとき見えなくする。falseで逆。
    result.flag = command.hide; return result;
  }
}

function execute(unit, command){
  const _type = command.type;
  if(["speed", "direction", "shotSpeed", "shotDirection", "shotDelay"].includes(_type)){
    // speedとかshotDirectionとかいじる
    let newParameter = getNumber(command[_type + "Change"]);
    if(command.mode === "set"){
      unit[_type] = newParameter;
    }else if(command.mode === "add"){
      unit[_type] += newParameter;
    }else if(command.mode === "mirror"){
      // 角度限定。角度をθ → 2a-θにする。speedやdelayでは使わないでね。
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
    unit.shotDirection = getPlayerDirection(unit.position, command.margin);
    unit.velocityUpdate();
    unit.actionIndex++;
    return true; // ループは抜けない
  }
  if(_type === "vanish"){
    // vanishDelayまで何もしない、そのあと消える。デフォルトは1. {vanish:1}ですぐ消える。
    if(unit.loopCheck(command.vanishDelay)){ unit.vanishFlag = true; }
    return false; // ループを抜ける
  }
  if(_type === "hide"){
    // 関数で分けて書きたいね・・
    unit.hide = command.flag;
    unit.actionIndex++;
    return true; // ループは抜けない
  }
}
