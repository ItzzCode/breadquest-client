var fileInput = document.createElement("input");
fileInput.setAttribute("type", "file");
fileInput.multiple = true;
function loadFile(file) {
    var fileReader = new FileReader();
    fileReader.addEventListener("loadend", function(e) {
	console.log("hi");
	var result = fileReader.result;
	result = result.replaceAll("\u2014", "--");
	result = result.replaceAll("\u2019", "'");
	result = result.replaceAll("\u201c", '"');
	result = result.replaceAll("\u201d", '"');
	result = result.replaceAll("\u2026", '...');
	//var paras = result.split(/\n/);
	var lineLength = 30;
	var lines = [];
	var lastBreak = 0;
	var breaks = [0];
	while (lastBreak + lineLength < result.length)
	{
	    var j = result.indexOf("\n", lastBreak + 1);
	    if (j <= lastBreak + lineLength) // there's another break in time
	    {
		lastBreak = j;
	    }
	    else
	    {
		var i = result.lastIndexOf(" ", lastBreak + lineLength);
		if (i <= lastBreak)
		    i = lastBreak + lineLength;
		breaks.push(i);
		lastBreak = i;
	    }
	}
	breaks.push(result.length);
	var substrings = [];
	for (var i = 0; i < breaks.length - 1; i++)
	    substrings.push(result.substring(breaks[i], breaks[i + 1]));
	console.log(substrings);
	lines = substrings.join("\n").split("\n");
	console.log(lines);
	//var lines = paras.join("\n").split("\n");
	for (var i = 0; i < lines.length; i++)
	    while (lines[i].length < lineLength)
		lines[i] += " ";
	result = lines.join("\n");
	for (var i = 0; i < result.length; i++)
	    if (result.charCodeAt(i) >= 128)
		console.log(result[i]);
	console.log(result, (result.length + 1) / (lineLength + 1));
    }, false);
    fileReader.readAsText(file);
}
fileInput.addEventListener("change", function() {
    var files = fileInput.files;
    for (var file of files) {
	loadFile(file);
    }
}, false);



document.body.appendChild(fileInput);
