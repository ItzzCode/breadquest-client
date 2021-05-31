

// line width must be constant IIRC
// and you specify the x, y, and line width with the function
var dontgo = `\
-- DNS Resolution --          
The Domain Name System exists 
 so that humans can use the   
 Internet. Some IP address    
 like 67.205.178.12 is        
 generally less memorable than
 ostracodapps.com. When the   
 user puts the URL in the     
 browser, the browser contacts
 a DNS server. If the DNS     
 server knows an IP address   
 for the domain, the server   
 will send over the IP address
 so that the browser can use  
 it.                          
However, if the DNS server    
 the browser contacts does not
 have the IP address, the DNS 
 server will contact another  
 DNS server for the           
 information. If that DNS     
 server does not have the     
 information, it will contact 
 another DNS server, which may
 contact another. If no server
 knows it, it will eventually 
 stop. However, if a server   
 knows it, then the           
 information will be passed   
 down the line and remembered 
 by each server. After your   
 browser gets that            
 information, it may remember 
 the relationship between that
 IP and domain name, as well. 
                              
                              
                              
                              
                              
-- XML --                     
XML is a language used for    
 data storage. Its normal use 
 relates sets of two concepts 
 - for instance, "the last    
 thing someone ate" and       
 "potato". Another use can    
 hierarchically label sections
 of the XML document. The     
 video game Celeste makes     
 heavy use of it. For         
 instance, if someone got all 
 six of the gems in Summit,   
 part of the save file might  
 look like this:              
<SummitGems>                  
  <boolean>true</boolean>     
  <boolean>true</boolean>     
  <boolean>true</boolean>     
  <boolean>true</boolean>     
  <boolean>true</boolean>     
  <boolean>true</boolean>     
</SummitGems>                 
These are all <boolean> tags, 
 a name which is completely   
 arbitrary and could really be
 anything. Each section can   
 hold multiple sorts of tags, 
 too. This is what another    
 part of the file might look  
 like:                        
<Assists>                     
  <GameSpeed>10</GameSpeed>   
  <DashMode>Normal</DashMode> 
  <Hiccups>false</Hiccups>    
</Assists>                    
When Celeste wants to look at 
 GameSpeed in Assists, it will
 find the number 10. When it  
 looks at DashMode in Assists,
 it will find Normal. You     
 might compare it to a file   
 structure. In this particular
 document that Celeste uses to
 store information, SaveData  
 is like a root directory. It 
 contains that Assists tag    
 from earlier, and all the    
 other information about the  
 save.                        
<SaveData>                    
  <Assists>                   
    <GameSpeed>10</GameSpeed> 
    <Hiccups>false</Hiccups>  
  </Assists>                  
  <SummitGems>                
    <boolean>true</boolean>   
    <boolean>true</boolean>   
    <boolean>true</boolean>   
    <boolean>true</boolean>   
    <boolean>true</boolean>   
    <boolean>true</boolean>   
  </SummitGems>               
</SaveData>                   
When it tries to find the     
 game speed, it really looks  
 in Assists in SaveData.      
 However, the hierarchy isn't 
 simply limited to this, it   
 can just keep going.         
<never>                       
  <gonna>                     
    <give>                    
      <you>up</you>           
    </give>                   
    <let>                     
      <you>down</down>        
    </let>                    
  </gonna>                    
</never>                      
As previously stated with the 
 <boolean> tags, XML tags     
 don't inherently mean        
 anything - HTML says that a  
 <p> tag always means a       
 paragraph, but in XML it     
 could mean any number of     
 things that any given        
 application uses it as. HTML 
 was made to specify          
 formatting, where XML was    
 made for general use.        
In HTML, there are some tags  
 which don't need closing     
 tags. Another difference     
 between XML and HTML is that 
 every tag in XML should have 
 a beginning and closing tag, 
 as shown below.              
<xmltag>The XML</xmltag>      
<img src="html.png" />        
Except in cases where it      
 doesn't, of course.          `.split("\n");

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
    //mtLoop(-15, 216, 30);
    mtLoop(-15, 1654, 30);
    //lastActivityTime = -(dontgo.length + 216 - localPlayer.pos.y) * 3.5 * 16;
}
function stopmt()
{
    mtGoing = false;
}
