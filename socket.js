'use strict';

var gameUpdateSocket;
const elChat = document.getElementById ("chatElement");
const elStats = document.getElementById ("statsElement");
const elColorContainer = document.getElementById ("colorSelect");
var aelColorButton = [];
const elBlockTrail = document.getElementById ("leaveBlockTrail");
const elTrailSelect = document.getElementById ("trailSelect");
const canvas = document.getElementById ("canvas");
const blockRenderSize = 12;
const cScreenBlockWidth = 50;
canvas.width = canvas.height = cScreenBlockWidth * blockRenderSize;
const ctx = canvas.getContext ("2d");

const spritesheet = new Image (192, 192);


const colorsBlock = ["#a00", "#a50", "#aa0", "#0a0", "#0aa", "#00a", "#a0a", "#aaa"];
const colorsBackground = ["#fcc", "#fec", "#ffe", "#efe", "#eff", "#eef", "#fef", "#eee"];

const trailMessages = ["Default", "Blocks", "Nothing"];
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

function drawStats ()
{
    elStats.innerHTML = "Health: " + player.health + "\n" + player.pos.toString ();
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
    ctx.drawImage (spritesheet,
		   (tile & 0xf) * blockRenderSize, (tile >> 4) * blockRenderSize,
		   blockRenderSize, blockRenderSize,
		   x * blockRenderSize, y * blockRenderSize,
		   blockRenderSize, blockRenderSize,);
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
	drawSprite (pos.x, pos.y, 0xa0);
    }
}

function drawTiles ()
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
    drawTiles ();
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
	qcWalk (dir);
	if (this.trail == TRAIL_BLOCKS)
	    qcPlaceTile (dir ^ 2, tileToPlace);
	else if (this.trail == TRAIL_NOTRACE)
	{
	    qcPlaceSymbolTile (43);
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
	return code == "KeyL" ? 0 : code == "Semicolon" ? 1 : code == "KeyK" ? 2 : code == "KeyJ" ? 3 : 4;
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
    }
    walk (dir)
    {
	player.pos.addeq (aVecFromDir [dir]);
	scrollTileBuffer (aVecFromDir [dir]);
	qcWalk (dir);
	qcCollectTile (dir ^ 1);
	qcCollectTile (dir ^ 3);
    }
    move ()
    {
	var distToEnemy = 20;
	for (var enemy of aEntityGlobal)
	{
	    if (enemy.className != "Enemy")
		continue;
	    var distToThisEnemy = player.pos.distOrthogonal (enemy.pos);
	    distToEnemy = Math.min (distToThisEnemy, distToEnemy);
	}
	if (distToEnemy < 5)
	{
	    for (var i = 0; i < 8; ++i)
	    {
		this.walk (this.direction);
		if (isSolidInDirection (this.direction) || walkBudget <= 0)
		    break;
	    }
	}
	else
	{
	    this.walk (this.direction);
	    /*while (walkBudget > 16 && !isSolidInDirection (this.direction))
	      this.walk (this.direction);*/
	    // in the cClearTiles... call, walkBudget could be 32 or any number; walkBudget is just the maximum that I care about
	    let dist = cClearTilesInDirection (this.direction, walkBudget);
	    if (dist != -1 && dist < walkBudget)
	    {
		while (!isSolidInDirection (this.direction))
		    this.walk (this.direction);
	    }
	}
	sendCommandList ();
	vDrawAll ();
	clearTimeout (this.timeoutCode);
	this.timeoutCode = setTimeout (this.timerEvent.bind (this), 65);
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
	    qcRemoveTile (this.direction);
	    sendCommandList ();
	    this.waitingForBlock = true;
	    clearTimeout (this.timeoutCode);
	    this.timeoutCode = setTimeout (this.skipWaitForTiles.bind (this), 300);
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

var srvcManual = new ManualControlService ();
var srvcBreak = new ManualBreakService ();
var srvcPeriodic = new PeriodicRequestsService ();
var srvcPlaceText = new PlaceTextService ();
var bore = new Bore ();
var srvcWalkCounter = new WalkCounterService ();
var srvcTileSelector = new TileSelectorService ();

function handleKeydown (e)
{
    if (!e.repeat)
    {
	for (var service of aServiceGlobal)
	    service.onkeydown (e.code);
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
	    // removeAllOnlinePlayers
	    // addOnlinePlayer
	    // setInventory inventory
	    // setRespawnPos respawnPos
	    case "setStats":
	    performSetStats (command);
	    break;
	    // setAvatar
	    // setGuidelinePos
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
	srvcPlaceText.start ();
	srvcWalkCounter.start ();
	srvcTileSelector.start ();
    }
    gameUpdateSocket.onmessage = function (e)
    {
	let data = JSON.parse (e.data);
	if (data.success)
	    receiveCommandList (data.commandList); // handle commands from server
	else
	    drawError (data.message);
    }
    qcStartPlaying ();
    qcAssertPos ();
    qcGetTiles ();
    qcGetOnlinePlayers ();
    qcGetChatMessages ();
}
spritesheet.onload = init;
spritesheet.src = "sprites.png";

