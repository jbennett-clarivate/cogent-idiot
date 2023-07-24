/*globals jQuery:false STAY_ON_SITE:false */
(function ($) {
	"use strict";
	var populateGraphTimer;
	var savedClientWidth;
	var minimumTaxable = 12760;
	var maximumTaxable = 9999999;
	var personalFormula = true;
	var magicNumber = 0.1618;
	$(document).ready(function () {
		$(window).keydown(function (event) {
			if (event.keyCode == 13) {
				event.preventDefault();
				return false;
			}
		});
		var formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD"
		});

		$("#tax-types").on("change", function (event) {
			switch ($(event.target).find(":selected").text()) {
				case "Personal":
					$("#personal").prop("disabled", false);
					$("#corporate").prop("disabled", true);
					break;
				case "Corporate":
					$("#corporate").prop("disabled", false);
					$("#personal").prop("disabled", true);
					break;
				default:
			}
		});

		function setMinimumTaxable(taxType) {
			switch (taxType) {
				case "Personal":
					minimumTaxable = parseInt($("#personal").val());
					maximumTaxable = 9999999;
					break;
				case "Corporate":
					minimumTaxable = parseInt($("#corporate").val());
					maximumTaxable = 999999999999;
					personalFormula = false;
					break;
				default:
			}
		}

		function populateGraph() {
			var taxTypeObj = $("#tax-types");
			var taxType = taxTypeObj.prop("selectedIndex") - 1;
			var xPosition = parseInt($("#quantity").val());
			var ordersOfMag = xPosition.toString().length;
			var yPosition;
			var pointObjects = [];
			var lineX;
			var lineY;
			if (!xPosition || taxType < 0) {
				return false;
			}
			setMinimumTaxable(taxTypeObj.find(":selected").text());
			if (xPosition < minimumTaxable || xPosition > maximumTaxable) {
				HANDLE_BAD_DATA(event, GLOBAL_WARNING_ARRAY[Math.floor(Math.random() * GLOBAL_WARNING_ARRAY.length)]);
				return;
			}
			var points = [];
			var maxLoop = 2 * Math.pow(10, ordersOfMag - 3);
			var maxLoop = Math.min(maxLoop, 1500);
			for (var j = 0; j < maxLoop; j++) {
				lineX = 10000 * Math.exp(j * 0.0345387763949107);
				if (personalFormula) {
					lineY = (Math.pow(Math.log10(1 / Math.log10(lineX * minimumTaxable)), 10) / 5 - (Math.pow(Math.log10(1 / Math.log10(Math.pow(minimumTaxable, 2))), 10) / 5)) * magicNumber;
				} else {
					lineY = (Math.pow(Math.log10(Math.log10(lineX * minimumTaxable)), 10) / 5 - (Math.pow(Math.log10(Math.log10(Math.pow(minimumTaxable, 2))), 10) / 5)) * magicNumber;
				}
				points.push([lineX, Math.floor(10000 * lineY) / 100]);
			}
			pointObjects.push({
					data: points,
					color: "#59669c"
				}
			);
			if (xPosition < minimumTaxable) {
				yPosition = 0;
			} else {
				if (personalFormula) {
					yPosition = (Math.pow(Math.log10(1 / Math.log10(xPosition * minimumTaxable)), 10) / 5 - (Math.pow(Math.log10(1 / Math.log10(Math.pow(minimumTaxable, 2))), 10) / 5)) * magicNumber;
				} else {
					yPosition = (Math.pow(Math.log10(Math.log10(xPosition * minimumTaxable)), 10) / 5 - (Math.pow(Math.log10(Math.log10(Math.pow(minimumTaxable, 2))), 10) / 5)) * magicNumber;
				}
			}
			pointObjects.push({
					label: yPosition === 0 ? "&nbsp;TAX:&nbsp;$0.00" : "&nbsp;TAX:&nbsp;" + formatter.format(xPosition * yPosition),
					data: [[xPosition, Math.floor(10000 * yPosition) / 100]],
					color: "#ff0000",
					fill: true
				}
			);
			$.plot("#taxPlot", pointObjects, {
				xaxis: {
					min: 2 * Math.pow(10, ordersOfMag - 2),
					max: 2 * Math.pow(10, ordersOfMag),
					tickSize: 2 * Math.pow(10, ordersOfMag - 2),
					tickLength: 0,
					axisLabel: "$",
					axisLabelUseCanvas: true,
					color: "#000000",
					reserveSpace: true
				},
				yaxis: {
					tickSize: Math.ceil(2 * parseInt(Math.log10(xPosition)) / 20),
					tickLength: 0,
					min: 0,
					max: 2 * parseInt(Math.log10(xPosition)),
					axisLabel: "%",
					color: "#000000",
					reserveSpace: true
				},
				series: {
					lines: {
						show: true
					},
					points: {
						show: true,
						radius: 2
					}
				}
			});
		}

		function resetTaxes() {
			var perObj = $("#personal");
			var corObj = $("#corporate");
			var quantityObj = $("#quantity");
			perObj.prop("disabled", false);
			perObj.val("12760");
			corObj.prop("disabled", false);
			corObj.val("59000");
			quantityObj.val("");
			$("#tax-types").prop('selectedIndex', 0);
		}

		$("#chart-taxes").on("click", populateGraph);
		$("#reset-taxes").on("click", resetTaxes);

		$(window).on("resize", function () {
			var currentWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
			if (currentWidth !== savedClientWidth) {
				if (populateGraphTimer) {
					clearTimeout(populateGraphTimer);
				}
				populateGraphTimer = setTimeout(populateGraph, 100);
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
})(jQuery);
//# sourceURL=taxes.js