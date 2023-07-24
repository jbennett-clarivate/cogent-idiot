/*globals jQuery:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	$(document).ready(function () {
		var testReg = /^(0?\.\d+)$/;
		$("#suspicion").on("keyup", function () {
			if (testReg.test($(this).val())) {
				$("#falseSuspicion").val(1 - $(this).val());
			}
		});
		$("#confirmedSuspicion").on("keyup", function () {
			if (testReg.test($(this).val())) {
				$("#confirmedFalseSuspicion").val(1 - $(this).val());
			}
		});
		$("#reset").on("click", function () {
			$("#suspicion").val("");
			$("#confirmedSuspicion").val("");
			$("#falseSuspicion").val("");
			$("#confirmedFalseSuspicion").val("");
			$("#rawAnswer").val("");
			$("#answer").val("");
		});
		$("#regenerate-it").on("click", function () {
			var answer = $("#answer");
			var rawAnswer = $("#rawAnswer");
			var suspicion = $("#suspicion");
			if (testReg.test(rawAnswer.val())) {
				suspicion.val(rawAnswer.val());
				suspicion.keyup();
			}
			var confirmedSuspicion = $("#confirmedSuspicion");
			var falseSuspicion = $("#falseSuspicion");
			var confirmedFalseSuspicion = $("#confirmedFalseSuspicion");
			var suspicionVal = $("#suspicion").val();
			var confirmedSuspicionVal = $("#confirmedSuspicion").val();
			var falseSuspicionVal = $("#falseSuspicion").val();
			var confirmedFalseSuspicionVal = $("#confirmedFalseSuspicion").val();
			if (testReg.test(suspicionVal) && testReg.test(suspicionVal) && testReg.test(confirmedSuspicionVal) && testReg.test(falseSuspicionVal) && testReg.test(confirmedFalseSuspicionVal)) {
				var p_E_H = suspicionVal * confirmedSuspicionVal;
				var p_E_NotH = falseSuspicionVal * confirmedFalseSuspicionVal;
				var displayAnswer = p_E_H / (p_E_H + p_E_NotH);
				rawAnswer.val(p_E_H / (p_E_H + p_E_NotH));
				answer.val(Math.round(1000 * displayAnswer) / 10 + "%");
			} else {
				suspicion.val("");
				confirmedSuspicion.val("");
				falseSuspicion.val("");
				confirmedFalseSuspicion.val("");
			}
		});

		$("div[tabindex='10']").focus();
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
})(jQuery);
//# sourceURL=bayes.js