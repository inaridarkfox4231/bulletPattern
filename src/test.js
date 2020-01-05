"use strict";

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

const INF = Infinity; // 長いので
const AREA_WIDTH = 480;
const AREA_HEIGHT = 600; // あとでCanvasSizeをこれよりおおきく・・もしくは横かもだけど。んー。
// 1列に・・これだと15だから、パターン60個できるね！（しないけど）

// update用の配列やめてもうそれぞれ別々の色配列の中でupdateとdrawやっちゃった方が速そう。
// で、removeも行う感じ。ポインタつなげて。すべて、一本。
// それとは別にオールクリアも用意する。

let isLoop = true;
let showInfo = true;

let updateTimeSum = 0;
let updateTimeAverage = 0;
let updateTimeMax = 0;
let ejectTimeSum = 0;
let ejectTimeAverage = 0;
let ejectTimeMax = 0;
let drawTimeSum = 0;
let drawTimeAverage = 0;
let drawTimeMax = 0;
let usingUnitMax = 0;
let timeTotalMax = 0;
const INDENT = 40;
const AVERAGE_CALC_SPAN = 10;
const TEXT_INTERVAL = 25;

let unitPool;
let entity;
let seedSet = {};
const DEFAULT_PATTERN_INDEX = 0;
const STAR_FACTOR = 2.618033988749895; // 1 + 2 * cos(36).
// cosとsinの0, 72, 144, 216, 288における値
const COS_PENTA = [1, 0.30901699437494745, -0.8090169943749473, -0.8090169943749473, 0.30901699437494745];
const SIN_PENTA = [0, 0.9510565162951535, 0.5877852522924732, -0.587785252292473, -0.9510565162951536];

//let testCannon;

function preload(){
  /* NOTHING */
}

function setup(){
  createCanvas(AREA_WIDTH + 160, AREA_HEIGHT);
  angleMode(DEGREES);
  textSize(16);
  //preparePattern(); // jsonからあれこれするみたい(?)
  unitPool = new ObjectPool(() => { return new Unit(); }, 1024);
  entity = new System();
  registUnitColors(); // 色を用意する。
  registUnitShapes(); // 形を用意する。

  // FALさんの1
  // 中心からばーっと乱射（タイル：濃い灰色）
  seedSet.seed0 = {
    colorName:"dkgray", shotColorName:"black", bgColor:"gray",
    x:0.5, y:0.5,
    action:{
      main:[{shotSpeed:["set", [3, 6]]}, {shotDirection:["set", [0, 360]]}, {fire:""},
            {loop:2, back:-1}, {wait:1}, {loop:INF, back:-1}]
    },
  };
  // FALさんの2
  // カミソリ。（タイル：濃い緑）
  seedSet.seed1 = {
    colorName:"dkgreen", shotColorName:"green", bgColor:"ltgreen", shotShapeName:"wedgeMiddle",
    x:0.5, y:0.5, shotSpeed:2,
    action:{
      main:[{shotDirection:["set", [0, 360]]}, {fire:"fire"}, {wait:60}, {loop:INF, back:-1}]
    },
    fireDef:{fire:{radial:{count:16}, nway:{count:7, interval:2}}}
  };
  // FALさんの3
  // ぐらーーっ。（タイル：赤）
  seedSet.seed2 = {
    colorName:"red", shotColorName:"orange", bgColor: "plorange",
    x:0.5, y:0.5, shotSpeed:2,
    action:{
      main:[{shotDirection:["add", 2]}, "attack", {shotDirection:["add", -2]}, "attack", {loop:INF, back:-1}]
    },
    short:{attack:[{fire:"radial16"}, {wait:4}, {loop:8, back:3}, {wait:16}]},
    fireDef:{radial16:{radial:{count:16}}}
  };

  // burstSweeping.(FALさんの4)
  // 回転しながら弾をばらまく。（タイル：青）
  // これでいいでしょ。角速度2πだから2秒で1周する。12°ずつ方向変化、速度は2.
  seedSet.seed3 = {
    x:0.5, y:0.5, shotSpeed:2*Math.PI, shotDirection:0, shotBehavior:["circle"],
    action:{
      main:[{shotAction:["set", "sweep"]}, {fire:"rad2"}, {wait:INF}],
      sweep:[{hide:true}, {shotSpeed:["set", 2]}, {shotDirection:["add", 12]}, {fire:""}, {wait:1}, {loop:INF, back:-2}]
    },
    fireDef:{rad2:{formation:{type:"points", p:[[120, 0]]}, bend:90, radial:{count:2}}},
    behaviorDef:{circle:["circular", {radius:120}]}
  };


  // FALさんの5
  // kindをcannonに指定すると複数のcannonを生成してそれぞれに挙動させることができる
  // （タイル：薄い緑）
  seedSet.seed4 = {
    bgColor:"plgreen",
    x:0.5, y:0.3, shotSpeed:96*PI/180, shotDirection:90,
    shotColorName:"plblue", shotShapeName:"squareMiddle",
    action:{
      main:[{shotColor:"green"},
            {shotAction:["set", "cannon1"]}, {shotBehavior:["add", "circle"]}, {fire:"setCannon1"},
            {shotBehavior:["clear"]}, {shotAction:["set", "cannon2"]}, {shotBehavior:["add", "circleInv"]},
            {fire:"setCannon2"}, {vanish:1}
           ],
      cannon1:[{shotColor:"dkgreen"}, {shotShape:"wedgeSmall"}, "cannonMain"],
      cannon2:[{shotColor:"dkgreen"}, {shotShape:"wedgeSmall"}, {wait:48}, "cannonMain"]
    },
    short:{cannonMain:[{shotSpeed:["set", 5]}, {aim:0}, {fire:"line7"}, {wait:4}, {loop:8, back:3},
                        {wait:64}, {loop:INF, back:5}]},
    fireDef:{setCannon1:{formation:{type:"points", p:[[48, 0]]}, bend:90, kind:"square"},
             setCannon2:{formation:{type:"points", p:[[48, 0]]}, bend:-90, kind:"square"},
             line7:{line:{count:7, upSpeed:0.3}}},
    behaviorDef:{circle:["circular", {radius:96, clockwise:true}],
                 circleInv:["circular", {radius:96, clockwise:false}]}
  };
  // FALさんの6.
  // margin120であらぬ方向に3wayを発射して(interval45°)速さ5で30フレーム進んでから
  // margin30でこっちに向かって・・んー。2フレームに1発、0.5ずつ速くしていって飛ばす感じ。(??)
  // タイル：紫
  seedSet.seed5 = {
    colorName:"purple", shotColorName:"red", bgColor:"plred",
    x:0.5, y:0.3, shotSpeed:5,
    action:{
      main:[{aim:120}, {shotAction:["set", "burst"]}, {fire:"way3"}, {wait:30}, {loop:INF, back:-1}],
      burst:[{wait:30}, {aim:10}, {shotAction:["set", "burst2"]}, {fire:"u"}, {vanish:1}],
      burst2:[{shotSpeed:["add", 0.5]}, {fire:""}, {wait:2}, {loop:24, back:3}, {vanish:1}]
    },
    fireDef:{way3:{nway:{count:3, interval:45}}}
  };

  // FALさんの7.(メソッドを用いてやり直し)
  // 出来たと思う。多分本家のあっちの方が速いね・・48→24にするとかしないと似ない気がする。まあいいけど。
  // タイル：水色
  seedSet.seed6 = {
    colorName:"dkskblue", shotColorName:"skblue", bgColor:"plskblue",
    x:0.5, y:0.3, shotSpeed:6, shotDirection:90,
    action:{main:[{shotAction:["set", "split2_0"]}, {fire:"radial7"}, {wait:4}, {loop:8, back:2},
                  {wait:48}, {shotDirection:["add", 15]}, {loop:INF, back:-2}],
            split2_0:[{shotAction:["set", "split2_1"]}, "split2"],
            split2_1:[{shotAction:["set", "split2_2"]}, "split2"],
            split2_2:[{shotAction:["set", "last"]}, "split2"],
            last:[{speed:["set", 3, 30]}, {wait:INF}]
           },
    short:{split2:[{speed:["set", 1, 30]}, {shotSpeed:["set", 6]}, {fire:"way2"}, {vanish:1}]},
    fireDef:{radial7:{radial:{count:7}}, way2:{nway:{count:2, interval:120}}}
  };

  // FALさんの8, 多分だけど円周上をぐるぐるまわる16個の砲台が
  // 6フレームおきに120°間隔で2way発射を4回を16フレームおきにやってる？
  // とりま、16発回らせてみますか。
  // できたかな？
  // タイル：黄色
  seedSet.seed7 = {
    bgColor:"plorange", shotColorName:"dkyellow",
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
  };

  // FALさんの9, これは16個の方向にとばしてそれに2wayさせてる、すぐに。
  // タイル：濃い赤
  seedSet.seed8 = {
    bgColor:"plred", colorName:"red", shotColorName:"dkred",
    x:0.5, y:0.5, shotSpeed:4,
    action:{
      main:[{shotAction:["set", "way2"]}, {shotDirection:["add", 11.5]},
            {fire:"radial16"}, {wait:120}, {loop:INF, back:-2}],
      way2:[{wait:15}, {shotSpeed:["set", 2]}, {fire:"way2"}, {wait:4}, {loop:8, back:2}, {wait:INF}]
    },
    fireDef:{radial16:{radial:{count:16}}, way2:{nway:{count:2, interval:120}}}
  };

  // FALさんの10, lineをターゲットホーミングでlineしている。
  // それっぽくなった。
  // setのところを30フレームかけて1にする処理にしたらそれっぽくなった。
  // スピードが1になった直後に流れていく感じ。
  // タイル：濃い紫
  seedSet.seed9 = {
    bgColor:"plblue", shotColorName:"dkpurple", colorName:"dkblue",
    x:0.5, y:0.3, shotSpeed:4,
    action:{
      main:[{shotAction:["set", "line12"]},
            {aim:0}, {shotDirection:["add", [-105, -45]]}, {fire:"line12"}, {wait:45},
            {aim:0}, {shotDirection:["add", [45, 105]]}, {fire:"line12"}, {wait:45}, {loop:INF, back:-2}],
      line12:[{speed:["set", 1, 30]}, {shotSpeed:["set", 4]}, {aim:0}, {fire:"line10"}, {vanish:1}]
    },
    fireDef:{line12:{line:{count:12, upSpeed:1}}, line10:{line:{count:10, upSpeed:0.5}}}
  };

  // FALさんの11. スパイラルは120フレームおき（回転方向チェンジ）、ラジアルは終端速度2と3が
  // 3つおきに入れ替わる形で1.5°ずつ, 1.5 * 6 = 9で40サイクル。これが90フレームおき。
  // できれば色も変えたいね
  // できたけど洗練させたいな。
  // set 3 30 set 2 30にしたら滑らかさが増した（気がする）
  // タイル：薄い赤
  seedSet.seed10 = {
    bgColor:"plred",
    x:0.5, y:0.25,
    action:{
      main:[{shotAction:["set", "spiral"]}, {fire:"u"}, {shotAction:["set", "radial"]}, {fire:"u"}, {vanish:1}],
      spiral:[{shotColor:"dkred"}, {hide:true}, {shotSpeed:["set", 1]}, {shotDirection:["set", 0]},
              {shotBehavior:["add", "spiral_1"]}, "rad_24", {shotBehavior:["clear"]},
              {shotBehavior:["add", "spiral_1_Inv"]}, "rad_24", {shotBehavior:["clear"]}, {loop:INF, back:-1}],
      radial:[{shotColor:"dkorange"}, {hide:true}, {shotSpeed:["set", 4]}, {shotDirection:["set", 0]},
              {shotAction:["set", "decel_3"]}, {fire:"u"}, {shotDirection:["add", 1.5]}, {loop:3, back:2},
              {shotAction:["set", "decel_2"]}, {fire:"u"}, {shotDirection:["add", 1.5]}, {loop:3, back:2},
              {loop:40, back:8}, {wait:90}, {loop:INF, back:-3}],
      decel_3:[{wait:60}, {speed:["set", 3, 30]}, {wait:INF}],
      decel_2:[{wait:60}, {speed:["set", 2, 30]}, {wait:INF}]
    },
    short:{rad_24:[{fire:"radial_24"}, {wait:6}, {loop:2, back:2}, {wait:120}]},
    fireDef:{radial_24:{radial:{count:24}}},
    behaviorDef:{
      spiral_1:["spiral", {radius:1, radiusIncrement:1}],
      spiral_1_Inv:["spiral", {radius:1, radiusIncrement:1, clockwise:false}],
    }
  };


  // FALさんの12
  // これ書いたら洗練させる作業に入るしpatternチェンジも実装したい。
  // set[1, 30]は30フレームかけて1にするとかそういう意味？
  // accellerateでterminalSpeed実装した.
  // delayってactionのwaitじゃん・・まあ、とにかく。
  // できました。いちいちwait:INFって書くのばかばかしいから、
  // actionの終わりに来たら自動的にスルーするように仕向けるか。
  // タイル：濃い水色
  seedSet.seed11 = {
    shotColorName:"dkskblue", colorName:"skblue",
    x:0.5, y:0.3, shotSpeed:8,
    action:{
      main:[{shotAction:["set", "sub"]}, {shotDirection:["set", [0, 360]]}, {fire:""}, {wait:90},
            {loop:INF, back:-2}],
      sub:[{speed:["set", 1, 30]}, {shotAction:["set", "trap"]},
           {shotSpeed:["set", 12]}, {aim:0}, {shotDirection:["add", [-30, 30]]}, {fire:""},
           {vanish:1}],
      trap:[{hide:true}, {shotSpeed:["set", 0.001]}, {shotAction:["set", "last"]},
            {shotDirection:["add", 20]}, {fire:""}, {wait:1}, {loop:INF, back:3}],
      last:[{wait:60}, {speed:["set", 2, 60]}]
    },
  }; // できた。wait:INFがなくてもエラー出ない。

  // FALさんの13. ベアリングからの・・機銃掃射？アーミーくさくなってきた感。
  // すげぇ。普通にradial_4でいけるんだ。
  // 360フレームで1周するように調整。
  seedSet.seed12 = {
    x:0.5, y:0.3, shotSpeed:2*PI/3, shotDirection:0, shotBehavior:["circ3"],
    action:{
      main:[{shotAction:["set", "barricade"]}, {fire:"radgun3"}, {wait:INF}],
      barricade:[{hide:true}, {shotSpeed:["set", 10]}, {fire:"rad4"}, {wait:1}, {loop:INF, back:2}]
    },
    fireDef:{
      radgun3:{formation:{type:"points", p:[[120, 0]]}, bend:90, radial:{count:3}},
      rad4:{radial:{count:4}}
    },
    behaviorDef:{circ3:["circular", {radius:120}]}
  };

  // FALさんの14をradialのshotDirDiffを使って書き直し。
  // めっちゃ短くなった。すげぇ。
  seedSet.seed13 = {
    x:0.5, y:0.3, shotSpeed:2*PI/3, shotDirection:0, shotBehavior:["circ"],
    action:{
      main:[{shotAction:["set", "way8"]}, {fire:"radgun32"}],
      way8:[{hide:true}, {shotAction:["set", "sub"]}, {shotSpeed:["set", 4]},
            {fire:"way8"}, {wait:240}, {loop:INF, back:2}],
      sub:[{speed:["set", 1, 30]}, {direction:["add", 210, 60]}, {speed:["set", 2, 60]}]
    },
    fireDef:{
      radgun32:{formation:{type:"points", p:[[80, 0]]}, bend:90, radial:{count:32, shotDirDiff:90}},
      way8:{nway:{count:8, interval:12}}
    },
    behaviorDef:{circ:["circular", {radius:80}]}
  };

  // FALさんの15.
  // 今のままだとway5を発射した時のshotDirectionをlineに設定できない。工夫が必要。
  // でもなぁ・・
  // だめでした。way5を撃った瞬間にすべてのbulletのshotDirectionがそろわないとだめ。んー。
  // way5で各々の弾丸のshotDirectionがaim-0で揃うようにしてみた。
  // これで合ってるだろ。nway発射時のaim-0と実際にl// 完全なaim-0にならないっていう、ただそれだけの話だよね。
  // どうでもいい話だけどaim-0してから5°ずらしてそのあとrelで戻すとdirectAimになる。
  seedSet.seed14 = {
    x:0.5, y:0.3,
    action:{
      main:[{shotAction:["set", "fire15"]},
            {shotSpeed:["set", [6, 11]]}, {shotDirection:["set", [45, 135]]}, {fire:""}, {wait:40},
            {shotSpeed:["set", [6, 11]]}, {shotDirection:["set", [225, 315]]}, {fire:""}, {wait:40},
            {loop:INF, back:-2}],
      fire15:[{shotAction:["set", "lineAim"]}, {speed:["set", 1, 30]}, {shotSpeed:["set", 8]}, {aim:5},
              {fire:"way5"}, {vanish:1}],
      lineAim:[{shotAction:["set", "last"]}, {speed:["set", 1, 45]}, {shotSpeed:["set", 1]},
               {fire:"line12"}, {vanish:1}],
      last:[{wait:30}, {speed:["add", 5, 60]}]
    },
    fireDef:{way5:{shotDirOption:["aim", 0], nway:{count:5, interval:30, shotDirDiff:0}},
             line12:{line:{count:12, upSpeed:0.5}}}
  };

  // FALさんの16.
  // burstはspeedが0になってかつ存在が消えて(hide),ばんばん撃ってvanishですね。
  // 違うね。間違えた。はぁ・・
  // ああ、最初んとこ180＋[90又は-90]だ。なるほどね。
  seedSet.seed15 = {
    x:0.5, y:0.3, shotSpeed:6,
    action:{
      main:[{shotDirection:["set", [90, 450, 180]]}, {shotDirection:["add", [-60, 60]]},
            {shotAction:["set", "burst1"]}, {fire:""},
            {shotAction:["set", "burst2"]}, {fire:""}, {wait:15}, {loop:INF, back:-1}],
      burst1:[{wait:30}, {aim:20}, "machinegun"],
      burst2:[{shotAction:["set", "last"]}, "machinegun"],
      last:[{wait:29}, {vanish:1}]
    },
    short:{machinegun:[{hide:true}, {speed:["set", 0]}, {fire:""}, {wait:3}, {loop:12, back:2}, {vanish:1}]}
  };;

  // FALさんの17. speedは60ディレイのあと0.0001から始まって120フレームで3にしている。
  // 90と270の位置に同時に発生させたbulletが螺旋を描きながら半径は多分1ずつの増加。
  // それを120フレーム間隔で右回り、左回り、と出している。
  // とりあえずshotSpeed2のradiusIncrement0.5で行ってみる。
  // ダメだ。やっぱdistance増やす感じじゃないとダメっぽい。えー・・
  // 気持ちは分かる。半径を1ずつ増加させてるんでしょ・・多分。
  seedSet.seed16 = {
    x:0.5, y:0.3, shotSpeed:4, shotDirection:90,
    action:{
      main:[{shotAction:["set", "scatter"]}, {shotBehavior:["add", "spir"]}, {fire:"rad2"},
            {wait:120}, {shotBehavior:["clear"]},
            {shotAction:["set", "scatterInv"]}, {shotBehavior:["add", "spirInv"]}, {fire:"rad2Inv"},
            {wait:120}, {shotBehavior:["clear"]},
            {loop:INF, back:-1}],
      scatter:[{shotAction:["set", "last"]}, {wait:30}, {shotDirection:["rel", -60]}, "scatter"],
      scatterInv:[{shotAction:["set", "last"]}, {wait:30}, {shotDirection:["rel", 60]}, "scatter"],
      last:[{wait:60}, {speed:["set", 3, 120]}]
    },
    short:{scatter:[{shotSpeed:["set", 0.0001]}, {fire:""}, {wait:4}, {loop:INF, back:-3}]},
    fireDef:{rad2:{formation:{type:"points", p:[[50, 0]]}, radial:{count:2}, bend:90},
             rad2Inv:{formation:{type:"points", p:[[50, 0]]}, radial:{count:2}, bend:-90}},
    behaviorDef:{spir:["spiral", {radius:50, radiusIncrement:1}],
                 spirInv:["spiral", {radius:50, radiusIncrement:1, clockwise:false}]}
  };


  // FALさんの11作ろう。
  // 手始めにスパイラル部分。
  seedSet.seed17 = {
    x:0.5, y:0.5, shotSpeed:1, shotDirection:0,
    action:{
      main:[{shotBehavior:["add", "spiral_1"]}, "rad_24", {shotBehavior:["clear"]},
            {shotBehavior:["add", "spiral_1_Inv"]}, "rad_24", {shotBehavior:["clear"]}, {loop:INF, back:-1}],
    },
      short:{rad_24:[{fire:"radial_24"}, {wait:6}, {loop:2, back:2}, {wait:120}]},
      fireDef:{radial_24:{radial:{count:24}}},
      behaviorDef:{
      spiral_1:["spiral", {radius:1, radiusIncrement:1}],
      spiral_1_Inv:["spiral", {radius:1, radiusIncrement:1, clockwise:false}]
    }
  };

  // 回転砲台
  seedSet.seed18 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90,
    colorName:"red", shotShapeName:"starSmall", shotColorName:"black",
    action:{main:[{shotDirection:["add", 5]}, {fire:""}, {wait:4}, {loop:INF, back:-1}]},
  };
  // 双回転砲台
  seedSet.seed19 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90, shotShapeName:"diaSmall",
    action:{main:[{shotDirection:["add", 5]}, {fire:""}, {shotDirection:["mirror", 90]}, {fire:""},
                  {wait:4}, {shotDirection:["mirror", 90]}, {loop:INF, back:-1}]},
  };
  // いったりきたりしながら下に向けて発射. ディレイをかけて。さらにアクセルをかけて。
  seedSet.seed20 = {
    x:0.2, y:0.2, speed:4, direction:0, shotSpeed:4, shotDirection:90, shotDelay:30, shotBehavior:["accell"],
    action:{main:[{fire:""}, {wait:4}, {loop:16, back:2}, {wait:16}, {direction:["mirror", 90]}, {loop:INF, back:-1}]},
    behaviorDef:{accell:["accellerate", {accelleration:0.2}]}
  };
  // 四角形に沿って移動（初めて作ったやつ）
  seedSet.seed21 = {
    x:0.2, y:0.2, speed:4, direction:0,
    action:{main:[{wait:50}, {direction:["add", 90]}, {loop:INF, back:-1}]}
  };
  // 簡単な分裂
  seedSet.seed22 = {
    x:0.5, y:0.1, shotSpeed:4, shotDirection:90,
    action:{main:[{shotAction:["set", "split2_0"]}, {fire:"way2"}, {wait:4}, {loop:INF, back:-2}],
            split2_0:[{shotAction:["set", "split2_1"]}, "split2"],
            split2_1:[{shotAction:["set", "split2_2"]}, "split2"],
            split2_2:["split2"]
           },
    short:{split2:[{wait:30}, {fire:"way2"}, {vanish:1}]},
    fireDef:{way2:{nway:{count:2, interval:30}}}
  };
  // FALさんの7.
  seedSet.seed23 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90,
    action:{main:[{shotAction:["set", "split2_0"]}, {fire:"radial7"}, {wait:4}, {loop:8, back:2},
                  {wait:32}, {shotDirection:["add", 15]}, {loop:INF, back:-2}],
            split2_0:[{shotAction:["set", "split2_1"]}, "split2"],
            split2_1:[{shotAction:["set", "split2_2"]}, "split2"],
            split2_2:["split2"]
           },
    short:{split2:[{wait:20}, {fire:"way2"}, {vanish:1}]},
    fireDef:{radial7:{radial:{count:7}}, way2:{nway:{count:2, interval:120}}}
  };

  // 失われたパターン1
  seedSet.seed24 = {
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
  };
  // lineのテスト(nwayと組み合わせる)
  // さらにホーミングマシンガンを組み合わせて逃げ場のない感じに。
  seedSet.seed25 = {
    x:0.5, y:0.5,
    action:{
      main:[{shotSpeed:["set",2]}, {aim:0}, {fire:"line3_8_6"}, {wait:4},
            {shotSpeed:["set", 5]}, {aim:10}, {fire:""}, {wait:4}, {loop:29,back:3}, {loop:INF,back:-1}]
      },
    fireDef:{line3_8_6:{nway:{count:7, interval:5}, radial:{count:8}, line:{count:6,upSpeed:0.3}}}
  };

  // shotDelayが新しくなったんで使ってみる.
  // 直線状に弾丸を配置していっせいにばーーーーーーーん！
  seedSet.seed26 = {
    x:0.5, y:0.2, shotSpeed:4,
    action:{
      main:[{aim:120}, {shotAction:["set", "sub1"]}, {fire:""}, {wait:30}, {loop:INF, back:-1}],
      sub1:[{wait:30}, {aim:10}, {shotAction:["set", "trap"]}, {fire:""}, {vanish:1}],
      trap:[{shotDelay:["set", 120]}, {shotDelay:["add", -3]}, {shotDirection:["add", 15]}, {fire:""}, {wait:3}, {loop:40, back:4}, {vanish:1}]
    },
  };
  // homingBehaviorが新しくなったので試してみる.
  // radial12と組み合わせる感じで。
  seedSet.seed27 = {
    x:0.5, y:0.3, shotSpeed:6, shotBehavior:["decele"],
    action:{
      main:[{shotDirection:["set", [0, 360]]}, {shotAction:["set", "delayHom"]},
            {fire:"radial12"}, {wait:30}, {loop:INF, back:4}],
      delayHom:[{wait:60}, {behavior:["add", "hom1"]}, {wait:INF}]
    },
    fireDef:{radial12:{radial:{count:12}}},
    behaviorDef:{decele:["decelerate", {terminalSpeed:1, friction:0.05}],
                 hom1:["homing", {rotationSpeed:2, threshold:120}]}
  };



  // 速度反転のテスト.
  // 上向きにぽーんと出た弾丸が逆方向に落ちてくるイメージ。まあどうでもいい・・。
  // 描画の所でspeedが負の時に逆向きに描画するようにしてみた。とりあえず応急処置って感じで。
  // 実際の所加速度ってベクトルだからね・・スカラーで扱うのはどうしたって無理がある。
  // 加速だって本来はベクトルの足し算をやっているので・・そしてそれは座標ベースでないとしっくりこない。
  // 今って完全に極座標ベースでやってるでしょ、それってベクトルの足し算と相性最悪だからどうしようもないんよ。
  // ------- でも、極座標ベースの可能性を信じたい。もちろん、ね。 ------- //
  seedSet.seed28 = {
    x:0.5, y:0.5, shotSpeed:4, shotDirection:-90, shotBehavior:["accell"],
    action:{
      main:[{fire:""}, {wait:30}, {loop:INF, back:2}]
    },
    behaviorDef:{accell:["accellerate", {accelleration:-0.1}]}
  };

  // decelerationBehaviorを一定の割合で減らせるように新しくした.
  // さらに・・これやばいね。。
  seedSet.seed29 = {
    x:0.5, y:0.3, shotSpeed:4, shotDirection:90,
    action:{
      main:[{aim:0}, {shotBehavior:["add", "decel_3"]}, {fire:"burst"}, {shotDirection:["add", 4.5]},
            {shotBehavior:["clear"]}, {shotBehavior:["add", "decel_2"]}, {fire:"burst"}, {shotBehavior:["clear"]},
            {shotDirection:["add", -60]}, {fire:""}, {shotDirection:["add", 8]}, {wait:2}, {loop:15, back:3},
            {wait:15}, {fire:""}, {shotDirection:["add", -8]}, {wait:2}, {loop:15, back:3}, {wait:15},
            {shotBehavior:["clear"]}, {loop:INF, back:-1}]
    },
    fireDef:{burst:{radial:{count:40}, nway:{count:3, interval:1.5}}},
    behaviorDef:{
      decel_2:["decelerate", {deceleration:0.05, terminalSpeed:2}],
      decel_3:["decelerate", {deceleration:0.05, terminalSpeed:3}]
    }
  };

  // FALさんの14やりたいけど準備が足りないかも。
  // waitの変種でsetとadd使うやつ・・んー。引数が2つ以上で配列でない時そういう処理にしてもいいかな・・
  // って気がする。そうしたいね。どうしようね。先にそっち？
  // 周囲80πx2で160πだから240で割って・・240フレームで1周するように調整。
  // これ、順繰りにshotDirectionが90°ずつずれてる・・・・どうしよ。異なるわけね。まあでも・・んー。
  // 仕方ないので8個ずつまとめてそれぞれ90°ずつ射出方向を変える荒業で解決しました。でも、
  // なげぇ・・actionも変数導入して・・もうちょっとパースの所を洗練させないとだめだこりゃ。
  // たとえばsubの命令、これあそこをあれにすれば4つでいける。
  // actionは変数導入すれば1行で済むし。
  // もしくは・・今、撃ちだしたあれのshotSpeedやshotDirectionが追従で決まってるからそこをいじるとか。
  seedSet.seed30 = {
    x:0.5, y:0.3, shotSpeed:2*PI/3, shotDirection:0, shotBehavior:["circ"],
    action:{
      main:[{shotAction:["set", "way8_1"]}, "revolveFire",
            {shotAction:["set", "way8_2"]}, "revolveFire",
            {shotAction:["set", "way8_3"]}, "revolveFire",
            {shotAction:["set", "way8_4"]}, "revolveFire", {wait:INF}],
      way8_1:[{shotDirection:["add", 0]}, "way8routine"],
      way8_2:[{shotDirection:["add", 90]}, "way8routine"],
      way8_3:[{shotDirection:["add", 180]}, "way8routine"],
      way8_4:[{shotDirection:["add", 270]}, "way8routine"],
      sub:[{speed:["set", 1, 30]}, {direction:["add", 210, 60]}, {speed:["set", 2, 60]}]
    },
    short:{way8routine:[{hide:true}, {shotAction:["set", "sub"]}, {shotSpeed:["set", 4]},
                        {fire:"way8"}, {wait:240}, {loop:INF, back:2}],
           revolveFire:[{shotDirection:["add", 22.5]}, {fire:"radgun8"}]
    },
    fireDef:{
      radgun8:{formation:{type:"points", p:[[80, 0]]}, bend:90, radial:{count:8}},
      way8:{nway:{count:8, interval:12}}
    },
    behaviorDef:{circ:["circular", {radius:80}]}
  };
  // できたよー
  // 最後の所は多分、30フレームで1にしたあと60フレームで回転させて最後に60フレームで2に加速して直進させてる。

  // 新しいset,addメソッドのテスト。
  seedSet.seed31 = {
    x:0, y:0.2, speed:4, direction:0, shotDirection:90, shotSpeed:10,
    action:{
      main:[{shotAction:["set", "dec1"]},
            {fire:""}, {wait:3}, {loop:30, back:2},
            {wait:30}, // やめなさい
            {direction:["mirror", 90]}, {loop:INF, back:-2}],
      dec1:[{speed:["set", 1, 30]}, {wait:INF}]
    }
  };

  // あとは自由に。
  // ばらまき大作戦
  seedSet.seed32 = {
    x:0.5, y:0.3, shotSpeed:2,
    action:{
      main:[{shotAction:["set", "way4"]},
            {shotDirection:["add", 16]}, {fire:"rad5"}, {wait:8}, {loop:16, back:3}, {wait:32},
            {aim:10}, {fire:""}, {wait:4}, {loop:8, back:3}, {wait:16},
            {shotDirection:["add", -16]}, {fire:"rad5"}, {wait:8}, {loop:16, back:3}, {wait:32},
            {aim:10}, {fire:""}, {wait:4}, {loop:8, back:3}, {wait:16},
            {loop:INF, back:-2}],
      way4:[{wait:60}, {fire:"way4"}, {vanish:1}]
    },
    fireDef:{rad5:{radial:{count:5}}, way4:{nway:{count:4, interval:12}}}
  };
  // 花火みたいなやつ。2wayばらまきまくって最後にどかーん！
  // followをtrueにして常にshotDirectionがdirectionと一致するようにしようね。
  // followプロパティ追加。これは毎フレームshotDirectionをdirectionで更新するもの。
  // behaviorの直後に行うのでfire直前のshotDirectionの変化には影響されない。
  seedSet.seed33 = {
    x:0.5, y:0.2, shotSpeed:2,
    action:{
      main:[{shotDirection:["set", [-45, 45]]}, {shotAction:["set", "right"]}, {fire:""}, {wait:4}, {loop:4, back:2},
						{wait:32},
            {shotDirection:["set", [135, 225]]}, {shotAction:["set", "left"]}, {fire:""}, {wait:4}, {loop:4, back:2},
						{wait:32},
            {loop:INF, back:-1}],
      right:[{shotSpeed:["set", 4]}, {follow:true}, {direction:["add", 1.5]},
             "way2Rail", "bomb"],
      left:[{shotSpeed:["set", 4]}, {follow:true}, {direction:["add", -1.5]},
            "way2Rail", "bomb"],
      fade:[{speed:["set", 2, 120]}]
    },
    short:{
      way2Rail:[{wait:2}, {loop:16, back:2}, {fire:"way2"}, {loop:8, back:4}],
      bomb:[{shotAction:["set", "fade"]}, {aim:10}, {fire:"rad24"}, {vanish:1}]
    },
    fireDef:{way2:{nway:{count:2, interval:60}}, rad24:{radial:{count:24}}}
  }
  // SnowFrake.
  // 色で遊んでみたりして。いぇい。
  seedSet.seed34 = {
		x:0.5, y:0.5, shotSpeed:2, shotDirection:90, shotColorName:"skblue",
		action:{
			main:[{hide:true}, {shotAction:["set", "lim120"]}, {fire:"rad6"}, {wait:8}, {loop:INF, back:2}],
			lim120:[{shotColor:"blue"}, {wait:20}, "branch12",
              {shotColor:"dkblue"}, {wait:24}, {shotAction:["set", "lim40"]}, {fire:"way2"},
              {shotColor:"plblue"}, {wait:36}, {shotAction:["set", "lim24"]}, {fire:"way2"},
              {wait:20}, "branch12", {wait:20}, {vanish:1}],
			lim40:[{shotColor:"red"}, {wait:20}, "branch12", {wait:20}, {vanish:1}],
			lim24:[{wait:24}, {vanish:1}],
			lim12:[{wait:12}, {vanish:1}]
		},
		short:{branch12:[{shotAction:["set", "lim12"]}, {fire:"way2"}]},
		fireDef:{rad6:{radial:{count:6}}, way2:{nway:{count:2, interval:120}}}
	}

	// sevenStar.
	seedSet.seed35 = {
		x:0.5, y:0.3, shotSpeed:6, shotBehavior:["sevenStar"],
    shotShapeName: "starSmall", shotColorName:"orange",
		action:{
			main:[{hide:true}, {fire:""}, {wait:4}, {loop:100, back:2}, {vanish:1}]
		},
		behaviorDef:{sevenStar:["curve", {a:2, b:-4, c:7}]}
	}

  // ながれぼし
  // frontVerticalで5つの場所に配置したユニットが左下方に星型の弾丸を発射してそれが
  // 後ろ方向に小さめの弾丸を発射しながら落ちていくイメージ。方向はすこしずつブレさせる。
  seedSet.seed36 = {
    bgColor:"dkgray", infoColor:{r:255, g:255, b:255},
    x:0.7, y:0, shotDirection:90,
    action:{
      main:[{shotAction:["set", "generator"]}, {fire:"v5"}, {vanish:1}],
      generator:[{hide:true},
                 {shotAction:["set", "shootingStar"]}, {shotShape:"starMiddle"}, {shotColor:"yellow"},
                 {shotSpeed:["set", 2]}, {shotDirection:["set", [110, 140]]}, {fire:""},
                 {wait:30}, {loop:INF, back:3}],
      shootingStar:[{follow:true},
                    {shotAction:["set", "spur"]}, {shotShape:"wedgeMiddle"}, {shotColor:"yellow"},
                    {direction:["add", [-1, 1]]}, {shotSpeed:["set", 6]}, {shotDirection:["add", 180]}, {fire:""},
                    {wait:2}, {loop:INF, back:5}],
      spur:[{shotSpeed:["set", 0, 10]}, {vanish:1}]
    },
    fireDef:{v5:{formation:{type:"frontVertical", count:5, distance:40, interval:120}}}
  }

  // どうする？？
  entity.setPattern(DEFAULT_PATTERN_INDEX);
}

function draw(){
  background(entity.backgroundColor);

	const updateStart = performance.now();
  entity.update(); // 更新
  const updateEnd = performance.now();

  const ejectStart = performance.now();
  entity.eject(); // 排除
  const ejectEnd = performance.now();

	const drawStart = performance.now(); // 時間表示。
  entity.draw(); // 描画
  const drawEnd = performance.now();

	if(showInfo){ showPerformanceInfo(updateEnd - updateStart, ejectEnd - ejectStart, drawEnd - drawStart); }
  drawConfig();
}

// ---------------------------------------------------------------------------------------- //
// PerformanceInfomation.

function showPerformanceInfo(updateTime, ejectTime, drawTime){
  let y = 0; // こうすれば新しいデータを挿入しやすくなる。指定しちゃうといろいろとね・・
  // ほんとは紐付けとかしないといけないんだろうけど。
	fill(entity.infoColor);
  y += TEXT_INTERVAL;
  displayInteger(entity.getCapacity(), INDENT, y, "using");

  y += TEXT_INTERVAL;
  displayRealNumber(updateTime, INDENT, y, "updateTime");

  //if(updateTimeMax < updateTime){ updateTimeMax = updateTime; }
  updateTimeSum += updateTime;
  if(frameCount % AVERAGE_CALC_SPAN === 0){
		updateTimeAverage = updateTimeSum / AVERAGE_CALC_SPAN;
		updateTimeSum = 0;
	}
  y += TEXT_INTERVAL;
  displayRealNumber(updateTimeAverage, INDENT, y, "updateTimeAverage");
  if(updateTimeMax < updateTime){ updateTimeMax = updateTime; }
  y += TEXT_INTERVAL;
  displayRealNumber(updateTimeMax, INDENT, y, "updateTimeMax");

  y += TEXT_INTERVAL * 2;
  displayRealNumber(ejectTime, INDENT, y, "ejectTime");

  ejectTimeSum += ejectTime;
	if(frameCount % AVERAGE_CALC_SPAN === 0){
		ejectTimeAverage = ejectTimeSum / AVERAGE_CALC_SPAN;
		ejectTimeSum = 0;
	}
  y += TEXT_INTERVAL;
  displayRealNumber(ejectTimeAverage, INDENT, y, "ejectTimeAverage");
  if(ejectTimeMax < ejectTime){ ejectTimeMax = ejectTime; }
  y += TEXT_INTERVAL;
  displayRealNumber(ejectTimeMax, INDENT, y, "ejectTimeMax");

  y += TEXT_INTERVAL * 2;
  displayRealNumber(drawTime, INDENT, y, "drawTime");

	drawTimeSum += drawTime;
	if(frameCount % AVERAGE_CALC_SPAN === 0){
		drawTimeAverage = drawTimeSum / AVERAGE_CALC_SPAN;
		drawTimeSum = 0;
	}
  y += TEXT_INTERVAL;
  displayRealNumber(drawTimeAverage, INDENT, y, "drawTimeAverage");
  if(drawTimeMax < drawTime){ drawTimeMax = drawTime; }
  y += TEXT_INTERVAL;
  displayRealNumber(drawTimeMax, INDENT, y, "drawTimeMax");

  if(timeTotalMax < updateTime + ejectTime + drawTime){ timeTotalMax = updateTime + ejectTime + drawTime; }
  y += TEXT_INTERVAL;
  displayRealNumber(timeTotalMax, INDENT, y, "timeTotalMax");
  y += TEXT_INTERVAL;
  displayRealNumber(updateTimeAverage + ejectTimeAverage + drawTimeAverage, INDENT, y, "totalTimeAverage");

  if(usingUnitMax < entity.getCapacity()){ usingUnitMax = entity.getCapacity(); }
  y += TEXT_INTERVAL * 2;
  displayInteger(usingUnitMax, INDENT, y, "usingUnitMax");

  // 色について内訳表示
  y += TEXT_INTERVAL * 2;
  Object.keys(entity.drawGroup).forEach((colorName) => {
    displayInteger(entity.drawGroup[colorName].length, INDENT, y, colorName);
    y += TEXT_INTERVAL;
  })
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
// ClickAction.

function mouseClicked(){
  if(!isLoop){ return; } // ループが止まってる時は受け付けない感じ。
  if(mouseX < AREA_WIDTH || mouseX > width){ return; }
  if(mouseY < 0 || mouseY > AREA_HEIGHT){ return; }
  const x = Math.floor((mouseX - AREA_WIDTH) / 40);
  const y = Math.floor(mouseY / 40);
  const nextPatternIndex = y + (Math.floor(AREA_HEIGHT / 40) * x);
  entity.setPattern(nextPatternIndex);
}

function drawConfig(){
  fill(220);
  rect(AREA_WIDTH, 0, 160, AREA_HEIGHT);
  fill(120)
  rect(AREA_WIDTH, 0, 40, 40);
  fill(180);
  rect(AREA_WIDTH, 40, 40, 40);
}

// ---------------------------------------------------------------------------------------- //
// registUnitColors.

function registUnitColors(){
  entity.registColor("black", color(0))
        .registColor("blue", color(63, 72, 204))
        .registColor("dkblue", color(35, 43, 131))
        .registColor("skblue", color(0, 128, 255))
        .registColor("dkskblue", color(0, 107, 153))
        .registColor("plskblue", color(159, 226, 255))
        .registColor("plblue", color(125, 133, 221))
        .registColor("red", color(237, 28, 36))
        .registColor("plred", color(247, 153, 157))
        .registColor("dkred", color(146, 12, 18))
        .registColor("yellow", color(255, 242, 0))
        .registColor("dkyellow", color(142, 135, 0))
        .registColor("dkgreen", color(17, 91, 39))
        .registColor("green", color(34, 177, 76))
        .registColor("plgreen", color(108, 227, 145))
        .registColor("brown", color(128, 64, 0))
        .registColor("purple", color(163, 73, 164))
        .registColor("dkpurple", color(95, 41, 95))
        .registColor("plorange", color(255, 179, 128))
        .registColor("orange", color(255, 127, 39))
        .registColor("dkorange", color(180, 70, 0))
        .registColor("gold", color(128, 128, 0))
        .registColor("dkgray", color(64))
        .registColor("gray", color(128))
        .registColor("ltgreen", color(181, 230, 29));
}

// ---------------------------------------------------------------------------------------- //
// registUnitShapes.

function registUnitShapes(){
  entity.registShape("wedgeSmall", new DrawWedgeShape(6, 3))
        .registShape("wedgeMiddle", new DrawWedgeShape(9, 4.5))
        .registShape("wedgeLarge", new DrawWedgeShape(12, 6))
        .registShape("wedgeHuge", new DrawWedgeShape(24, 12))
        .registShape("squareSmall", new DrawSquareShape(10))
        .registShape("squareMiddle", new DrawSquareShape(20))
        .registShape("squareLarge", new DrawSquareShape(30))
        .registShape("squareHuge", new DrawSquareShape(60))
        .registShape("starSmall", new DrawStarShape(3))
        .registShape("starMiddle", new DrawStarShape(6))
        .registShape("starLarge", new DrawStarShape(12))
        .registShape("starHuge", new DrawStarShape(24))
        .registShape("diaSmall", new DrawDiaShape(8));
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
    this.unitArray = new CrossReferenceArray();
    this.backgroundColor = color(220, 220, 255); // デフォルト（薄い青）
    this.infoColor = color(0); // デフォルト（情報表示の色、黒）
    this.drawColor = {}; // 色の辞書
    this.drawShape = {}; // 形を表現する関数の辞書
    this.drawGroup = {}; // 描画用に用意されたCrossReferenceArrayからなるオブジェクト
    // になるみたいな、それを外部関数でやる。
    // this.drawGroup = {}; hasOwnでたとえばblueがないなってなったらnew CrossReferenceArray()して放り込むとか。
    // で、そこにも登録し、vanishのときにそこからはじく、パターンチェンジの際にもこれらの内容を破棄する。
    // 破棄するときはunitをPoolに戻すのはやってるから単にclearでいい。unitArrayをclearしちゃうとPoolに戻らないので駄目。
    this.patternIndex = 0;
	}
  setPattern(newPatternIndex){
    // パターンを作る部分をメソッド化
    if(seedSet["seed" + newPatternIndex] === undefined){ return; } // 存在しない時。
    let seed = seedSet["seed" + newPatternIndex];
    // 背景色
    if(seed.hasOwnProperty("bgColor")){
      this.backgroundColor = this.drawColor[seed.bgColor];
    }else{
      this.backgroundColor = color(220, 220, 255);
    }
    // 情報表示の色
    if(seed.hasOwnProperty("infoColor")){
      this.infoColor = color(seed.infoColor.r, seed.infoColor.g, seed.infoColor.b);
    }else{
      this.infoColor = color(0);
    }
    this.patternIndex = newPatternIndex;
    this.initialize();
    let ptn = parsePatternSeed(seed);
    console.log(ptn);
    createUnit(ptn);
  }
  registDrawGroup(unit){
    const {colorName} = unit;
    if(!this.drawGroup.hasOwnProperty(colorName)){
      this.drawGroup[colorName] = new CrossReferenceArray();
    }
    this.drawGroup[colorName].add(unit);
  }
	initialize(){
		this.player.initialize();
    this.unitArray.loopReverse("vanish"); // unitすべて戻す
    this.drawGroup = {};
    usingUnitMax = 0; // 毎回初期化する
    // 各種情報
    updateTimeMax = 0;
    drawTimeMax = 0;
    ejectTimeMax = 0;
    timeTotalMax = 0;
	}
  registColor(name, _color){
    this.drawColor[name] = _color;
    return this; // こういうのはメソッドチェーンで書くといい
  }
  registShape(name, _shape){
    this.drawShape[name] = _shape;
    return this; // メソッドチェーン
  }
	update(){
		this.player.update();
    this.unitArray.loop("update");
	}
  eject(){
    this.unitArray.loopReverse("eject");
  }
	draw(){
		this.player.draw();
    Object.keys(this.drawGroup).forEach((colorName) => {
      fill(this.drawColor[colorName]);
      this.drawGroup[colorName].loop("draw"); // 色別に描画
    })
	}
  getCapacity(){
    return this.unitArray.length;
  }
}

// ここをpattern1本にして、shape, colorプロパティを用意して文字列データ入れておいて、
// shapeに従ってunitのshapeプロパティを設定して(クラス)、colorに従って以下略。
// shapeの方はさっそくsetを呼び出してdrawParamに必要なら入れる、これはvanishで初期化してなくす、
function createUnit(pattern){
  let newUnit = unitPool.use();
  newUnit.initialize();
  newUnit.setPattern(pattern);
  entity.unitArray.add(newUnit);
  entity.registDrawGroup(newUnit);
  // 色、形についてはsetPatternで行う感じ。
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
    // 色、形. デフォルトはこんな感じ。
    this.shapeName = "squareMiddle";
    this.colorName = "plblue";
    this.shotShapeName = "wedgeSmall";
    this.shotColorName = "blue";
    this.drawModule = undefined; // 描画用クラス
    this.drawParam = {}; // 描画用付加データは毎回初期化する
    // その他の挙動を制御する固有のプロパティ
    this.properFrameCount = 0;
    this.vanishFlag = false; // trueなら、消す。
    this.hide = false; // 隠したいとき // appearでも作る？disappearとか。それも面白そうね。ステルス？・・・
    this.follow = false; // behaviorの直後、actionの直前のタイミングでshotDirectionをdirectionで更新する。
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
    const moveProperties = ["speed", "direction", "delay", "shotSpeed", "shotDirection", "shotDelay"];
    moveProperties.forEach((name) => {
      if(ptn[name] !== undefined){ this[name] = ptn[name]; } // 確定は済んでる
    })

    const figureProperties = ["colorName", "shotColorName", "shapeName", "shotShapeName"]
    figureProperties.forEach((name) => {
      if(ptn[name] !== undefined){ this[name] = ptn[name]; } // 文字列
    })

    // drawModuleの設定とセッティング
    this.drawModule = entity.drawShape[this.shapeName]; // drawShapeにクラスが入ってる
    this.drawModule.set(this);

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
    // 複数ある場合っての今回出て来てるので・・うん。うしろから。
    // とにかくね、remove関連は後ろからなのよ・・でないとやっぱバグるのよね。
    for(let i = this.belongingArrayList.length - 1; i >= 0; i--){
      this.belongingArrayList[i].remove(this);
    }
    if(this.belongingArrayList.length > 0){ console.log("REMOVE ERROR!"); noLoop(); } // 排除ミス

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
    // followがtrueの場合はshotDirectionをいじる
    if(this.follow){ this.shotDirection = this.direction; }
    // アクションの実行（処理が終了しているときは
    if(this.action.length > 0 && this.actionIndex < this.action.length){
      let debug = 0; // デバッグモード
      let continueFlag = true;
      while(continueFlag){
        const command = this.action[this.actionIndex];
        continueFlag = execute(this, command); // flagがfalseを返すときに抜ける
        debug++; // デバッグモード
        if(debug > 1000){
          console.log("INFINITE LOOP ERROR!!");
          console.log(command, this.actionIndex);
          noLoop(); break; } // デバッグモード
        // actionの終わりに来たら勝手に抜ける。その後は永久にwaitになる（予定）
        if(this.actionIndex === this.action.length){ break; }
      }
    }
    // カウントの進行
    this.properFrameCount++;
  }
  getLoopCount(){
    // ループ内で何かしら処理するときに使う。基本0, 1, 2, ..., limit-1の値が使われる。
    // カウントを増やす前に使われるってこと。
    // 必要なら0を追加する処理はこっちにも書く（使われない場合もあるけどね）
    if(this.loopCounterIndex === this.loopCounter.length){ this.loopCounter.push(0); }
    return this.loopCounter[this.loopCounterIndex];
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
    // countプロパティを持つコマンドは滞留コマンド(stay)と呼ばれる。（名前つけたかっただけ）
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
    this.drawModule.draw(this);
  }
}

// ---------------------------------------------------------------------------------------- //
// drawFunction. bullet, cannon用の描画関数.
// もっと形増やしたい。剣とか槍とか手裏剣とか。3つ4つの三角形や四角形がくるくるしてるのとか面白いかも。
// で、色とは別にすれば描画の負担が減るばかりかさらにバリエーションが増えて一石二鳥。
// サイズはsmall, middle, large, hugeの4種類。

class DrawShape{
  constructor(){}
  set(unit){ /* drawParamに描画用のプロパティを準備 */}
  draw(unit){ /* 形の描画関数 */ }
}

// drawWedge
// 三角形。(6, 3), (9, 4.5), (12, 6), (24, 12).
// 三角形の高さの中心に(x, y)で高さの半分が6で底辺の長さの半分が3にあたる。
class DrawWedgeShape extends DrawShape{
  constructor(h, b){
    super();
    this.heightLengthHalf = h; // 6
    this.baseLengthHalf = b; // 3
  }
  set(unit){ return; }
  draw(unit){
    const {x, y} = unit.position;
    const direction = (unit.speed > 0 ? unit.direction : unit.direction + 180);
    const dx = cos(direction);
    const dy = sin(direction);
    const {heightLengthHalf:h, baseLengthHalf:b} = this;
    triangle(x + h * dx,          y + h * dy,
             x - h * dx + b * dy, y - h * dy - b * dx,
             x - h * dx - b * dy, y - h * dy + b * dx);
  }
}

// drawSquare.
// 回転する四角形。10, 20, 30, 60.
class DrawSquareShape extends DrawShape{
  constructor(size){
    super();
    this.size = size;
  }
  set(unit){
    unit.drawParam = {rotationAngle:0, rotationSpeed:2};
  }
  draw(unit){
    const {x, y} = unit.position;
    const c = cos(unit.drawParam.rotationAngle) * this.size;
    const s = sin(unit.drawParam.rotationAngle) * this.size;
    quad(x + c, y + s, x - s, y + c, x - c, y - s, x + s, y - c);
    unit.drawParam.rotationAngle += unit.drawParam.rotationSpeed;
  }
}

// drawStar. 回転する星型。
// 3, 6, 12, 24.
// 三角形と鋭角四角形を組み合わせてさらに加法定理も駆使したらクソ速くなった。すげー。
class DrawStarShape extends DrawShape{
  constructor(size){
    super();
    this.size = size;
  }
  set(unit){
    unit.drawParam = {rotationAngle:0, rotationSpeed:2};
  }
  draw(unit){
    const {x, y} = unit.position;
    const r = this.size;
    const direction = unit.drawParam.rotationAngle;
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
    unit.drawParam.rotationAngle += unit.drawParam.rotationSpeed;
  }
}

// いわゆるダイヤ型。8, 12, 16, 32.
class DrawDiaShape extends DrawShape{
  constructor(size){
    super();
    this.size = size;
  }
  set(unit){}
  draw(unit){
    const {x, y} = unit.position;
    const {direction} = unit;
    const c = cos(direction);
    const s = sin(direction);
    const r = this.size;
    quad(x + r * c, y + r * s, x + 0.5 * r * s, y - 0.5 * r * c,
         x - r * c, y - r * s, x - 0.5 * r * s, y + 0.5 * r * c);
  }
}

// 長方形（指向性のある）
class DrawRectShape extends DrawShape{
  constructor(size){
    super();
    this.size = size;
  }
  set(unit){}
  draw(unit){
    // unit.directionの方向に長い長方形
  }
}

// 剣みたいなやつ。
// 先端とunit.positionとの距離を指定してコンストラクトする。剣先からなんか出す場合の参考にする。

// レーザーは撃ちだし元との間に直線を引くのでそこら辺の処理とかも重要（posデータを渡す）

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
    // 複数のCRArrayが存在する場合に備えての仕様変更
    if(!element.hasOwnProperty("belongingArrayList")){
      element.belongingArrayList = [];
    }
    element.belongingArrayList.push(this); // 所属配列への参照
  }
  addMulti(elementArray){
    // 複数の場合
    elementArray.forEach((element) => { this.add(element); })
  }
  remove(element){
    // 先にbelongingArrayListから排除する
    let belongingArrayIndex = element.belongingArrayList.indexOf(this, 0);
    element.belongingArrayList.splice(belongingArrayIndex, 1);
    // elementを配列から排除する
    let index = this.indexOf(element, 0);
    this.splice(index, 1);
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
function frameOutBehavior(unit){
  const {x, y} = unit.position;
  if(x < -AREA_WIDTH * 0.2 || x > AREA_WIDTH * 1.2 || y < -AREA_HEIGHT * 0.2 || y > AREA_HEIGHT * 1.2){ unit.vanishFlag = true; }
}

// 速度の方向に進む
function goBehavior(unit){
  unit.position.add(unit.velocity);
}

// 加速
// accelleration
// terminalSpeed用意しますね.(デフォはINF)
function accellerateBehavior(param){
  if(!param.hasOwnProperty("terminalSpeed")){ param.terminalSpeed = INF; }
  return (unit) => {
    if(unit.speed < param.terminalSpeed){
      unit.speed += param.accelleration;
    }
    unit.velocityUpdate();
  }
}

// 一定時間減速
// friction, deceleration, terminalSpeed.
// frictionがある場合は掛け算、decelerationがある場合はその値で減速する。
function decelerateBehavior(param){
  return (unit) => {
    if(unit.speed > param.terminalSpeed){
      if(param.hasOwnProperty("friction")){
        unit.speed *= (1 - param.friction);
      }else{
        unit.speed -= param.deceleration;
      }
      unit.velocityUpdate();
    }
  }
}

// 一定時間減速したのち加速
// threshold, friction, accelleration
function brakeAccellBehavior(param){
  return (unit) => {
    if(unit.properFrameCount < param.threshold){
      unit.speed *= (1 - param.friction);
    }else{
      unit.speed += param.accelleration;
    }
    unit.velocityUpdate();
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
// 多彩な曲線
function curveBehavior(param){
	return (unit) => {
		unit.direction += param.a + param.b * cos(param.c * unit.properFrameCount);
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
      const shotDirDiff = (param.hasOwnProperty("shotDirDiff") ? param.shotDirDiff : param.interval);
      const shotSpeedDiff = (param.hasOwnProperty("shotSpeedDiff") ? param.shotSpeedDiff : 0);
      const diffAngle = (i - (param.count - 1) / 2) * param.interval;
      let obj = {};
      Object.assign(obj, ptn);
      const {x, y, direction, shotSpeed, shotDirection} = ptn;
      //let newPtn = {speed:ptn.speed};
      obj.x = x * cos(diffAngle) - y * sin(diffAngle);
      obj.y = y * cos(diffAngle) + x * sin(diffAngle);
      obj.direction = direction + diffAngle;
      // shotDirection, shotSpeedについて（デフォは追従）
      obj.shotDirection = shotDirection + (i - (param.count - 1) / 2) * shotDirDiff;
      obj.shotSpeed = shotSpeed + (i - (param.count - 1) / 2) * shotSpeedDiff;
      newArray.push(obj);
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
      const shotDirDiff = (param.hasOwnProperty("shotDirDiff") ? param.shotDirDiff : 360 / param.count);
      const shotSpeedDiff = (param.hasOwnProperty("shotSpeedDiff") ? param.shotSpeedDiff : 0);
      const diffAngle = 360 * i / param.count;
      let obj = {};
      Object.assign(obj, ptn);
      const {x, y, direction, shotSpeed, shotDirection} = ptn;
      obj.x = x * cos(diffAngle) - y * sin(diffAngle);
      obj.y = y * cos(diffAngle) + x * sin(diffAngle);
      obj.direction = direction + diffAngle;
      // shotSpeedとshotDirection.
      obj.shotDirection = shotDirection + shotDirDiff * i;
      obj.shotSpeed = shotSpeed + shotSpeedDiff * i;
      newArray.push(obj);
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
      const shotDirDiff = (param.hasOwnProperty("shotDirDiff") ? param.shotDirDiff : 0);
      const shotSpeedDiff = (param.hasOwnProperty("shotSpeedDiff") ? param.shotSpeedDiff : param.upSpeed);
      let obj = {};
      Object.assign(obj, ptn);
      const {speed, shotSpeed, shotDirection} = ptn;
      obj.speed = speed + i * param.upSpeed;
      obj.shotSpeed = shotSpeed + i * shotSpeedDiff;
      obj.shotDirection = shotDirection + i * shotDirDiff;
      // lineの各bulletについて角度を変えるなんてことも・・してどうするんだって話だけど。
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
      ptn.direction = unit.shotDirection + (data.hasOwnProperty("bend") ? data.bend : 0);
      // たとえば90°ずつ曲げるとか, -90°ずつ曲げるとか。30°とかね。
      // shotSpeedとshotDirectionのデフォの設定(follow前提)
      // speedは"follow"ならptn.speedで数ならその値、directionは"follow"ならptn.directionで"aim"なら
      // プレイヤー方向で["aim", 5]みたくできて数は["abs", 60]みたいに指定する["rel", 40]で曲げることも
      // 可能・・speedも["abs", 4]ですべて4, ["rel", 2]ですべて+2みたいな。
      // デフォは["follow"].
      // bendはdirectionに対する作用だから必要でしょ・・まあ、別にいいけども。
      const shotSpeedOption = (data.hasOwnProperty("shotSpeedOption") ? data.shotSpeedOption : ["follow"]);
      const shotDirOption = (data.hasOwnProperty("shotDirOption") ? data.shotDirOption : ["follow"]);
      switch(shotSpeedOption[0]){
        case "follow":
          ptn.shotSpeed = ptn.speed; break;
        case "abs":
          ptn.shotSpeed = shotSpeedOption[1]; break;
        case "rel":
          ptn.shotSpeed = ptn.speed + shotSpeedOption[1]; break;
        case "multiple":
          ptn.shotSpeed = ptn.speed * shotSpeedOption[1]; break;
      }
      switch(shotDirOption[0]){
        case "follow":
          ptn.shotDirection = ptn.direction; break;
        case "aim":
          ptn.shotDirection = getPlayerDirection(unit.position, shotDirOption[1]); break;
        case "abs":
          ptn.shotDirection = shotDirOption[1]; break;
        case "rel":
          ptn.shotDirection = ptn.direction + shotDirOption[1]; break;
      }
    })

    // このタイミングでunitのshotSpeedなどに指定があるなら一斉に適用する。でなければデフォルト値を使う。
    // ...あれ？

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
      // ここ、playerPositionにしたりどこか具体的な位置にしても面白そう。relとかで。
      ptn.x += unit.position.x;
      ptn.y += unit.position.y;
      ptn.delay = unit.shotDelay; // ディレイ
      ptn.behavior = {}; // ビヘイビア
      Object.assign(ptn.behavior, unit.shotBehavior); // アサインで作らないとコピー元がいじられてしまうの
      // あとでObject.values使ってあれにする。
      //ptn.shotSpeed = ptn.speed; // 基本、同じ速さ。
      //ptn.shotDirection = ptn.direction; // 基本、飛んでく方向だろうと。
      // ↑まずいよねぇ・・
      ptn.shotDelay = 0; // デフォルト
      ptn.shotBehavior = {}; // デフォルト
      ptn.action = unit.shotAction; // 無くても[]が入るだけ
      // 色、形関連
      ptn.colorName = unit.shotColorName;
      ptn.shapeName = unit.shotShapeName;
      // 基本的に自分の複製をする(Commandで変更可能)
      ptn.shotColorName = ptn.colorName;
      ptn.shotShapeName = ptn.shapeName;
    })
    // kindは廃止。draw関連はshapeプロパティで操作するので。
    ptnArray.forEach((ptn) => {
      createUnit(ptn, data.kind); // 形を指定する。基本的にWedge.
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

  // behavior関連
  const moveProperties = ["speed", "direction", "delay", "shotSpeed", "shotDirection", "shotDelay"]
  moveProperties.forEach((propName) => {
    if(seed[propName] !== undefined){ ptn[propName] = getNumber(seed[propName]); }
  })
  // 色、形関連

  const figureProperties = ["colorName", "shotColorName", "shapeName", "shotShapeName"];
  figureProperties.forEach((propName) => {
    if(seed[propName] !== undefined){ ptn[propName] = seed[propName]; }
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
    // 長さが3の場合はcountを設定する。この場合、waitの変種となる。
    if(command[_type].length > 2){ result.count = command[_type][2]; }
    // set:count数でその値になる. add:count数でその値だけ足す。
    return result;
  }

  // 色、形関連
  if(["shotColor", "shotShape"].includes(_type)){
    result.style = command[_type]; // 文字列
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
    // fire:名前, の名前を関数にするだけ。
    // ライブラリに存在しない場合は自動的にデフォルトになる（書き忘れ対策）
    if(data.fire[command.fire] === undefined){ result.fire = createFirePattern({}); }
    else{ result.fire = data.fire[command.fire]; }
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
  if(_type === "follow"){
    // followをonoffにする
    result.flag = command.follow; return result;
  }
}

function execute(unit, command){
  const _type = command.type;
  if(["speed", "direction", "shotSpeed", "shotDirection", "shotDelay"].includes(_type)){
    // speedとかshotDirectionとかいじる
    // 第2引数（3番目)がある場合。
    // まずループを抜けるかどうかはプロパティの有無で純粋に決まる。プロパティが無ければ抜けないで進む(true)。
    // 次にインデックスを増やすかどうかはプロパティが無ければ増やし、
    // ある場合はアレがtrueを返せば増やす。
    const newParameter = getNumber(command[_type + "Change"]);
    const hasCount = command.hasOwnProperty("count"); // countを持っているかどうか
    // ループを抜けないかどうか
    const loopAdvanceFlag = (hasCount ? false : true);
    if(command.mode === "set"){
      if(hasCount){
        const cc = unit.getLoopCount();
        // cc(currentLoopCount)から目標値との割合を計算する感じ.
        unit[_type] = map(cc + 1, cc, command.count, unit[_type], newParameter);
      }else{
        unit[_type] = newParameter; // ターンを消費しないで普通にセットする
      }
    }else if(command.mode === "add"){
      if(hasCount){
        unit[_type] += newParameter / command.count; // 単に割り算の結果を足すだけ。
      }else{
        unit[_type] += newParameter; // ターンを消費しないで普通に足す
      }
    }else if(command.mode === "mirror"){
      // 角度限定。角度をθ → 2a-θにする。speedやdelayでは使わないでね。
      unit[_type] = 2 * newParameter - unit[_type];
    }else if(command.mode === "rel"){
      // shotSpeedとshotDirectionで、unit自身のspeed, directionを使いたいときに使う。普通にaddする。
      // たとえば["rel", 40]で自分のdirection+40がshotDirectionに設定される。
      if(_type === "shotSpeed"){ unit[_type] = unit.speed + newParameter; }
      if(_type === "shotDirection"){ unit[_type] = unit.direction + newParameter; }
    }
    if(["speed", "direction"].includes(_type)){ unit.velocityUpdate(); }
    // インデックスを増やすかどうか（countがあるならカウント進める）
    // countがある場合は処理が終了している時に限り進める感じ。
    const indexAdvanceFlag = (hasCount ? unit.loopCheck(command.count) : true);
    if(indexAdvanceFlag){ unit.actionIndex++; }
    return loopAdvanceFlag; // フラグによる
  }
  if(_type === "shotDelay"){
    // shotDelayをいじる
    unit.shotDelay = command.delayCount;
    unit.actionIndex++;
    return true; // ループは抜けない
  }
  // 色、形.
  if(["shotColor", "shotShape"].includes(_type)){
    unit[_type + "Name"] = command.style;
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
  if(_type === "follow"){
    unit.follow = command.flag;
    unit.actionIndex++;
    return true; // ループは抜けない
  }
}
