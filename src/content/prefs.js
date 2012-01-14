var NoSquintPrefs = {
    prefs: null,
    site: null,
    level: null,
    NoSquint: null,

    init: function(doc) {
        NoSquintPrefs.doc = doc;

        if (window.arguments) {
            NoSquintPrefs.site = window.arguments[0];
            NoSquintPrefs.level = window.arguments[1];
            NoSquintPrefs.url = window.arguments[2];
            NoSquintPrefs.NoSquint = window.arguments[3];
            NoSquintPrefs.prefs = NoSquintPrefs.NoSquint.prefs;
        } else {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(
                                      Components.interfaces.nsIPrefService);
            NoSquintPrefs.prefs = prefs.getBranch("extensions.nosquint.")
        }
        doc.getElementById("defaultZoomLevel").value = NoSquintPrefs.prefs.getIntPref("zoomlevel");
        doc.getElementById("zoomIncrement").value = NoSquintPrefs.prefs.getIntPref("zoomIncrement");
        doc.getElementById("rememberSites").selectedIndex = NoSquintPrefs.prefs.getBoolPref("rememberSites") ? 1 : 0;
        doc.getElementById("showStatus").checked = !NoSquintPrefs.prefs.getBoolPref("hideStatus");
        doc.getElementById("wheelZoomEnabled").checked = NoSquintPrefs.prefs.getBoolPref("wheelZoomEnabled");

        var forget_cb = doc.getElementById("siteForget");
        var months = NoSquintPrefs.prefs.getIntPref("forgetMonths");
        //if (months < 0 || months > 12 || months % 3 != 0)
        //    months = 6;
        forget_cb.checked = (months != 0);
        if (months)
            doc.getElementById("siteForget-menu").value = months;
        forget_cb.addEventListener("CheckboxStateChange", NoSquintPrefs.forgetMonthsChecked, false);
        NoSquintPrefs.forgetMonthsChecked();

        NoSquintPrefs.sitesRadioSelect();
        NoSquintPrefs.parseExceptions();
        NoSquintPrefs.excListSelect();
    },

    parseExceptions: function() {
        var exstr = NoSquintPrefs.prefs.getCharPref("exceptions");
        // Trim whitespace and split on space.
        exlist = exstr.replace(/(^\s+|\s+$)/g, "").split(" ");
        for (var i = 0; i < exlist.length; i++) {
            if (exlist[i])
                NoSquintPrefs.exceptionsListAdd(exlist[i], false);
        }
        NoSquintPrefs.doc.getElementById("exceptionsList")._changed = false;
    },

    exceptionsListAdd: function(pattern, check_dupe) {
        // Strip URI scheme from pattern (if it exists)
        pattern = pattern.replace(/^\w+:\/\//, '');

        var listbox = NoSquintPrefs.doc.getElementById("exceptionsList");
        if (check_dupe) {
            for (var i = 0; i < listbox.childNodes.length; i++) {
                var node = listbox.childNodes[i];
                if (node.childNodes[0].getAttribute("label") == pattern) {
                    var bundle = NoSquintPrefs.doc.getElementById("nosquint-prefs-bundle");
                    alert(bundle.getString('patternExists'));
                    return;
                }
            }
        }

        var node = NoSquintPrefs.doc.createElement("listitem");
        var li1 = NoSquintPrefs.doc.createElement("listcell");
        li1.setAttribute("label", pattern);
        node.appendChild(li1);
        listbox.appendChild(node);
        node.addEventListener("dblclick", NoSquintPrefs.buttonEditException, false);
        listbox._changed = true;
    },

    textPatternKeyPress: function(event) {
        if (event.keyCode == 13) {
            NoSquintPrefs.buttonAddException();
            return false;
        }
    },

    textPatternChange: function() {
        var pattern = NoSquintPrefs.doc.getElementById("pattern").value;
        var exc_button = NoSquintPrefs.doc.getElementById("exceptionAdd-button");
        exc_button.disabled = (pattern == '');
        //var grp_button = NoSquintPrefs.doc.getElementById("groupAdd-button");
        //exc_button.disabled = grp_button.disabled = (pattern == '');
    },

    excListKeyPress: function(event) {
        if (event.keyCode == 13) {
            NoSquintPrefs.buttonEditException();
            return false;
        }
    },

    excListSelect: function() {
        var btn = NoSquintPrefs.doc.getElementById("exceptionRemove-button");
        var listbox = NoSquintPrefs.doc.getElementById("exceptionsList");
        btn.disabled = (listbox.selectedItems.length == 0);

        var btn = NoSquintPrefs.doc.getElementById("exceptionEdit-button");
        btn.disabled = listbox.selectedItems.length != 1;
    },

    buttonCopyFromURL: function() {
        var pattern = NoSquintPrefs.doc.getElementById("pattern");
        pattern.value = NoSquintPrefs.url;
        NoSquintPrefs.textPatternChange();
    },

    buttonAddException: function() {
        var pattern = NoSquintPrefs.doc.getElementById("pattern");
        NoSquintPrefs.exceptionsListAdd(pattern.value, true);
        pattern.value = '';
        NoSquintPrefs.textPatternChange();
    },


    buttonEditException: function() {
        var listbox = NoSquintPrefs.doc.getElementById("exceptionsList");
        var item = listbox.selectedItem;
        var pattern = item.childNodes[0].getAttribute('label');
        var bundle = NoSquintPrefs.doc.getElementById("nosquint-prefs-bundle");
        var new_pattern = prompt(bundle.getString('editPrompt'),  pattern, bundle.getString('editTitle'));
        if (new_pattern != null && new_pattern != pattern) {
            item.childNodes[0].setAttribute('label', new_pattern);
            listbox._changed = true;
        }
    },

    buttonRemoveException: function() {
        var listbox = NoSquintPrefs.doc.getElementById("exceptionsList");
        while (listbox.selectedItems.length)
            listbox.removeChild(listbox.selectedItems[0]);
        listbox._changed = true;
    },

    forgetMonthsChecked: function() {
        var checked = NoSquintPrefs.doc.getElementById('siteForget').checked;
        NoSquintPrefs.doc.getElementById('siteForget-menu').disabled = !checked;
    },

    sitesRadioSelect: function() {
        var doc = NoSquintPrefs.doc;
        var label = doc.getElementById("siteZoom-label");
        if (NoSquintPrefs.site) {
            if (label.value.search("\\(") == -1) {
                label.value = label.value.replace(":", " (" + NoSquintPrefs.site + "):");
                doc.getElementById("siteZoom").value = NoSquintPrefs.level;
            }
        }
        else
            doc.getElementById("siteZoom-box").style.display = "none";
        if (!NoSquintPrefs.url)
            doc.getElementById("copyURL-button").style.display = "none";

        var disabled = doc.getElementById("rememberSites").selectedIndex == 0;
        NoSquintPrefs.enableTree(doc.getElementById("siteZoom-box"), disabled);
        NoSquintPrefs.enableTree(doc.getElementById("siteForget-box"), disabled);
    },

    enableTree: function(node, state) {
        for (var i = 0; i < node.childNodes.length; i++) {
            var child = node.childNodes[i];
            if (state && child.disabled == false || child.disabled == true)
                child.disabled = state;
            if (child.childNodes.length)
                NoSquintPrefs.enableTree(child, state);
        }
    },

    buttonSitesUseDefault: function() {
        NoSquintPrefs.doc.getElementById("siteZoom").value = "default";
    },

    help: function() {
        window.openDialog("chrome://nosquint/content/help.xul", "NoSquint Help", "chrome");
    },

    close: function() {
        var doc = NoSquintPrefs.doc;
        NoSquintPrefs.prefs.setBoolPref("hideStatus", !doc.getElementById("showStatus").checked);
        NoSquintPrefs.prefs.setBoolPref("wheelZoomEnabled", doc.getElementById("wheelZoomEnabled").checked);
        NoSquintPrefs.prefs.setIntPref("zoomlevel", doc.getElementById("defaultZoomLevel").value);
        NoSquintPrefs.prefs.setIntPref("zoomIncrement", doc.getElementById("zoomIncrement").value);
        var val = doc.getElementById("rememberSites").selectedIndex == 0 ? false : true;
        NoSquintPrefs.prefs.setBoolPref("rememberSites", val);

        var listbox = NoSquintPrefs.doc.getElementById("exceptionsList");
        if (listbox._changed) {
            var exceptions = [];
            for (var i = 0; i < listbox.getRowCount(); i++) {
                var item = listbox.getItemAtIndex(i);
                var pattern = item.childNodes[0].getAttribute('label');
                exceptions.push(pattern);
            }
            NoSquintPrefs.prefs.setCharPref("exceptions", exceptions.join(' '));
        }
        if (!NoSquintPrefs.doc.getElementById("siteForget").checked)
            NoSquintPrefs.prefs.setIntPref("forgetMonths", 0);
        else
            NoSquintPrefs.prefs.setIntPref("forgetMonths", NoSquintPrefs.doc.getElementById("siteForget-menu").value);

        if (!NoSquintPrefs.NoSquint)
            return;

        var level = doc.getElementById("siteZoom").value;
        if (NoSquintPrefs.NoSquint.updateSiteList(NoSquintPrefs.site, level))
            NoSquintPrefs.NoSquint.queueZoomAll();
            //NoSquintPrefs.NoSquint.zoomAll(false);
    }
};
