// オブジェクトプールから取り出して使う感じで。
// FALworksさんの弾幕アニメ作ってみたい

// burstは自分が消滅してなんかbulletを作るやつだから、
// それを書いてみたい。レイド飽きた。

// クリックによりplayerとwholeSystemが初期化されて別のパターンがセットされる。
// programArrayに登録しておく。以上。

// draw時間かかりすぎ・・あと同じようなコードはパラメータでまとめたいし、
// その・・もっと洗練させて・・んー。
// pushpopなくしたら速くなった。なんじゃい。

// setBurstをなくして、burstの中にいろいろ書くようにするってこと。
// defaultBulletPatternのところに別のパターンを入れちゃうってことね。

// テスト初めて使ったわ。bulletのeject処理が全然うまくいってない。やべぇ。
// やっぱ逆走査しないとだめだよなぁ。
// もっとテストコード活用しないとな・・まあ最終的には無くすけど。

// bulletSpeedとbulletDirectionでもいいでしょ。
// 先に決めておくならinitializeでやる。
// バーストならbulletにも同じ名前のプロパティ付ければいいじゃん。

// bulletとcannonをわけるからいけないんだよ（たぶん）
// 親かどうかの違いしかないのに。で、親の場合だけなんかちょっといじるだけでいいんじゃない・・
// そうすればバーストとかも効率的に記述できるよ（多分）

let bulletPool;
let wholeSystem;
let controller;

let drawTimeSum = 0;
let drawTimeAverage = 0;
const AVERAGE_CALC_SPAN = 30;

let isLoop = true;
let showInfo = true;


/*
const UPPER_BOUND = 180;
const LOWER_BOUND = 320;
const LEFT_BOUND = 240;
const RIGHT_BOUND = 240;
const CENTER_X = 240;
const CENTER_Y = 180;
*/
const PATTERN_WIDTH = 480;
const PATTERN_HEIGHT = 480;
const PATTERN_SELECT_MARGIN = 40;

const INITIAL_CAPACITY = 600;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ObjectPool運用のためのdummy.

function setup(){
	//createCanvas(LEFT_BOUND + RIGHT_BOUND, UPPER_BOUND + LOWER_BOUND + 40);
  createCanvas(PATTERN_WIDTH, PATTERN_HEIGHT + PATTERN_SELECT_MARGIN);
	textSize(16);
	bulletPool = new ObjectPool(() => { return new Bullet(); }, INITIAL_CAPACITY);
	controller = new ProgramController();
	controller.setProgram(0);
  wholeSystem = new System();
	wholeSystem.setting(controller.getProgram());
}

function draw(){
	background(200, 200, 255); // うすいあお
	const updateStart = performance.now(); // 時間表示。
	wholeSystem.update();
	const updateEnd = performance.now();
	const drawStart = performance.now(); // 時間表示。
	wholeSystem.draw();
	controller.draw();
	const drawEnd = performance.now();
	if(showInfo){ showPerformanceInfo(updateEnd - updateStart, drawEnd - drawStart); }
}

// ---------------------------------------------------------------------------------------- //
// Change Program.

function mouseClicked(){
	if(mouseY > height || mouseY < height - PATTERN_SELECT_MARGIN){ return; }
	if(mouseX < 0 || mouseX > width){ return; }
	const newIndex = Math.floor(mouseX / 30);
	if(newIndex < 0 || newIndex > controller.size - 1){ return; }
	controller.setSketch(newIndex);
	wholeSystem.initialize();
	wholeSystem.setting(controller.getSketch());
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
// PerformanceInfomation.

function showPerformanceInfo(updateTime, drawTime){
	fill(0);
	text("using:" + wholeSystem.getBulletCapacity(), 40, 40);
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
  text("drawTimeAverage:" + drawTimeAverageInnerText, 160, 160);
}

// ---------------------------------------------------------------------------------------- //
// Player.

class SelfUnit{
	constructor(){
		this.position = createVector(0, 0);
		this.initialize();
	}
	initialize(){
		this.position.set(PATTERN_WIDTH / 2, PATTERN_HEIGHT * 7 / 8);
		this.speed = 4;
		this.rotationAngle = 0;
		this.rotationSpeed = toRad(2);
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	getPosition(){
		return {x:this.position.x, y:this.position.y};
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
		this.position.x = constrain(this.position.x, -LEFT_BOUND, RIGHT_BOUND);
		this.position.y = constrain(this.position.y, -UPPER_BOUND, LOWER_BOUND);
	}
	draw(){
		const {x, y} = this.position;
		const c = Math.cos(this.rotationAngle) * 10;
		const s = Math.sin(this.rotationAngle) * 10;
		stroke(0);
		noFill();
		strokeWeight(2);
		quad(x + c, y + s, x - s, y + c, x - c, y - s, x + s, y - c);
		strokeWeight(4);
		point(x, y);
		/*
		push();
		stroke(0);
		translate(this.position.x, this.position.y);
		rotate(this.rotationAngle);
		noFill();
		strokeWeight(2);
		rect(-10, -10, 20, 20);
		strokeWeight(4);
		point(0, 0);
		pop();
		*/
	}
}

// ---------------------------------------------------------------------------------------- //
// System.
// 初期化の際にはすべてのcannonに対してinitializeを施す。

class System{
	constructor(){
		this.player = new SelfUnit();
		this.cannonArray = new CrossReferenceArray();
	}
	initialize(){
		this.player.initialize();
		this.cannonArray.loop("initialize");
		this.cannonArray.clear(); // cannon自体もなくす・・これでいい？
	}
	setting(_sketch){
		_sketch(this); // パターンを作るところのはずなんだけど。
	}
	update(){
		this.cannonArray.loop("update");
		this.player.update();
	}
	draw(){
		this.cannonArray.loop("draw");
		this.player.draw();
	}
	getBulletCapacity(){
    // 使われている弾丸の総数
		let sum = 0;
		this.cannonArray.forEach((cannon) => { sum += cannon.bulletSet.length; })
		return sum;
	}
}

// この216行目までは特に問題無さそうなんだよね。
// ここから下がカオス

// Cannonっていうのはnodeのことで、bulletを生み出すけどどこかからは生まれない、最初からある、そこだけ違う。
// それが作るbulletは、そのbulletがburstしてもすべてこのparentに属す、updateやdrawもそこがまとめて行う・・。

// ---------------------------------------------------------------------------------------- //
// BulletSystem. というかcannon.
// 初期化の際には手持ちのbulletをすべてPoolに戻す。
// ・・だけでなく、いろいろ初期化しないと・・

// bulletを作るメソッド2つも要るのか・・？んー。

class Cannon{
	constructor(){
		this.bulletSet = new CrossReferenceArray();
		this.position = createVector();
		this.initialize();
	}
	initialize(){
		this.bulletSet.loopReverse("vanish"); // すべてのbulletを（あれば）Poolに戻す。
    // なくす。で、
    /*
		// 以下、固定された発射する弾丸の情報とかいろいろ
		this.bulletSpeed = 0;
		this.bulletSpeedChange = 0;
		this.bulletDirection = 0;
		this.bulletDirectionVelocity = 0;
		// bulletPatternは弾丸の挙動に関する情報。
		this.bulletPattern = defaultBulletPattern; // 必要に応じて変える。
    */
		// これはbodyに関する情報
		this.rotationAngle = 0;
		this.rotationSpeed = toRad(2);
		// フレームカウント
		this.properFrameCount = 0;
    // 待ち情報
    this.waitCount = 0; // wait命令を実行するとき0ならここになんか数を置く、で、減らし、0になったら次、的な。
    /*
		// bodyの動きを記述する・・これも何かしら・・んー。
		this.position.set(0, 0);
		this.radius = 0;
		this.angle = 0;
    */
		// 弾丸の発射の仕方について
		this.pattern = undefined;
	}
  setPattern(_pattern){
    this.pattern = _pattern;
    _pattern.initialize(this); // 初期化処理
  }
	getNext(typeName){
		// 名前がgetで始まるのにreturnで終わってないのは混乱を招くよね。どうにかして・・
		// typeNameはmoveもしくはfire.
    let controller = this.pattern.controller[typeName];
		controller.index++;
		if(controller.index === controller.sequence.length){ controller.index = 0; }
		this.pattern[typeName] = controller.sequence[controller.index];
	}
  /*
	setting(menu){
    // なくしたい・・
		// ここでcannonとbulletとかもろもろ用意する
		menu(this);
	}
  */
  createBullet(_pattern){
    // こっち使いたいの
    let newBullet = bulletPool.use();
    newBullet.setParent(this); // 親を設定
		newBullet.setPolar(_pattern.speed, _pattern.direction); // ここまでに確定していないといけない
    newBullet.setPattern(_pattern); // 一元化(properFrameCount=0とかvanishFlag=falseとかここでやるべき)
    this.bulletSet.add(newBullet);
  }
  /*
	createBullet(){
    // なくしたい
		let newBullet = bulletPool.use();
		newBullet.properFrameCount = 0;
		newBullet.setPosition(this.position.x, this.position.y);
		newBullet.setPolar(this.bulletSpeed, this.bulletDirection);
		newBullet.parent = this; // 親を設定する
		newBullet.setPattern(this.bulletPattern); // パターンを決める。
		newBullet.vanishFlag = false;
		this.bulletSet.add(newBullet);
	}
	resumeBullet(position, speed, direction, bulletPattern = defaultBulletPattern){
    // なくしたい
		// 弾丸が親経由でbulletを作らせるときに使うメソッド
		let newBullet = bulletPool.use();
		newBullet.properFrameCount = 0;
		newBullet.setPosition(position.x, position.y);
    newBullet.setPolar(speed, direction);
		newBullet.parent = this;
		newBullet.setPattern(bulletPattern); // burstの廃止に伴い変更。burst以外にもパターンあるでしょ。
		// もしくはコンポジットという手もあるな・・切り替わっても面白そうだ・・
		newBullet.vanishFlag = false;
		this.bulletSet.add(newBullet);
	}
  */
	update(){
    this.properFrameCount++;
    this.pattern.move(this); // 動き
		this.pattern.fire(this); // 発射
    if(this.waitCount > 0){ this.waitCount--; }
    // bullet関連のupdate.
    this.bulletSet.loop("update");
		this.bulletSet.loopReverse("check"); // ここで排除されるはず・・フラグが立っていれば。
		ejectBulletFailed(this); // テストコード
		this.rotationAngle += this.rotationSpeed; // 本体の回転
    /*
		this.position.x = this.radius * Math.cos(toRad(this.angle));
		this.position.y = this.radius * Math.sin(toRad(this.angle));
		this.pattern(this); // インターバルの情報はpatternに含めてしまいましょう。
		this.properFrameCount++;
		this.bulletSet.loop("update");
		this.bulletSet.loopReverse("check"); // ここで排除されるはず・・フラグが立っていれば。
		ejectBulletFailed(this);
		this.rotationAngle += this.rotationSpeed;
    */
	}
	drawBody(){
		const {x, y} = this.position;
		const c = Math.cos(this.rotationAngle) * 8;
		const s = Math.sin(this.rotationAngle) * 8;
		fill(0);
		quad(x + c, y + s, x - s, y + c, x - c, y - s, x + s, y - c);
		/*
		push();
		translate(this.position.x, this.position.y);
		rotate(this.rotationAngle);
		fill(0);
		rect(-8, -8, 16, 16);
		pop();
		*/
	}
	draw(){
		this.drawBody();
		noStroke();
		fill(0, 0, 255); // 弾丸の色を固定する場所は1ヵ所に。
		// 弾丸の色、パターンによって変えたいわね。背景色も。
		this.bulletSet.loop("draw");
	}
}

// ---------------------------------------------------------------------------------------- //
// Bullet.
// parentを付けるとか・・
// burstは途中でvanishして何かしらのbulletを生成して親にcreateさせる感じ（？？）
// createBulletのところ・・んー。
// 位置と速度を指定して弾を補充できるようにしたからこれで？
// あるいは、bullet自体がそういう感じにするべき、なのかも？systemとか分けたりしないで。

// 弾丸の挙動は大きく分けて自分自身の移動とバーストによる弾丸放出の2部構成。
// バーストしなければ挙動そのままで画面外に消えるだけ。
// 一定時間で消える処理でもいいけど・・
// バーストの場合は放出される弾丸に移動の挙動やバーストの挙動をインプットする必要がある。
// と同時に自分の親に所属させるための処理も必要になる、まあそんだけでいいってことで。

// シンプルなものから始めよう。いつだって最初は・・

class Bullet{
	constructor(){
		this.direction = 0;
		this.speed = 0;
		this.position = createVector(0, 0);
		this.velocity = createVector(0, 0);
		this.properFrameCount = 0;
		this.pattern = undefined;
		this.vanishFlag = false; // まずフラグを立ててそれから別処理で破棄するようにしないと面倒が起きる。もうたくさん。
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	/*
	setVelocity(vx, vy){
    // たぶんなくす
		this.velocity.set(vx, vy);
	}
	*/
	setPolar(speed, angle){
		// angleはdegree指定
		this.speed = speed;
		this.direction = toRad(angle);
		this.velocity.set(this.speed * Math.cos(this.direction), this.speed * Math.sin(this.direction));
	}
	setPattern(_pattern){
    this.properFrameCount = 0;
		this.pattern = _pattern;
    _pattern.initialize(this); // 初期化処理
    this.vanishFlag = false;
	}
	getNext(typeName){
		// typeNameはmoveもしくはfire.
		// コピペです。やっぱ統一すべきかなぁ
    let controller = this.pattern.controller[typeName];
		controller.index++;
		if(controller.index === controller.sequence.length){ controller.index = 0; }
		this.pattern[typeName] = controller.sequence[controller.index];
	}
	update(){
		ejectedBulletUpdated(this); // vanishした後も排除されずにupdateされてないかどうか調べるテストコード
		this.properFrameCount++;
		this.pattern.move(this);
		this.pattern.fire(this);
		if(!this.isInFrame()){ this.vanishFlag = true; } // ここではフラグを立てるだけにする。直後に破棄する。
	}
	check(){
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
		const c = Math.cos(this.direction);
		const s = Math.sin(this.direction);
		triangle(x + 6 * c, y + 6 * s, x - 6 * c + 3 * s, y - 6 * s - 3 * c, x - 6 * c - 3 * s, y - 6 * s + 3 * c);
	}
	isInFrame(){
		// フレーム外に出たときの排除処理
		if(this.position.x < -LEFT_BOUND - 10 || this.position.x > RIGHT_BOUND + 10){ return false; }
		if(this.position.y < -UPPER_BOUND - 10 || this.position.y > LOWER_BOUND + 10){ return false; }
		return true;
	}
}

// ---------------------------------------------------------------------------------------- //
// ProgramController.

class ProgramController{
	constructor(){
		this.index = 0;
		this.size = 0;
		this.sketchArray = [];
		this.currentSketch = undefined;
		this.preparation();
	}
	preparation(){
	  const singleProgramArray = [program1, program2];
		singleProgramArray.forEach((program) => {
			const singleProgram = createSingleCannonSketch(program);
			this.sketchArray.push(singleProgram);
		})
		const multiProgramArray = [[program3, program4]];
		multiProgramArray.forEach((programArray) => {
			const multiProgram = createMultiCannonSketch(programArray);
			this.sketchArray.push(multiProgram);
		})
		this.size = this.sketchArray.length;
	}
	setSketch(newIndex){
		this.index = newIndex;
		this.currentSketch = this.sketchArray[this.index];
	}
	getSketch(){
		return this.currentSketch;
	}
	draw(){
		const y = PATTERN_HEIGHT;
		push();
		for(let i = 0; i < this.size; i++){
			const x = i * 30;
			if(i === this.index){ fill(0, 0, 255); }else{ fill(i * 15); }
			rect(x, y, 25, 40);
		}
		pop();
	}
}

function createSingleCannonSketch(program){
	return (_system) => {
		let _cannon = new Cannon();
    const pattern = interpret(program); // 関数を生成
    _cannon.setPattern(pattern);
		_system.cannonArray.add(_cannon);
	}
}

// programはオブジェクト、これを解釈すると関数が出来上がる（はず）

function createMultiCannonSketch(programArray){
	return (_system) => {
		programArray.forEach((program) => {
			let _cannon = new Cannon();
      const pattern = interpret(program); // 関数を生成
			_cannon.setPattern(pattern);
			_system.cannonArray.add(_cannon);
		})
	}
}



// programはオブジェクトで、interpretで解釈して関数にする（pattern）
// bulletを作る肝心の所は、やはり何かしらのpatternっていう関数ができるからそれを使って・・
// [速さ3][方向自機狙い][以下もろもろ]みたいななんかそんなようなやつ入るんじゃね？？知らないけど。

// interpretは何を作るのか。
// Cannonにセットしてupdateで実行するpattern関数（引数にCannonオブジェクトを取り移動とか発射とか指示する）。
// あっちのコードのpattern1とかpattern2とかなってるやつだと思う。
// あるいは、BulletにセットしてBulletがupdateで実行するpattern関数（引数にBulletオブジェクトを取り以下略）。
// そういうのをオブジェクトから生成するのがinterpretの仕事（になるはず）。

// ------------------------------- //
// ???
// オブジェクトとパーサーを作りたい。まずは単純なやつから。目的はまず・・最初のランダムぎゅーんってやつ。
// [2]: 2. [3, 6]: 3から6までのどれかの実数. [3, 9, 1]: 3から9まで間隔1でどれかを取る（3, 4, ..., 9)
// って感じで数指定を表現できるじゃんね。それでいけるんじゃない。
// 何に何を指示するのかイミフ。却下！！！！

// たとえば直進、画面外で消滅。これだけの場合。
// {speed:3, direction:30}で30°方向にスピード3で直進ってなるとする。
// この場合、えー・・bulletに{speed:3, direction:30}を渡すとそういうふうになる的な？
// systemが発射するんだっけ・・インターバル指定。そして、endlessなのかある程度発射して終わりなのか考えるとか。
// endlessかlimitedみたいな。countが正の場合は1減らす、countが0の場合はreturn, endlessはcount=-1としていけそう。
// {endless:{loop:{count:2, pattern:{shot_velocity:["set", [3, 6], [0, 360]], fire:unit?}}, wait:1}}
// 初期設定はショットの速度は方向0大きさ0でしておいて・・"set"ならその値にする、"add"ならその値を加える感じ。
// [a]は値a,[a,b]はa~bランダム、[a,b,i]はi刻みでa~bランダム(Math.floor((b-a)/i)*i)って感じ。
// {limited:{count:20, loop:{count:10, shot_velocity:["add", [0.1], [0]]}, wait:4}}とかいって。

// あれに縛られてると・・あれも不完全だから（得られる情報が、という意味）・・んー。
// 組み込み先はbulletSystemというかcannon, これ統一したほうがいいな。Cannonでクラス名にしたいね。
// Cannonについて、第一階層：弾丸を無限に発射するのか、限界があるのか。
// 動くのか動かないのか、動くとしてどんな風に？
// waitが3なら3ターンおき、とかそういうの？厳密に、厳密に・・んー。

// シンプルにやりたい！！！！！！！！！！！！！！！！！！！！！！！！！！え
// 動きと発射は別々、これを2本柱とし、挙動は適宜合わせる
// 弾丸の挙動も動きと発射（つまりバースト）を別々にする。これでいけるはず。これでいこう。

// {move:..., fire:...{bulletのところに{move:..., fire:...}}}以下続く
// move:isMove:falseで動かない感じ。最初の例とか。fireはたとえばtype:"endlessLoop"なら一定間隔で発射し続ける感じ。
// endlessLoopを検知した後の処理は別の関数にするとか。
// type:"endlessLoop", interval:1, pattern:弾丸はどんなのにする？fire:isFire:falseなら何もしない、感じの。
// vanishしないといけない。画面外に出たらvanishなのか一定時間後にvanishなのかとかその辺。
// 画面外vanishはデフォルトでいいよ・・moveのプロパティに含めて。vanish:-1なら時間では消えない、60なら60フレームで消えるとか。
// 一定進んでからとかは・・waitを使う。wait命令があるとその間は速度を加えるだけ、みたいな。

// waitって何ですか先生！waitとはfireの直後にセットされるカウンターで正だと毎フレーム減らされる、0になったら次のfireを
// 実行できるやつだよ（つまりfire前提）。countが設定されてるならそれが減っていって0になったらvanishする。
// しかしcountが-1の場合それは減らず、延々と続ける。画面外に消えるまで・・
// moveにwaitがある場合はそれが0になるまではただ動くだけって感じの・・？
// それが終わった後でfireが始まってfireの間は意味が変わるとかすれば表現力高そう。
// ??fireはwaitの方だけ・・だよね。よく考えたら。で・・
// wait:30, pattern:... で？ loop: {count: pattern:}, wait:だったらcountだけpatternでbulletを作ってから..
// endlessLoopであればそのサイクルを繰り返す形になる。おわり。

// moveプロパティにwaitがあったらカウンターがセットされてそれだけのあとでfireに進む感じ。
// fireの中のloopの中の・・waitについてはそれを検知したらcounterにセットされてそれが毎回減ってとかそういう。

// {move: isMove:false, fire: isFire:true, type:"endlessLoop", pattern:{loop:{count:2, pattern:A}, wait:1}}
// A = {speed:[3, 6], direction:[0, 360]}

// updateのところにmoveとfireって書くんじゃないかな。で、isMoveやisFireがfalseならスルーみたいな。

// move: isMove:true, circle: {中心とか回る方向とか周期とかその辺}

// Cannon側
// ずーっと一定間隔でbulletを発射し続ける
// {loop}{loop}{loop}...
// delayをおいてからそのサイクルに入る
// {wait}{loop}{loop}{loop}...
// 一定の発射と一定のwaitを繰り返すサイクル
// ...{loop}{wait}{loop}{wait}{loop}{wait}...

// もういっそシンプルにwait, loop, backの組み合わせで表現することにしよう。
// backは指定した数だけ後ろの命令で置き換わる仕組み。{loop}{back1}はloopのあと1つ前のloopが実行され以下略

// 移動については、中心が決まってて、半径が決まってて、楕円軌道を動くとか行ったり来たりするとか一定のスピードで
// 往復してもいいね。

// bulletの生成
// ある速さ、方向を与え、パターンがデフォルトのBulletを生成する流れ
// accell, brakeAccell, easingのかかったBulletを生成する流れ
// etc...

// bullet生成時にそのbulletがbulletを生成するならそれを考慮してそういう関数を仕込んでおくとか出来るようになりたいね

// ---------------------- //
// 挙動関数つくってみようぜ

// defaultのbulletPattern. 基本的にこれがbulletにはセットされる。速度の方向に直進するだけ。
/*
function defaultBulletPattern(_bullet){
	_bullet.position.add(_bullet.velocity);
}
*/
// まあつまり、こういうのをオブジェクトから生成するってことで・・んー、まあ、同じコード何べんも書きたくないしさ。
// 関数を生成する関数？

// patternにinitialize処理とexecute処理という二つの関数を持たせることに。
// これらを生成するのね。
// Cannonのinitialize処理は多分初期位置を決めるとかかな・・
// Bulletの方は位置とか速度とか決めそう



// 毎ターンランダムで2つの方向にある速さのBulletを発射するのを延々とやる、みたいな・・

// ---------------------------------------------------------------------------------------- //
// program menu.
// ていうかprogramとすべきなんじゃ・・ここ以下のpatternのところを汎用的にして、
// さらにそれを解釈する機構を作りたいんだけど。それができれば大きく前進できる。
// パターン増やす前にそっちやりたい感ある。そうすれば自由自在なのに。

function menu1(_cannon){
	_cannon.pattern = pattern1;
}

function menu2(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.pattern = pattern2;
}

function menu3(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 0;
	_cannon.pattern = pattern3;
}

function menu4(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 0;
	_cannon.bulletDirectionVelocity = 12;
	_cannon.angle = 0;
	_cannon.radius = 60;
	_cannon.pattern = pattern4;
}

function menu5(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 0;
	_cannon.bulletDirectionVelocity = 2;
	_cannon.bulletPattern = bulletPattern1;
	_cannon.pattern = pattern5;
}

function menu6(_cannon){
	_cannon.radius = 60;
	_cannon.angle = 0;
	_cannon.pattern = pattern6;
}

function menu7(_cannon){
	_cannon.radius = 60;
	_cannon.angle = 180;
	_cannon.pattern = pattern7;
}

function menu8(_cannon){
	_cannon.bulletSpeed = 5;
	_cannon.bulletPattern = bulletPattern2;
	_cannon.pattern = pattern8;
}

function menu9(_cannon){
	_cannon.bulletSpeed = 6;
	_cannon.bulletDirection = 0;
	_cannon.bulletDirectionVelocity = 15;
	_cannon.bulletPattern = bulletPattern3;
	_cannon.pattern = pattern9;
}

function menu16(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = -90;
	_cannon.bulletDirectionVelocity = -12;
	_cannon.angle = 180;
	_cannon.radius = 120;
	_cannon.pattern = pattern17;
}

function menu17(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 90;
	_cannon.bulletDirectionVelocity = 12;
	_cannon.angle = 0;
	_cannon.radius = 120;
	_cannon.pattern = pattern17;
}

// ---------------------------------------------------------------------------------------- //
// pattern.

// EXPLANATION.
// patternはCannonのpatternプロパティに設定するものです。
// クリックによるパターンチェンジの際にリセットされて設定されます。
// CannonはBulletを生成するのですがそのBulletにもまたpatternが設定され、
// それはCannonに設定するpatternの中にそれが入っている仕組みですね。すべて情報が詰め込まれています。
// patternは3つの関数（initialize, move, fire）をもっており、
// initializeはpatternセットの際に最初に実行される（速度とか決めたりする）、
// moveとfireはupdateの所で実行されます。moveは本体の移動関連、fireは他のBulletの生成に関するものです。
// Bulletは親となるCannonに常に属し、Bulletの生成するBullet（いわゆるバースト）については元となる
// 親のCannonに属しupdateやvanish等も共通に行われます。複数ある時は個別に。

// patternをオブジェクトから作るinterpretという関数を作らなくてはいけません。そのための補助関数なども・・・
// こいつ誰

/*
  pattern直下にcontrollerプロパティが入っててその中にmoveとfireがあってそれぞれに
	sequence(文字列の配列)とindex(0以上の整数)とsequenceに使う関数(loopやwaitなどの名前が付いてる)。
	interpretの中でmoveとfireには一旦()=>{}が入るけどsequenceが[]でない時はその0番が放り込まれる形。
	そして即座に実行が始まる形。
  例えば30フレーム休むとかそういうの・・moveなら直進命令とか。ex: go = (b) => {b.pos.add(b.vel);}
	途中までスピードに0.9とか掛けていって既定フレーム超えたら今度は加速していって一定のスピードで直進とか(?)
*/

// 単独命令の場合controllerは必要ないの割と重要・・作るかどうかの判断も入れておくのね。

/*
  これを作ればいいのね。
  pattern - initialize:(c) => {}
	        - move:(c) => {}
					- fire:(c) => {
					    const fc = c.properFrameCount;
							if(fc % 1 === 0){
							  let count = 2;
								while(count-- > 0){
							    c.createBullet(c.bulletPattern);
								}
						  }
							c.increment(); // properFrameCount++;
				    }
          // 単独命令の場合controllerは必要ない
					- bulletPattern:bulletPattern1
  bulletPattern1 - initialize;(b) => {
	                   const {x, y} = b.parent.position;
	                   b.setPosition(x, y);
										 b.setPolar(randomRange(3, 6), randomRange(0, 360));
                   }
								 - move:(b) => {b.position.add(b.velocity);}
								 - fire:(b) => {}
*/
/*
  program = obj - initialize:"default"
	              - move:"default"
							  - fire:simpleLoop(interval = 1, count = 2, 0, limit = -1) // -1はendlessの意味
								// 0はbulletPattern配列の0番目のパターンが入るというような意味
								// たとえば10なら10回実行したのちパターンチェンジが起こるみたいなそんなやつ
								- controller:"default"
								- bulletPatternArray:[straight([3, 6], [0, 360])]
	simpleLoopは文字列でどのパターンを放り込むか決めておいてそれを呼び出す感じ、置き換わる。
	で、intervalがproperFrameCountを割り切るときにcountの回数だけfireする、limitはそれを何回やったらおわりか。
	つまりinterval * limitが限界になるんだけど-1の場合はエンドレスね。終わる場合、nextが呼び出されてセットされる。
	.getNext("fire")ってやるんよ・・controllerがnothing状態だから意味ないけど。
  straightは
	  「指定された速度をランダムに与えられた上でその方向に直進する」
	感じの。うん。
	方向が変化するのとかどこに書いたらいいのかって思ったけどfire関連だからfireに書けばいいや。
*/
/*
  initializeって何をするの？位置と速度の初期設定か。ん。bulletならparentがあるから、判別でき・・
	parentがいるときは相対位置、いない時は中心に対する相対位置（普通に定義するだけ）のx,yで
	vx,vyも分かるでしょ。type:simpleでinfo:{x,y,vx,vy}って感じ。
*/
/*
  moveって・・たとえばgoなら(b) => {b.position.add(b.velocity);}を作って欲しいとかそういうの。
*/
// あーそうか、ひとつであってもcontrollerないと0番を設定っていうあれができないじゃん。もともと・・んー。
// 今気付いたけどcontrollerって不要では？自動的に作られるんでは？んー・・
// あとinitializeが何もしない処理ならそこは何も入れなくていい気がするな・・
/*
  種データ
  data - fire
	       - sequence:["loop"] // loopのところに関数を入れるんだけどプロパティを見て作ったやつをね・・
				 - loop
					 - type:"endless"
					 - interval:1
					 - count:2
					 - speed:[3, 6]
					 - direction:[0, 360]
					 // - diff:[x, y] // これは発射位置がcannonの位置とズレてる場合にそのズレを記述する感じ
					 - pattern
					   - type:"unit"
	simpleStraightは指定された範囲の速度をランダムに与えてきっかり1発だけ親の位置から発射します。
	2発以上なら速度は一定なのかとか問題になりそうな・・変えるのかとか。うん、その辺。あっちでlineって
	やってる、あとはnwayね、他にもburstとかまあそこはおいおい。

	円形移動のイメージ
	data - move
	       - sequence:["closedCurve"]
				 - closedCurve
				   - type:"circle"
					 - center:[0, 0]
					 - radius:60
					 - rollingSpeed:3 // 360°指定 -3とかだと逆回転
 このデータを元にして関数を作る
 遷移条件を工夫すれば別の・・んー。

完成品：
  ptn1 - initialize:(c) => {}
	     - move:(c) => {}
			 - fire:(c) => {
			     const fc = c.properFrameCount;
					 if(fc % 1 === 0){
					   let _count = 2;
						 while(_count-- > 0){
					     fc.createBullet(ptn2);
						 }
				   }
					 c.properFrameCount++;
		     }
			 - controller
			   - fire
				   - sequence:["loop"]
					 - index:0
					 - loop:上記のfunc
			   moveについては指示がないので作らない

	ptn2 - initialize:(b) => {
	                    const {x, y} = b.parent.position;
											b.setPosition(x, y);
											b.setPolar(randomRange(3, 6), randomRange(0, 360));
                    }
			 - move:(b) => {b.position.add(b.velocity);}
			 - fire:(b) => {}
			 - controller
			   - move
				   - sequence:["go"]
					 - index:0
					 - go:上記のfunc
			 // patternについては指示がないので作らない
こういうのを作るinterpreterが欲しいってわけね。
*/
/*
  2つ目の、16個の方向に7WAYは？
	data - fire
	       - sequence:["loop"]
				 - loop
				   - type:"endless"
					 - interval:60
					 - count:1
					 - pattern
					   - type:"radial"
						 - ways:16
						 - direction:[0, 360]
						 - pattern
						   - type:"nway"
							 - ways:7
							 - intervalAngle:2
							 - speed:2
							 - pattern: "unit"
	ああなるほど、これまずいね。どうする・・ひとつしかないんだしここで生成しちゃえばいいでしょ。
	これで同じものになる・・はず。
*/

// interpret本体
// 完成品のptnにはinitialize, move, fireとcontrollerが付いている。
// initializeは関数、デフォルトは(obj)=>{}
// moveとfireのデフォルトは(obj)=>{}だけどdata直下にfireないしmoveが「なければ」
// それは変えない、あればsequenceの0番をそこにはめておく。
// controllerについてはdata直下になければそっちは作らない。(hasOwnPropertyでチェックする)
// あればsequenceとして作りそれぞれについて作る。
// その過程でbulletに設定するptnが必要になるかもしれないがそれは同じinterpretを用いて再帰的に構成する

// たとえば最初のパターンで用いられるのは・・
/*
- pattern
	- type:"straight"
	- speed:[3, 6]
	- direction:[0, 360]
からできあがるもの
data - initialize:simpleSet([3, 6], [0, 360])
     - move
		   - sequence:["go"]
条件分岐で"go"の場合は(b) => {b.position.add(b.velocity);}になるように書いておこう。
つまり自動的に -go:(b) => {....}ってなるようにするとかそんな感じ。で、moveに代入される感じ。
*/

// Cannon用とBullet用で分けた方がいいね
function interpret(data){
	let ptn = {};
	createInitialize(data, ptn);
	createController(data, ptn);
}

// もしセットするbulletのスピードとか方向がずっと一緒だったり初期設定とか決まってるなら、
// そういうのここで設定するのありかもしれない。ptn.speedとかptn.directionとかにして
// 関数内で使ってしまえば問題ない気がする。Cannonに付けなくてもいいからあっちのコードいじらなくて
// 済む、多分これをbulletのバーストでも同じように出来るのでは？当たり前のようだけど・・
// ・・というわけでinitializeは先に、ああでも使うのは実際にbullet作るときだからどっちでもいいけどね。

// ちょっとあっち変えた。ptn.speedとptn.directionを登録するように。
// 位置についてはいろいろなのでいろいろで。
function createInitialize(data, ptn){
	if(!data.hasOwnProperty("initialize")){ ptn.initialize = (_cannon) => {}; return; }
	// data.initializeの内容に応じて色々決める
}

function createController(data, ptn){
	// data.fireとdata.moveの内容に応じてcontrollerを作る
	createFire(data, ptn);
	createMove(data, ptn);
}

function createFire(data, ptn){
	if(!data.hasOwnProperty("fire")){ ptn.fire = (_cannon) => {}; return; }
  let node = ptn.controller.fire;
	node.sequence = data.fire.sequence;
	node.index = 0;
	node.sequence.forEach((actName) => {
		node[actName] = createFirePattern(data.fire[actName]); // ここは関数です（(_cannon) => {...}）
	})
	const name = node.sequence[0];
	ptn.fire = ptn.controller.fire[name];
}

// とりあえずtype:"endless"とか処理してみる？
// イメージ：data.typeの文字列によりそのあと定義されているプロパティが異なる。
// 省略無くすべて書いてある（原則）
// それを元に関数ができるのでそれを返す。以上。
function createFirePattern(data){
  switch(data.type){
		case "unit":
		  return unitPattern(data);
		case "endless":
		  return endlessPattern(data);
	}
}

function unitPattern(data){
	return (_cannon){
		const ptn = createBulletPattern(data)
		// dataの中にもしspeedとかdirectionとか書いてある場合はそれを使う感じの。
		_cannon.createBullet(ptn)
	}
}

// endlessの中身は状況によって違う場合がある（一発撃つだけとは限らない）。
// wayとかradialとかlineとか。だからそこらへんも考慮しないと・・
function endlessPattern(data){
	const {interval, count} = data;
	return (_cannon) => {
		const fc = _cannon.properFrameCount;
		if(fc % interval === 0){
		  let n = count;
	   	while(n-- > 0){
				// なにかする
				// とりあえず速さと方向決めてこの_cannonの位置にbulletセットしたいだけなんだけど、
				// 3WAYとか4RADIALにも対応しなきゃとか考えだしたら頭がこんがらがってきた・・
				if(data.hasOwnProperty("speed")){ data.pattern.speed = randomRange(data.speed); }
				else{ data.pattern.speed = _cannon.pattern.speed; }
				if(data.hasOwnProperty("direction")){ data.pattern.direction = randomRange(data.direction); }
				else{ data.pattern.direction = _cannon.pattern.direction; }

				createFirePattern(data.pattern)(_cannon);
		  }
		}
		_cannon.properFrameCount++;
	}
}

function createMove(data, ptn){
	if(!data.hasOwnProperty("move")){ ptn.move = (_cannon) => {}; return; }
  let node = ptn.controller.move;
	node.sequence = data.move.sequence;
	node.index = 0;
	node.sequence.forEach((actName) => {
		node[actName] = createMovePattern(data.move[actName]); // ここは関数
	})
	const name = ptn.controller.move.sequence[0];
	ptn.move = ptn.controller.move[name];
}


function createMovePattern(data){

}

// Bullet用
// 入れ子になるかどうかは知らない
function createBulletPattern(data){

}

/*
  っていうのをobjからinterpretが作るって感じなんだけど・・・・
	backは戻って別の命令で置き換える感じかなぁ。フレームはかけない。ズレるから。
	endlessLoopとかintervalごとにfireする、fireの際にはbulletPatternを用意しておかないといけないやつ・・
*/

/*
  backやjumpについて詳しく
	backは回数無限なら一定の範囲の無限ループを実現できるがコーダのように有限回にすることもできるし、
	条件次第でbackするか次のパターンを実行するかみたいなこともできるはずなのよね。
	おとずれた回数に応じて違う所にジャンプすることもできそうな（音楽記号かよ）
*/

function pattern1(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 1 === 0){
		let loopCount = 2;
		while(loopCount-- > 0){
			_cannon.bulletSpeed = randomRange(3, 6);
			_cannon.bulletDirection = randomRange(0, 360);
			_cannon.createBullet();
		}
	}
}

function pattern2(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 60 === 0){
		const radial = 16;
		let mainDirection = 360 * Math.random();
		let loopCount = radial;
		while(loopCount-- > 0){
			// 7WAY
			let ways = 7;
			let intervalAngle = 2;
			_cannon.bulletDirection = mainDirection - 0.5 * (ways - 1) * intervalAngle;
			while(ways-- > 0){
				_cannon.createBullet();
				_cannon.bulletDirection += intervalAngle;
			}
			mainDirection += 360 / radial;
		}
	}
}

function pattern3(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 96 === 0){
		_cannon.bulletDirectionVelocity = 0.5;
	}else if(fc % 96 === 48){
		_cannon.bulletDirectionVelocity = -0.5;
	}
	if(fc % 4 === 0 && fc % 48 < 32){
		const radial = 16;
		let loopCount = radial;
		while(loopCount-- > 0){
			_cannon.createBullet();
			_cannon.bulletDirection += 360 / radial;
		}
	}
	_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
}

function pattern4(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle += 2;
	if(fc % 1 === 0){
    _cannon.createBullet();
		_cannon.bulletDirection *= -1;
    _cannon.createBullet();
		_cannon.bulletDirection *= -1;
	}
	_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
}

function pattern5(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 8 === 0){
		const radial = 5;
		let loopCount = radial;
		let initialDirection = _cannon.bulletDirection;
		while(loopCount-- > 0){
			_cannon.createBullet();
			_cannon.bulletDirection += 360 / radial;
		}
		_cannon.bulletDirection = initialDirection;
	}
	_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
}

// lineっていうのを・・
function pattern6(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle += 2;
	if(fc % 96 > 32){ return; } // 0, 4, 8, 12, 16, 20, 24, 28.
	if(fc % 4 === 0){
		_cannon.bulletDirection = getPlayerAimAngle(_cannon.position);
		const initialSpeed = 5;
		_cannon.bulletSpeed = initialSpeed;
		const count = 7;
		let n = count;
		while(n-- > 0){
			_cannon.createBullet();
			_cannon.bulletSpeed += 0.3;
		}
	}
}

// lineっていうのを・・
function pattern7(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle -= 2;
	if(fc % 96 < 48 || fc % 96 > 80){ return; } // 48, 52, etc...
	if(fc % 4 === 0){
		_cannon.bulletDirection = getPlayerAimAngle(_cannon.position);
		const initialSpeed = 5;
		_cannon.bulletSpeed = initialSpeed;
		const count = 7;
		let n = count;
		while(n-- > 0){
			_cannon.createBullet();
			_cannon.bulletSpeed += 0.3;
		}
	}
}

// 3つの方向に射出、30フレーム間隔、45°おき、方向はこっちの位置-120～120で、30フレーム後にバースト、
// バーストではこっちの方向-30～30の方向になんか・・わからん！
function pattern8(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 30 === 0){
		const pivotDirection = getPlayerAimAngle(_cannon.position, 120);
		const ways = 3;
		const intervalAngle = 45;
		let loopCount = ways;
		_cannon.bulletDirection = pivotDirection - 0.5 * (ways - 1) * intervalAngle;
		while(loopCount-- > 0){
			_cannon.createBullet();
			_cannon.bulletDirection += intervalAngle;
		}
	}
}

// 7つの方向に射出、そのあと2WAYで分裂を3回くりかえしたのち直進
function pattern9(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 48 === 0){
		//ここで7つの方向に1発だけ弾を発射するみたい。32フレーム後に消滅する。
		// というかあのコードだとその場にとどめる？それが4フレームおきに8発？スピード6？
		// ある程度進む→2方向にスプリット→ある程度進む→2方向にスプリット・・
		// 最後は直進する弾
		// とりあえず真下で作ってみてそれから7方向にするとか。
		_cannon.bulletDirection += _cannon.bulletDirectionVelocity; /* 15 */ }
}

function pattern17(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle += -3;
	if(fc % 1 === 0){
		_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
		_cannon.createBullet();
	}
}

// ---------------------------------------------------------------------------------------- //
// bulletPattern.
// デフォルトは速度を加えるだけ。
/*
function defaultBulletPattern(_bullet){
	_bullet.position.add(_bullet.velocity);
}
*/

function bulletPattern1(_bullet){
	// 4つの方向にばーん
	_bullet.position.add(_bullet.velocity);
	if(_bullet.properFrameCount < 60){ return; }
	const ways = 4;
	const intervalAngle = 12;
	let direction = toDeg(_bullet.direction) - 0.5 * (ways - 1) * intervalAngle;
	let loopCount = ways;
	while(loopCount-- > 0){
		_bullet.parent.resumeBullet(_bullet.position, _bullet.speed, direction);
		direction += intervalAngle;
	}
	_bullet.vanishFlag = true;
}

function bulletPattern2(_bullet){
	// スピードを0.5ずつ増しつつ24発・・？intervalFramesが2だから2フレームおき。
	// limitCountを24に設定して、properが2で割り切れるときだけ弾丸を作り、・・んー。
	// 31で実行されてる・・・？vanishFlagがtrueなのに排除されずにここに来てるね。
	_bullet.position.add(_bullet.velocity);
	if(_bullet.properFrameCount < 30){ return; }
	if(_bullet.properFrameCount === 30){
		_bullet.burst = {count:24, interval:2, pattern:burst2, speed:5};
		_bullet.burst.speedChange = 0.5;
		_bullet.burst.direction = getPlayerAimAngle(_bullet.position, 30);
		_bullet.setPolar(0, _bullet.burst.direction);
	}
	if((_bullet.properFrameCount - 30) % _bullet.burst.interval === 0){
		_bullet.burst.pattern(_bullet);
		_bullet.burst.count--;
		if(_bullet.burst.count === 0){
			_bullet.vanishFlag = true;
			delete _bullet.burst;
    }
	}
	// burstの中でcountを減らして0になったらvanishFlag=true.
}

function bulletPattern3(_bullet){

}

// ---------------------------------------------------------------------------------------- //
// burst.
// burst = {count:24, interval:2, pattern:...}

function burst2(_bullet){
	_bullet.parent.resumeBullet(_bullet.position, _bullet.burst.speed, _bullet.burst.direction);
	_bullet.burst.speed += _bullet.burst.speedChange;
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

function toRad(degree){
	return degree * Math.PI / 180;
}

function toDeg(radian){
	return radian * 180 / Math.PI;
}

function getPlayerAimAngle(pos, margin = 0){
	// posは射出するユニットの位置(x:, y:)で、marginは振れ幅(Degree)、たとえば30とか120とか。
	// 返す角度はDegreeで与えられる。
  // margin=0ってのはピンポイントってことね。
  const aimAngle = atan2(wholeSystem.player.position.y - pos.y, wholeSystem.player.position.x - pos.x);
	return (aimAngle * 180 / Math.PI) - Math.random() * 2 * margin + margin;
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
// test.
// いろんなテスト。

// bulletがフラグ立ってるのにupdateを実行しちゃうとまずいからそこら辺のテスト
function ejectedBulletUpdated(_bullet){
	if(_bullet.vanishFlag){ console.log("ejected bullet updated!"); }
	return;
}

// bulletSystemがcheckしたあとに排除フラグの立っているbulletがあればエラーを返す感じ。
function ejectBulletFailed(_cannon){
	for(let i = 0; i < _cannon.bulletSet.length; i++){
		if(_cannon.bulletSet[i].vanishFlag){ console.log("eject bullet failed!"); break; }
	}
}
