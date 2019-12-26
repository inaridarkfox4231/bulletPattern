// 速度の方向変化だけで円軌道を実現させる実験。割とうまく行った。

"use strict";
let x, y, speed, direction, radius, accelleration;

function setup(){
	createCanvas(600, 600);
	radius = 10;
	accelleration = 0.04;
	x = 300;
	y = 300 - radius;
  speed = 4;
	direction = 0;
}

// 半径を変えずに動かすには角度の変化をasin(speed/radius)にすればいい。そうすればそのときのスピードに対して
// 垂直な方向にrだけ離れた場所を中心として回転する。
// 螺旋を描きながら広がっていくにはどうすればいいのか？
// スピードを変えない場合、半径だけ伸ばしていくことになるけどそれだとだんだん角速度が遅くなっていくので・・
// 両方同時に変えればそんなことはないんだけど。
// 実用上は角度変化が固定されるので自動的に半径が増加していく形になる・・はず。

function draw(){
	background(220);
  //speed += accelleration;
	//radius = radius * (speed / (speed - accelleration));
	radius += 0.3;
	t = asin(speed / radius);
	// 逆にこれが一定になるようにradiusを決める・・？違う、速さが一定になるように、だ。
	// だから角度が変わることになる、角度の増加が。それは、
  direction += t;
	x += speed * cos(direction);
	y += speed * sin(direction);
	noStroke();
	fill(0);
	ellipse(x, y, 10, 10);
	fill(0, 0, 255);
	ellipse(300, 300, 10, 10);
	stroke(0);
	line(x, y, 300, 300);
	const difference = sqrt(pow(x - 300, 2) + pow(y - 300, 2)) - radius;
	const absValue = abs(difference);
	if(difference > 0){ line(100 + difference, 100, 100, 100); }
	else{ line(100 - difference, 100, 100, 100); }
}
