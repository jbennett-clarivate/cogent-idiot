/*globals jQuery:false,GLOBAL_WARNING_ARRAY:false,HANDLE_PASTE:false,HANDLE_BAD_DATA:false,FILE_TO_DIV:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	$(document).ready(function () {
		var resizeTimer;
		var heightSpeed = 100;

		function escapeRegExp(string) {
			return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
		}

		var generateSplitRegex = function (spaces, tabs, commas, semicolons, singlequote, doublequote, customchar) {
			var tabReg = "\\t";
			var spaceReg = " ";
			var semicolonReg = ";";
			var commaReg = ",";
			var singlequoteReg = "'";
			var doublequoteReg = "\"";
			var combinedRegex = ["\\n", "\\r"];
			if (spaces) {
				combinedRegex.push(spaceReg);
			}
			if (tabs) {
				combinedRegex.push(tabReg);
			}
			if (commas) {
				combinedRegex.push(commaReg);
			}
			if (semicolons) {
				combinedRegex.push(semicolonReg);
			}
			if (singlequote) {
				combinedRegex.push(singlequoteReg);
			}
			if (doublequote) {
				combinedRegex.push(doublequoteReg);
			}
			if (customchar) {
				combinedRegex.push(escapeRegExp(customchar));
			}
			var newRegex = combinedRegex.join("");
			return new RegExp("[" + newRegex + "]+", "g");
		};

		var resizeElements = function () {
			var portHeight = $(window).height();
			var customHeight = Math.max(100, portHeight - 333) + "px";
			$("#theinputlist").animate({
				height: customHeight
			}, heightSpeed);
			$("#thecleanlist").animate({
				height: customHeight
			}, heightSpeed);
			$("#thedirtylist").animate({
				height: customHeight
			}, heightSpeed);
		};
		resizeElements();
		$(window).on("resize", function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () {
				resizeElements();
			}, heightSpeed);
		});

		$("#fix-it").on("click", function () {
			var theInputList = $("#theinputlist");
			var theCleanList = $("#thecleanlist");
			var theDirtyList = $("#thedirtylist");
			var theInputListCount = $("#theinputlistspan");
			var theCleanListCount = $("#thecleanlistspan");
			var theDirtyListCount = $("#thedirtylistspan");
			var lowercase = $("#lowercase");
			var spaces = $("#spaces");
			var tabs = $("#tabs");
			var commas = $("#commas");
			var semicolons = $("#semicolons");
			var singlequote = $("#singlequote");
			var doublequote = $("#doublequote");
			var customchar = $("#customchar");
			if (typeof Storage !== "undefined") {
				localStorage.setItem("cleanList", theInputList.html());
				localStorage.setItem("cleanListLower", lowercase.is(":checked"));
				localStorage.setItem("delimitOnListSpaces", spaces.is(":checked"));
				localStorage.setItem("delimitOnListTab", tabs.is(":checked"));
				localStorage.setItem("delimitOnListCommas", commas.is(":checked"));
				localStorage.setItem("delimitOnListSemicolons", semicolons.is(":checked"));
				localStorage.setItem("delimitOnListSinglequote", singlequote.is(":checked"));
				localStorage.setItem("delimitOnListDoublequote", doublequote.is(":checked"));
				localStorage.setItem("delimitOnListCustomChar", customchar.val());
			}
			// Reset the tool
			theCleanList.text("");
			theDirtyList.text("");
			theInputListCount.text("");
			theCleanListCount.text("");
			theDirtyListCount.text("");

			var cleanCount = 0;
			var dirtyCount = 0;
			if (theInputList && theInputList.html() !== "") {
				var theListText = theInputList.html().trim()
				.replace(/<br(\s*)\/*>/ig, "\n") // replace single line-breaks
				.replace(/<[p|div]\s/ig, "\n$0") // add a line break before all div and p tags
				.replace(/(<([^>]+)>)/ig, "\n");
				theListText = $("<div/>").html(theListText).text();
				var theListArray;
				var map = {};
				var cleanList = "";
				var dirtyList = "";
				if (lowercase.is(":checked")) {
					theListText = theListText.toLowerCase();
				}
				theListArray = theListText.split(generateSplitRegex(spaces.is(":checked"), tabs.is(":checked"), commas.is(":checked"), semicolons.is(":checked"), singlequote.is(":checked"), doublequote.is(":checked"), customchar.val()));
				var trimedVal;
				$.each(theListArray, function (index, value) {
					trimedVal = value.trim();
					if ("" === trimedVal) {
						return;
					}
					if (map[trimedVal] !== 1) {
						cleanCount++;
					} else {
						dirtyList += value + "\n";
						dirtyCount++;
					}
					map[trimedVal] = 1;
				});
				for (var key in map) {
					if (map.hasOwnProperty(key)) {
						cleanList += key + "\n";
					}
				}
				theInputListCount.text(cleanCount + dirtyCount);
				theCleanList.empty().append($("<div/>").text(cleanList.trim()).html().split(/\n/g).join("<br />"));
				theCleanListCount.text(cleanCount);
				theDirtyList.empty().append($("<div/>").text(dirtyList).html().split(/\n/g).join("<br />"));
				theDirtyListCount.text(dirtyCount);
			}
		});
		var theInputList = document.getElementById("theinputlist");
		theInputList.onpaste = function (e) {
			HANDLE_PASTE(e, theInputList);
		};
		document.getElementById("theinputlist").ondrop = function (e) {
			HANDLE_BAD_DATA(e, GLOBAL_WARNING_ARRAY[Math.floor(Math.random() * GLOBAL_WARNING_ARRAY.length)]);
		};
		$("div[tabindex='20']").focus();
		$("input[type='file']").on("change", function (event) {
			var self = $(this);
			var destinationId = self.attr("id").replace("file_", "");
			FILE_TO_DIV(event, destinationId);
		});

		var list = document.getElementsByTagName("script");
		var i = list.length, jumpship = false;
		var re1 = "(?:http|https)(?::\\/{2}[\\w]+)((?:[\\/|\\.]?)(?:[^\\s\"]*))";
		var p = new RegExp(re1, ["i"]);
		while (i--) {
			var m = p.exec(list[i].src);
			if (m === null) {
				continue;
			} else {
				if (m[1] && m[1].indexOf("js/jumpship.js") !== -1) {
					jumpship = true;
					break;
				}
			}
		}

		if (!jumpship) {
			$.getScript("https://brightmatter.tools/js/jumpship.js", function () {
				window.STAY_ON_SITE();
			});
		}
	});

	(function () {
		if (typeof Storage !== "undefined") {
			var theInputList = $("#theinputlist");
			var lowercase = $("#lowercase");
			var spaces = $("#spaces");
			var tabs = $("#tabs");
			var commas = $("#commas");
			var semicolons = $("#semicolons");
			var singlequote = $("#singlequote");
			var doublequote = $("#doublequote");
			var customchar = $("#customchar");
			theInputList.html(localStorage.cleanList);
			if (localStorage.cleanListLower) {
				lowercase.prop("checked", localStorage.cleanListLower === "true");
			}
			if (localStorage.delimitOnListSpaces) {
				spaces.prop("checked", localStorage.delimitOnListSpaces === "true");
			}
			if (localStorage.delimitOnListTabs) {
				tabs.prop("checked", localStorage.delimitOnListTabs === "true");
			}
			if (localStorage.delimitOnListCommas) {
				commas.prop("checked", localStorage.delimitOnListCommas === "true");
			}
			if (localStorage.delimitOnListSemicolons) {
				semicolons.prop("checked", localStorage.delimitOnListSemicolons === "true");
			}
			if (localStorage.delimitOnListSinglequote) {
				singlequote.prop("checked", localStorage.delimitOnListSinglequote === "true");
			}
			if (localStorage.delimitOnListDoublequote) {
				doublequote.prop("checked", localStorage.delimitOnListDoublequote === "true");
			}
			if (localStorage.delimitOnListCustomChar) {
				customchar.val(localStorage.delimitOnListCustomChar);
			}
		}
	})();
})(jQuery);
//# sourceURL=listclean.js