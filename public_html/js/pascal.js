/*globals jQuery:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	var displayTriangleTimer;
	var setupMaxInputRangeTimer;
	var fullTriangle;
	$(document).ready(function () {
		var buildTriangle = function (nInt) {
			var fullPascal = [];
			var innerArray = [];
			innerArray.push([1]);
			fullPascal.push(innerArray);
			for (var i = 1; i < nInt + 1; ++i) {
				innerArray = [];
				innerArray.push(1);
				for (var j = 1; j < i; ++j) {
					innerArray.push(fullPascal[i - 1][j - 1] + fullPascal[i - 1][j]);
				}
				innerArray.push(1);
				fullPascal.push(innerArray);
			}
			return fullPascal;
		};
		fullTriangle = buildTriangle(45);

		var pascal = function (nInt, kInt) {
			if (nInt >= 0 && kInt <= nInt) {
				return fullTriangle.slice(0, nInt + 1);
			}
			return [];
		};

		var displayTriangle = function () {
			var landing = $("#landing");
			var nInt = parseInt($(".digitonly[placeholder=\"N\"]").val());
			var kInt = parseInt($(".digitonly[placeholder=\"K\"]").val());
			var $nValObj = $("#nVal");
			var $kValObj = $("#kVal");
			var $nChooseKObj = $("#nChooseK");
			$nValObj.html(nInt);
			$kValObj.html(kInt);
			landing.empty();
			if (nInt > 45 || !(nInt >= 0 && kInt <= nInt)) {
				return false;
			}
			var dataArray = pascal(nInt, kInt);
			var containerSize = $(".form-horizontal").width();
			var elemCount = dataArray[nInt].join(" ").length;
			var textSize = Math.min(1, containerSize / (elemCount * 10));
			if (dataArray.length < 1 || textSize < 0.33) {
				return false;
			}
			var innerArray = null;
			var fullhtml = "";
			for (var i = 0; i <= nInt; i++) {
				innerArray = dataArray[i];
				fullhtml += "<div style='line-height: " + (textSize + 0.33) + "em;'>";
				for (var j = 0; j < innerArray.length; j++) {
					fullhtml += "<span";
					if (nInt === i && kInt === j) {
						$nChooseKObj.html(innerArray[j].toLocaleString());
						fullhtml += " class='highlightValue'";
					}
					fullhtml += " style='font-size: " + textSize + "em;'> ";
					fullhtml += innerArray[j] + " </span>";
				}
				fullhtml += "</div>";
			}
			landing.append(fullhtml);
		};

		var setupMaxInputRange = function () {
			var containerSizeSetMax = $(".form-horizontal").width();
			for (var i = 45; i >= 0; i--) {
				var elemCountSetMax = pascal(i, 0)[i].join(" ").length;
				var textSizeSetMax = Math.min(1, containerSizeSetMax / (elemCountSetMax * 10));
				if (textSizeSetMax > 0.33) {
					var $digitonly = $(".digitonly");
					$digitonly.attr("max", i);
					$digitonly.val(i);
					displayTriangle();
					break;
				}
			}
		};

		$(".digitonly").on("input", function (e) {
			var inputObj = $(this);
			var inputStr = inputObj.val();
			inputStr = inputStr.replace(/\D/g, "");
			inputObj.val(inputStr);
			displayTriangle();
		});

		$(window).on("resize", function () {
			if (displayTriangleTimer) {
				clearTimeout(displayTriangleTimer);
			}
			if (setupMaxInputRangeTimer) {
				clearTimeout(setupMaxInputRangeTimer);
			}
			displayTriangleTimer = setTimeout(displayTriangle, 100);
			setupMaxInputRangeTimer = setTimeout(setupMaxInputRange, 100);
		});

		var list = document.getElementsByTagName("script");
		var i = list.length, jumpship = false;
		var re1 = "(?:http|https)(?::\\/{2}[\\w]+)((?:[\\/|\\.]?)(?:[^\\s\"]*))";
		var p = new RegExp(re1, "i");
		while (i--) {
			var m = p.exec(list[i].src);
			if (m !== null) {
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

		setupMaxInputRange();
	});
})(jQuery);
//# sourceURL=pascal.js