{
	"translatorID":"2b1a0782-00dc-4b2f-9bb3-5c3ed7041cdc",
	"translatorType":2,
	"label":"ZoteroRDF-citekey",
	"creator":"Jonathan BISSON",
	"target":"rdf",
	"minVersion":"1.0.0b4.r1",
	"maxVersion":"",
	"priority":25,
	"configOptions":{"getCollections":"true", "dataMode":"rdf/xml"},
	"displayOptions":{"exportNotes":true, "exportFileData":false},
	"inRepository":false,
	"lastUpdated":"2012-09-03 11:32:18"
}

var item;
var rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

var n = {
	bib:"http://purl.org/net/biblio#",
	dc:"http://purl.org/dc/elements/1.1/",
	dcterms:"http://purl.org/dc/terms/",
	prism:"http://prismstandard.org/namespaces/1.2/basic/",
	foaf:"http://xmlns.com/foaf/0.1/",
	vcard:"http://nwalsh.com/rdf/vCard#",
	vcard2:"http://www.w3.org/2006/vcard/ns#",	// currently used only for NSF, but is probably
												// very similar to the nwalsh vcard ontology in a
												// different namespace
	link:"http://purl.org/rss/1.0/modules/link/",
	z:"http://www.zotero.org/namespaces/export#"
};

function generateSeeAlso(resource, seeAlso) {
	for(var i in seeAlso) {
		if(itemResources[seeAlso[i]]) {
			Zotero.RDF.addStatement(resource, n.dc+"relation", itemResources[seeAlso[i]], false);
		}
	}
}

function generateTags(resource, tags) {
	Zotero.debug("processing tags");
	for each(var tag in tags) {
		if(tag.type == 1) {
			var tagResource = Zotero.RDF.newResource();
			// set tag type and value
			Zotero.RDF.addStatement(tagResource, rdf+"type", n.z+"AutomaticTag", false);
			Zotero.RDF.addStatement(tagResource, rdf+"value", tag.tag, true);
			// add relationship to resource
			Zotero.RDF.addStatement(resource, n.dc+"subject", tagResource, false);
		} else {
			Zotero.RDF.addStatement(resource, n.dc+"subject", tag.tag, true);
		}
	}
}

function generateCollection(collection) {
	var collectionResource = "#collection_"+collection.id;
	Zotero.RDF.addStatement(collectionResource, rdf+"type", n.z+"Collection", false);
	Zotero.RDF.addStatement(collectionResource, n.dc+"title", collection.name, true);
	
	var children = collection.children ? collection.children : collection.descendents;
	if(!children) return;
	for each(var child in children) {
		// add child list items
		if(child.type == "collection") {
			Zotero.RDF.addStatement(collectionResource, n.dcterms+"hasPart", "#collection_"+child.id, false);
			// do recursive processing of collections
			generateCollection(child);
		} else if(itemResources[child.id]) {
			Zotero.RDF.addStatement(collectionResource, n.dcterms+"hasPart", itemResources[child.id], false);
		}
	}
}

/**
 * Get display title
 * Analogous to getDisplayTitle in item.js, but returns null if no display title distinct from
 * title property
 */
function getDisplayTitle(item) {
	if(!item.title && (item.itemType == "interview" || item.itemType == "letter")) {
		var participants = []
		for each(var creator in item.creators) {
			if (item.itemType == "letter" && creator.creatorType == "recipient" ||
					item.itemType == "interview" && creator.creatorType == "interviewer") {
			   participants.push(creator);
			}
		}
		
		var displayTitle = "["+(item.itemType == "letter" ? "Letter" : "Interview");
		if(participants.length) {
			//var names = [creator.firstName ? creator.firstName+" "+creator.lastName : creator.lastName
			var names = [];
			for each(var creator in participants) {
				names.push(creator.lastName);
			}
			
			displayTitle += (item.itemType == "letter" ? " to " : " of ")+names[0];
			
			if(participants.length == 2) {
				displayTitle += " and "+names[1];
			} else if(participants.length == 3) {
				displayTitle += ", "+names[1]+", and "+names[2];
			} else if(participants.length > 3) {
				displayTitle += " et al.";
			}
		}
		
		return displayTitle+"]";
	} if (item.itemType == "case" && item.title && item.reporter) { // 'case' itemTypeID
		return item.title+' (' + item.reporter + ')';
	}
	return null;
}

function generateItem(item, zoteroType, resource) {
	var container = null;
	var containerElement = null;
	
	/** CORE FIELDS **/
	
	// type
	var type = null;
	if(zoteroType == "book") {
		type = n.bib+"Book";
	} else if (zoteroType == "bookSection") {
		type = n.bib+"BookSection";
		container = n.bib+"Book";
	} else if(zoteroType == "journalArticle") {
		type = n.bib+"Article";
		container = n.bib+"Journal";
	} else if(zoteroType == "magazineArticle") {
		type = n.bib+"Article";
		container = n.bib+"Periodical";
	} else if(zoteroType == "newspaperArticle") {
		type = n.bib+"Article";
		container = n.bib+"Newspaper";
	} else if(zoteroType == "thesis") {
		type = n.bib+"Thesis";
	} else if(zoteroType == "letter") {
		type = n.bib+"Letter";
	} else if(zoteroType == "manuscript") {
		type = n.bib+"Manuscript";
	} else if(zoteroType == "interview") {
		type = n.bib+"Interview";
	} else if(zoteroType == "film") {
		type = n.bib+"MotionPicture";
	} else if(zoteroType == "artwork") {
		type = n.bib+"Illustration";
	} else if(zoteroType == "webpage") {
		type = n.bib+"Document";
		container = n.z+"Website";
	} else if(zoteroType == "note") {
		type = n.bib+"Memo";
		if(!Zotero.getOption("exportNotes")) {
			return;
		}
	} else if(zoteroType == "attachment") {
		type = n.z+"Attachment";
	} else if(zoteroType == "report") {
		type = n.bib+"Report";
	} else if(zoteroType == "bill") {
		type = n.bib+"Legislation";
	} else if(zoteroType == "case") {
		type = n.bib+"Document";	// ??
		container = n.bib+"CourtReporter";
	} else if(zoteroType == "hearing") {
		type = n.bib+"Report";
	} else if(zoteroType == "patent") {
		type = n.bib+"Patent";
	} else if(zoteroType == "statute") {
		type = n.bib+"Legislation";
	} else if(zoteroType == "email") {
		type = n.bib+"Letter";
	} else if(zoteroType == "map") {
		type = n.bib+"Image";
	} else if(zoteroType == "blogPost") {
		type = n.bib+"Document";
		container = n.z+"Blog";
	} else if(zoteroType == "instantMessage") {
		type = n.bib+"Letter";
	} else if(zoteroType == "forumPost") {
		type = n.bib+"Document";
		container = n.z+"Forum";
	} else if(zoteroType == "audioRecording") {
		type = n.bib+"Recording";
	} else if(zoteroType == "presentation") {
		type = n.bib+"ConferenceProceedings";
	} else if(zoteroType == "videoRecording") {
		type = n.bib+"Recording";
	} else if(zoteroType == "tvBroadcast") {
		type = n.bib+"Recording";
	} else if(zoteroType == "radioBroadcast") {
		type = n.bib+"Recording";
	} else if(zoteroType == "podcast") {
		type = n.bib+"Recording";
	} else if(zoteroType == "computerProgram") {
		type = n.bib+"Data";
	}
	
	if(type) {
		Zotero.RDF.addStatement(resource, rdf+"type", type, false);
	}
	Zotero.RDF.addStatement(resource, n.z+"itemType", zoteroType, true);
	
	// generate section
	if(item.section) {
		var section = Zotero.RDF.newResource();
		// set section type
		Zotero.RDF.addStatement(section, rdf+"type", n.bib+"Part", false);
		// set section title
		Zotero.RDF.addStatement(section, n.dc+"title", item.section, true);
		// add relationship to resource
		Zotero.RDF.addStatement(resource, n.dcterms+"isPartOf", section, false);
	}
	
	// generate container
	if(container) {
/*		var testISSN = "urn:issn:"+encodeURI(item.ISSN);
		if(item.ISSN && !Zotero.RDF.getArcsIn(testISSN)) {
			// use ISSN as container URI if no other item is
			containerElement = testISSN;
		} else {*/
			containerElement = Zotero.RDF.newResource();
//		}
		// attach container to section (if exists) or resource
		Zotero.RDF.addStatement((section ? section : resource), n.dcterms+"isPartOf", containerElement, false);
		// add container type
		Zotero.RDF.addStatement(containerElement, rdf+"type", container, false);
	}
	
	// generate series
	if(item.series || item.seriesTitle || item.seriesText || item.seriesNumber) {
		var series = Zotero.RDF.newResource();
		// set series type
		Zotero.RDF.addStatement(series, rdf+"type", n.bib+"Series", false);
		// add relationship to resource
		Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.dcterms+"isPartOf", series, false);
	}
	
	// generate publisher
	// BEGIN NSF
	if(zoteroType == "nsfReviewer") {
		var organization = Zotero.RDF.newResource();
		Zotero.RDF.addStatement(organization, rdf+"type", n.vcard2+"Organization", false);
		Zotero.RDF.addStatement(resource, n.vcard2+"org", organization, false);
	} else {
	// END NSF
		if(item.publisher || item.distributor || item.label || item.company || item.institution || item.place) {
			var organization = Zotero.RDF.newResource();
			// set organization type
			Zotero.RDF.addStatement(organization, rdf+"type", n.foaf+"Organization", false);
			// add relationship to resource
			Zotero.RDF.addStatement(resource, n.dc+"publisher", organization, false);
		}
	}
	
	var typeProperties = ["reportType", "videoRecordingType", "letterType",
							"manuscriptType", "mapType", "thesisType", "websiteType",
							"audioRecordingType", "presentationType", "postType",
							"audioFileType"];
	var ignoreProperties = ["itemID", "itemType", "firstCreator", "dateAdded",
							"dateModified", "section", "sourceItemID"];
	
	// creators
	if(item.creators) {			// authors/editors/contributors
		var creatorContainers = new Object();
		
		// not yet in biblio
		var biblioCreatorTypes = ["author", "editor", "contributor"];
		
		for(var j in item.creators) {
			var creator = Zotero.RDF.newResource();
			Zotero.RDF.addStatement(creator, rdf+"type", n.foaf+"Person", false);
			// gee. an entire vocabulary for describing people, and these aren't even
			// standardized in it. oh well. using them anyway.
			Zotero.RDF.addStatement(creator, n.foaf+"surname", item.creators[j].lastName, true);
			if(item.creators[j].firstName) {
				Zotero.RDF.addStatement(creator, n.foaf+"givenname", item.creators[j].firstName, true);
			}
			
			if(biblioCreatorTypes.indexOf(item.creators[j].creatorType) != -1) {
				var cTag = n.bib+item.creators[j].creatorType+"s";
			} else {
				var cTag = n.z+item.creators[j].creatorType+"s";
			}
			
			if(!creatorContainers[cTag]) {
				var creatorResource = Zotero.RDF.newResource();
				// create new seq for author type
				creatorContainers[cTag] = Zotero.RDF.newContainer("seq", creatorResource);
				// attach container to resource
				Zotero.RDF.addStatement(resource, cTag, creatorResource, false);
			}
			Zotero.RDF.addContainerElement(creatorContainers[cTag], creator, false);
		}
	}
	
	// notes
	if(item.notes && Zotero.getOption("exportNotes")) {
		for(var j in item.notes) {
			var noteResource = itemResources[item.notes[j].itemID];
			
			// add note tag
			Zotero.RDF.addStatement(noteResource, rdf+"type", n.bib+"Memo", false);
			// add note item.notes
			Zotero.RDF.addStatement(noteResource, rdf+"value", item.notes[j].note, true);
			// add relationship between resource and note
			Zotero.RDF.addStatement(resource, n.dcterms+"isReferencedBy", noteResource, false);
			
			// Add see also info to RDF
			generateSeeAlso(noteResource, item.notes[j].seeAlso);
//			generateTags(noteResource, item.notes[j].tags);
		}
	}
	
	// child attachments
	if(item.attachments) {
		for each(var attachment in item.attachments) {
			var attachmentResource = itemResources[attachment.itemID];
			Zotero.RDF.addStatement(resource, n.link+"link", attachmentResource, false);
			generateItem(attachment, "attachment", attachmentResource);
		}
	}
	
	// relative file path for attachment items
	if(item.defaultPath) {	// For Zotero 3.0
		item.saveFile(item.defaultPath, true);
		Zotero.RDF.addStatement(resource, rdf+"resource", item.defaultPath, false);
	} else if(item.path) {	// For Zotero 2.1
		Zotero.RDF.addStatement(resource, rdf+"resource", item.path, false);
	}
    
	// seeAlso and tags
	if(item.seeAlso) generateSeeAlso(resource, item.seeAlso);
///	if(item.tags) generateTags(resource, item.tags);
	
	for(var property in item.uniqueFields) {
		var value = item[property];
		if(!value) continue;
		
		if(property == "title") {					// title
			// BEGIN NSF
			if(zoteroType == "nsfReviewer") {
				Zotero.RDF.addStatement(resource, n.vcard2+"fn", value, true);
			} else {
			// END NSF
				Zotero.RDF.addStatement(resource, n.dc+"title", value, true);
			}
		} else if(property == "source") {			// authors/editors/contributors
			Zotero.RDF.addStatement(resource, n.dc+"source", value, true);
		} else if(property == "url") {				// url
			// BEGIN NSF
			if(item.homepage) {
				Zotero.RDF.addStatement(resource, n.vcard2+"url", value, false);
			} else {
			// END NSF
				// add url as identifier
				var term = Zotero.RDF.newResource();
				// set term type
				Zotero.RDF.addStatement(term, rdf+"type", n.dcterms+"URI", false);
				// set url value
				Zotero.RDF.addStatement(term, rdf+"value", value, true);
				// add relationship to resource
				Zotero.RDF.addStatement(resource, n.dc+"identifier", term, false);
			}
		} else if(property == "accessionNumber") {	// accessionNumber as generic ID
			Zotero.RDF.addStatement(resource, n.dc+"identifier", value, true);
		} else if(property == "rights") {			// rights
			Zotero.RDF.addStatement(resource, n.dc+"rights", value, true);
		} else if(property == "edition" ||			// edition
		          property == "version") {			// version
			Zotero.RDF.addStatement(resource, n.prism+"edition", value, true);
		} else if(property == "date") {				// date
			if(item.dateSent) {
				Zotero.RDF.addStatement(resource, n.dcterms+"dateSubmitted", value, true);
			} else {
				Zotero.RDF.addStatement(resource, n.dc+"date", value, true);
			}
		} else if(property == "accessDate") {		// accessDate
			Zotero.RDF.addStatement(resource, n.dcterms+"dateSubmitted", value, true);
		} else if(property == "issueDate") {		// issueDate
			Zotero.RDF.addStatement(resource, n.dcterms+"issued", value, true);
		} else if(property == "pages") {			// pages
			// not yet part of biblio, but should be soon
			Zotero.RDF.addStatement(resource, n.bib+"pages", value, true);
		} else if(property == "extra") {			// extra
			Zotero.RDF.addStatement(resource, n.dc+"description", value, true);
		} else if(property == "mimeType") {			// mimeType
			Zotero.RDF.addStatement(resource, n.link+"type", value, true);
		} else if(property == "charset") {			// charset
			Zotero.RDF.addStatement(resource, n.link+"charset", value, true);
		// THE FOLLOWING ARE ALL PART OF THE CONTAINER
		} else if(property == "ISSN") {				// ISSN
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.dc+"identifier", "ISSN "+value, true);
		} else if(property == "ISBN") {				// ISBN
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.dc+"identifier", "ISBN "+value, true);
		} else if(property == "DOI") {				// DOI
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.dc+"identifier", "DOI "+value, true);
		} else if(property == "publicationTitle" ||	// publicationTitle
		          property == "reporter") {			// reporter
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.dc+"title", value, true);
		} else if(property == "journalAbbreviation") {	// journalAbbreviation
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.dcterms+"alternative", value, true);
		} else if(property == "volume") {			// volume
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.prism+"volume", value, true);
		} else if(property == "issue" ||			// issue
				  property == "number" ||			// number
				  property == "patentNumber") {		// patentNumber
			Zotero.RDF.addStatement((containerElement ? containerElement : resource), n.prism+"number", value, true);
		} else if(property == "callNumber") {
			var term = Zotero.RDF.newResource();
			// set term type
			Zotero.RDF.addStatement(term, rdf+"type", n.dcterms+"LCC", false);
			// set callNumber value
			Zotero.RDF.addStatement(term, rdf+"value", value, true);
			// add relationship to resource
			Zotero.RDF.addStatement(resource, n.dc+"subject", term, false);
		} else if(property == "abstractNote") {
			Zotero.RDF.addStatement(resource, n.dcterms+"abstract", value, true);
		// THE FOLLOWING ARE ALL PART OF THE SERIES
		} else if(property == "series") {			// series
			Zotero.RDF.addStatement(series, n.dc+"title", value, true);
		} else if(property == "seriesTitle") {		// seriesTitle
			Zotero.RDF.addStatement(series, n.dcterms+"alternative", value, true);
		} else if(property == "seriesText") {		// seriesText
			Zotero.RDF.addStatement(series, n.dc+"description", value, true);
		} else if(property == "seriesNumber") {		// seriesNumber
			Zotero.RDF.addStatement(series, n.dc+"identifier", value, true);
		// THE FOLLOWING ARE ALL PART OF THE PUBLISHER
		} else if(property == "publisher" ||		// publisher
		          property == "distributor" ||		// distributor (film)
		          property == "label" ||			// label (audioRecording)
		          property == "company" ||			// company (computerProgram)
		          property == "institution") {		// institution (report)
		    // BEGIN NSF
		    if(zoteroType == "nsfReviewer") {
		    	Zotero.RDF.addStatement(organization, n.vcard2+"organization-name", value, true);
		    } else {
		    // END NSF
				Zotero.RDF.addStatement(organization, n.foaf+"name", value, true);
			}
		} else if(property == "place") {			// place
			var address = Zotero.RDF.newResource();
			// set address type
			Zotero.RDF.addStatement(address, rdf+"type", n.vcard+"Address", false);
			// set address locality
			Zotero.RDF.addStatement(address, n.vcard+"locality", value, true);
			// add relationship to organization
			Zotero.RDF.addStatement(organization, n.vcard+"adr", address, false);
		} else if(property == "archiveLocation") {	// archiveLocation
			Zotero.RDF.addStatement(resource, n.dc+"coverage", value, true);
		} else if(property == "interviewMedium" ||
		          property == "artworkMedium") {	// medium
			Zotero.RDF.addStatement(resource, n.dcterms+"medium", value, true);
		} else if(property == "conferenceName") {
			var conference = Zotero.RDF.newResource();
			// set conference type
			Zotero.RDF.addStatement(conference, rdf+"type", n.bib+"Conference", false);
			// set conference title
			Zotero.RDF.addStatement(conference, n.dc+"title", value, true);
			// add relationship to conference
			Zotero.RDF.addStatement(resource, n.bib+"presentedAt", conference, false);
		} else if(typeProperties.indexOf(property) != -1) {
			Zotero.RDF.addStatement(resource, n.dc+"type", value, true);
		// THE FOLLOWING RELATE TO NOTES
		} else if(property == "note") {
			if(Zotero.getOption("exportNotes")) {
				if(item.itemType == "attachment") {
					Zotero.RDF.addStatement(resource, n.dc+"description", value, true);
				} else if(item.itemType == "note") {
					Zotero.RDF.addStatement(resource, rdf+"value", value, true);
				}
			}
		// BEGIN NSF
		} else if(property == "address") {
			var address = Zotero.RDF.newResource();
			Zotero.RDF.addStatement(address, rdf+"type", n.vcard2+"Address", false);
			Zotero.RDF.addStatement(address, n.vcard2+"label", value, true);
			Zotero.RDF.addStatement(resource, n.vcard2+"adr", address, false);
		} else if(property == "telephone") {
			Zotero.RDF.addStatement(resource, n.vcard2+"tel", value, true);
		} else if(property == "email") {
			Zotero.RDF.addStatement(resource, n.vcard2+"email", value, true);
		} else if(property == "accepted") {
			Zotero.RDF.addStatement(resource, n.dcterms+"dateAccepted", value, true);
		// END NSF
		// THIS CATCHES ALL REMAINING PROPERTIES
		} else if(ignoreProperties.indexOf(property) == -1) {
			Zotero.debug("Zotero RDF: using Zotero namespace for property "+property);
			Zotero.RDF.addStatement(resource, n.z+property, value, true);
		}
	}
	
	var displayTitle = getDisplayTitle(item);
	if(displayTitle) Zotero.RDF.addStatement(resource, n.z+"displayTitle", displayTitle, true);
}
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
	// add namespaces
	for(var i in n) {
		Zotero.RDF.addNamespace(i, n[i]);
	}
	
	// leave as global
	itemResources = new Array();
	var citekeys = new Object();
	// keep track of resources already assigned (in case two book items have the
	// same ISBN, or something like that)
	var usedResources = new Array();
	
	var items = new Array();
	
	// first, map each ID to a resource
	while(item = Zotero.nextItem()) {
		items.push(item);
		Zotero.debug(item);
		var citekey = buildCiteKey(item, citekeys);
		var testISBN = "urn:isbn:"+encodeURI(item.ISBN);
/*		if(item.ISBN && !usedResources[testISBN]) {
			itemResources[item.itemID] = testISBN;
			usedResources[itemResources[item.itemID]] = true;
		} else if(item.itemType != "attachment" && item.url && !usedResources[item.url]) {
			itemResources[item.itemID] = item.url;
			usedResources[itemResources[item.itemID]] = true;
		} else {
			// just specify a node ID
			itemResources[item.itemID] = "#item_"+item.itemID;
		}*/
		itemResources[item.itemID] = citekey;
		for(var j in item.notes) {
			itemResources[item.notes[j].itemID] = "#item_"+item.notes[j].itemID;
		}
		
		for each(var attachment in item.attachments) {
			// just specify a node ID
			itemResources[attachment.itemID] = "#item_"+attachment.itemID;
		}
	}
	
	for each(item in items) {
		// these items are global
		generateItem(item, item.itemType, itemResources[item.itemID]);
	}
	
	/** RDF COLLECTION STRUCTURE **/
	var collection;
	while(collection = Zotero.nextCollection()) {
		generateCollection(collection);
	}
}
