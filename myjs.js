// https://discord.gg/q4NBCjsg
// asdf to walk
// jkl; to mine/place
// m to lock walk
// pn to scroll through things

var localPlayerWalkRepeatDirections = [];
var localPlayerWalkBuffer = -1;
var lockWalkDir = -1;
const KEYS = {w: 65, s: 83, e: 68, n: 70};

var speedbps = 1/16;

var areasString = `\
Spawn | 111, 31
Stantown | -1719, -2094
Duty Outpost | -1367, -2991
Tuxtown | 175, -3775
Musty Outpost | -815, -3617
Mel | -4279, -10639
Mel2 | -1731, -40
Mel3 | -2024, -410
Mel4 / rainbow lounge | -23, 5908
Mel5 | -59, 7651
Mel6 | 47, 22628
Mel7 | -60, 25833
Wikitown | 15701, -596
Small Wikitown | 9103, -617
Boteram cave | 16044, 797
WhileTrue Zone | -3557, -1100
Boteram vertical 1 | 14132, 12336`;
/*
  Votgil tunnel: -3548+, -1100
  Boteram tunnel: 15701, -596+
  Lone Oven | -4683, -6020
  Lone Hospital | -4794, -6035
*/

var restAreas = [];
var pauseOnRestArea = false;

function loadRestAreas (areas)
{
    areas = areas.split ("\n");
    var posstrings = areas.map(area => area.substring(area.indexOf("|") + 1));
    var poses = [];
    restAreas.length = posstrings.length;
    for (var i = 0; i < areas.length; ++i)
    {
	var j = posstrings[i].indexOf(",");
	restAreas[i] = new Pos(
	    Number(posstrings[i].substring(0, j)),
	    Number(posstrings[i].substring(j+1))
	);
    }
}

function placeSymbolTile (tile)
{
    setTileBufferValue(localPlayer.pos, tile);
    addPlaceSymbolTileCommand(tile);
}

Player.prototype.stopActionInDirection = function(direction) {
    if (this == localPlayer)
        localPlayerStopWalking(direction);
}

function localPlayerStartWalking(direction) {
    if (localPlayerWalkRepeatDirections[localPlayerWalkRepeatDirections.length - 1] !== direction)
    {
	if (this.walkDelay <= 0)
	    localPlayer.walk(direction);
	else {
	    localPlayerWalkRepeatDirections.push(direction);
	    localPlayerWalkBuffer = direction;
	}
	lockWalkDir = -1;
    }
    //localPlayerWalkRepeatDelay = 0.1 * framesPerSecond;
    //localPlayerShouldStopWalkRepeat = !lKeyIsHeld;
}

function localPlayerStopWalking(direction) {
    if (localPlayerWalkRepeatDirections.length == 0)
	return;
    for (var i = localPlayerWalkRepeatDirections.length - 1; i >= 0; i--)
    {
	if (localPlayerWalkRepeatDirections[i] == direction) {
	    localPlayerWalkRepeatDirections.splice(i, 1);
	    i++;
	}
    }
}

function getTileBufferValueRelative (pos)
{
    var temppos = localPlayer.pos.copy();
    temppos.add(pos);
    return getTileBufferValue (temppos);
}

Player.prototype.getDeltaInWalkDiagL = function (dir)
{
    var x = dir == 0 || dir == 3 ? -1 : 1;
    var y = dir == 0 || dir == 1 ? -1 : 1;
    return new Pos (x, y);
}
Player.prototype.getDeltaInWalkDiagR = function (dir)
{
    var x = dir == 3 || dir == 2 ? -1 : 1;
    var y = dir == 3 || dir == 0 ? -1 : 1;
    return new Pos (x, y);
}

var deltaCos = [0,1,1,1,0,-1,-1,-1];
var deltaSin = [-1,-1,0,1,1,1,0,-1];
Player.prototype.getDeltaInWalkDirt = function (dirt) // direction = dir + .5 diag
{
    var x = deltaCos[dirt];
    var y = deltaSin[dirt];
    return new Pos (x, y);
}
Player.prototype.getDeltaInOffsetDirt = function (direction, dirt)
{
    return this.getDeltaInWalkDirt ((direction * 2 + dirt) & 7);
}

Player.prototype.canWalkThroughRelative = function (pos)
{
    var ppos = this.pos.copy();
    ppos.add(pos);
    return this.canWalkThroughTile (getTileBufferValue (ppos));
}

Player.prototype.walkMotion = function (direction)
{
    var tempPos = this.getPosInWalkDirection(direction);
    this.pos.set(tempPos);
    placeLocalPlayerTrail(this.pos);
    addWalkCommand(direction);
}

Player.prototype.walk = function(direction) {
    if (this.walkDelay > 0) {
	console.log("aah");
        return false;
    }
    if (this == localPlayer) {
        if (localCrack !== null) {
            return false;
        }
    }
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if (!this.canWalkThroughTile(tempTile)) {
	var tempPos2, tempPos3;
	tempPos2 = this.getDeltaInOffsetDirt (direction, -1);
	tempPos3 = this.getDeltaInOffsetDirt (direction, -2);
	if (this.canWalkThroughRelative (tempPos2)
	    && this.canWalkThroughRelative (tempPos3))
	    this.walkMotion ((direction - 1) & 3);
	else
	{
	    tempPos2 = this.getDeltaInOffsetDirt (direction, 1);
	    tempPos3 = this.getDeltaInOffsetDirt (direction, 2);
	    if (this.canWalkThroughRelative (tempPos2)
		&& this.canWalkThroughRelative (tempPos3))
		this.walkMotion ((direction + 1) & 3);
	    else
		return false;
	}
    }
    this.walkMotion (direction);
    this.walkDelay = speedbps * framesPerSecond;
    for (var service of services)
	service.onwalk(direction);
    return true;
}


Player.prototype.teleport = function (n) {
    n.subtract(this.pos);
    var dir;
    var x = -n.x;
    var y = -n.y;
    var xodir = x < 0 ? 1 : 3;
    var yodir = y < 0 ? 2 : 0;
    var xvdir = x < 0 ? 1 : -1;
    var yvdir = y < 0 ? 1 : -1;
    for (var i = 0; i < 20; i++) {
	if (x == 0 && y == 0) {
	    break;
	}
	if (Math.abs(y * n.x) > Math.abs(x * n.y) || x == 0) {
	    y += yvdir;
	    dir = yodir;
	}
	else {
	    x += xvdir;
	    dir = xodir;
	}
	this.walk(dir);
	this.walkDelay = 0;
    }
}

Player.prototype.teleportNearest = function (tiles)
{
    if (typeof(tiles) == "number")
	tiles = [tiles];
    var cursorPos = this.pos.copy();
    var v = new Pos(0, 0);
    var foundTile = false;
    search:
    for (var i = 0; i < 450; i++)
    {
	if (cursorPos.x >= this.pos.x && cursorPos.y == this.pos.y)
	{
	    v.x = 0;
	    v.y = 1;
	}
	else
	{
	    v.x = cursorPos.y > this.pos.y ? -1 : 1;
	    v.y = cursorPos.x < this.pos.x ? -1 : cursorPos.x > this.pos.x ? 1 : cursorPos.y <= this.pos.y ? 1 : -1;
	}
	cursorPos.add(v); // +=
	var bufferValue = getTileBufferValue(cursorPos);
	for (var tile of tiles)
	{
	    if (tile == bufferValue)
	    {
		foundTile = true;
		break search;
	    }
	}
    }
    if (foundTile)
    {
	this.teleport (cursorPos);
	return true;
    }
    else
	return false;
}

function performAddChatMessageCommand(command) {
    var tempPlayerName;
    if (command.username === null) {
        tempPlayerName = null;
    } else {
        tempPlayerName = encodeHtmlEntity(command.username);
    }
    var tempText = encodeHtmlEntity(command.text);
    if (command.text == "report")
	addAddChatMessageCommand (getBasicStatusString());
    var tempIsAtBottom = (chatOutput.scrollTop + 150 > chatOutput.scrollHeight - 30);
    var tempTag = document.createElement("div");
    if (tempPlayerName === null) {
        tempTag.innerHTML = tempText;
    } else {
        tempTag.innerHTML = "<strong>" + tempPlayerName + ":</strong> " + tempText;
    }
    chatOutput.appendChild(tempTag);
    chatMessageTagList.push(tempTag);
    while (chatMessageTagList.length > maximumChatMessageCount) {
        var tempTag = chatMessageTagList[0];
        chatOutput.removeChild(tempTag);
        chatMessageTagList.splice(0, 1);
    }
    if (tempIsAtBottom) {
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
    new OverlayChatMessage(tempPlayerName, tempText);
}

function performSetTilesCommand(command) {
    var tempPos = createPosFromJson(command.pos);
    var tempSize = command.size;
    var tempTileList = command.tileList;
    resetTileBuffer();
    var index = 0;
    var tempPos2 = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < tempSize) {
        var tempTile = tempTileList[index];
        tempPos2.set(tempPos);
        tempPos2.add(tempOffset);
        setTileBufferValue(tempPos2, tempTile);
	if ((tempTile == ovenTile || tempTile == hospitalTile) && tempPos2.getOrthogonalDistance(new Pos(0,0)) > 4)
	{
	    console.log(tempPos2.x + (tempTile == ovenTile ? 2 : -2), tempPos2.y);
	    hasStopped |= pauseOnRestArea;
	}
        index += 1;
        tempOffset.x += 1;
        if (tempOffset.x >= tempSize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
    if (localCrack !== null) {
        setTileBufferValue(localCrack.pos, localCrackTile);
    }
}

Player.prototype.removeTile = function(direction) {
    if (localCrack !== null) {
        return;
    }
    var tempPos = this.getPosInWalkDirection(direction);
    localCrack = new Crack(-1, tempPos, localPlayer.username);
    localCrackTile = getTileBufferValue(tempPos);
    var tempDate = new Date();
    localCrackExpirationTime = tempDate.getTime() + 450;
    addRemoveTileCommand(direction);
}


function keyDownEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = true;
    }
    if (keyCode == 77) { // m
        lKeyIsHeld = true;
    }
    if (chatInputIsFocused) {
        if (keyCode == 13) {
            var tempText = chatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                chatInput.value = "";
            }
        }
    } else if (overlayChatInputIsFocused) {
        if (keyCode == 13) {
            var tempText = overlayChatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                overlayChatInput.value = "";
            }
            overlayChatInput.style.display = "none";
            overlayChatInputIsVisible = false;
            overlayChatInput.blur();
            setAllInputIsFocusedAsFalse();
            canvasIsFocused = true;
        }
    } else if (textToPlaceInputIsFocused) {
        if (keyCode == 13) {
            var tempText = textToPlaceInput.value;
            startPlacingText(tempText);
            textToPlaceInput.value = "";
            textToPlaceInput.blur();
            setAllInputIsFocusedAsFalse();
            canvasIsFocused = true;
        }
    } else if (guidelinePosInputIsFocused) {
        if (keyCode == 13) {
            setGuidelinePosFromInput();
        }
    } else if (canvasIsFocused) {
        textToPlace = null;
        if (keyCode == 13) {
            document.getElementById("overlayChat").style.display = "block";
            overlayChatInput.style.display = "block";
            overlayChatInputIsVisible = true;
            setAllInputIsFocusedAsFalse();
            overlayChatInput.focus();
            overlayChatInputIsFocused = true;
        }
	var key = event.key;
	if (false) {
	}
        else if (keyCode == 37 || keyCode == KEYS.w) {
            localPlayerStartWalking(3);
        }
        else if (keyCode == 39 || keyCode == KEYS.e) {
            localPlayerStartWalking(1);
        }
        else if (keyCode == 38 || keyCode == KEYS.n) {
            localPlayerStartWalking(0);
        }
        else if (keyCode == 40 || keyCode == KEYS.s) {
            localPlayerStartWalking(2);
        }
	else if (key == ";")
	    localPlayer.placeOrRemoveTile(0);
	else if (key == "l")
	    localPlayer.placeOrRemoveTile(1);
	else if (key == "k")
	    localPlayer.placeOrRemoveTile(2);
	else if (key == "j")
	    localPlayer.placeOrRemoveTile(3);
	else if (key == "h")
	    localPlayer.teleportNearest([145,146,147]);
	else if (key == "m")
	    lockWalkDir = localPlayerWalkBuffer >= 0 ? localPlayerWalkBuffer : localPlayerWalkRepeatDirections.length ? localPlayerWalkRepeatDirections[localPlayerWalkRepeatDirections.length - 1] : -1;
        else if (keyCode == 189 || keyCode == 173) {
            setZoom(0);
        }
        else if ((keyCode == 187 || keyCode == 61) && shiftKeyIsHeld) {
            setZoom(1);
        }
        else if (keyCode == 82 || key == "p") {
            var index = selectedInventoryItemIndex - 1;
            if (index < 0) {
                index = inventoryItemList.length - 1;
            }
            selectInventoryItem(index);
            centerSelectedInventoryItem();
        }
        if (key == "n") {
            var index = selectedInventoryItemIndex + 1;
            if (index >= inventoryItemList.length) {
                index = 0;
            }
            selectInventoryItem(index);
            centerSelectedInventoryItem();
        }
        if (keyCode == 66) {
            addEatBreadCommand();
        }
        if (keyCode == 84) {
            showModuleByName("textTool");
            textToPlaceInput.focus();
            return false;
        }
        if (keyCode >= 37 && keyCode <= 40) {
            return false;
        }
    }
}

function keyUpEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = false;
    }
    if (keyCode == 77) { // m
        lKeyIsHeld = false;
    }
    if (keyCode == 37 || keyCode == KEYS.w) {
        localPlayer.stopActionInDirection(3);
    }
    if (keyCode == 39 || keyCode == KEYS.e) {
        localPlayer.stopActionInDirection(1);
    }
    if (keyCode == 38 || keyCode == KEYS.n) {
        localPlayer.stopActionInDirection(0);
    }
    if (keyCode == 40 || keyCode == KEYS.s) {
        localPlayer.stopActionInDirection(2);
    }
}


var clearDark = function()
{
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvasSize, canvasSize);
}

function setDarkMode()
{
    clearCanvas = clearDark;
    var spritesImageTemp = document.createElement("canvas");
    spritesImageTemp.width = spritesImage.width;
    spritesImageTemp.height = spritesImage.height;
    var tempctx = spritesImageTemp.getContext("2d");
    tempctx.drawImage(spritesImage, 0, 0);
    tempctx.globalCompositeOperation = "source-atop";
    tempctx.fillStyle = "#fff";
    tempctx.fillRect(0, 40, 128, 48);
    spritesImage = spritesImageTemp;
}
//setDarkMode();

var services = [];

var basicStatsDisplay, basicStatsCanvas;

function getBasicStatusString ()
{
    var tempFlourCount = getInventoryItemByTile(flourTile).count;
    var tempWaterCount = getInventoryItemByTile(waterTile).count;
    var tempPowderCount = getInventoryItemByTile(powderTile).count;
    var tempUnbakedBreadCount = Math.min(tempFlourCount, tempWaterCount, tempPowderCount);
    var tempEffectiveBreadCount = localPlayer.breadCount + tempUnbakedBreadCount;
    return `Bread: ${localPlayer.breadCount} (+ ${tempUnbakedBreadCount} = ${tempEffectiveBreadCount})\nHealth: ${localPlayerHealth}\nPos: ${localPlayer.pos.toString()}`;
}

function updateBasicStats ()
{
    basicStatsDisplay.innerHTML = getBasicStatusString();
    var ctx = basicStatsCanvas.getContext ("2d");
    var w = basicStatsCanvas.width;
    var h = basicStatsCanvas.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(-w/2,-h/2,w,h);
    ctx.fillStyle = "#a0f";
    ctx.fillRect(-2,-2,4,4);
    ctx.fillStyle = "#05f";
    var tempPos = new Pos(0, 0);
    tempPos.subtract(localPlayer.pos);
    tempPos.scale(.01);
    tempPos.x = Math.round(tempPos.x);
    tempPos.y = Math.round(tempPos.y);
    ctx.fillRect(tempPos.x - 2, tempPos.y - 2, 4, 4);
    ctx.fillStyle = "#fff";
    for (var restArea of restAreas)
    {
	tempPos = restArea.copy();
	tempPos.subtract(localPlayer.pos);
	tempPos.scale(.01);
	tempPos.x = Math.round(tempPos.x);
	tempPos.y = Math.round(tempPos.y);
	ctx.fillRect(tempPos.x - 1, tempPos.y - 1, 2, 2);
    }
}

function makeBasicStatsModule ()
{
    var div = document.createElement("div");
    div.setAttribute ("id", "basicstats");
    basicStatsDisplay = document.createElement("pre");
    var parentdiv = document.getElementById("content").children[1];
    basicStatsCanvas = document.createElement("canvas");
    basicStatsCanvas.width = 200;
    basicStatsCanvas.height = 200;
    basicStatsCanvas.getContext("2d").translate(100,100);
    div.appendChild(basicStatsDisplay);
    div.appendChild(basicStatsCanvas);
    parentdiv.appendChild(div);
}

var airplaneTracker = localPlayer.pos.copy();
function timerEvent() {
    if (hasStopped) {
        return;
    }
    var tempTag = document.getElementById("overlayChat");
    var tempHasFoundVisibleMessage = false;
    var index = 0;
    while (index < overlayChatMessageList.length) {
        var tempMessage = overlayChatMessageList[index];
        if (tempMessage.getIsVisible()) {
            tempHasFoundVisibleMessage = true;
            break;
        }
        index += 1;
    }
    if (tempHasFoundVisibleMessage || overlayChatInputIsVisible) {
        tempTag.style.display = "block";
    } else {
        tempTag.style.display = "none";
    }
    
    var index = overlayChatMessageList.length - 1;
    while (index >= 0) {
        var tempMessage = overlayChatMessageList[index];
        tempMessage.tick();
        index -= 1;
    }
    
    if (!spritesImageHasLoaded) {
        return;
    }
    
    //lastActivityTime += 1;
    if (lastActivityTime > 20 * 60 * framesPerSecond) {
        alert("You have been kicked due to inactivity.");
        hasStopped = true;
        window.location = "menu";
    }
    
    invincibilityBlinkDelay += 1;
    if (invincibilityBlinkDelay >= 4) {
        invincibilityBlinkDelay = 0;
    }
    
    if (!isRequestingGameUpdate) {
        gameUpdateRequestDelay -= 1;
        if (gameUpdateRequestDelay <= 0) {
            addAssertPosCommand();
            addGetEntitiesCommand();
            addGetTilesCommand();
            addGetChatMessagesCommand();
            addGetOnlinePlayersCommand();
            addGetInventoryChangesCommand();
            addGetRespawnPosChangesCommand();
            addGetStatsCommand();
            addGetAvatarChangesCommand();
            performGameUpdateRequest();
        }
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
    }
    if (textToPlace !== null) {
        if (textToPlaceIndex >= textToPlace.length) {
            textToPlace = null;
        } else {
            if (!textToPlaceIsWaitingToWalk) {
                var tempCharacter = textToPlace.charCodeAt(textToPlaceIndex);
                if (tempCharacter >= 33 && tempCharacter <= 126) {
                    addPlaceSymbolTileCommand(tempCharacter - 33 + symbolStartTile);
                }
                textToPlaceIsWaitingToWalk = true;
            }
            var tempResult = localPlayer.walk(1);
            if (tempResult) {
                textToPlaceIndex += 1;
                textToPlaceIsWaitingToWalk = false;
            }
        }
    }
    if (localPlayer.walkDelay > 0)
    {
	// idk
    }
    else if (localPlayerWalkRepeatDirections.length > 0 || localPlayerWalkBuffer >= 0 || lockWalkDir >= 0) {
	if (localPlayerWalkBuffer >= 0) {
	    localPlayer.walk(localPlayerWalkBuffer);
	    localPlayerWalkBuffer = -1;
	}
	else if (localPlayerWalkRepeatDirections.length) {
            localPlayer.walk(localPlayerWalkRepeatDirections[localPlayerWalkRepeatDirections.length - 1]);
        }
	else {
	    localPlayer.walk(lockWalkDir);
	}
    }
    cameraPos.set(localPlayer.pos);
    var tempOffset = Math.floor(canvasSpriteSize / 2);
    cameraPos.x -= tempOffset;
    cameraPos.y -= tempOffset;
    
    clearCanvas();
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < canvasSpriteSize) {
        tempPos.set(cameraPos);
        tempPos.add(tempOffset);
        var tempTile = getTileBufferValue(tempPos);
        drawTile(tempOffset, tempTile);
        tempOffset.x += 1;
        if (tempOffset.x >= canvasSpriteSize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        tempEntity.draw();
        index += 1;
    }
    displayGuideline();
    
    document.getElementById("coordinates").innerHTML = localPlayer.pos.toString();
    var tempOffset = localPlayer.pos.copy();
    tempOffset.subtract(respawnPos);
    document.getElementById("respawnOffset").innerHTML = tempOffset.toString();
    var tempDistance = Math.round(localPlayer.pos.getDistance(respawnPos));
    document.getElementById("respawnPosDistance").innerHTML = tempDistance;
    
    drawCompass();

    updateBasicStats ();

    if (localPlayer.pos.getOrthogonalDistance(airplaneTracker) > 32)
    {
	console.log("Player warped from " + airplaneTracker.toString());
	hasStopped = true;
	for (var service of services)
	    service.ondie();
    }
    airplaneTracker.set(localPlayer.pos);
    for (var service of services)
	if (service.running)
	    service.timerEvent();
}

Player.prototype.collectTileConditional = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if ((tempTile >= flourTile && tempTile <= breadTile)
        || (tempTile >= symbolStartTile && tempTile <= symbolStartTile + symbolTileAmount)) {
	this.collectTile(direction);
    }
}

Player.prototype.breakColorTileConditional = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    var bool = tempTile >= blockStartTile && tempTile < blockStartTile + blockTileAmount;
    if (bool) {
	this.removeTile(direction);
    }
    return bool;
}

Player.prototype.canWalkInDir = function (dir)
{
    return localPlayer.canWalkThroughTile(getTileBufferValue(localPlayer.getPosInWalkDirection(dir)));
};

class Service  {
    constructor() {
	this.running = false;
	services.push(this);
    }
    onwalk() {}
    ondie() {}
    ongetchat() {}
    timerEvent() {}
    start() {this.running = true;}
    stop() {this.running = false;}
}

var leaveTilesBehind = new Service();

var bore = new Service();
bore.interval = -1;
bore.left = false;
bore.right = false;
bore.step = function (dir)
{
    var c = 1;
    for (var entity of entityList)
    {
	if (!entity.username && localPlayer.pos.getOrthogonalDistance(entity.pos) < 3)
	{
	    c = 5;
	    break;
	}
    }
    for (var i = 0; i < c; ++i)
    {
	//localPlayer.breakColorTileConditional((dir + 1) & 3);
	//localPlayer.breakColorTileConditional((dir - 1) & 3);
	if (bore.right)
	    localPlayer.placeTile((dir + 1) & 3);
	if (bore.left)
	    localPlayer.placeTile((dir - 1) & 3);
	if (localPlayer.canWalkInDir(dir))
	    localPlayer.walkMotion(dir);
	else
	    break;
    }
    var delay = 70;
    if (!localPlayer.canWalkThroughTile(getTileBufferValue(localPlayer.getPosInWalkDirection(dir))))
    {
	delay = 625;
	localPlayer.removeTile(dir);
    }
    bore.interval = setTimeout (function () {
	bore.step (dir);
    }, delay);
};
bore.start = function (dir)
{
    bore.running = true;
    bore.step (dir);
};
bore.stop = function ()
{
    bore.running = false;
    clearTimeout (bore.interval);
};
bore.ondie = function ()
{
    bore.stop();
};

function getSnakeDir (minx, maxx, yoff)
{
    var east = (localPlayer.pos.y - yoff) & 1;
    var dir = east ? 1 : 3;
    if ((localPlayer.pos.x == minx && !east) ||
	(localPlayer.pos.x == maxx && east))
	dir = 2;
    return dir;
}

Player.prototype.blockedInDir = function (dir)
{
    return !this.canWalkThroughTile(getTileBufferValue(this.getPosInWalkDirection(dir)));
}

function snakeMovePlayer (minx, maxx, yoff, callback, objecet)
{
    var dir = getSnakeDir (minx, maxx, yoff);
    var blocked = localPlayer.blockedInDir (dir);
    var delay = 70;
    if (blocked)
    {
	localPlayer.removeTile (dir);
	delay = 625;
    }
    objecet.interval = setTimeout (function () {
	localPlayer.walkMotion (dir);
	callback();
    }, delay);
}


var symbolArea = new Service();
symbolArea.x0 = 0;
symbolArea.x1 = 0;
symbolArea.y0 = 0;
symbolArea.y1 = 0;
symbolArea.step = function()
{
    if (localPlayer.pos.y <= symbolArea.y1 && localPlayer.pos.y >= symbolArea.y0)
    {
	placeSymbolTile(0x5f);
	snakeMovePlayer (symbolArea.x0, symbolArea.x1, 0, symbolArea.step, symbolArea);
    }
    else
	this.running = false;
}
symbolArea.start = function(x0, y0, x1, y1)
{
    symbolArea.x0 = x0;
    symbolArea.y0 = y0;
    symbolArea.x1 = x1;
    symbolArea.y1 = y1;
    symbolArea.step ();
    this.running = true;
}
symbolArea.stop = function ()
{
    clearInterval (symbolArea.interval);
    this.running = false;
}
symbolArea.ondie = function ()
{
    symbolArea.stop();
}



var breakArea = new Service();
breakArea.x0 = 0;
breakArea.x1 = 0;
breakArea.y0 = 0;
breakArea.y1 = 0;
breakArea.step = function()
{
    if (localPlayer.pos.y <= breakArea.y1 && localPlayer.pos.y >= breakArea.y0)
	snakeMovePlayer (breakArea.x0, breakArea.x1, 0, breakArea.step, breakArea);
}
breakArea.start = function(x0, y0, x1, y1)
{
    breakArea.x0 = x0;
    breakArea.y0 = y0;
    breakArea.x1 = x1;
    breakArea.y1 = y1;
    breakArea.step ();
    this.running = true;
}
breakArea.stop = function ()
{
    clearInterval (breakArea.interval);
    this.running = false;
}
breakArea.ondie = function ()
{
    breakArea.stop();
}

var rule = new Service();
rule.minx = -15;
rule.maxx = 14;
rule.yoff = 0;
rule.rule = 30;
rule.chr = 35;
rule.interval = -1;
rule.step = function()
{
    var a = getTileBufferValueRelative(new Pos(-1,-1)) == 35;
    var b = getTileBufferValueRelative(new Pos( 0,-1)) == 35;
    var c = getTileBufferValueRelative(new Pos( 1,-1)) == 35;
    var d = 4 * a + 2 * b + c;
    var r = rule.rule & (1 << d);
    if (r)
	placeSymbolTile (35);
    snakeMovePlayer (rule.minx, rule.maxx, rule.yoff, rule.step, rule);
};
rule.start = function(minx, maxx, yoff)
{
    this.minx = minx;
    this.maxx = maxx;
    this.yoff = yoff;
    this.running = true;
    rule.step();
};
rule.stop = function()
{
    clearInterval(rule.interval);
    this.running = false; // no more running
};
rule.ondie = function ()
{
    rule.stop();
};


var safety = new Service();
safety.timerEvent = function() {
    if (localPlayerHealth <= 2)
	hasStopped = true;
};
safety.ondie = function()
{
    hasStopped = true;
}

function resetEnemies ()
{
    hasStopped = true;
    setTimeout(function(){hasStopped=false;},20000)
}

function getTileBuffer ()
{
    var arr = [];
    var l = 0;
    var maxw = 0;
    for (var i = 0; i < tileBufferSize; i++)
    {
	arr[i] = [];
	arr[i].length = tileBufferSize;
	for (var j = 0; j < tileBufferSize; j++)
	{
	    var val = tileBuffer[l];
	    ++l;
	    arr[i][j] = val == 0 ? "" : val < 16 ? "0" + val.toString(16) : val.toString(16);
	}
	arr[i] = arr[i].join("");
	if (arr[i].length / 2 > maxw)
	    maxw = arr[i].length / 2;
    }
    return arr.join("\n");
}
getTileBuffer();


loadRestAreas(areasString);
makeBasicStatsModule();
showOrHideModuleByName ("stats");
clearInterval(3);
setInterval(timerEvent, Math.floor(1000 / framesPerSecond));
setZoom(0);
selectInventoryItem(7);
centerSelectedInventoryItem();
window.onkeydown = keyDownEvent;
window.onkeyup = keyUpEvent;


//breakArea.start (-15, 57, -2, 135)
//breakArea.start(2,85,14,137)
