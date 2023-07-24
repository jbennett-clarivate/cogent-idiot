/*globals jQuery:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	$(document).ready(function () {
		var benfordLawProbabilityArray = [301, 176, 125, 97, 79, 67, 58, 51, 46];
		var getRandomIntInRange = function (min, max) {
			return Math.floor(Math.random() * (max - min)) + min;
		};
		var getRandomInt = function (max) {
			return getRandomIntInRange(0, max);
		};
		var shuffleString = function (shuffleThis) {
			var a = shuffleThis;
			var n = a.length;
			for (var i = n - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var tmp = a[i];
				a[i] = a[j];
				a[j] = tmp;
			}
			return a;
		};
		var mayContainFunc = function (dictionary, stringquantity, stringlength) {
			//min is inclusive and max is exclusive
			var max = dictionary.length;
			var mayContainPart;
			var mayContainValue = [];
			var i;
			while (stringquantity--) {
				i = stringlength;
				mayContainPart = [];
				while (i--) {
					mayContainPart.push(dictionary[getRandomInt(max)]);
				}
				mayContainValue.push(mayContainPart);
			}
			return mayContainValue;
		};
		var mustContainFunc = function (mayContainArrays, lower, upper, num, spec, utf8) {
			var innerArray;
			for (var i = 0; i < mayContainArrays.length; i++) {
				innerArray = mayContainArrays[i];
				var shuffle = false;
				if (num && !/\d/.test(innerArray.join(""))) {
					innerArray[0] = benfordLawArray[getRandomInt(benfordLawArray.length)];
					shuffle = true;
				}
				if (spec && !(new RegExp("[" + specialCharArray.join("") + "]")).test(innerArray.join(""))) {
					innerArray[1] = specialCharArray[getRandomInt(specialCharArray.length)];
					shuffle = true;
				}
				if (upper && !/[A-Z]/.test(innerArray.join(""))) {
					innerArray[2] = upperCaseArray[getRandomInt(upperCaseArray.length)];
					shuffle = true;
				}
				if (lower && !/[a-z]/.test(innerArray.join(""))) {
					innerArray[3] = lowerCaseArray[getRandomInt(lowerCaseArray.length)];
					shuffle = true;
				}
				if (utf8) {
					innerArray[4] = utf8CharArray[getRandomInt(utf8CharArray.length)];
				}
				mayContainArrays[i] = shuffle ? shuffleString(innerArray).join("") : innerArray.join("");
			}
			return mayContainArrays.join("<br />");
		};
		var resizeElements = function () {
			var portHeight = $(window).height();
			var portWidth = $(window).width();
			var customHeight = Math.max(100, portHeight - (portWidth < 768 ? 366 : 333)) + "px";
			$("#maycontainlist").animate({
				height: customHeight
			}, heightSpeed);
			$("#mustcontainlist").animate({
				height: customHeight
			}, heightSpeed);
		};
		var timedLengthClear = function (self) {
			if (!/^\d+$/.test(self.val())) {
				self.val(self.val().replace(/\D/g, ""));
			}
			if (self.val().length > 0) {
				if (parseInt(self.val()) < minimumLength) {
					self.val(minimumLength);
				}
				if (parseInt(self.val()) > 999) {
					self.val(999);
				}
			} else {
				self.val(minimumLength);
			}
		};
		var timedQuantityClear = function (self) {
			if (!/^\d+$/.test(self.val())) {
				self.val(self.val().replace(/\D/g, ""));
			}
			if (self.val().length > 0) {
				if (parseInt(self.val()) < 1) {
					self.val(1);
				}
				if (parseInt(self.val()) > 999) {
					self.val(999);
				}
			} else {
				self.val(1);
			}
		};
		var onRun = function () {
			var mayContainList = $("#maycontainlist");
			var mustContainList = $("#mustcontainlist");
			var lowercase = $("#lowercase");
			var uppercase = $("#uppercase");
			var numbers = $("#numbers");
			var special = $("#special");
			var utf8 = $("#utf8");
			var stringlengthStr = $("#stringlength").val();
			var stringlength = parseInt(stringlengthStr);
			var stringquantityStr = $("#stringquantity").val();
			var stringquantity = parseInt(stringquantityStr);
			// Reset the tool
			mayContainList.text("");
			mustContainList.text("");
			var dictionary = [];
			var subDict;
			var leftMult = 1;
			var rightMult = 1;
			if (lowercase.is(":checked")) {
				dictionary = dictionary.concat(lowerCaseArray);
			}
			if (uppercase.is(":checked")) {
				dictionary = dictionary.concat(upperCaseArray);
			}
			if (special.is(":checked")) {
				dictionary = dictionary.concat(specialCharArray);
			}
			if (utf8.is(":checked")) {
				dictionary = dictionary.concat(utf8CharArray);
			}
			if (numbers.is(":checked")) {
				subDict = numericArray;
				if (dictionary.length === 0) {
					dictionary = subDict;
				} else {
					leftMult = 13; // 26 / 2
					rightMult = 5; // 10 / 2
					while (rightMult--) {
						dictionary = dictionary.concat(dictionary);
					}
					while (leftMult--) {
						dictionary = dictionary.concat(subDict);
					}
				}
			}
			var mayContainArrays = mayContainFunc(dictionary, stringquantity, stringlength);
			var mayContainArray = [];
			var mayContainString;
			for (var i = 0; i < mayContainArrays.length; i++) {
				if (numbers.is(":checked") && !lowercase.is(":checked") && !uppercase.is(":checked") && !special.is(":checked") && !utf8.is(":checked")) {
					mayContainArrays[i][0] = benfordLawArray[getRandomInt(benfordLawArray.length)];
				}
				mayContainArray.push(mayContainArrays[i].join(""));
			}
			mayContainString = mayContainArray.join("<br />");
			mayContainList.html(mayContainString);
			mustContainList.html(mustContainFunc(mayContainArrays, lowercase.is(":checked"), uppercase.is(":checked"), numbers.is(":checked"), special.is(":checked"), utf8.is(":checked")));

			if (typeof Storage !== "undefined") {
				localStorage.setItem("maycontainlist", mayContainList.html());
				localStorage.setItem("mustcontainlist", mustContainList.html());
				localStorage.setItem("lowercase", lowercase.is(":checked"));
				localStorage.setItem("uppercase", uppercase.is(":checked"));
				localStorage.setItem("numbers", numbers.is(":checked"));
				localStorage.setItem("special", special.is(":checked"));
				localStorage.setItem("stringlength", stringlength.toString());
				localStorage.setItem("stringquantity", stringquantity.toString());
			}
			utf8CharArray = populateUTF8();
		};

		var populateUTF8 = function () {
			var utf8CharArray = [];
			var randomnumberRanges = [];
			randomnumberRanges.push([11904, 12019]);
			randomnumberRanges.push([12032, 12245]);
			randomnumberRanges.push([13312, 16383]);
			randomnumberRanges.push([16384, 19893]);
			randomnumberRanges.push([19968, 20479]);
			var range = randomnumberRanges[getRandomInt(randomnumberRanges.length - 1)];
			for (var i = 0; i < 26; i++) {
				var randomnumber = getRandomIntInRange(range[0], range[1]);
				utf8CharArray.push("&#" + randomnumber.toString() + ";");
			}
			return utf8CharArray;
		};

		var resizeTimer;
		var minimumLength = 5;
		var heightSpeed = 100;
		var lowerCaseArray = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
		var upperCaseArray = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
		var specialCharArray = ["~", "!", "@", "#", "$", "%", "^", "&amp;", "*", "(", ")", "_", "+", "-", "=", "]", "[", "|", "}", ";", ":", "/", ".", ",", "?", "&gt"];
		var utf8CharArray = populateUTF8();
		var numericArray = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
		var benfordLawArray = [];
		for (var i = 0; i < benfordLawProbabilityArray.length; i++) {
			for (var j = 0; j < benfordLawProbabilityArray[i]; j++) {
				benfordLawArray.push((i + 1).toString());
			}
		}
		resizeElements();
		$(window).on("resize", function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () {
				resizeElements();
			}, heightSpeed);
		});

		$("#stringlength").on("keyup", function () {
			var self = $(this);
			setTimeout(function () {
				timedLengthClear(self);
			}, 1500);
		});

		$("#stringquantity").on("keyup", function () {
			var self = $(this);
			setTimeout(function () {
				timedQuantityClear(self);
			}, 1500);
		});
		$("input[type='text']").on("click", function () {
			$(this).select();
		});

		$("#generate-it").on("click", function () {
			var stringlengthStr = $("#stringlength").val();
			var stringquantityStr = $("#stringquantity").val();
			var stringlength;
			var stringquantity;
			if (/^\d+$/.test(stringlengthStr) && /^\d+$/.test(stringquantityStr)) {
				stringlength = parseInt(stringlengthStr);
				stringquantity = parseInt(stringquantityStr);
				if (stringlength < minimumLength || stringlength > 999 || stringquantity < 1 || stringquantity > 999) {
					setTimeout(onRun, 1500);
				} else {
					onRun();
				}
			} else {
				setTimeout(onRun, 1500);
			}
		});

		var maycontainlist = document.getElementById("maycontainlist");
		var mustcontainlist = document.getElementById("mustcontainlist");
		maycontainlist.onpaste = function (e) {
			HANDLE_PASTE(e, maycontainlist);
		};
		mustcontainlist.onpaste = function (e) {
			HANDLE_PASTE(e, mustcontainlist);
		};

		$("input[tabindex='30']").focus();

		var list = document.getElementsByTagName("script");
		var index = list.length, jumpship = false;
		var re1 = "(?:http|https)(?::\\/{2}[\\w]+)((?:[\\/|\\.]?)(?:[^\\s\"]*))";
		var p = new RegExp(re1, ["i"]);
		while (index--) {
			var m = p.exec(list[index].src);
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
	});

	(function () {
		if (typeof Storage !== "undefined") {
			var mayContainList = $("#maycontainlist");
			var mustContainList = $("#mustcontainlist");
			var lowercase = $("#lowercase");
			var uppercase = $("#uppercase");
			var numbers = $("#numbers");
			var special = $("#special");
			var utf8 = $("#utf8");
			var stringlength = $("#stringlength");
			var stringquantity = $("#stringquantity");
			mayContainList.html(localStorage.maycontainlist);
			mustContainList.html(localStorage.mustcontainlist);
			if (localStorage.lowercase) {
				lowercase.prop("checked", localStorage.lowercase === "true");
			}
			if (localStorage.uppercase) {
				uppercase.prop("checked", localStorage.uppercase === "true");
			}
			if (localStorage.numbers) {
				numbers.prop("checked", localStorage.numbers === "true");
			}
			if (localStorage.special) {
				special.prop("checked", localStorage.special === "true");
			}
			if (localStorage.utf8) {
				utf8.prop("checked", localStorage.special === "true");
			}
			if (localStorage.stringlength) {
				stringlength.val(localStorage.stringlength);
			}
			if (localStorage.stringquantity) {
				stringquantity.val(localStorage.stringquantity);
			}
		}
	})();
})(jQuery);
//# sourceURL=listrandom.js