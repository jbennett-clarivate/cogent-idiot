// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
	config.set({
		basePath: "",
		frameworks: ["jasmine", "@angular-devkit/build-angular"],
		plugins: [
			require("karma-jasmine"),
			require("karma-firefox-launcher"),
			require("karma-jasmine-html-reporter"),
			require("karma-coverage"),
			require("@angular-devkit/build-angular/plugins/karma")
		],
		client: {
			jasmine: {
			},
			clearContext: false // leave Jasmine Spec Runner output visible in browser
		},
		jasmineHtmlReporter: {
			suppressAll: true // removes the duplicated traces
		},
		coverageReporter: {
			dir: require("path").join(__dirname, "./coverage/cogent-idiot"),
			subdir: ".",
			reporters: [
				{type: "html"},
				{type: "text-summary"}
			]
		},
		reporters: ["progress", "kjhtml"],
		browsers: ["FirefoxHeadless"],
		customLaunchers: {
			// NOTE: a custom launcher must NOT be named after its own `base`
			// (a `Firefox: { base: "Firefox" }` entry makes karma's injector
			// resolve itself forever and die with a stack overflow).
			FirefoxSafe: {
				base: "Firefox",
				flags: ["--safe-mode"]
			},
			FirefoxHeadless: {
				base: "Firefox",
				flags: ["-headless"]
			}
		},
		singleRun: false,
		restartOnFileChange: true
	});
};
