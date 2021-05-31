'use strict';

// independent classes

// vec class

class Vec
{
    constructor (x=0, y=0)
    {
	this.x = x;
	this.y = y;
    }
    get lengthSquared () {return this.x * this.x + this.y * this.y;}
    get lengthEuclidian () {return Math.sqrt(this.lengthSquared);}
    get lengthTaxicab () {return Math.abs (this.x) + Math.abs (this.y);}
    
    distOrthogonal (vec) {return Math.max (Math.abs (this.x - vec.x), Math.abs (this.y - vec.y))}
    
    add (vec) {return new Vec (this.x + vec.x, this.y + vec.y);}
    addeq (vec) {this.x += vec.x; this.y += vec.y;}
    sub (vec) {return new Vec (this.x - vec.x, this.y - vec.y);}
    subeq (vec) {this.x -= vec.x; this.y -= vec.y;}
    mul (a) {return new Vec (this.x * a, this.y * a);}
    muleq (a) {this.x *= a; this.y *= a;}
    div (a) {return new Vec (this.x / a, this.y / a);}
    diveq (a) {this.x /= a; this.y /= a;}
    
    toJson () {return {x: this.x, y: this.y};}
    toString () {return this.x + ", " + this.y;}
    clone () {return new Vec (this.x, this.y);}
    
    seteq (pos) {this.x = pos.x; this.y = pos.y;};
    seteqjson (posjson) {this.x = posjson.x; this.y = posjson.y;}
    fromjson (posjson) {return new Vec (posjson.x, posjson.y);}
    
    bIsEqual (pos) {return this.x == pos.x && this.y == pos.y};
    bIsInBounds (x0,y0,  x1,y1) {return this.x >= x0 && this.x < x1 && this.y >= y0 && this.y < y1}
}

var aVecFromDir = [new Vec (0,-1), new Vec (1,0), new Vec (0,1), new Vec (-1,0)];

var testvec = new Vec (1, 2);

var aServiceGlobal = [];
class Service { // service, job, group of functions too complex for a single function
    constructor() {
	this.running = false;
	this.timeoutCode = -1;
	aServiceGlobal.push(this);
    }
    onwalk() {}
    ondie() {}
    ongetchat() {}
    timerEvent() {}
    start() {this.running = true;}
    stop() {this.running = false; clearTimeout (this.timeoutCode);}
    onkeydown () {}
    onkeyup () {}
    onsettiles () {}
}
