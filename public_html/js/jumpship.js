window.STAY_ON_SITE = function () {
	localStorage.setItem("activityMonitor", Date.now().toString());
	setTimeout(function () {
		if (window.self !== top) {
			top.location = window.self.location;
		}
	}, 1);
	setTimeout(function () {
		if (!/^(http:\/\/|https:\/\/)?(brightmatter\.tools\/?([^.]+\.p?html)?$|localhost(:[0-9]+|\/).*)$/.test(window.location.href)) {
			window.location.replace("https://brightmatter.tools/");
		}
	}, 1000);
};

