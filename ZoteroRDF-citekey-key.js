{
	"translatorID":"2b1a0782-00dc-4b2f-9bb3-5c3ed7041cdd",
	"translatorType":2,
	"label":"ZoteroRDF-citekey (key)",
	"creator":"Jonathan BISSON",
	"target":"rdf",
	"minVersion":"1.0.0b4.r1",
	"maxVersion":"",
	"priority":25,
	"configOptions":{"getCollections":"true", "dataMode":"rdf/xml"},
	"inRepository":false,
	"lastUpdated":"2012-09-03 11:32:18"
}

var item;

//%a = first author surname
//%y = year
//%t = first word of title
var citeKeyFormat = "%a_%t_%y";
var citeKeyTitleBannedRe = /\b(a|an|the|some|from|on|in|to|of|do|with|der|die|das|ein|eine|einer|eines|einem|einen|un|une|la|le|l\'|el|las|los|al|uno|una|unos|unas|de|des|del|d\')(\s+|\b)/g;
var citeKeyConversionsRe = /%([a-zA-Z])/;
var citeKeyCleanRe = /[^a-z0-9\!\$\&\*\+\-\.\/\:\;\<\>\?\[\]\^\_\`\|]+/g;
var numberRe = /^[0-9]+/;

var citeKeyConversions = {
	"a":function (flags, item) {
		if(item.creators && item.creators[0] && item.creators[0].lastName) {
			return item.creators[0].lastName.toLowerCase().replace(/ /g,"_").replace(/,/g,"");
		}
		return "";
	},
	"t":function (flags, item) {
		if (item["title"]) {
			return item["title"].toLowerCase().replace(citeKeyTitleBannedRe, "").split(/\s+/g)[0];
		}
		return "";
	},
	"y":function (flags, item) {
		if(item.date) {
			var date = Zotero.Utilities.strToDate(item.date);
			if(date.year && numberRe.test(date.year)) {
				return date.year;
			}
		}
		return "????";
	}
}
function tidyAccents(s) {
	var r=s.toLowerCase();

	// XXX Remove conditional when we drop Zotero 2.1.x support
	// This is supported in Zotero 3.0 and higher
	if (ZU.removeDiacritics !== undefined)
		r = ZU.removeDiacritics(r, true);
	else {
	// We fall back on the replacement list we used previously
		r = r.replace(new RegExp("[ä]", 'g'),"ae");
		r = r.replace(new RegExp("[ö]", 'g'),"oe");
		r = r.replace(new RegExp("[ü]", 'g'),"ue");
		r = r.replace(new RegExp("[àáâãå]", 'g'),"a");
		r = r.replace(new RegExp("æ", 'g'),"ae");
		r = r.replace(new RegExp("ç", 'g'),"c");
		r = r.replace(new RegExp("[èéêë]", 'g'),"e");
		r = r.replace(new RegExp("[ìíîï]", 'g'),"i");
		r = r.replace(new RegExp("ñ", 'g'),"n");                            
		r = r.replace(new RegExp("[òóôõ]", 'g'),"o");
		r = r.replace(new RegExp("œ", 'g'),"oe");
		r = r.replace(new RegExp("[ùúû]", 'g'),"u");
		r = r.replace(new RegExp("[ýÿ]", 'g'),"y");
	}

	return r;
};
function buildCiteKey (item,citekeys) {
	var basekey = "";
	var counter = 0;
	citeKeyFormatRemaining = citeKeyFormat;
	while (citeKeyConversionsRe.test(citeKeyFormatRemaining)) {
		if (counter > 100) {
			Zotero.debug("Pathological BibTeX format: " + citeKeyFormat);
			break;
		}
		var m = citeKeyFormatRemaining.match(citeKeyConversionsRe);
		if (m.index > 0) {
			//add data before the conversion match to basekey
			basekey = basekey + citeKeyFormatRemaining.substr(0, m.index);
		}
		var flags = ""; // for now
		var f = citeKeyConversions[m[1]];
		if (typeof(f) == "function") {
			var value = f(flags, item);
			Zotero.debug("Got value " + value + " for %" + m[1]);
			//add conversion to basekey
			basekey = basekey + value;
		}
		citeKeyFormatRemaining = citeKeyFormatRemaining.substr(m.index + m.length);
		counter++;
	}
	if (citeKeyFormatRemaining.length > 0) {
		basekey = basekey + citeKeyFormatRemaining;
	}

	// for now, remove any characters not explicitly known to be allowed;
	// we might want to allow UTF-8 citation keys in the future, depending
	// on implementation support.
	//
	// no matter what, we want to make sure we exclude
	// " # % ' ( ) , = { } ~ and backslash
	// however, we want to keep the base characters 

	basekey = tidyAccents(basekey);
	basekey = basekey.replace(citeKeyCleanRe, "");
	var citekey = basekey;
	var i = 0;
	while(citekeys[citekey]) {
		i++;
		citekey = basekey + "-" + i;
	}
	citekeys[citekey] = true;
	return citekey;
}
function doExport() {
	var item;
        var citekeys = new Object();
	while (item = Zotero.nextItem()){ 
	    Zotero.write("[[bib:"+buildCiteKey(item, citekeys)+"]]");
	}

}
