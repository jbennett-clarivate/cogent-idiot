/*globals jQuery:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	$(document).ready(function () {
		var resizeTimer;
		var heightSpeed = 100;
		var alphaString = "abcdefghijklmnopqrstuvwxyz";
		var numericString = "0123456789";
		var resizeElements = function () {
			var portHeight = $(window).height();
			var portWidth = $(window).width();
			var customHeight = Math.max(100, portHeight - (portWidth < 768 ? 555 : 400)) + "px";
			$("#theiterationlist").animate({
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
		var arbitraryCharacterArray;
		var incrementCharacterByIndexRecursive = function (startingValArray, index) {
			if (index < 0) {
				return "";
			}
			var theCurrentCharacter = startingValArray[index];
			if (theCurrentCharacter === arbitraryCharacterArray[arbitraryCharacterArray.length - 1]) {
				startingValArray[index] = arbitraryCharacterArray[0];
				if (index === 0) {
					return arbitraryCharacterArray[1] + startingValArray.join("");
				}
				return incrementCharacterByIndexRecursive(startingValArray, --index);
			} else {
				var myIndexValue = arbitraryCharacterArray.indexOf(theCurrentCharacter);
				startingValArray[index] = arbitraryCharacterArray[myIndexValue + 1];
			}
			return startingValArray.join("");
		};

		var saveLocalStorage = function (arbitraryCharacterInput, numberOfIterations, prefixInput, bodyInput, suffixInput, alphas, numerics) {
			if (typeof Storage !== "undefined") {
				localStorage.setItem("arbitrarycharacterinput", arbitraryCharacterInput);
				localStorage.setItem("numberofiterations", numberOfIterations);
				localStorage.setItem("prefixinput", prefixInput);
				localStorage.setItem("bodyinput", bodyInput);
				localStorage.setItem("suffixinput", suffixInput);
				localStorage.setItem("iterateoveralphas", alphas);
				localStorage.setItem("iterateovernumerics", numerics);
			}
		};

		$("#generate-it").on("click", function () {
			var arbitraryCharacterInput = $("#arbitraryCharacterInput").val();
			var numberOfIterations = $("#numberOfIterations").val();
			var prefixInput = $("#prefixInput").val();
			var bodyInput = $("#bodyInput").val();
			var suffixInput = $("#suffixInput").val();
			var $theiterationlistObj = $("#theiterationlist");
			var $alphaObj = $("#alpha");
			var $numericObj = $("#numeric");
			$theiterationlistObj.html("");
			if (arbitraryCharacterInput.length < 1) {
				if ($numericObj.is(":checked")) {
					arbitraryCharacterInput += numericString;
				}
				if ($alphaObj.is(":checked")) {
					arbitraryCharacterInput += alphaString;
				}
			}

			var quantityWithinArbitraryCharacters = new RegExp("^[" + arbitraryCharacterInput + "]+$");
			if (!quantityWithinArbitraryCharacters.test(bodyInput)) {
				return false;
			}
			if (typeof arbitraryCharacterArray === "undefined" || arbitraryCharacterArray.length < 1) {
				if (arbitraryCharacterInput.length < 1) {
					saveLocalStorage(arbitraryCharacterInput, numberOfIterations, prefixInput, bodyInput, suffixInput, $alphaObj.is(":checked"), $numericObj.is(":checked"));
					return;
				}
				arbitraryCharacterArray = arbitraryCharacterInput.split("");
			}
			if (/^\d+$/.test(numberOfIterations)) {
				var i = 0;
				var endVal = parseInt(numberOfIterations) - 1;
				$theiterationlistObj.append(prefixInput + bodyInput + suffixInput);
				while (i < endVal) {
					i++;
					bodyInput = incrementCharacterByIndexRecursive(bodyInput.split(""), bodyInput.length - 1);
					$theiterationlistObj.append("<br />" + prefixInput + bodyInput + suffixInput);
				}
			}
			saveLocalStorage(arbitraryCharacterInput, numberOfIterations, prefixInput, bodyInput, suffixInput, $alphaObj.is(":checked"), $numericObj.is(":checked"));
			arbitraryCharacterArray = [];
		});
		$("input[tabindex='61']").focus();

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
			var $arbitraryCharacterInputObj = $("#arbitraryCharacterInput");
			var $numberOfIterationsObj = $("#numberOfIterations");
			var $prefixInputObj = $("#prefixInput");
			var $bodyInputObj = $("#bodyInput");
			var $suffixInputObj = $("#suffixInput");
			$arbitraryCharacterInputObj.val(localStorage.arbitrarycharacterinput);
			$numberOfIterationsObj.val(localStorage.numberofiterations);
			$prefixInputObj.val(localStorage.prefixinput);
			$bodyInputObj.val(localStorage.bodyinput);
			$suffixInputObj.val(localStorage.suffixinput);

			var $alphaObj = $("#alpha");
			var $numericObj = $("#numeric");
			if (localStorage.iterateoveralphas) {
				$alphaObj.prop("checked", localStorage.iterateoveralphas === "true");
			}
			if (localStorage.iterateovernumerics) {
				$numericObj.prop("checked", localStorage.iterateovernumerics === "true");
			}
		}
	})();
})(jQuery);
//# sourceURL=listiterator.js
