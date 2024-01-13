/*globals jQuery:false timezoneJS:false,STAY_ON_SITE:false */
(function ($) {
	"use strict";
	let populateGraphTimer;
	let savedClientWidth;
	$(document).ready(function () {
		const selectedLocalTimes = [];
		let safeScheduleArray;
		const localTimes = [
			['14', 'LINT', '0', 'Line Islands'],
			['13.75', 'CHADT', '0', 'Chatham Islands'],
			['13', 'NZDT', '0', 'New Zealand DT'],
			['12', 'ANAT', '0', 'Anadyr'],
			['11', 'AEDT', '0', 'Australian Eastern DT'],
			['10.5', 'ACDT', '0', 'Australian Central'],
			['10', 'AEST', '0', 'Australian Eastern ST'],
			['9.5', 'ACST', '0', 'Australian Central ST'],
			['9', 'JST', '0', 'Japan ST'],
			['8.75', 'ACWST', '0', 'Australian Central Western ST'],
			['8.5', 'PYT', '0', 'Pyongyang'],
			['8', 'CST', '0', 'China ST'],
			['7', 'WIB', '0', 'Western Indonesian'],
			['6.5', 'MMT', '0', 'Myanmar'],
			['6', 'BST', '0', 'Bangladesh ST'],
			['5.75', 'NPT', '0', 'Nepal'],
			['5.5', 'IST', '0', 'Irish ST'],
			['5', 'UZT', '0', 'Uzbekistan'],
			['4.5', 'IRDT', '0', 'Iran DT'],
			['4', 'GST', '0', 'Gulf ST'],
			['3', 'MSK', '0', 'Moscow ST'],
			['2', 'CEST', '0', 'Central European ST'],
			['1', 'BST', '0', 'British ST'],
			['0', 'GMT', '0', 'Accra'],
			['-1', 'CVT', '0', 'Praia'],
			['-2', 'WGST', '0', 'Nuuk'],
			['-2.5', 'NDT', '0', 'St. John\'s'],
			['-3', 'ART', '0', 'Buenos Aires'],
			['-4', 'EDT', '0', 'New York'],
			['-5', 'CDT', '0', 'Chicago'],
			['-6', 'CST', '0', 'Mexico City'],
			['-7', 'PDT', '0', 'Los Angeles'],
			['-8', 'AKDT', '0', 'Anchorage'],
			['-9', 'HADT', '0', 'Adak'],
			['-9.5', 'MART', '0', 'Taiohae'],
			['-10', 'HAST', '0', 'Honolulu'],
			['-11', 'NUT', '0', 'Alofi'],
			['-12', 'AoE', '0', 'Baker Island']
		];

		function getRandomColor() {
			let letters = '0123456789ABCDEF';
			let color = '#';
			let letter;
			let remaining = letters.split('').length;
			for (let i = 0; i < 6; i++) {
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

			let max = arr[0];
			let maxIndex = 0;

			for (let i = 1; i < arr.length; i++) {
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

			let min = arr[0];
			let minIndex = 0;

			for (let i = 1; i < arr.length; i++) {
				if (arr[i] < min) {
					minIndex = i;
					min = arr[i];
				}
			}

			return minIndex;
		}

		const select = $('#all-utc-offsets');
		for (let t = 0; t < localTimes.length; t++) {
			const localtime = localTimes[t];
			localtime.push(getRandomColor());
			const option = $('<option>', {
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
			const utcDate = new Date();
			const year = utcDate.getFullYear();
			const month = utcDate.getMonth();
			const day = utcDate.getDay();
			let spanPrime = [];
			let spanAlt = [];
			const spans = [];
			let differentWorkingHoursBegin;
			let differentWorkingHoursEnd;
			let lineColor;
			let localTime;
			let minutes = 0;
			let hourTrunc;
			let safeScheduleArrayIndexOffset;
			const timeZoneSize = selectedLocalTimes.length;
			const indexToTzMap = {};
			for (let j = 0; j < timeZoneSize; j++) {
				safeScheduleArrayIndexOffset = 0;
				spanPrime = [];
				spanAlt = [];
				localTime = selectedLocalTimes[j];
				let offset = (new Date().getTimezoneOffset()) / -60;
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
				let k = 0;
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
				const start = Math.floor(differentWorkingHoursBegin) * 4 + safeScheduleArrayIndexOffset + 96;
				const end = Math.floor(differentWorkingHoursEnd) * 4 + safeScheduleArrayIndexOffset + 96;
				for (let safeIndexSpan = start; safeIndexSpan < end; safeIndexSpan++) {
					for (let multiplier = 1; multiplier <= parseInt(localTime[2]); multiplier++) {
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
						const tz = indexToTzMap[val];
						let result = '';
						if(tz) {
							result = "GMT " + (tz < 0 ? "" : "+") + tz;
						}
						return result;
					}
				}
			});
		}

		function getTimestamp(indexOfValue) {
			let niceTime;
			let niceTimeIndicator;
			let indexOfValueIndex = indexOfValue / 4;
			indexOfValueIndex = Math.round(indexOfValueIndex * 100) / 100;
			const minutes = indexOfValueIndex - Math.floor(indexOfValueIndex);
			let minutesStr = ':00';
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
			const afterHoursStart = 68;
			const beforeHoursStart = 36;
			const afterHoursArray = safeScheduleArray.slice(afterHoursStart, safeScheduleArray.length).concat(safeScheduleArray.slice(0, afterHoursStart));
			const beforeHoursArray = safeScheduleArray.slice(beforeHoursStart, safeScheduleArray.length).concat(safeScheduleArray.slice(0, beforeHoursStart));
			const indexOfMinRaw = (indexOfMin(afterHoursArray) + afterHoursStart) % safeScheduleArray.length;
			const indexOfMaxRaw = (indexOfMax(beforeHoursArray) + beforeHoursStart) % safeScheduleArray.length;
			const indexOfMinValue = getTimestamp(indexOfMinRaw);
			const indexOfMaxValue = getTimestamp(indexOfMaxRaw);
			$("#meeting").text(indexOfMaxValue);
			$("#downtime").text(indexOfMinValue);
		});

		$("#chart-it").on("click", function () {
			const selectedTimeZoneIndex = $('#all-utc-offsets').prop('selectedIndex') - 1;
			if (selectedTimeZoneIndex < 0) {
				return false;
			}
			$(this).next("#best-time").prop("disabled", false);
			const getTimeZone = localTimes[selectedTimeZoneIndex];
			getTimeZone[2] = $("#weights").prop("selectedIndex") + 1;
			selectedLocalTimes.push(getTimeZone);
			if (safeScheduleArray) {
				safeScheduleArray.length = 0;
			} else {
				safeScheduleArray = [];
			}
			for (let safeScheduleArrayIndex = 0; safeScheduleArrayIndex < (24 * 4); safeScheduleArrayIndex++) {
				safeScheduleArray.push(0);
			}
			populateGraph(selectedLocalTimes);
		});
		$(window).on("resize", function () {
			const currentWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
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

		const list = document.getElementsByTagName('script');
		let i = list.length;
		let jumpship = false;
		const re1 = '(?:http|https)(?::\\/{2}[\\w]+)((?:[\\/|\\.]?)(?:[^\\s"]*))';
		const p = new RegExp(re1, ['i']);
		while (i--) {
			const m = p.exec(list[i].src);
			if (m === null) {

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
