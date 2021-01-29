// asdf to walk
// jkl; to mine/place
// m to lock walk
// pn to scroll through things

var localPlayerWalkRepeatDirections = [];
var localPlayerWalkBuffer = -1;
var lockWalkDir = -1;
const KEYS = {w: 65, s: 83, e: 68, n: 70};


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
Wikitown | 15701, -596
Small Wikitown | 9103, -617
Boteram cave | 16044, 797`;


var restAreas = [];

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
        return false;
    }
    addWalkCommand(direction);
    this.pos.set(tempPos);
    placeLocalPlayerTrail(this.pos);
    this.walkDelay = (1 / 16) * framesPerSecond;
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
	    console.log(tempPos2.x + (tempTile == ovenTile ? 2 : -2), tempPos2.y);
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
    
    lastActivityTime += 1;
    if (lastActivityTime > 10 * 60 * framesPerSecond) {
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
}



clearInterval(3);
setInterval(timerEvent, Math.floor(1000 / framesPerSecond));
setZoom(0);
window.onkeydown = keyDownEvent;
window.onkeyup = keyUpEvent;
