

// line width must be constant IIRC
// and you specify the x, y, and line width with the function
var dontgo = `\
`.split("\n");

Player.prototype.collectOrRemoveTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if (tempTile >= blockStartTile && tempTile < blockStartTile + blockTileAmount) {
        this.removeTile(direction);
	return true;
    }
    if ((tempTile >= flourTile && tempTile <= breadTile)
            || (tempTile >= symbolStartTile && tempTile <= symbolStartTile + symbolTileAmount)) {
        this.collectTile(direction);
    }
    return false;
}

//addPlaceSymbolTileCommand(tempCharacter - 33 + symbolStartTile);, symbolStartTile = 33

var mtGoing = false;
function mtLoop(x0, y0, llen)
{
    if (!mtGoing)
	return;
    var relY = localPlayer.pos.y - y0;
    var relX = localPlayer.pos.x - x0;
    if (relY >= dontgo.length || relY < 0 || relX < 0 || relX >= llen)
	return;
    addPlaceSymbolTileCommand(dontgo[relY].charCodeAt(relX));
    var nextWalkDir = (relY & 1) ? 3 : 1;
    if ((nextWalkDir == 1 && relX == llen - 1) ||
	(nextWalkDir == 3 && relX == 0))
    {
	nextWalkDir = 2;
    }
    var existsCrack = localPlayer.collectOrRemoveTile(nextWalkDir);
    var time = existsCrack ? 500 : Math.floor(1000 / 12);
    setTimeout(function()
	       {
		   localPlayer.walk(nextWalkDir);
		   mtLoop(x0, y0, llen);
	       }
	       , time);
}
function startmt()
{
    mtGoing = true;
    mtLoop(-15, 216, 30);
    lastActivityTime = -(dontgo.length + 216 - localPlayer.pos.y) * 3.5 * 16;
}
function stopmt()
{
    mtGoing = false;
}
