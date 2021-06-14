'use strict';

const tileSpriteFirst = 0x21;
const tileBlockFirst = 0x81;
const tileBlockLast = 0x88;
const tileTrailFirst = 0x89;
const tileTrailLast = 0x90;
const tileSpriteLast = 0x96;

const cTileBufferHeight = 100;
const cTileBoardHeight = 50;
var aTileGlobal = new Uint8Array (cTileBufferHeight * cTileBufferHeight);

const posPlayerBuffer = new Vec (50, 50);
const posBoardBuffer = new Vec (25, 25); // graphical board

function bufferIndexFromPlayerRelativePos (relpos) // relative to player
{
    return (relpos.x + posPlayerBuffer.x) + (relpos.y + posPlayerBuffer.y) * cTileBufferHeight;
}

function setTileFromPlayerPos (relpos, tile)
{
    var i = bufferIndexFromPlayerRelativePos (relpos);
    aTileGlobal [i] = tile;
}

function getTileFromPlayerPos (relpos)
{
    var i = bufferIndexFromPlayerRelativePos (relpos);
    return aTileGlobal [i];
}

function bufferIndexFromBoardRelativePos (relpos) // relative to top left corner
{
    return (relpos.x + posBoardBuffer.x) + (relpos.y + posBoardBuffer.y) * cTileBufferHeight;
}

function setTileFromBoardPos (relpos, tile)
{
    var i = bufferIndexFromBoardRelativePos (relpos);
    aTileGlobal [i] = tile;
}

function getTileFromBoardPos (relpos)
{
    var i = bufferIndexFromBoardRelativePos (relpos);
    return aTileGlobal [i];
}

function bufferIndexFromBufferRelativePos (relpos)
{
    return relpos.x + relpos.y * cTileBufferHeight;
}

function setTileFromBufferPos (relpos, tile)
{
    var i = bufferIndexFromBufferRelativePos (relpos);
    aTileGlobal [i] = tile;
}

function getTileFromBufferPos (relpos)
{
    var i = bufferIndexFromBufferRelativePos (relpos);
    return aTileGlobal [i];
}

function getTileFromDirection (dir)
{
    return getTileFromPlayerPos (aVecFromDir [dir]);
}

function isSolidInDirection (dir)
{
    var tile = getTileFromDirection (dir);
    return (tile >= tileBlockFirst && tile <= tileBlockLast) || tile == 0x95 || tile == 0x96;
}

// -1 says that this function was inconclusive
// didn't find tile in specified area, or ran out of buffer
function cClearTilesInDirection (dir, max=32)
{
    var diff = aVecFromDir [dir];
    for (var i = 1; i <= max; ++i)
    {
	let tile = getTileFromPlayerPos (diff.mul (i));
	if (tile == 0)
	    return -1;
	if ((tile >= tileBlockFirst && tile <= tileBlockLast) || tile == 0x95 || tile == 0x96)
	    return i - 1;
    }
    return -1;
}

function canPlaceInDirection (dir)
{
    var tile = getTileFromPlayerPos (aVecFromDir [dir]);
    return tile == 0x80 || (tile >= tileTrailFirst && tile <= tileTrailLast);
}

function scrollTileBuffer (diff)
{
    var x, y;
    const yinc = diff.y < 0 ? () => y-=1 : () => y+= 1;
    const yc   = diff.y < 0 ? () => y>=0 : () => y<100;
    const y0   = diff.y < 0 ?         99 :           0;
    const xinc = diff.x < 0 ? () => x-=1 : () => x+= 1;
    const xc   = diff.x < 0 ? () => x>=0 : () => x<100;
    const x0   = diff.x < 0 ?         99 :           0;
    for (y = y0; yc(); yinc())
    {
	for (x = x0; xc(); xinc())
	{
	    let tempPos = new Vec (x, y);
	    let destPos = tempPos.add (diff);
	    let tempTile = 0;
	    if (destPos.bIsInBounds (0,0,  100,100))
		 tempTile = getTileFromBufferPos(destPos);
	    setTileFromBufferPos(tempPos, tempTile);
	}
    }
}

function loadTileBuffer (command, posPlayer)
{
    const cSize = command.size;
    const aTile = command.tileList;
    const relx = command.pos.x - posPlayer.x;
    const rely = command.pos.y - posPlayer.y;
    var i = 0;
    let rx, br;
    for (var y = rely; y < rely + cSize; ++y)
    {
	for (var x = relx; x < relx + cSize; ++x)
	{
	    let tile = aTile [i];
	    br = tile == 0x95 || tile == 0x96;
	    var wp = new Vec (x + player.pos.x, y + player.pos.y);
	    if (br && wp.lengthTaxicab > 3)
	    {
		if (tile == 0x95)
		    rx = wp.x + 2;
		else
		    rx = wp.x - 2;
		var message = rx + ", " + (y + player.pos.y);
		//console.log (message);
		if (elChat.childElementCount == 0 || message != elChat.children[elChat.childElementCount-1].innerHTML)
		    performAddChatMessage ({text: message});
	    }
	    setTileFromPlayerPos (new Vec (x, y), tile);
	    ++i;
	}
    }
}
