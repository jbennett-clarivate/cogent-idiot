/*globals jQuery:false,Modernizr:false */
var GLOBAL_WARNING_ARRAY;
var FILE_TO_DIV;
var HANDLE_PASTE;
var HANDLE_BAD_DATA;
var MESSAGE_SPLASH;
var TEXT_WIDTH;
var SHA512;
var LOGOUT;
var REFRESH_SESSION;
var GLOBAL_ACTIVITY_MONITOR_INTERVAL;
var GLOBAL_ACTIVITY_MONITOR_TIMEOUT = 60 * 60 * 1000;

(function ($, Modernizr) {
	"use strict";
	$(document).ready(function () {
		REFRESH_SESSION = function () {
			var $obj = $(".temporaryMessage");
			if ($obj) {
				$obj.remove();
			}
			localStorage.setItem("activityMonitor", Date.now().toString());
			$.get({
				url: "refresh_login.php"
			}).done(function (success) {
				MESSAGE_SPLASH(null, "Session refreshed.", 500);
			}).fail(function () {
				MESSAGE_SPLASH(null, "!");
			});
		};

		LOGOUT = function () {
			localStorage.clear();
			window.location.replace("logout.php");
		};

		/**
		 * @param {string} str
		 * @return {string}
		 */
		SHA512 = function (str) {
			var int64 = function (msint_32, lsint_32) {
				this.highOrder = msint_32;
				this.lowOrder = lsint_32;
			};
			var H = [new int64(0x6a09e667, 0xf3bcc908), new int64(0xbb67ae85, 0x84caa73b), new int64(0x3c6ef372, 0xfe94f82b), new int64(0xa54ff53a, 0x5f1d36f1), new int64(0x510e527f, 0xade682d1), new int64(0x9b05688c, 0x2b3e6c1f), new int64(0x1f83d9ab, 0xfb41bd6b), new int64(0x5be0cd19, 0x137e2179)];
			var K = [new int64(0x428a2f98, 0xd728ae22), new int64(0x71374491, 0x23ef65cd), new int64(0xb5c0fbcf, 0xec4d3b2f), new int64(0xe9b5dba5, 0x8189dbbc), new int64(0x3956c25b, 0xf348b538), new int64(0x59f111f1, 0xb605d019), new int64(0x923f82a4, 0xaf194f9b), new int64(0xab1c5ed5, 0xda6d8118), new int64(0xd807aa98, 0xa3030242), new int64(0x12835b01, 0x45706fbe), new int64(0x243185be, 0x4ee4b28c), new int64(0x550c7dc3, 0xd5ffb4e2), new int64(0x72be5d74, 0xf27b896f), new int64(0x80deb1fe, 0x3b1696b1), new int64(0x9bdc06a7, 0x25c71235), new int64(0xc19bf174, 0xcf692694), new int64(0xe49b69c1, 0x9ef14ad2), new int64(0xefbe4786, 0x384f25e3), new int64(0x0fc19dc6, 0x8b8cd5b5), new int64(0x240ca1cc, 0x77ac9c65), new int64(0x2de92c6f, 0x592b0275), new int64(0x4a7484aa, 0x6ea6e483), new int64(0x5cb0a9dc, 0xbd41fbd4), new int64(0x76f988da, 0x831153b5), new int64(0x983e5152, 0xee66dfab), new int64(0xa831c66d, 0x2db43210), new int64(0xb00327c8, 0x98fb213f), new int64(0xbf597fc7, 0xbeef0ee4), new int64(0xc6e00bf3, 0x3da88fc2), new int64(0xd5a79147, 0x930aa725), new int64(0x06ca6351, 0xe003826f), new int64(0x14292967, 0x0a0e6e70), new int64(0x27b70a85, 0x46d22ffc), new int64(0x2e1b2138, 0x5c26c926), new int64(0x4d2c6dfc, 0x5ac42aed), new int64(0x53380d13, 0x9d95b3df), new int64(0x650a7354, 0x8baf63de), new int64(0x766a0abb, 0x3c77b2a8), new int64(0x81c2c92e, 0x47edaee6), new int64(0x92722c85, 0x1482353b), new int64(0xa2bfe8a1, 0x4cf10364), new int64(0xa81a664b, 0xbc423001), new int64(0xc24b8b70, 0xd0f89791), new int64(0xc76c51a3, 0x0654be30), new int64(0xd192e819, 0xd6ef5218), new int64(0xd6990624, 0x5565a910), new int64(0xf40e3585, 0x5771202a), new int64(0x106aa070, 0x32bbd1b8), new int64(0x19a4c116, 0xb8d2d0c8), new int64(0x1e376c08, 0x5141ab53), new int64(0x2748774c, 0xdf8eeb99), new int64(0x34b0bcb5, 0xe19b48a8), new int64(0x391c0cb3, 0xc5c95a63), new int64(0x4ed8aa4a, 0xe3418acb), new int64(0x5b9cca4f, 0x7763e373), new int64(0x682e6ff3, 0xd6b2b8a3), new int64(0x748f82ee, 0x5defb2fc), new int64(0x78a5636f, 0x43172f60), new int64(0x84c87814, 0xa1f0ab72), new int64(0x8cc70208, 0x1a6439ec), new int64(0x90befffa, 0x23631e28), new int64(0xa4506ceb, 0xde82bde9), new int64(0xbef9a3f7, 0xb2c67915), new int64(0xc67178f2, 0xe372532b), new int64(0xca273ece, 0xea26619c), new int64(0xd186b8c7, 0x21c0c207), new int64(0xeada7dd6, 0xcde0eb1e), new int64(0xf57d4f7f, 0xee6ed178), new int64(0x06f067aa, 0x72176fba), new int64(0x0a637dc5, 0xa2c898a6), new int64(0x113f9804, 0xbef90dae), new int64(0x1b710b35, 0x131c471b), new int64(0x28db77f5, 0x23047d84), new int64(0x32caab7b, 0x40c72493), new int64(0x3c9ebe0a, 0x15c9bebc), new int64(0x431d67c4, 0x9c100d4c), new int64(0x4cc5d4be, 0xcb3e42b6), new int64(0x597f299c, 0xfc657e2a), new int64(0x5fcb6fab, 0x3ad6faec), new int64(0x6c44198c, 0x4a475817)];
			var W = new Array(64);
			var a, b, c, d, e, f, g, h, i, j;
			var T1, T2;
			var charsize = 8;

			function utf8_encode(str) {
				return unescape(encodeURIComponent(str));
			}

			function str2binb(str) {
				var bin = [];
				var mask = (1 << charsize) - 1;
				var len = str.length * charsize;
				for (var i = 0; i < len; i += charsize) {
					bin[i >> 5] |= (str.charCodeAt(i / charsize) & mask) << (32 - charsize - (i % 32));
				}
				return bin;
			}

			function binb2hex(binarray) {
				var hex_tab = "0123456789abcdef";
				var str = "";
				var length = binarray.length * 4;
				var srcByte;
				for (var i = 0; i < length; i += 1) {
					srcByte = binarray[i >> 2] >> ((3 - (i % 4)) * 8);
					str += hex_tab.charAt((srcByte >> 4) & 0xF) + hex_tab.charAt(srcByte & 0xF);
				}
				return str;
			}

			function safe_add_2(x, y) {
				var lsw, msw, lowOrder, highOrder;
				lsw = (x.lowOrder & 0xFFFF) + (y.lowOrder & 0xFFFF);
				msw = (x.lowOrder >>> 16) + (y.lowOrder >>> 16) + (lsw >>> 16);
				lowOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
				lsw = (x.highOrder & 0xFFFF) + (y.highOrder & 0xFFFF) + (msw >>> 16);
				msw = (x.highOrder >>> 16) + (y.highOrder >>> 16) + (lsw >>> 16);
				highOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
				return new int64(highOrder, lowOrder);
			}

			function safe_add_4(a, b, c, d) {
				var lsw, msw, lowOrder, highOrder;
				lsw = (a.lowOrder & 0xFFFF) + (b.lowOrder & 0xFFFF) + (c.lowOrder & 0xFFFF) + (d.lowOrder & 0xFFFF);
				msw = (a.lowOrder >>> 16) + (b.lowOrder >>> 16) + (c.lowOrder >>> 16) + (d.lowOrder >>> 16) + (lsw >>> 16);
				lowOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
				lsw = (a.highOrder & 0xFFFF) + (b.highOrder & 0xFFFF) + (c.highOrder & 0xFFFF) + (d.highOrder & 0xFFFF) + (msw >>> 16);
				msw = (a.highOrder >>> 16) + (b.highOrder >>> 16) + (c.highOrder >>> 16) + (d.highOrder >>> 16) + (lsw >>> 16);
				highOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
				return new int64(highOrder, lowOrder);
			}

			function safe_add_5(a, b, c, d, e) {
				var lsw, msw, lowOrder, highOrder;
				lsw = (a.lowOrder & 0xFFFF) + (b.lowOrder & 0xFFFF) + (c.lowOrder & 0xFFFF) + (d.lowOrder & 0xFFFF) + (e.lowOrder & 0xFFFF);
				msw = (a.lowOrder >>> 16) + (b.lowOrder >>> 16) + (c.lowOrder >>> 16) + (d.lowOrder >>> 16) + (e.lowOrder >>> 16) + (lsw >>> 16);
				lowOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
				lsw = (a.highOrder & 0xFFFF) + (b.highOrder & 0xFFFF) + (c.highOrder & 0xFFFF) + (d.highOrder & 0xFFFF) + (e.highOrder & 0xFFFF) + (msw >>> 16);
				msw = (a.highOrder >>> 16) + (b.highOrder >>> 16) + (c.highOrder >>> 16) + (d.highOrder >>> 16) + (e.highOrder >>> 16) + (lsw >>> 16);
				highOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
				return new int64(highOrder, lowOrder);
			}

			function maj(x, y, z) {
				return new int64((x.highOrder & y.highOrder) ^ (x.highOrder & z.highOrder) ^ (y.highOrder & z.highOrder), (x.lowOrder & y.lowOrder) ^ (x.lowOrder & z.lowOrder) ^ (y.lowOrder & z.lowOrder));
			}

			function ch(x, y, z) {
				return new int64((x.highOrder & y.highOrder) ^ (~x.highOrder & z.highOrder), (x.lowOrder & y.lowOrder) ^ (~x.lowOrder & z.lowOrder));
			}

			function rotr(x, n) {
				if (n <= 32) {
					return new int64((x.highOrder >>> n) | (x.lowOrder << (32 - n)), (x.lowOrder >>> n) | (x.highOrder << (32 - n)));
				} else {
					return new int64((x.lowOrder >>> n) | (x.highOrder << (32 - n)), (x.highOrder >>> n) | (x.lowOrder << (32 - n)));
				}
			}

			function sigma0(x) {
				var rotr28 = rotr(x, 28);
				var rotr34 = rotr(x, 34);
				var rotr39 = rotr(x, 39);
				return new int64(rotr28.highOrder ^ rotr34.highOrder ^ rotr39.highOrder, rotr28.lowOrder ^ rotr34.lowOrder ^ rotr39.lowOrder);
			}

			function sigma1(x) {
				var rotr14 = rotr(x, 14);
				var rotr18 = rotr(x, 18);
				var rotr41 = rotr(x, 41);
				return new int64(rotr14.highOrder ^ rotr18.highOrder ^ rotr41.highOrder, rotr14.lowOrder ^ rotr18.lowOrder ^ rotr41.lowOrder);
			}

			function gamma0(x) {
				var rotr1 = rotr(x, 1),
					rotr8 = rotr(x, 8),
					shr7 = shr(x, 7);
				return new int64(rotr1.highOrder ^ rotr8.highOrder ^ shr7.highOrder, rotr1.lowOrder ^ rotr8.lowOrder ^ shr7.lowOrder);
			}

			function gamma1(x) {
				var rotr19 = rotr(x, 19);
				var rotr61 = rotr(x, 61);
				var shr6 = shr(x, 6);
				return new int64(rotr19.highOrder ^ rotr61.highOrder ^ shr6.highOrder, rotr19.lowOrder ^ rotr61.lowOrder ^ shr6.lowOrder);
			}

			function shr(x, n) {
				if (n <= 32) {
					return new int64(x.highOrder >>> n, x.lowOrder >>> n | (x.highOrder << (32 - n)));
				} else {
					return new int64(0, x.highOrder << (32 - n));
				}
			}

			str = utf8_encode(str);
			var strlen = str.length * charsize;
			str = str2binb(str);
			str[strlen >> 5] |= 0x80 << (24 - strlen % 32);
			str[(((strlen + 128) >> 10) << 5) + 31] = strlen;
			for (var i = 0; i < str.length; i += 32) {
				a = H[0];
				b = H[1];
				c = H[2];
				d = H[3];
				e = H[4];
				f = H[5];
				g = H[6];
				h = H[7];
				for (var j = 0; j < 80; j++) {
					if (j < 16) {
						W[j] = new int64(str[j * 2 + i], str[j * 2 + i + 1]);
					} else {
						W[j] = safe_add_4(gamma1(W[j - 2]), W[j - 7], gamma0(W[j - 15]), W[j - 16]);
					}
					T1 = safe_add_5(h, sigma1(e), ch(e, f, g), K[j], W[j]);
					T2 = safe_add_2(sigma0(a), maj(a, b, c));
					h = g;
					g = f;
					f = e;
					e = safe_add_2(d, T1);
					d = c;
					c = b;
					b = a;
					a = safe_add_2(T1, T2);
				}
				H[0] = safe_add_2(a, H[0]);
				H[1] = safe_add_2(b, H[1]);
				H[2] = safe_add_2(c, H[2]);
				H[3] = safe_add_2(d, H[3]);
				H[4] = safe_add_2(e, H[4]);
				H[5] = safe_add_2(f, H[5]);
				H[6] = safe_add_2(g, H[6]);
				H[7] = safe_add_2(h, H[7]);
			}
			var binarray = [];
			for (var i = 0; i < H.length; i++) {
				binarray.push(H[i].highOrder);
				binarray.push(H[i].lowOrder);
			}
			return binb2hex(binarray);
		};

		TEXT_WIDTH = (function () {
			var canvasEl;
			var ctx;
			return function (text, font) {
				if (!text || !font) {
					return false;
				}
				if (!canvasEl) {
					canvasEl = document.createElement("canvas");
				}
				ctx = canvasEl.getContext("2d");
				ctx.font = font;
				return ctx.measureText(text).width;
			};
		})();

		FILE_TO_DIV = (function () {
			var reader = new FileReader();
			return function (sourceEvent, destinationId) {
				var file = sourceEvent.target.files[0];
				reader.onload = function (sourceEvent) {
					var results = sourceEvent.target.result;
					$("#" + destinationId).text(results);
				};
				if (file.type === "" || /^text/.test(file.type)) {
					reader.readAsText(file);
				} else {
					HANDLE_BAD_DATA(sourceEvent, GLOBAL_WARNING_ARRAY[Math.floor(Math.random() * GLOBAL_WARNING_ARRAY.length)]);
				}
			};
		})();

		HANDLE_PASTE = function (e, targetDiv) {
			e.stopPropagation();
			e.preventDefault();
			var pastedData;
			if (e.clipboardData && e.clipboardData.getData) {
				pastedData = e.clipboardData.getData("text/plain");
			} else if (e.clipboardData && e.clipboardData.getData) {
				pastedData = e.clipboardData.getData("Text");
			} else if (e.clipboardData) {
				pastedData = e.clipboardData;
			} else if (window.clipboardData && window.clipboardData.getData) {
				pastedData = window.clipboardData.getData("Text");
			} else if (window.clipboardData) {
				pastedData = window.clipboardData;
			}
			window.document.execCommand("insertText", false, "\n" + pastedData);
			var removeThis = $(targetDiv).find(":first-child");
			removeThis.remove();
		};

		MESSAGE_SPLASH = function (e, message, pause) {
			if (e) {
				e.stopPropagation();
				e.preventDefault();
			}
			var wrapMyDiv = $("<div>", {
				class: "temporaryMessage",
				style: "display:table;position:absolute;height:100%;width:100%;z-index:10;text-align:left;top:0;"
			});
			var myDiv = $("<div>", {
				style: "display:table-cell;vertical-align:top;text-align:left;"
			});
			var myDivText = $("<div>", {
				style: "height:14%;margin-left:auto;margin-right:auto;width:100%;font-weight:bold;text-align:center;background:white;background: radial-gradient(circle, rgba(255,255,255,1) 50%, rgba(0,0,0,0) 100%);"
			});
			var myText = $("<span>", {
				html: message,
				style: "color:red;font-size:24px;text-align:center;"
			});
			wrapMyDiv.append(myDiv);
			myDiv.append(myDivText);
			myDivText.append(myText);
			$("body").prepend(wrapMyDiv);
			setTimeout(function () {
				var $obj = $(".temporaryMessage");
				if ($obj) {
					$obj.remove();
				}
			}, pause ? pause : 10000);
		};

		HANDLE_BAD_DATA = function (e, message) {
			if (e) {
				e.stopPropagation();
				e.preventDefault();
			}
			var wrapMyDiv = $("<div>", {
				class: "temporaryMessage",
				style: "display:table;position:absolute;height:100%;width:100%;z-index:10;text-align:center;top:-20vh;"
			});
			var myDiv = $("<div>", {
				style: "display:table-cell;vertical-align:bottom;text-align:center;"
			});
			var myDivText = $("<div>", {
				style: "margin-left:auto;margin-right:auto;width:100%;text-align:center;"
			});
			var myText = $("<span>", {
				html: message,
				style: "color:red;font-size:50vmin;text-align:center;"
			});
			wrapMyDiv.append(myDiv);
			myDiv.append(myDivText);
			myDivText.append(myText);
			$("body").prepend(wrapMyDiv);
			setTimeout(function () {
				$(".temporaryMessage").remove();
			}, 1000);
		};
//browserDetect code created by: https://gist.github.com/ideefixe
		var browserDetect = (function () {
			var BrowserDetect = {
				init: function () {
					this.browser = this.searchString(this.dataBrowser) || "Other";
					this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) || "Unknown";
				},
				searchString: function (data) {
					for (var i = 0; i < data.length; i++) {
						var dataString = data[i].string;
						this.versionSearchString = data[i].subString;

						if (dataString.indexOf(data[i].subString) !== -1) {
							return data[i].identity;
						}
					}
					return null;
				},
				searchVersion: function (dataString) {
					var index = dataString.indexOf(this.versionSearchString);
					if (index === -1) {
						return null;
					}

					var rv = dataString.indexOf("rv:");
					if (this.versionSearchString === "Trident" && rv !== -1) {
						return parseFloat(dataString.substring(rv + 3));
					} else {
						return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
					}
				},

				dataBrowser: [
					{string: navigator.userAgent, subString: "Edge", identity: "MS Edge"},
					{string: navigator.userAgent, subString: "MSIE", identity: "Explorer"},
					{string: navigator.userAgent, subString: "Trident", identity: "Explorer"},
					{string: navigator.userAgent, subString: "Firefox", identity: "Firefox"},
					{string: navigator.userAgent, subString: "Opera", identity: "Opera"},
					{string: navigator.userAgent, subString: "OPR", identity: "Opera"},
					{string: navigator.userAgent, subString: "Chrome", identity: "Chrome"},
					{string: navigator.userAgent, subString: "Safari", identity: "Safari"}
				]
			};
			BrowserDetect.init();
			return BrowserDetect;
		})();

		GLOBAL_WARNING_ARRAY = ["NO", "&#x2613;", "&#x1F593;", "&#x26A0;", "&#x2620;", "&#x2622;", "&#x2623;", "&#x203C;", "&#x2639;", "&#x2668;", "&#x2694;", "&#x2048;"];
		if (window.self === top) {
			$("#antiClickjack").remove();
		} else {
			top.location = window.self.location;
		}

		if (!Modernizr.svg) {
			$.each($("img"), function () {
				var thisSrc = $(this).attr("src");
				$(this).attr("src", thisSrc.replace(/svg$/, "png"));
			});
		}
		$("#logout-button").on("click", function () {
			LOGOUT();
		});
		$("#info-text-button").on("click", function () {
			$("#info-text").toggle();
		});
		$(".page-transition").on("click", function () {
			var currentPage = $(".current-page");
			var self = $(this);
			if (self.is(currentPage)) {
				return false;
			}
			var contentTarget = $("#content");
			currentPage.removeClass("current-page");
			self.addClass("current-page");
			contentTarget.load("ajax/" + self.attr("id") + ".html");
			var helpObj = $("#info-text");
			var helpText;
			if (self.attr("id") === "listcomparator") {
				helpText =
					"<p>This is a tool to compare two lists. Paste or type your data in the two provided list areas (List A &amp; List B), and click Compare.</p>" +
					"<ul><li>To ignore case, check the <em>Lowercase</em> checkbox.</li>" +
					"<li>To delimit the list on spaces, check the <em>Spaces</em> checkbox.</li>" +
					"<li>To delimit the list on tabs, check the <em>Tabs</em> checkbox.</li>" +
					"<li>To delimit the list on commas, check the <em>Commas</em> checkbox.</li>" +
					"<li>To delimit the list on semicolons, check the <em>Semicolons</em> checkbox.</li>" +
					"<li>To delimit the list on single quotes, check the <em>Single Quotes</em> checkbox.</li>" +
					"<li>To delimit the list on double quotes, check the <em>Double Quotes</em> checkbox.</li></ul>";
			} else if (self.attr("id") === "listclean") {
				helpText = "<p>This is a tool to clean a list (remove spaces, repeated words). Paste in your list, choose whether to enforce lowercase for letters, and click Clean.</p>";
			} else if (self.attr("id") === "listrandom") {
				helpText = "<p>This tool will generate various lists of m strings of n length.</p>" +
					"<ul><li><em>May Contain</em> may or may not contain a character coorisponding to each of the selected checkbox character types</li>" +
					"<li><em>Must Contain</em> will contain at least one of every character coorisponding to each of the selected checkbox character types</li></ul>";
			} else if (self.attr("id") === "safecron") {
				helpText = "<p>This tool will help determine the best time to trigger automated work when dealing with international clients</p>" +
					"<ul><li>The timeline axis is 24 hours and divided into increments of 15 minutes</li>" +
					"<li>Additionally this axis is set to your local time according to your browser</li>" +
					"<li>As you enter timezones, the standard working hours of 9am to 5pm are displayed for that timezone relative to your timeline</li>" +
					"<li>After at least one timezone has been entered, you may select, \"Safe Time\" to be told the best point in time to do something with the least impact.</li>" +
					"<li>Optionally, you may choose an importance level. This will act as a multiplyer to the entered lines value for calculating a safe time</li>" +
					"<li>Not choosing an importance level is of lesser value than choosing \"Low\"</li></ul>";
			} else if (self.attr("id") === "pascal") {
				helpText = "<p>This tool will help show where nCk gets its value within Pascal's triangle (within reason)</p>";
			} else if (self.attr("id") === "listiterator") {
				helpText = "<p>This tool will generate a list of elements that incrementally increase in value as defined by the options</p>";
				helpText += "<ul><li>Selecting Alpha, or Numeric will give you the respective character dictionaries to generate the list</li>";
				helpText += "<li>Alternately, you can choose to enter a custom character dictionary such as 01234567 for octal, or 0123456789abcdef for hexadecimal</li>";
				helpText += "<li>The body is the starting point. For instance 0 if you want the first number to be 0 followed by 1, 2, 3, ...</li>";
				helpText += "<li>Prefix will prepend a static string and suffix will append a static string to every output</li></ul>";
			} else if (self.attr("id") === "bayes") {
				helpText = "<p>This tool is used to update a probability given new probable affirmative information. Select \"Reuse\" when the fields have been entered or when you wish to run another cycle with the newest probability</p>";
				helpText += "<ul><li>(H) is the hypothesis</li>";
				helpText += "<li>P(H) is the initial probability of the hypothesis being true, or if you are running a second time, it is P(H|E)</li>";
				helpText += "<li>P(E|H) is the probability the new affirmative information is correct</li>";
				helpText += "<li>P(¬H) is the probability of the initial assertion being wrong</li>";
				helpText += "<li>P(E|¬H) is the probability the new affirmative information is incorrect</li>";
				helpText += "<li>P(H|E) is the new probability the (H) is true</li></ul>";
			} else if (self.attr("id") === "taxes") {
				helpText = "<p>This tool shows a means to calculate taxes effectively based on the current poverty line. The lower the line, the lower the taxes. No loopholes, no provisos, no caveats. Everyone pays this amount.</p>";
				helpText += "<ul><li>Select a type of tax to calculate</li>";
				helpText += "<li>Enter an amount greater that the current poverty line $12,760</li>";
				helpText += "<li>Select \"Show Taxes\"</li></ul>";
				helpText += "<p>The blue line shows taxes of the x-axis and the red dot is where your tax percentage would be.</p>";
			} else if (self.attr("id") === "message") {
				helpText = "<p>This tool to help make HTML elements to paste into Teams</p>";
				helpText += "<ul><li>Place a message in position 1</li>";
				helpText += "<li>Place a message in position 2</li>";
				helpText += "<li>Press the button and the combination should appear below</li></ul>";
				helpText += "<p>Just copy and paste this into Teams</p>";
			} else {
				helpText = "<p>Help TBD</p>";
			}
			helpObj.html(helpText);
			var headerTitleObj = $(".center-block.panel-title.tool-title");
			var headerText;
			if (self.attr("id") === "listcomparator") {
				headerText = "<h2>List Comparator</h2>";
			} else if (self.attr("id") === "listclean") {
				headerText = "<h2>List Cleaner</h2>";
			} else if (self.attr("id") === "listrandom") {
				headerText = "<h2>Random List</h2>";
			} else if (self.attr("id") === "safecron") {
				headerText = "<h2>Safe Scheduler</h2>";
			} else if (self.attr("id") === "pascal") {
				headerText = "<h2>Pascal's Triangle</h2>";
			} else if (self.attr("id") === "listiterator") {
				headerText = "<h2>List Iterator</h2>";
			} else if (self.attr("id") === "bayes") {
				headerText = "<h2>Bayes' Theorem</h2>";
			} else if (self.attr("id") === "taxes") {
				headerText = "<h2>Simple Taxes</h2>";
			} else if (self.attr("id") === "message") {
				headerText = "<h2>Teams Message</h2>";
			}
			headerTitleObj.html(headerText);
			return true;
		});

		localStorage.clear();
		if (browserDetect.browser === "Explorer" && browserDetect.version <= 11) {
			var outerDiv = $("<div>", {
				css: {
					"display": "table",
					"position": "absolute",
					"height": "100%",
					"width": "100%"
				}
			});
			var middleDiv = $("<div>", {
				css: {
					"display": "table-cell",
					"vertical-align": "middle"
				}
			});
			var innerDiv = $("<div>", {
				css: {
					"margin-left": "auto",
					"margin-right": "auto",
					"width": "300px",
					"font-weight": "bold"
				},
				text: "Internet " + browserDetect.browser + " " + browserDetect.version + " is not supported."
			});
			middleDiv.append(innerDiv);
			outerDiv.append(middleDiv);
			$("body").html(outerDiv);
		}
		var viewport = $("meta[name='viewport']");
		var original = viewport.attr("content");
		var force_scale = original + ", maximum-scale=1";
		viewport.attr("content", force_scale);
		setTimeout(function () {
			viewport.attr("content", original);
		}, 50);
		$("#listcomparator").click();

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

		var warningInMilliseconds = 5 * 60 * 1000;//min * sec * ms
		var checkStatusInMilliseconds = 55 * 1000;//sec * ms

		var resetIntervalState = function () {
			if (window.GLOBAL_ACTIVITY_MONITOR_INTERVAL) {
				try {
					clearInterval(window.GLOBAL_ACTIVITY_MONITOR_INTERVAL);
				} catch (ex) {
				}
			}
		};

		var throwMessageBox = function (message, okFunction) {
			MESSAGE_SPLASH(null, "NOTICE<br />" + message);
			if (typeof okFunction === "function") {
				okFunction();
			}
		};

		var checkActivityTimeout = function () {
			var dateInMilliseconds = Date.now();
			var activityMonitorInMilliseconds = parseInt(localStorage.activityMonitor);
			if (activityMonitorInMilliseconds > 0) {
				var thenLogoutOffset = (activityMonitorInMilliseconds + window.GLOBAL_ACTIVITY_MONITOR_TIMEOUT);
				var thenWarningOffset = (activityMonitorInMilliseconds + (window.GLOBAL_ACTIVITY_MONITOR_TIMEOUT - warningInMilliseconds));
				if (dateInMilliseconds >= thenLogoutOffset) {
					resetIntervalState();
					LOGOUT();
					return false;
				} else if (dateInMilliseconds >= thenWarningOffset) {
					var timeRemaining = Math.ceil((warningInMilliseconds - (dateInMilliseconds - thenWarningOffset)) / 1000 / 60);
					var message = "You will be logged out due to inactivity in " + timeRemaining + " minute";
					message += timeRemaining === 1 ? "." : "s.";
					message += "<br/>Select OK to continue with your session.";
					message += "<br/><input type='button' value='OK' onclick='REFRESH_SESSION()' style='height: 32px;'/>";
					throwMessageBox(message, null);
				}
			} else {
				localStorage.setItem("activityMonitor", Date.now().toString());
				resetIntervalState();
				window.GLOBAL_ACTIVITY_MONITOR_INTERVAL = setInterval(checkActivityTimeout, checkStatusInMilliseconds);
			}
			return true;
		};
		if (!/index\.html/.test(window.location.pathname)) {
			checkActivityTimeout();
		}
	});
}(jQuery, Modernizr));