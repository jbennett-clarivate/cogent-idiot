/*globals jQuery:false,GLOBAL_WARNING_ARRAY:false,HANDLE_PASTE:false,HANDLE_BAD_DATA:false,FILE_TO_DIV:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	$(document).ready(function () {
		var resizeTimer;
		var heightSpeed = 100;
		var resizeElements = function () {
			var portHeight = $(window).height();
			var portWidth = $(window).width();
			var customHeight = Math.max(100, portHeight - (portWidth < 768 ? 550 : 525)) + "px";
			var heightSpeed = 100;
			$("#output_list_a_not_b").animate({
				height: customHeight
			}, heightSpeed);
			$("#output_list_b_not_a").animate({
				height: customHeight
			}, heightSpeed);
			$("#output_list_intersection").animate({
				height: customHeight
			}, heightSpeed);
			$("#output_list_union").animate({
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

		$("#compare-it").on("click", function () {
			// Setup variables
			var inputListA = $("#input_list_a");
			var inputListB = $("#input_list_b");
			if (!inputListA || !inputListB) {
				return false;
			}
			var inputListAText = inputListA.html().trim()
			.replace(/<br(\s*)\/*>/ig, "\n") // replace single line-breaks
			.replace(/<[p|div]\s/ig, "\n$0") // add a line break before all div and p tags
			.replace(/(<([^>]+)>)/ig, "\n");
			inputListAText = $("<div/>").html(inputListAText).text();
			var inputListBText = inputListB.html().trim()
			.replace(/<br(\s*)\/*>/ig, "\n") // replace single line-breaks
			.replace(/<[p|div]\s/ig, "\n$0") // add a line break before all div and p tags
			.replace(/(<([^>]+)>)/ig, "\n");
			inputListBText = $("<div/>").html(inputListBText).text();
			if (inputListAText.length <= 0 || inputListBText.length <= 0) {
				return false;
			}
			var outputListA = $("#output_list_a_not_b");
			var outputListB = $("#output_list_b_not_a");
			var outputListIntersection = $("#output_list_intersection");
			var outputListUnion = $("#output_list_union");

			var inputListACount = $("#input_list_a_span");
			var inputListBCount = $("#input_list_b_span");
			var outputListACount = $("#output_list_a_span");
			var outputListBCount = $("#output_list_b_span");
			var outputListIntersectionCount = $("#output_list_intersection_span");
			var outputListUnionCount = $("#output_list_union_span");

			// Reset the tool
			outputListA.val("");
			outputListB.val("");
			outputListIntersection.val("");
			outputListUnion.val("");
			inputListACount.text("");
			inputListBCount.text("");
			outputListACount.text("");
			outputListBCount.text("");
			outputListIntersectionCount.text("");
			outputListUnionCount.text("");

			var lowerVal = $("#lowercase").is(":checked");
			var tabVal = $("#tabs").is(":checked");
			var spaceVal = $("#spaces").is(":checked");
			var semicolonVal = $("#semicolons").is(":checked");
			var commaVal = $("#commas").is(":checked");
			var squoteVal = $("#singlequote").is(":checked");
			var dquoteVal = $("#doublequote").is(":checked");
			if (typeof Storage !== "undefined") {
				localStorage.setItem("compareListA", inputListA.html());
				localStorage.setItem("compareListB", inputListB.html());
				localStorage.setItem("compareListLower", lowerVal);
				localStorage.setItem("compareListTab", tabVal);
				localStorage.setItem("compareListSpaces", spaceVal);
				localStorage.setItem("compareListSemicolons", semicolonVal);
				localStorage.setItem("compareListCommas", commaVal);
				localStorage.setItem("compareListSinglequote", squoteVal);
				localStorage.setItem("compareListDoublequote", dquoteVal);
			}

			inputListAText = dedupe(inputListAText, lowerVal, tabVal, spaceVal, semicolonVal, commaVal, squoteVal, dquoteVal);
			inputListACount.text(inputListAText.split(/\n/g).length);

			inputListBText = dedupe(inputListBText, lowerVal, tabVal, spaceVal, semicolonVal, commaVal, squoteVal, dquoteVal);
			inputListBCount.text(inputListBText.split(/\n/g).length);

			var outputListAText = uniqueToLeftList(inputListAText, inputListBText);
			outputListACount.text((outputListAText.length < 1 ? 0 : outputListAText.split(/\n/g).length));

			var outputListBText = uniqueToLeftList(inputListBText, inputListAText);
			outputListBCount.text((outputListBText.length < 1 ? 0 : outputListBText.split(/\n/g).length));

			var outputListIntersectionText = intersection(inputListAText, inputListBText);
			outputListIntersectionCount.text((outputListIntersectionText.length < 1 ? 0 : outputListIntersectionText.split(/\n/g).length));

			var outputListUnionText = union(inputListAText, inputListBText, tabVal, spaceVal, semicolonVal, commaVal, squoteVal, dquoteVal);
			outputListUnionCount.text((outputListUnionText.length < 1 ? 0 : outputListUnionText.split(/\n/g).length));

			outputListA.empty().append($("<div/>").text(outputListAText.trim()).html().split(/\n/g).join("<br />"));
			outputListB.empty().append($("<div/>").text(outputListBText.trim()).html().split(/\n/g).join("<br />"));
			outputListIntersection.empty().append($("<div/>").text(outputListIntersectionText.trim()).html().split(/\n/g).join("<br />"));
			outputListUnion.empty().append($("<div/>").text(outputListUnionText.trim()).html().split(/\n/g).join("<br />"));
			return true;
		});

		function union(left, right, tabVal, spaceVal, semicolonVal, commaVal, squoteVal, dquoteVal) {
			if (left && right) {
				return dedupe(left + "\n" + right, false, tabVal, spaceVal, semicolonVal, commaVal, squoteVal, dquoteVal);
			}
			return "ERROR!";
		}

		function intersection(left, right) {
			if (left && right) {
				var leftListArray;
				var rightListArray;
				var map = {};
				var intersectionList = "";
				leftListArray = left.split(/\n/g);
				rightListArray = right.split(/\n/g);
				var trimed;
				$.each(rightListArray, function (index, value) {
					map[value.trim()] = 1;
				});
				$.each(leftListArray, function (index, value) {
					trimed = value.trim();
					if (map[trimed] === 1) {
						intersectionList += trimed + "\n";
					}
				});
				return intersectionList.trim();
			}
			return "";
		}

		function uniqueToLeftList(left, right) {
			if (left && right) {
				var leftListArray;
				var rightListArray;
				var map = {};
				var uniqueList = "";
				leftListArray = left.split("\n");
				rightListArray = right.split("\n");
				$.each(rightListArray, function (index, value) {
					map[value] = 1;
				});
				$.each(leftListArray, function (index, value) {
					if (map[value] !== 1) {
						uniqueList += value + "\n";
					}
				});
				return uniqueList.trim();
			}
			return "ERROR!";
		}

		function dedupe(srcInputList, lowercase, tabVal, spaceVal, semicolonVal, commaVal, squoteVal, dquoteVal) {
			var inputList;
			if (srcInputList) {
				inputList = (lowercase ? srcInputList.toLowerCase() : srcInputList).trim();
				var tabReg = "\\t";
				var spaceReg = " ";
				var semicolonReg = ";";
				var commaReg = ",";
				var singlequoteReg = "'";
				var doublequoteReg = "\"";
				var combinedRegex = ["\\n", "\\r"];
				if (tabVal) {
					combinedRegex.push(tabReg);
				}
				if (spaceVal) {
					combinedRegex.push(spaceReg);
				}
				if (semicolonVal) {
					combinedRegex.push(semicolonReg);
				}
				if (commaVal) {
					combinedRegex.push(commaReg);
				}
				if (squoteVal) {
					combinedRegex.push(singlequoteReg);
				}
				if (dquoteVal) {
					combinedRegex.push(doublequoteReg);
				}
				var newRegex = combinedRegex.join("|");
				newRegex = "(" + newRegex + ")+";
				var re = new RegExp(newRegex, "g");
				var theListArray = inputList.replace(re, "\n").split(/\n/g);
				var map = {};
				var cleanList = "";
				var trimed;
				$.each(theListArray, function (index, value) {
					trimed = value.trim();
					if ("" !== trimed) {
						if (map[trimed] !== 1) {
							cleanList += value + "\n";
						}
						map[trimed] = 1;
					}
				});
				return cleanList.trim();
			}
			return "ERROR!";
		}

		var listA = document.getElementById("input_list_a");
		var listB = document.getElementById("input_list_b");
		listA.onpaste = function (e) {
			HANDLE_PASTE(e, listA);
		};
		listB.onpaste = function (e) {
			HANDLE_PASTE(e, listB);
		};
		listA.ondrop = function (e) {
			HANDLE_BAD_DATA(e, GLOBAL_WARNING_ARRAY[Math.floor(Math.random() * GLOBAL_WARNING_ARRAY.length)]);
		};
		listB.ondrop = function (e) {
			HANDLE_BAD_DATA(e, GLOBAL_WARNING_ARRAY[Math.floor(Math.random() * GLOBAL_WARNING_ARRAY.length)]);
		};

		$("div[tabindex='10']").focus();
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
			var inputListA = $("#input_list_a");
			var inputListB = $("#input_list_b");
			var lowercase = $("#lowercase");
			var spaces = $("#spaces");
			var tabs = $("#tabs");
			var commas = $("#commas");
			var semicolons = $("#semicolons");
			var singlequote = $("#singlequote");
			var doublequote = $("#doublequote");
			inputListA.html(localStorage.compareListA);
			inputListB.html(localStorage.compareListB);
			if (localStorage.compareListLower) {
				lowercase.prop("checked", localStorage.compareListLower === "true");
			}
			if (localStorage.compareListSpaces) {
				spaces.prop("checked", localStorage.compareListSpaces === "true");
			}
			if (localStorage.compareListTabs) {
				tabs.prop("checked", localStorage.compareListTabs === "true");
			}
			if (localStorage.compareListCommas) {
				commas.prop("checked", localStorage.compareListCommas === "true");
			}
			if (localStorage.compareListSemicolons) {
				semicolons.prop("checked", localStorage.compareListSemicolons === "true");
			}
			if (localStorage.compareListSinglequote) {
				singlequote.prop("checked", localStorage.compareListSinglequote === "true");
			}
			if (localStorage.compareListDoublequote) {
				doublequote.prop("checked", localStorage.compareListDoublequote === "true");
			}
		}
	})();
})(jQuery);
//# sourceURL=listcomparator.js