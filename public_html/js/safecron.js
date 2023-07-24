/*globals jQuery:false timezoneJS:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	var populateGraphTimer;
	var savedClientWidth;
	$(document).ready(function () {
		var selectedLocalTimes = [];
		var safeScheduleArray;
		var localTimes = [
			["14", "LINT", "0", "Line Islands"],
			["13.75", "CHADT", "0", "Chatham Islands"],
			["13", "NZDT", "0", "New Zealand DT"],
			["12", "ANAT", "0", "Anadyr"],
			["11", "AEDT", "0", "Australian Eastern DT"],
			["10.5", "ACDT", "0", "Australian Central"],
			["10", "AEST", "0", "Australian Eastern ST"],
			["9.5", "ACST", "0", "Australian Central ST"],
			["9", "JST", "0", "Japan ST"],
			["8.75", "ACWST", "0", "Australian Central Western ST"],
			["8.5", "PYT", "0", "Pyongyang"],
			["8", "CST", "0", "China ST"],
			["7", "WIB", "0", "Western Indonesian"],
			["6.5", "MMT", "0", "Myanmar"],
			["6", "BST", "0", "Bangladesh ST"],
			["5.75", "NPT", "0", "Nepal"],
			["5.5", "IST", "0", "Irish ST"],
			["5", "UZT", "0", "Uzbekistan"],
			["4.5", "IRDT", "0", "Iran DT"],
			["4", "GST", "0", "Gulf ST"],
			["3", "MSK", "0", "Moscow ST"],
			["2", "CEST", "0", "Central European ST"],
			["1", "BST", "0", "British ST"],
			["0", "GMT", "0", "Accra"],
			["-1", "CVT", "0", "Praia"],
			["-2", "WGST", "0", "Nuuk"],
			["-2.5", "NDT", "0", "St. John's"],
			["-3", "ART", "0", "Buenos Aires"],
			["-4", "EDT", "0", "New York"],
			["-5", "CDT", "0", "Chicago"],
			["-6", "CST", "0", "Mexico City"],
			["-7", "PDT", "0", "Los Angeles"],
			["-8", "AKDT", "0", "Anchorage"],
			["-9", "HADT", "0", "Adak"],
			["-9.5", "MART", "0", "Taiohae"],
			["-10", "HAST", "0", "Honolulu"],
			["-11", "NUT", "0", "Alofi"],
			["-12", "AoE", "0", "Baker Island"]
		];

		function getRandomColor() {
			var letters = "0123456789ABCDEF";
			var color = "#";
			var letter;
			var remaining = letters.split("").length;
			for (var i = 0; i < 6; i++) {
				letter = letters[Math.floor(Math.random() * remaining)];
				color += letter;
				// stabilize luminosity
				letters += letter;
				remaining = letters.split("").length;
			}
			return color;
		}

		function indexOfMax(arr) {
			if (arr.length === 0) {
				return -1;
			}

			var max = arr[0];
			var maxIndex = 0;

			for (var i = 1; i < arr.length; i++) {
				if (arr[i] > max) {
					maxIndex = i;
					max = arr[i];
				}
			}

			return maxIndex;
		}

		function indexOfMin(arr) {
			if (arr.length === 0) {
				return -1;
			}

			var min = arr[0];
			var minIndex = 0;

			for (var i = 1; i < arr.length; i++) {
				if (arr[i] < min) {
					minIndex = i;
					min = arr[i];
				}
			}

			return minIndex;
		}

		var select = $("#all-utc-offsets");
		for (var t = 0; t < localTimes.length; t++) {
			var localtime = localTimes[t];
			localtime.push(getRandomColor());
			var option = $("<option>", {
				value: localtime[0],
				title: localtime[3]
			});
			option.text(localtime[1] + " (GMT " + localtime[0] + ")");
			select.append(option);
		}

		timezoneJS.timezone.zoneFileBasePath = "config/vendor/flot/tz";
		timezoneJS.timezone.defaultZoneFile = [];
		timezoneJS.timezone.init();

		function populateGraph(selectedLocalTimes) {
			var utcDate = new Date();
			var year = utcDate.getFullYear();
			var month = utcDate.getMonth();
			var day = utcDate.getDay();
			var spanPrime = [];
			var spanAlt = [];
			var spans = [];
			var differentWorkingHoursBegin;
			var differentWorkingHoursEnd;
			var lineColor;
			var localTime;
			var minutes = 0;
			var hourTrunc;
			var safeScheduleArrayIndexOffset;
			var timeZoneSize = selectedLocalTimes.length;
			var indexToTzMap = {};
			for (var j = 0; j < timeZoneSize; j++) {
				safeScheduleArrayIndexOffset = 0;
				spanPrime = [];
				spanAlt = [];
				localTime = selectedLocalTimes[j];
				var offset = (new Date().getTimezoneOffset()) / -60;
				differentWorkingHoursBegin = parseFloat(localTime[0]);
				offset = differentWorkingHoursBegin - offset;
				differentWorkingHoursBegin = 9 - offset;
				differentWorkingHoursEnd = differentWorkingHoursBegin + 8;
				minutes = differentWorkingHoursBegin - Math.floor(differentWorkingHoursBegin);
				if (minutes === 0.75) {
					safeScheduleArrayIndexOffset = 3;
					minutes = 45;
				} else if (minutes === 0.5) {
					safeScheduleArrayIndexOffset = 2;
					minutes = 30;
				} else if (minutes === 0.25) {
					safeScheduleArrayIndexOffset = 1;
					minutes = 15;
				} else {
					minutes = 0;
				}
				var k = 0;
				if (differentWorkingHoursBegin > 16) {
					spanAlt.push([Date.UTC(year, month, day, 0, 0, 0), j + 1]);
					spanPrime.push([Date.UTC(year, month, day, 24, 0, 0), j + 1]);
					for (k = differentWorkingHoursBegin; k <= differentWorkingHoursEnd; k++) {
						hourTrunc = Math.floor(k);
						if (k < 24) {
							spanPrime.push([Date.UTC(year, month, day, hourTrunc, minutes, 0), j + 1]);
						} else {
							spanAlt.push([Date.UTC(year, month, day, hourTrunc - 24, minutes, 0), j + 1]);
						}
					}
				} else if (differentWorkingHoursBegin < 0 && differentWorkingHoursBegin > -9) {
					spanAlt.push([Date.UTC(year, month, day, 24, 0, 0), j + 1]);
					spanPrime.push([Date.UTC(year, month, day, 0, 0, 0), j + 1]);
					for (k = differentWorkingHoursBegin; k <= differentWorkingHoursEnd; k++) {
						hourTrunc = Math.floor(k);
						if (k < 0) {
							spanAlt.push([Date.UTC(year, month, day, hourTrunc + 24, minutes, 0), j + 1]);
						} else {
							spanPrime.push([Date.UTC(year, month, day, hourTrunc, minutes, 0), j + 1]);
						}
					}
				} else if (differentWorkingHoursBegin < -8) {
					for (k = differentWorkingHoursBegin; k <= differentWorkingHoursEnd; k++) {
						hourTrunc = Math.floor(k);
						spanPrime.push([Date.UTC(year, month, day, hourTrunc + 24, minutes, 0), j + 1]);
					}
				} else {
					for (k = differentWorkingHoursBegin; k <= differentWorkingHoursEnd; k++) {
						hourTrunc = Math.floor(k);
						spanPrime.push([Date.UTC(year, month, day, hourTrunc, minutes, 0), j + 1]);
					}
				}
				var start = Math.floor(differentWorkingHoursBegin) * 4 + safeScheduleArrayIndexOffset + 96;
				var end = Math.floor(differentWorkingHoursEnd) * 4 + safeScheduleArrayIndexOffset + 96;
				for (var safeIndexSpan = start; safeIndexSpan < end; safeIndexSpan++) {
					for (var multiplier = 1; multiplier <= parseInt(localTime[2]); multiplier++) {
						safeScheduleArray[safeIndexSpan % 96]++;
					}
				}
				lineColor = localTime[4];
				indexToTzMap[j + 1] = localTime[0];
				spans.push({
					data: spanPrime,
					color: lineColor
				});
				if (spanAlt.length > 0) {
					spans.push({
						data: spanAlt,
						color: lineColor
					});
				}
			}
			$.plot("#cronUTC", spans, {
				xaxis: {
					color: "#000000",
					min: Date.UTC(year, month, day, 0, 0, 0),
					max: Date.UTC(year, month, day, 23, 45, 0),
					mode: "time",
					timeformat: "%I:%M&nbsp;%P",
					tickSize: [15, "minute"],
					tickLength: 5,
					axisLabel: "UTC",
					axisLabelUseCanvas: true,
					reserveSpace: true
				},
				yaxis: {
					color: "#000000",
					tickSize: 1,
					tickLength: 0,
					min: 0,
					max: timeZoneSize + 1,
					reserveSpace: true,
					tickFormatter: function (val, axis) {
						var tz = indexToTzMap[val];
						var result = "";
						if(tz) {
							result = "GMT " + (tz < 0 ? "" : "+") + tz;
						}
						return result;
					}
				}
			});
		}

		function getTimestamp(indexOfValue) {
			var niceTime;
			var niceTimeIndicator;
			var indexOfValueIndex = indexOfValue / 4;
			indexOfValueIndex = Math.round(indexOfValueIndex * 100) / 100;
			var minutes = indexOfValueIndex - Math.floor(indexOfValueIndex);
			var minutesStr = ":00";
			if (minutes >= 0.75) {
				minutesStr = ":45";
			} else if (minutes >= 0.5) {
				minutesStr = ":30";
			} else if (minutes >= 0.25) {
				minutesStr = ":15";
			}
			niceTime = Math.floor(indexOfValueIndex);
			if (niceTime > 12) {
				niceTime = niceTime % 12;
				niceTimeIndicator = "pm";
			} else {
				niceTimeIndicator = "am";
			}
			niceTime = niceTime + minutesStr + niceTimeIndicator;
			return niceTime;
		}

		$("#best-time").on("click", function () {
			var afterHoursStart = 68;
			var beforeHoursStart = 36;
			var afterHoursArray = safeScheduleArray.slice(afterHoursStart, safeScheduleArray.length).concat(safeScheduleArray.slice(0, afterHoursStart));
			var beforeHoursArray = safeScheduleArray.slice(beforeHoursStart, safeScheduleArray.length).concat(safeScheduleArray.slice(0, beforeHoursStart));
			var indexOfMinRaw = (indexOfMin(afterHoursArray) + afterHoursStart) % safeScheduleArray.length;
			var indexOfMaxRaw = (indexOfMax(beforeHoursArray) + beforeHoursStart) % safeScheduleArray.length;
			var indexOfMinValue = getTimestamp(indexOfMinRaw);
			var indexOfMaxValue = getTimestamp(indexOfMaxRaw);
			$("#meeting").text(indexOfMaxValue);
			$("#downtime").text(indexOfMinValue);
		});

		$("#chart-it").on("click", function () {
			var selectedTimeZoneIndex = $("#all-utc-offsets").prop("selectedIndex") - 1;
			if (selectedTimeZoneIndex < 0) {
				return false;
			}
			$(this).next("#best-time").prop("disabled", false);
			var getTimeZone = localTimes[selectedTimeZoneIndex];
			getTimeZone[2] = $("#weights").prop("selectedIndex") + 1;
			selectedLocalTimes.push(getTimeZone);
			if (safeScheduleArray) {
				safeScheduleArray.length = 0;
			} else {
				safeScheduleArray = [];
			}
			for (var safeScheduleArrayIndex = 0; safeScheduleArrayIndex < (24 * 4); safeScheduleArrayIndex++) {
				safeScheduleArray.push(0);
			}
			populateGraph(selectedLocalTimes);
		});
		$(window).on("resize", function () {
			var currentWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
			if (currentWidth !== savedClientWidth) {
				if (populateGraphTimer) {
					clearTimeout(populateGraphTimer);
				}
				populateGraphTimer = setTimeout(populateGraph, 100, selectedLocalTimes);
			}
			savedClientWidth = currentWidth;
		});
		if (!savedClientWidth) {
			savedClientWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		}
		$("#footer").prepend("Flot " + $.plot.version + " &ndash; ");

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
}(jQuery));
//# sourceURL=safecron.js
