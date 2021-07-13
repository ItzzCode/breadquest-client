'use strict';

var useSmallMode = true;

var gameUpdateSocket;
const elMiniBuffer = document.getElementById ("miniBufferElement");
const elChat = document.getElementById ("chatElement");
const elPlayer = document.getElementById ("playerElement");
const elStats = document.getElementById ("statsElement");
const elBore = document.getElementById ("boreSelect");
const elColorContainer = document.getElementById ("colorSelect");
var aelColorButton = [];
const elTrailSelect = document.getElementById ("trailSelect");
const canvas = document.getElementById ("canvas");
const blockRenderSize = 12;
const cScreenBlockWidth = 50;
canvas.width = canvas.height = cScreenBlockWidth * blockRenderSize;
const ctx = canvas.getContext ("2d");

const spritesheet = new Image (192, 192);


const colorsBlock = ["#a00", "#a50", "#aa0", "#0a0", "#0aa", "#00a", "#a0a", "#aaa"];
const colorsBackground = ["#fcc", "#fec", "#ffe", "#efe", "#eff", "#eef", "#fef", "#eee"];

const colors = `\
fff
f33 fa0 cc0 0c0  0af 33c a0a aaa
afa fca ffe afa  acf cfc fcf ccc
888 888 888 888  000 000
0 1 2 3 4 5 6 7 8
000`.split (/\s+/).map (str => "#" + str);

const trailMessages = ["Default", "Blocks", "Nothing"];
const boreMessages = ["N", "E", "S", "W", "Stop"];
const TRAIL_DEFAULT = 0;
const TRAIL_BLOCKS = 1;
const TRAIL_NOTRACE = 2;

var cCommandSent = 0;

var acsq = []; // array for client-to-server command queue

var aEntityGlobal = [];

var logCommands = false;

var player;

var tileToPlace = 0x84;

var walkBudget = 0;
const maxWalks = 32;

function getBreadString ()
{
    var plus = Math.min (player.inventory [0x91], player.inventory [0x92], player.inventory [0x93]);
    return player.inventory [0x94] + " ( + " + plus + " = " + (plus + player.inventory [0x94]) + ")";
}

function drawStats ()
{
    document.bgColor = colors[player.health];
    elStats.innerHTML = "Health: " + player.health + "\n"
	+ player.pos.toString ()+ "\n"
	+ walkBudget + "\n"
	+ "Bread: " + getBreadString ();
}

function drawError (message)
{
    ctx.fillStyle = "#000";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText (message, canvas.width / 2, canvas.height / 2);
}

/*function drawRect (x, y, color)
{
    ctx.fillStyle = color;
    ctx.fillRect ();
    }*/

function drawSprite (x, y, tile)
{
    if (blockRenderSize == 12)
    {
	ctx.drawImage (spritesheet,
		       (tile & 0xf) * blockRenderSize, (tile >> 4) * blockRenderSize,
		       blockRenderSize, blockRenderSize,
		       x * blockRenderSize, y * blockRenderSize,
		       blockRenderSize, blockRenderSize,);
    }
    else
    {
	if (tile == 0xa0)
	{
	    ctx.fillStyle = "#000";
	    ctx.fillRect (
		x * blockRenderSize + 1, y * blockRenderSize + 1,
		blockRenderSize - 2, blockRenderSize - 2
	    );
	    ctx.fillStyle = colors [0];
	    ctx.fillRect (
		x * blockRenderSize + 2, y * blockRenderSize + 2,
		blockRenderSize - 4, blockRenderSize - 4
	    );
	    ctx.fillStyle = colors [8];
	    ctx.fillRect (
		x * blockRenderSize + 3, y * blockRenderSize + 3,
		blockRenderSize - 6, blockRenderSize - 6
	    );
	}
	else if (tile > 0xa0)
	{
	    ctx.fillStyle = colors [tile - 0xa0];
	    ctx.fillRect (
		x * blockRenderSize + 2, y * blockRenderSize + 2,
		blockRenderSize - 4, blockRenderSize - 4
	    );
	}
	else if (tile & 128)
	{
	    ctx.fillStyle = colors [tile & 127];
	    ctx.fillRect (
		x * blockRenderSize, y * blockRenderSize,
		blockRenderSize, blockRenderSize
	    );
	}
    }
}

function drawEntities (aEntity)
{
    var playerSprite = 6;
    if (tileToPlace >= tileBlockFirst && tileToPlace <= tileBlockLast)
	playerSprite = tileToPlace - tileBlockFirst;
    var pos = new Vec ();
    pos.addeq (posPlayerBuffer);
    pos.subeq (posBoardBuffer);
    drawSprite (pos.x, pos.y, 0xa1 + playerSprite);
    for (var entity of aEntity)
    {
	pos.seteqjson (entity.pos);
	pos.subeq (player.pos);
	pos.addeq (posPlayerBuffer);
	pos.subeq (posBoardBuffer);
	if (entity.className == "Enemy")
	    drawSprite (pos.x, pos.y, 0xa0);
	else if (entity.className == "Player")
	    drawSprite (pos.x, pos.y, 0xa1);
	else
	    console.log (entity);
    }
}

function drawTilesAsSprites ()
{
    const size = cTileBoardHeight;
    ctx.fillStyle = "#fff";
    ctx.fillRect (0, 0, canvas.width, canvas.height);
    for (var y = 0; y < size; ++y)
    {
	for (var x = 0; x < size; ++x)
	{
	    let tile = getTileFromBoardPos (new Vec(x, y));
	    if (tile >= tileSpriteFirst && tile <= tileSpriteLast)
	    {
		drawSprite (x, y, tile);
	    }
	}
    }
    for (var y = 0; y < size; ++y)
    {
	for (var x = 0; x < size; ++x)
	{
	    let tile = getTileFromBoardPos (new Vec(x, y));
	    if (tile == 0x95)
	    {
		ctx.beginPath ();
		ctx.strokeRect ((x - 6) * blockRenderSize, (y - 8) * blockRenderSize, blockRenderSize * 17, blockRenderSize * 17);
		ctx.closePath ();
	    }
	    else if (tile == 0x96)
	    {
		ctx.beginPath ();
		ctx.strokeRect ((x - 10) * blockRenderSize, (y - 8) * blockRenderSize, blockRenderSize * 17, blockRenderSize * 17);
		ctx.closePath ();
	    }
	}
    }
}

function vDrawAll ()
{
    drawTilesAsSprites ();
    drawEntities (aEntityGlobal);
    ctx.strokeStyle = "#000";
    ctx.beginPath ();
    ctx.strokeRect (10*blockRenderSize,10*blockRenderSize,30*blockRenderSize,30*blockRenderSize);
    ctx.closePath ();
}

// queue commands

function qcStartPlaying () {acsq.push({commandName:"startPlaying"});}
function qcGetTiles () {acsq.push({commandName:"getTiles",size:50});}
function qcWalk (dir) {acsq.push({commandName:"walk",direction:dir}); --walkBudget;}
function qcAssertPos () {acsq.push({commandName:"assertPos",pos:player.pos.toJson()});}
function qcGetEntities () {acsq.push({commandName:"getEntities"});}
function qcAddChatMessage (text) {acsq.push({commandName:"addChatMessage",text:text});}
function qcGetChatMessages () {acsq.push({commandName:"getChatMessages"});}
function qcGetOnlinePlayers () {acsq.push({commandName:"getOnlinePlayers"});}
function qcRemoveTile (dir) {acsq.push({commandName:"removeTile",direction:dir});}
function qcGetInventoryChanges () {acsq.push({commandName:"getInventoryChanges"});}
function qcPlaceTile (dir, tile) {acsq.push({commandName:"placeTile",direction:dir,tile:tile});}
function qcCollectTile (dir) {acsq.push({commandName:"collectTile",direction:dir});}
function qcGetRespawnPosChanges () {acsq.push({commandName:"getRespawnPosChanges"});}
function qcGetStats () {acsq.push({commandName:"getStats"});}
function qcEatBread () {acsq.push({commandName:"eatBread"});}
function qcGetAvatarChanges () {acsq.push({commandName:"getAvatarChanges"});}
function qcPlaceSymbolTile (tile) {acsq.push({commandName:"placeSymbolTile",tile:tile});}
function qcSetGuidelinePos (pos) {acsq.push({commandName:"setGuidelinePos",pos:pos.toJson()});}
function qcGetGuidelinePos () {acsq.push({commandName:"getGuidelinePos"});}


function sendCommandList ()
{
    //isRequestingGameUpdate = true;
    //gameUpdateStartTimestamp = Date.now() / 1000;
    cCommandSent += acsq.length;
    gameUpdateSocket.send(JSON.stringify(acsq));
    acsq = [];
}

// player class

class Player
{
    constructor (x, y, color)
    {
	this.pos = new Vec (x, y);
	this.color = color;
	this.health;
	this.inventory = {};
    }
    get distToEnemy ()
    {
	var dist = Number.MAX_SAFE_INTEGER;
	for (var enemy of aEntityGlobal)
	{
	    if (enemy.className != "Enemy")
		continue;
	    var distToThisEnemy = player.pos.distOrthogonal (enemy.pos);
	    dist = Math.min (distToThisEnemy, dist);
	}
	return dist;
    }
}

// manual control class
// i swear i don't want to java


class ManualControlService extends Service
{
    constructor ()
    {
	super ();
	this.directions = [];
	this.trail = TRAIL_DEFAULT;
	this.disableStopWalk = false;
    }
    takeStep (dir)
    {
	if (isSolidInDirection (dir))
	    return;
	player.pos.addeq (aVecFromDir [dir]);
	scrollTileBuffer (aVecFromDir [dir]);
	vDrawAll ();
	if (this.trail == TRAIL_NOTRACE)
	    qcPlaceSymbolTile (43);
	qcWalk (dir);
	if (this.trail == TRAIL_BLOCKS)
	    qcPlaceTile (dir ^ 2, tileToPlace);
	else if (this.trail == TRAIL_NOTRACE)
	{
	    qcCollectTile (dir ^ 2);
	}
	sendCommandList ();
    }
    timerEvent ()
    {
	if (!this.directions.length)
	    return;
	this.takeStep (this.directions [this.directions.length - 1]);
	this.timeoutCode = setTimeout (this.timerEvent.bind(this), 65);
    };
    directionFromKey (code)
    {
	return code == "KeyF" ? 0 : code == "KeyD" ? 1 : code == "KeyS" ? 2 : code == "KeyA" ? 3 : 4;
    }
    onkeydown (code)
    {
	if (code == "KeyM")
	{
	    this.disableStopWalk = true;
	    return;
	}
	var dir = this.directionFromKey (code);
	if (dir == 4)
	    return;
	this.directions.push (dir);
	clearTimeout (this.timeoutCode);
	this.timerEvent ();
    }
    onkeyup (code)
    {
	if (code == "KeyM")
	{
	    this.disableStopWalk = false;
	    return;
	}
	if (this.disableStopWalk)
	    return;
	var dir = this.directionFromKey (code);
	for (var i = this.directions.length - 1; i >= 0; --i)
	    if (this.directions [i] == dir)
		this.directions.splice (i, 1);
    }
}

class ManualBreakService extends Service
{
    constructor ()
    {
	super ();
    }
    directionFromKey (code)
    {
	return code == "KeyK" ? 0 : code == "KeyL" ? 1 : code == "KeyJ" ? 2 : code == "KeyH" ? 3 : 4;
    }
    onkeydown (code)
    {
	var dir = this.directionFromKey (code);
	if (dir == 4)
	    return;
	if (isSolidInDirection (dir))
	{
	    qcRemoveTile (dir);
	    sendCommandList ();
	    setTimeout (function () {qcGetTiles (); sendCommandList ();}, 300);
	}
	else if (canPlaceInDirection (dir))
	{
	    qcPlaceTile (dir, tileToPlace);
	    sendCommandList ();
	}
	else
	{
	    qcCollectTile (dir);
	    sendCommandList ();
	}
    }
}

class PeriodicRequestsService extends Service
{
    constructor ()
    {
	super ();
	this.loopIndex = 0; // for doing events that happen every other tick or every third
    }
    timerEvent ()
    {
	qcGetEntities ();
	qcGetTiles ();
	qcGetChatMessages ();
	qcGetOnlinePlayers ();
	qcAssertPos ();
	qcGetStats ();
	sendCommandList ();
	if (this.loopIndex % 6 == 0)
	    qcGetInventoryChanges ();
	++this.loopIndex;
	this.loopIndex %= 24;
	this.timeoutCode = setTimeout (this.timerEvent.bind (this), 1000);
    }
    start ()
    {
	this.running = true;
	this.timerEvent ();
    }
    stop ()
    {
	this.running = false;
	clearTimeout (this.timeoutCode);
    }
}

class Bore extends Service
{
    constructor ()
    {
	super ();
	this.direction = 0;
	this.waitingForBlock = false;
	this.breakInterval = 300;
    }
    walk (dir)
    {
	player.pos.addeq (aVecFromDir [dir]);
	scrollTileBuffer (aVecFromDir [dir]);
	qcWalk (dir);
	var tile = getTileFromDirection (dir ^ 1);
	if (tile >= 0x91 && tile <= 0x94)
	    qcCollectTile (dir ^ 1);
	tile = getTileFromDirection (dir ^ 3);
	if (tile >= 0x91 && tile <= 0x94)
	    qcCollectTile (dir ^ 3);
    }
    move ()
    {
	// if it's solid, go, because the breaker has it covered
	if (isSolidInDirection (this.direction))
	    this.walk (this.direction);
	if (isSolidInDirection (this.direction))
	{
	    this.breakThings ();
	    return;
	}
	if (player.distToEnemy < 5)
	{
	    while (player.distToEnemy < 5 && !isSolidInDirection (this.direction) && walkBudget > 0)
	    {
		this.walk (this.direction);
	    }
	}
	else
	{
	    while (walkBudget > 24 && !isSolidInDirection (this.direction))
	      this.walk (this.direction);
	    // in the cClearTiles... call, walkBudget could be 32 or any number; walkBudget is just the maximum that I care about
	    let dist = cClearTilesInDirection (this.direction, walkBudget);
	    if (dist != -1 && dist < walkBudget)
	    {
		while (!isSolidInDirection (this.direction))
		    this.walk (this.direction);
	    }
	}
	vDrawAll ();
	clearTimeout (this.timeoutCode);
	if (isSolidInDirection (this.direction))
	    this.breakThings ();
	else
	{
	    sendCommandList ();
	    this.timeoutCode = setTimeout (this.timerEvent.bind (this), 65);
	}
    }
    breakThings ()
    {
	    qcRemoveTile (this.direction);
	    sendCommandList ();
	    this.waitingForBlock = true;
	    clearTimeout (this.timeoutCode);
	    this.timeoutCode = setTimeout (this.skipWaitForTiles.bind (this), this.breakInterval);
    }
    skipWaitForTiles ()
    {
	this.waitingForBlock = false;
	this.move ();
    }
    timerEvent ()
    {
	if (!this.running)
	    return;
	if (isSolidInDirection (this.direction))
	{
	    this.breakThings ();
	}
	else
	{
	    this.waitingForBlock = false;
	    this.move ();
	}
	//qcRemoveTile (this.direction);
	//console.log (this);
	//console.log ("hi");
    }
    onsettiles ()
    {
	if (!this.running)
	    return;
	if (!this.waitingForBlock)
	    return;
	if (!isSolidInDirection (this.direction))
	{
	    console.log ("hi");
	    this.waitingForBlock = false;
	    this.move ();
	}
    }
    start (dir)
    {
	this.running = true;
	this.direction = dir;
	clearTimeout (this.timeoutCode);
	this.timerEvent ();
    }
}

class PlaceTextService extends Service
{
    constructor ()
    {
	super ();
	this.tile = 95;
    }
    onkeydown (code)
    {
	if (code == "KeyT")
	    qcPlaceSymbolTile (this.tile);
    }
}

class WalkCounterService extends Service
{
    timerEvent ()
    {
	if (walkBudget < maxWalks)
	    ++walkBudget;
    }
    start ()
    {
	this.running = true;
	this.timeoutCode = setInterval (this.timerEvent.bind (this), 65);
    }
}

class TileSelectorService extends Service
{
    onkeydown (code)
    {
	if (code == "KeyP")
	{
	    if (tileToPlace > tileBlockFirst)
	    {
		--tileToPlace;
		vDrawAll ();
	    }
	}
	else if (code == "KeyN")
	{
	    if (tileToPlace < tileBlockLast)
	    {
		++tileToPlace;
		vDrawAll ();
	    }
	}
    }
}

class MiscCommandsService extends Service
{
    constructor ()
    {
	super ();
    }
    onkeydown (code)
    {
	if (code == "KeyB")
	{
	    if (player.health < 5 && player.inventory [0x94] > 0)
	    {
		--player.inventory [0x94];
		++player.health;
	    }
	    qcEatBread ();
	}
    }
}

class TeleportBreadService extends Service // do flood and teleport to nearest ingredient
{
    constructor ()
    {
	super ();
    }
    walk (dir)
    {
	player.pos.addeq (aVecFromDir [dir]);
	scrollTileBuffer (aVecFromDir [dir]);
	qcWalk (dir);
    }
    doThing (cap) // do the thing
    {
	var darr = new Uint8Array (cTileBufferHeight * cTileBufferHeight);
	darr.fill (0xff);
	darr [posPlayerBuffer.y * cTileBufferHeight + posPlayerBuffer.x] = 0;
	var aPosX = new Uint16Array (cap * 4);
	var aPosY = new Uint16Array (cap * 4);
	var cPos = 1;
	aPosX [0] = posPlayerBuffer.x;
	aPosY [0] = posPlayerBuffer.y;
	var foundIngredient = false;
	findPos:
	for (var d = 0; d < cap; ++d)
	{
	    // test each pos for ingredient, break if pos has ingredient
	    for (var n = 0; n < cPos; ++n)
	    {
		var tile = aTileGlobal [aPosY [n] * cTileBufferHeight + aPosX [n]];
		if (tile >= 0x91 && tile <= 0x93)
		{
		    aPosX [0] = aPosX [n];
		    aPosY [0] = aPosY [n];
		    foundIngredient = true;
		    break findPos;
		    // now the pos and walk distance will be stored in aPosX and aPosY and darr
		}
	    }
	    // set up new pos values, fill in their distances
	    var aPosX1 = new Uint16Array (cap * 4);
	    var aPosY1 = new Uint16Array (cap * 4);
	    var cPos1 = 0;
	    for (var n = 0; n < cPos; ++n)
	    {
		for (var coords of [[aPosX [n], aPosY [n] - 1], [aPosX [n] + 1, aPosY [n]], [aPosX [n], aPosY [n] + 1], [aPosX [n] - 1, aPosY [n]]])
		{
		    var ind = coords [1] * cTileBufferHeight + coords [0];
		    if (darr [ind] == 0xff && canWalkThroughTile (aTileGlobal [ind]))
		    {
			aPosX1 [cPos1] = coords [0];
			aPosY1 [cPos1] = coords [1];
			darr [ind] = darr [aPosY [n] * cTileBufferHeight + aPosX [n]] + 1;
			++cPos1;
		    }
		}
	    }
	    aPosX = aPosX1;
	    aPosY = aPosY1;
	    cPos = cPos1;
	}
	if (!foundIngredient)
	    return;
	// now the pos and walk distance are stored in aPosX [0], aPosY [0], and darr is filled sufficienty
	// we need to fill an array of walks so we know the path
	var x = aPosX [0];
	var y = aPosY [0];
	const walksToIngredient = darr [aPosY [0] * cTileBufferHeight + aPosX [0]];
	const aWalk = new Uint8Array (walksToIngredient);
	for (var i = walksToIngredient - 1; i >= 0; --i)
	{
	    var dir = 2; // reverse direction
	    for (var coords of [[x,y-1], [x+1,y], [x,y+1], [x-1,y]])
	    {
		if (darr [coords [1] * cTileBufferHeight + coords [0]] == darr [y * cTileBufferHeight + x] - 1)
		{
		    aWalk [i] = dir & 3;
		    x = coords [0];
		    y = coords [1];
		    break;
		}
		++dir;
	    }
	}
	// now the path should be in aWalk
	// do the walking
	for (var i = 0; i < walksToIngredient; ++i)
	{
	    this.walk (aWalk [i]);
	}
	vDrawAll ();
    }
    onkeydown (code)
    {
	if (code == "Semicolon")
	{
	    this.doThing (Math.min (walkBudget, 20));
	}
    }
}

class MiniBufferService extends Service
{
    constructor ()
    {
	super ();
	this.running = false;
	this.text = "";
    }
    evaluateCommand ()
    {
	//performAddChatMessage ({text: "> " + this.text});
	var parts = this.text.split (" ");
	if (parts[0] == "b")
	{
	    var n = parseInt (parts[1], 10);
	    if (bore.running)
		bore.stop();
	    if (n < 4)
		bore.start (n);
	}
	else if (parts [0] == "t")
	{
	    qcAddChatMessage (this.text.substring (2));
	}
	else if (parts[0] == "c")
	    qcPlaceSymbolTile (this.text.charCodeAt (2) & 255);
	elMiniBuffer.innerHTML += " [last command]";
	this.text = "";
	this.running = false;
    }
    onkeydown (code, key)
    {
	if (!this.running)
	    return;
	if (code == "Enter")
	    this.evaluateCommand ();
	else if (key != "Shift" && key != "Alt" && key != "Control")
	{
	    if (key == "Backspace")
	    {
		if (this.text.length)
		    this.text = this.text.slice (0, -1);
		else
		    this.running = false;
	    }
	    else
		this.text += key;
	    elMiniBuffer.innerHTML = this.text;
	}
    }
}

var srvcManual = new ManualControlService ();
var srvcBreak = new ManualBreakService ();
var srvcPeriodic = new PeriodicRequestsService ();
//var srvcPlaceText = new PlaceTextService ();
var srvcMiscCommands = new MiscCommandsService ();
var srvcTeleportBread = new TeleportBreadService ();
var bore = new Bore ();
var srvcWalkCounter = new WalkCounterService ();
var srvcTileSelector = new TileSelectorService ();
var srvcMiniBuffer = new MiniBufferService ();

function handleKeydown (e)
{
    e.preventDefault ();
    if (!e.repeat)
    {
	if (srvcMiniBuffer.running)
	    srvcMiniBuffer.onkeydown (e.code, e.key);
	else if (e.key == ":")
	    srvcMiniBuffer.running = true;
	else
	{
	    for (var service of aServiceGlobal)
		service.onkeydown (e.code, e.key);
	}
    }
}

function handleKeyup (e)
{
    for (var service of aServiceGlobal)
	service.onkeyup (e.code);
}

addEventListener ("keyup", handleKeyup, false);
addEventListener ("keydown", handleKeydown, false);

// handle commands

function sanitizeString (str)
{
    var out = "";
    for (var chr of str)
    {
	     if (chr == "<") out += "&lt;";
	else if (chr == ">") out += "&gt;";
	else out += chr;
    }
    return out;
}

function performAddChatMessage (command)
{
    var text = "";
    if (command.username)
	text += command.username + ": ";
    text += command.text;
    text = sanitizeString (text);
    var tempEl = document.createElement ("pre");
    tempEl.innerHTML = text;
    elChat.appendChild (tempEl);
}

function performSetStats (command)
{
    player.health = command.health;
    drawStats ();
}

function performSetLocalPlayerPos (pos)
{
    var pos2 = new Vec ();
    pos2.seteqjson (pos);
    var diff = pos2.sub (player.pos);
    scrollTileBuffer (diff);
    player.pos.seteqjson (pos);
}

function performSetInventory (command)
{
    player.inventory = command.inventory;
    drawStats ();
}

function performRemoveAllOnlinePlayers (command)
{
    elPlayer.innerHTML = "";
}

function performAddOnlinePlayer (command)
{
    elPlayer.innerHTML += command.username + "\n";
}

function receiveCommandList (list) // handle commands from server
{
    if (logCommands)
	console.log (list);
    var redraw = false;
    for (var command of list)
    {
	switch (command.commandName)
	{
	    case "setLocalPlayerInfo":
	    break;
	    case "setTiles":
	    loadTileBuffer (command, player.pos);
	    for (var service of aServiceGlobal)
		service.onsettiles ();
	    redraw = true;
	    break;
	    case "setLocalPlayerPos":
	    performSetLocalPlayerPos (command.pos);
	    redraw = true;
	    break;
	    case "removeAllEntities":
	    aEntityGlobal = [];
	    redraw = true;
	    break;
	    case "addEntity":
	    aEntityGlobal.push (command.entityInfo);
	    redraw = true;
	    break;
	    case "addChatMessage":
	    performAddChatMessage (command);
	    break;
	    case "removeAllOnlinePlayers":
	    performRemoveAllOnlinePlayers (command);
	    break;
	    case "addOnlinePlayer":
	    performAddOnlinePlayer (command);
	    break;
	    case "setInventory":
	    performSetInventory (command);
	    break;
	    case "setRespawnPos":
	    break;
	    case "setStats":
	    performSetStats (command);
	    break;
	    case "setAvatar":
	    break;
	    case "setGuidelinePos":
	    break;
	}
    }
    if (redraw)
	vDrawAll ();
}

function getColorSetFunction (color)
{
    color += 0x81;
    return () => (tileToPlace = color);
}

function updateBlockTrail ()
{
    for (var input of elTrailSelect.children)
    {
	if (input.checked)
	{
	    srvcManual.trail = input.value;
	    break;
	}
    }
}

function updateBoreInput ()
{
    for (var input of elBore.children)
    {
	if (input.checked)
	{
	    if (bore.running)
		bore.stop();
	    if (input.value < 4)
		bore.start (Number(input.value));
	}
    }
}

function initColorButtons ()
{
    for (var i = 0; i < 8; ++i)
    {
	var button = document.createElement ("button");
	button.classList.add ("colorButton");
	button.addEventListener ("click", getColorSetFunction (i), false);
	button.style.backgroundColor = colorsBlock [i];
	elColorContainer.appendChild (button);
    }
    elTrailSelect.addEventListener ("click", updateBlockTrail, false);
    for (var i = 0; i < 3; ++i)
    {
	var input = document.createElement ("input");
	input.type = "radio";
	input.setAttribute ("id", "trailInput" + i);
	input.setAttribute ("name", "trailInputs");
	input.setAttribute ("value", i);
	var label = document.createElement ("label");
	label.setAttribute ("for", "trailInput" + i);
	label.innerText = trailMessages [i];
	elTrailSelect.appendChild (input);
	elTrailSelect.appendChild (label);
    }
    elBore.addEventListener ("click", updateBoreInput, false);
    for (var i = 0; i < 5; ++i)
    {
	var input = document.createElement ("input");
	input.type = "radio";
	input.setAttribute ("id", "boreInput" + i);
	input.setAttribute ("name", "boreInputs");
	input.setAttribute ("value", i);
	var label = document.createElement ("label");
	label.setAttribute ("for", "boreInput" + i);
	label.innerText = boreMessages [i];
	elBore.appendChild (input);
	elBore.appendChild (label);
    }
}

function init ()
{
    initColorButtons ();
    player = new Player (0,0,6);
    gameUpdateSocket = new WebSocket ("wss://ostracodapps.com:2626/gameUpdate");
    gameUpdateSocket.onopen = function ()
    {
	sendCommandList ();
	srvcManual.start ();
	srvcBreak.start ();
	srvcPeriodic.start ();
	//srvcPlaceText.start ();
	srvcWalkCounter.start ();
	srvcTileSelector.start ();
	srvcMiscCommands.start ();
    }
    gameUpdateSocket.onmessage = function (e)
    {
	let data = JSON.parse (e.data);
	if (data.success)
	    receiveCommandList (data.commandList); // handle commands from server
	else
	{
	    srvcPeriodic.stop ();
	    drawError (data.message);
	}
    }
    qcStartPlaying ();
    qcAssertPos ();
    qcGetTiles ();
    qcGetOnlinePlayers ();
    qcGetChatMessages ();
}
spritesheet.onload = init;
spritesheet.src = "sprites.png";

